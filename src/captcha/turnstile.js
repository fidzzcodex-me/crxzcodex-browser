"use strict";

const { sleep } = require("../utils");

const TURNSTILE_WIDGET_WIDTH_MIN = 290;
const TURNSTILE_WIDGET_WIDTH_MAX = 310;
const SOLVE_TIMEOUT_MS           = 5000;
const LOOP_INTERVAL_MS           = 1000;

const _clickTurnstileElement = async (page, x, y) => {
  await page.mouse.move(x + Math.random() * 4 - 2, y + Math.random() * 4 - 2, { steps: 6 });
  await sleep(80 + Math.random() * 120);
  await page.mouse.click(x, y, { delay: 40 + Math.random() * 60 });
};

const _findWidgetCoordinates = async (page) => {
  return page.evaluate((minW, maxW) => {
    const hits = [];
    const strict = [];

    document.querySelectorAll("div").forEach((el) => {
      try {
        const r   = el.getBoundingClientRect();
        const css = window.getComputedStyle(el);
        if (r.width > minW && r.width <= maxW && !el.querySelector("*")) {
          if (css.margin === "0px" && css.padding === "0px") {
            strict.push({ x: r.x, y: r.y, w: r.width, h: r.height });
          } else {
            hits.push({ x: r.x, y: r.y, w: r.width, h: r.height });
          }
        }
      } catch {}
    });

    return strict.length > 0 ? strict : hits;
  }, TURNSTILE_WIDGET_WIDTH_MIN, TURNSTILE_WIDGET_WIDTH_MAX);
};

const checkTurnstile = async ({ page }) => {
  return new Promise(async (resolve) => {
    const timer = setTimeout(() => resolve(false), SOLVE_TIMEOUT_MS);

    try {
      const responseEls = await page.$$('[name="cf-turnstile-response"]');

      if (responseEls.length > 0) {
        for (const el of responseEls) {
          try {
            const parent = await el.evaluateHandle((n) => n.parentElement);
            const box    = await parent.boundingBox();
            if (!box) continue;
            await _clickTurnstileElement(page, box.x + 30, box.y + box.height / 2);
          } catch {}
        }
        clearTimeout(timer);
        return resolve(true);
      }

      const coords = await _findWidgetCoordinates(page);
      for (const coord of coords) {
        try {
          await _clickTurnstileElement(page, coord.x + 30, coord.y + coord.h / 2);
        } catch {}
      }

      clearTimeout(timer);
      resolve(coords.length > 0);
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
};

const turnstileSolverLoop = async (page, activeRef) => {
  while (activeRef.active) {
    await checkTurnstile({ page }).catch(() => {});
    await sleep(LOOP_INTERVAL_MS);
  }
};

module.exports = { checkTurnstile, turnstileSolverLoop };
