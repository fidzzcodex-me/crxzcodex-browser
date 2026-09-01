"use strict";

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

const applyUserAgent = async (page, ua = CHROME_UA) => {
  await page.setUserAgent(ua);
};

const applyViewport = async (page, viewport = DEFAULT_VIEWPORT) => {
  await page.setViewport(viewport);
};

const applyExtraHeaders = async (page) => {
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
};

const disableAutomationFeatures = async (client) => {
  await client.send("Emulation.setAutomationOverride", { enabled: false }).catch(() => {});
  await client.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
};

const applyAll = async (page, opts = {}) => {
  const {
    userAgent    = CHROME_UA,
    viewport     = DEFAULT_VIEWPORT,
    extraHeaders = true,
  } = opts;

  const client = await page.createCDPSession();

  await Promise.all([
    applyUserAgent(page, userAgent),
    applyViewport(page, viewport),
    extraHeaders ? applyExtraHeaders(page) : Promise.resolve(),
    disableAutomationFeatures(client),
  ]);

  await client.detach().catch(() => {});
};

module.exports = { applyAll, applyUserAgent, applyViewport, applyExtraHeaders, disableAutomationFeatures, CHROME_UA, DEFAULT_VIEWPORT };
