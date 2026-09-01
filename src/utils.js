"use strict";

const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base, spread = 0.35) =>
  Math.floor(base + (Math.random() - 0.5) * 2 * base * spread);

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const humanMouseMove = async (page, targetX, targetY) => {
  const steps = Math.floor(randomBetween(8, 18));
  const start = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })).catch(() => ({ x: 640, y: 400 }));
  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const x  = start.x + (targetX - start.x) * eased + randomBetween(-3, 3);
    const y  = start.y + (targetY - start.y) * eased + randomBetween(-3, 3);
    await page.mouse.move(x, y);
    await sleep(jitter(18, 0.6));
  }
};

const humanClick = async (page, selector) => {
  const el = await page.$(selector).catch(() => null);
  if (!el) return false;
  const box = await el.boundingBox().catch(() => null);
  if (!box) { await el.click(); return true; }
  const tx = box.x + box.width  * randomBetween(0.3, 0.7);
  const ty = box.y + box.height * randomBetween(0.3, 0.7);
  await humanMouseMove(page, tx, ty);
  await sleep(jitter(120, 0.5));
  await page.mouse.click(tx, ty, { delay: jitter(60, 0.4) });
  return true;
};

module.exports = { sleep, jitter, randomBetween, humanMouseMove, humanClick };
