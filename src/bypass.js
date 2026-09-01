"use strict";

const { connect }                                                    = require("./browser");
const { interceptNetworkTokens, injectDOMHarvester, collectTokens } = require("./captcha/harvester");
const { deepDetect }                                                 = require("./captcha/detector");
const { solveRecaptchaV2Audio }                                      = require("./captcha/recaptcha");
const { checkTurnstile }                                             = require("./captcha/turnstile");
const { sleep, jitter }                                              = require("./utils");

const BLOCKING_TITLES = [
  "Just a moment",
  "Attention Required",
  "Security Check",
  "Checking your browser",
  "DDoS-Guard",
  "Access denied",
];

const _isCfBlocking = (title) => BLOCKING_TITLES.some((t) => title.includes(t));

const _waitCfClearance = async (page, maxMs = 45000) => {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const cookies = await page.cookies().catch(() => []);
    if (cookies.find((c) => c.name === "cf_clearance")) return true;
    const title = await page.title().catch(() => "");
    if (!_isCfBlocking(title)) return true;
    await sleep(800);
  }
  return false;
};

const _pollTurnstileToken = async (page, store, maxMs = 20000) => {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const val = await page
      .evaluate(() =>
        document.querySelector('[name="cf-turnstile-response"]')?.value ||
        window.__crz_tokens__?.turnstile ||
        null
      )
      .catch(() => null);
    if (val?.length > 20) { store.turnstile = val; return true; }
    await sleep(600);
  }
  return false;
};

const _simulateHuman = async (page) => {
  await page.mouse.move(
    200 + Math.random() * 400,
    200 + Math.random() * 200,
    { steps: 10 + Math.floor(Math.random() * 8) }
  ).catch(() => {});
  await sleep(jitter(300, 0.4));
  await page.mouse.move(
    300 + Math.random() * 300,
    300 + Math.random() * 150,
    { steps: 8 + Math.floor(Math.random() * 6) }
  ).catch(() => {});
};

const _navRetry = async (page, maxRetries = 2) => {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(jitter(3500, 0.3));
    const title = await page.title().catch(() => "");
    if (!_isCfBlocking(title)) return true;
    console.log(`[crzcode/bypass] still blocked — reload ${i + 1}`);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  }
  return false;
};

const bypass = async (targetUrl, opts = {}) => {
  const {
    timeout    = 60000,
    waitAfter  = 3000,
    autoClose  = false,
    maxRetries = 2,
    ...connectOpts
  } = opts;

  const networkStore = {};
  const { browser, page } = await connect({
    fingerprint: true,
    tf:          true,
    turnstile:   true,
    ...connectOpts,
  });

  try {
    interceptNetworkTokens(page, networkStore);
    await injectDOMHarvester(page);

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 }).catch(() => {});

    await _simulateHuman(page);

    const cleared = await _waitCfClearance(page);
    if (!cleared) {
      console.log("[crzcode/bypass] CF not cleared — retrying");
      await _navRetry(page, maxRetries);
    }

    await page
      .waitForFunction(
        (blockTitles) => {
          const tok   = window.__crz_tokens__ || {};
          const title = document.title;
          const gRes  = document.querySelector('[name="g-recaptcha-response"]');
          const hRes  = document.querySelector('[name="h-captcha-response"]');
          const cfRes = document.querySelector('[name="cf-turnstile-response"]');
          return (
            (gRes?.value?.length  > 0) ||
            (hRes?.value?.length  > 0) ||
            (cfRes?.value?.length > 0) ||
            tok.recaptchaV2 || tok.recaptchaV3 ||
            tok.hcaptcha    || tok.turnstile    ||
            !blockTitles.some((t) => title.includes(t))
          );
        },
        { timeout },
        BLOCKING_TITLES
      )
      .catch(() => {});

    await sleep(waitAfter);

    const detection = await deepDetect(page);
    console.log("[crzcode/bypass] detection:", JSON.stringify(detection));

    if (detection?.turnstile?.sitekey) {
      console.log("[crzcode/bypass] Turnstile — click + poll");
      await checkTurnstile({ page });
      await _pollTurnstileToken(page, networkStore);
    }

    if (detection?.recaptcha?.sitekey && !detection.recaptcha.v3) {
      const hasToken = await page
        .evaluate(() => (document.getElementById("g-recaptcha-response")?.value?.length ?? 0) > 20)
        .catch(() => false);
      if (!hasToken) {
        console.log("[crzcode/bypass] reCAPTCHA v2 — audio solve");
        await solveRecaptchaV2Audio(page);
      }
    }

    if (detection?.hcaptcha?.sitekey) {
      console.log("[crzcode/bypass] hCaptcha — harvest wait");
      await sleep(jitter(5000, 0.3));
    }

    await sleep(2000);

    const tokens      = await collectTokens(page, networkStore);
    const title       = await page.title().catch(() => "");
    const cookies     = await page.cookies().catch(() => []);
    const cfClearance = cookies.find((c) => c.name === "cf_clearance");

    const bypassed =
      Boolean(cfClearance) ||
      Object.values(tokens).some((v) => v?.length > 20) ||
      !_isCfBlocking(title);

    if (autoClose) await browser.close();

    return {
      bypassed,
      title,
      cfClearance:  cfClearance?.value ?? null,
      tokens,
      cookies,
      detection,
      page:    autoClose ? null : page,
      browser: autoClose ? null : browser,
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
};

module.exports = { bypass };
