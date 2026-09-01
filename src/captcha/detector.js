"use strict";

const deepDetect = async (page) =>
  page
    .evaluate(() => {
      const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) ?? null;

      const isCfChl = Boolean(
        window._cf_chl_opt ||
        document.querySelector("#challenge-running, #challenge-stage, #cf-please-wait")
      );

      let turnstileKey   = getAttr(".cf-turnstile", "data-sitekey") || getAttr("[data-sitekey]", "data-sitekey");
      let turnstileInvis = getAttr(".cf-turnstile", "data-size") === "invisible";
      let recaptchaKey   = getAttr(".g-recaptcha", "data-sitekey");
      let recaptchaInvis = getAttr(".g-recaptcha", "data-size") === "invisible";
      let recaptchaV3    = false;
      let hcaptchaKey    = getAttr(".h-captcha", "data-sitekey");
      let hcaptchaInvis  = getAttr(".h-captcha", "data-size") === "invisible";

      document.querySelectorAll("iframe").forEach((f) => {
        const src = f.src || "";
        if (src.includes("challenges.cloudflare.com")) {
          const m = src.match(/sitekey=([^&]+)/);
          if (m) turnstileKey = m[1];
          if (src.includes("invisible")) turnstileInvis = true;
        }
        if (src.includes("recaptcha")) {
          const m = src.match(/(?:k|render)=([^&]+)/);
          if (m) recaptchaKey = m[1];
          if (src.includes("invisible")) recaptchaInvis = true;
        }
        if (src.includes("hcaptcha")) {
          const m = src.match(/sitekey=([^&]+)/);
          if (m) hcaptchaKey = m[1];
          if (src.includes("invisible")) hcaptchaInvis = true;
        }
      });

      document.querySelectorAll("script").forEach((s) => {
        const t = s.innerText || "";
        if (!recaptchaKey) {
          const m = t.match(/sitekey['":\s=]+([0-9a-zA-Z_\-]{20,})/i);
          if (m) recaptchaKey = m[1];
        }
        if (t.includes("grecaptcha.execute")) recaptchaV3 = true;
      });

      return {
        cloudflareUAM: isCfChl,
        turnstile: { sitekey: turnstileKey || null, invisible: turnstileInvis },
        recaptcha: { sitekey: recaptchaKey || null, invisible: recaptchaInvis, v3: recaptchaV3 },
        hcaptcha:  { sitekey: hcaptchaKey  || null, invisible: hcaptchaInvis },
      };
    })
    .catch(() => null);

module.exports = { deepDetect };
