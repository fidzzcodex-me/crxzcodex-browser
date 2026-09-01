"use strict";

const interceptNetworkTokens = (page, store) => {
  page.on("response", async (res) => {
    try {
      const url = res.url();

      if (url.includes("recaptcha") || url.includes("anchor") || url.includes("reload")) {
        const text = await res.text().catch(() => "");
        const m1 = text.match(/"rresp","([^"]{20,})"/);
        if (m1) { store.recaptchaV2 = m1[1]; console.log("[crzcode/harvest] reCAPTCHA v2 response"); }
        const m2 = text.match(/"uvresp","([^"]{20,})"/);
        if (m2) { store.recaptchaV3 = m2[1]; console.log("[crzcode/harvest] reCAPTCHA v3 response"); }
        const m3 = text.match(/\["rresp","([^"]{20,})"\]/);
        if (m3) store.recaptchaV2 = m3[1];
        try {
          const json = JSON.parse(text);
          if (json?.token?.length    > 20) store.recaptchaV2 = json.token;
          if (json?.response?.length > 20) store.recaptchaV2 = json.response;
        } catch {}
      }

      if (url.includes("hcaptcha.com/checkcaptcha") || url.includes("hcaptcha.com/getcaptcha")) {
        const text = await res.text().catch(() => "");
        try {
          const json = JSON.parse(text);
          if (json?.generated_pass_UUID) {
            store.hcaptcha = json.generated_pass_UUID;
            console.log("[crzcode/harvest] hCaptcha response");
          }
        } catch {}
      }

      if (url.includes("challenges.cloudflare.com") || url.includes("turnstile")) {
        const text = await res.text().catch(() => "");
        const m = text.match(/token['":\s]+['"]([A-Za-z0-9_\-.]{20,})['"]/);
        if (m) { store.turnstile = m[1]; console.log("[crzcode/harvest] Turnstile response"); }
      }
    } catch {}
  });

  page.on("request", (req) => {
    try {
      const url  = req.url();
      const body = req.postData() || "";

      const mg = body.match(/g-recaptcha-response=([^&]{20,})/);
      if (mg) { store.recaptchaV2 = decodeURIComponent(mg[1]); console.log("[crzcode/harvest] reCAPTCHA v2 POST"); }
      const mh = body.match(/h-captcha-response=([^&]{20,})/);
      if (mh) { store.hcaptcha = decodeURIComponent(mh[1]); console.log("[crzcode/harvest] hCaptcha POST"); }
      const mt = body.match(/cf-turnstile-response=([^&]{20,})/);
      if (mt) { store.turnstile = decodeURIComponent(mt[1]); console.log("[crzcode/harvest] Turnstile POST"); }

      try {
        const json = JSON.parse(body);
        if (json?.["g-recaptcha-response"]?.length  > 20) store.recaptchaV2 = json["g-recaptcha-response"];
        if (json?.["h-captcha-response"]?.length     > 20) store.hcaptcha    = json["h-captcha-response"];
        if (json?.["cf-turnstile-response"]?.length  > 20) store.turnstile   = json["cf-turnstile-response"];
      } catch {}

      if (url.includes("recaptcha") && url.includes("userverify")) {
        const mu = url.match(/[?&]c=([^&]{20,})/);
        if (mu) { store.recaptchaV2 = mu[1]; console.log("[crzcode/harvest] reCAPTCHA v2 URL param"); }
      }
    } catch {}
  });
};

const DOM_HARVESTER_SCRIPT = `
(function () {
  window.__crz_tokens__ = {};

  const patchGrecaptcha = () => {
    if (!window.grecaptcha || window.__crz_rcPatched__) return;
    window.__crz_rcPatched__ = true;

    const origExec = window.grecaptcha.execute;
    if (origExec) {
      window.grecaptcha.execute = function (key, opts) {
        const p = origExec.call(this, key, opts);
        if (p?.then) p.then(t => { if (t?.length > 20) window.__crz_tokens__.recaptchaV3 = t; }).catch(() => {});
        return p;
      };
    }

    const origGet = window.grecaptcha.getResponse;
    if (origGet) {
      window.grecaptcha.getResponse = function (...args) {
        const r = origGet.apply(this, args);
        if (r?.length > 20) window.__crz_tokens__.recaptchaV2 = r;
        return r;
      };
    }

    try {
      const cfg = window.___grecaptcha_cfg?.clients ?? {};
      for (const id of Object.keys(cfg)) {
        try {
          const r = window.grecaptcha.getResponse(parseInt(id, 10));
          if (r?.length > 20) window.__crz_tokens__.recaptchaV2 = r;
        } catch {}
      }
    } catch {}
  };

  patchGrecaptcha();
  setInterval(patchGrecaptcha, 400);

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const resp = await origFetch.apply(this, arguments);
    try {
      const body = init?.body;
      if (typeof body === 'string') {
        const mg = body.match(/g-recaptcha-response=([^&]{20,})/);
        if (mg) window.__crz_tokens__.recaptchaV2 = decodeURIComponent(mg[1]);
        const mh = body.match(/h-captcha-response=([^&]{20,})/);
        if (mh) window.__crz_tokens__.hcaptcha = decodeURIComponent(mh[1]);
      }
      if (body instanceof FormData) {
        const gv = body.get('g-recaptcha-response');
        if (gv?.length > 20) window.__crz_tokens__.recaptchaV2 = gv;
        const hv = body.get('h-captcha-response');
        if (hv?.length > 20) window.__crz_tokens__.hcaptcha = hv;
      }
      const url2 = typeof input === 'string' ? input : input?.url ?? '';
      if (url2.includes('recaptcha')) {
        resp.clone().json().then(d => {
          if (d?.token?.length    > 20) window.__crz_tokens__.recaptchaV3 = d.token;
          if (d?.response?.length > 20) window.__crz_tokens__.recaptchaV2 = d.response;
        }).catch(() => {});
      }
    } catch {}
    return resp;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (m, u) {
    this.__crz_url__ = u;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (typeof body === 'string') {
      const mg = body.match(/g-recaptcha-response=([^&]{20,})/);
      if (mg) window.__crz_tokens__.recaptchaV2 = decodeURIComponent(mg[1]);
    }
    this.addEventListener('load', function () {
      try {
        if (this.__crz_url__?.includes('recaptcha')) {
          const d = JSON.parse(this.responseText);
          if (d?.token?.length    > 20) window.__crz_tokens__.recaptchaV3 = d.token;
          if (d?.response?.length > 20) window.__crz_tokens__.recaptchaV2 = d.response;
        }
      } catch {}
    });
    return origSend.apply(this, arguments);
  };

  new MutationObserver(() => {
    const ta  = document.getElementById('g-recaptcha-response');
    if (ta?.value?.length  > 20) window.__crz_tokens__.recaptchaV2 = ta.value;
    const tah = document.querySelector('[name="h-captcha-response"]');
    if (tah?.value?.length > 20) window.__crz_tokens__.hcaptcha    = tah.value;
    const tct = document.querySelector('[name="cf-turnstile-response"]');
    if (tct?.value?.length > 20) window.__crz_tokens__.turnstile   = tct.value;
    patchGrecaptcha();
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
})();
`;

const injectDOMHarvester = async (page) => {
  await page.evaluateOnNewDocument(DOM_HARVESTER_SCRIPT);
};

const collectTokens = async (page, store) => {
  const dom = await page
    .evaluate(() => {
      const t = window.__crz_tokens__ || {};
      return {
        recaptchaV2: t.recaptchaV2 || document.querySelector('[name="g-recaptcha-response"]')?.value || null,
        recaptchaV3: t.recaptchaV3 || null,
        hcaptcha:    t.hcaptcha    || document.querySelector('[name="h-captcha-response"]')?.value   || null,
        turnstile:   t.turnstile   || document.querySelector('[name="cf-turnstile-response"]')?.value || null,
      };
    })
    .catch(() => ({}));

  return {
    recaptchaV2: store.recaptchaV2 || dom.recaptchaV2 || null,
    recaptchaV3: store.recaptchaV3 || dom.recaptchaV3 || null,
    hcaptcha:    store.hcaptcha    || dom.hcaptcha    || null,
    turnstile:   store.turnstile   || dom.turnstile   || null,
  };
};

module.exports = { interceptNetworkTokens, injectDOMHarvester, collectTokens, DOM_HARVESTER_SCRIPT };
