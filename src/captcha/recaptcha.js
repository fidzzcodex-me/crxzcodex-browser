"use strict";

const { sleep, jitter, humanClick } = require("../utils");
const { solveAudioCaptcha }         = require("./stt");

const MAX_AUDIO_ATTEMPTS = 3;

const _getFrames = (page) => {
  const frames = page.frames();
  let anchorFrame    = null;
  let challengeFrame = null;
  for (const f of frames) {
    const u = f.url();
    if (u.includes("recaptcha") && u.includes("anchor"))  anchorFrame    = f;
    if (u.includes("recaptcha") && u.includes("bframe"))  challengeFrame = f;
  }
  return { anchorFrame, challengeFrame };
};

const _isRateLimited = async (challengeFrame) => {
  const text = await challengeFrame
    .evaluate(() => document.querySelector(".rc-doscaptcha-header-text, .rc-doscaptcha-body-text")?.innerText ?? null)
    .catch(() => null);
  return text?.toLowerCase().includes("try again") ?? false;
};

const _openChallenge = async (page) => {
  const { anchorFrame } = _getFrames(page);
  if (anchorFrame) {
    await anchorFrame.waitForSelector("#recaptcha-anchor", { timeout: 8000 }).catch(() => {});
    const box = await anchorFrame.$eval("#recaptcha-anchor", el => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }).catch(() => null);
    if (box) {
      await anchorFrame.mouse.move(box.x + Math.random() * 4 - 2, box.y + Math.random() * 4 - 2);
      await sleep(jitter(150, 0.4));
    }
    await anchorFrame.click("#recaptcha-anchor").catch(() => {});
    await sleep(jitter(2200, 0.4));
  }
  return _getFrames(page).challengeFrame;
};

const _switchToAudio = async (challengeFrame) => {
  await challengeFrame.waitForSelector("#recaptcha-audio-button", { timeout: 8000 }).catch(() => {});
  await challengeFrame.click("#recaptcha-audio-button").catch(async () => {
    await challengeFrame.evaluate(() => document.querySelector("#recaptcha-audio-button")?.click());
  });
  await sleep(jitter(2200, 0.4));
};

const _solveOnce = async (page, challengeFrame) => {
  if (await _isRateLimited(challengeFrame)) {
    console.log("[crzcode/rcv2] IP rate-limited");
    return null;
  }

  await challengeFrame.waitForSelector("#audio-source", { timeout: 10000 }).catch(() => {});

  const audioSrc = await challengeFrame
    .evaluate(() =>
      document.querySelector("#audio-source")?.src ||
      document.querySelector(".rc-audiochallenge-tdownload-link")?.href ||
      null
    )
    .catch(() => null);

  if (!audioSrc) { console.log("[crzcode/rcv2] no audio URL"); return null; }

  const answer = await solveAudioCaptcha(audioSrc);
  if (!answer) return null;

  await challengeFrame.waitForSelector("#audio-response", { timeout: 5000 }).catch(() => {});
  await challengeFrame.click("#audio-response").catch(() => {});
  await sleep(jitter(400, 0.3));

  for (const ch of answer) {
    await challengeFrame.type("#audio-response", ch, { delay: jitter(85, 0.5) });
  }

  await sleep(jitter(700, 0.4));
  await challengeFrame.click("#recaptcha-verify-button").catch(() => {});
  await sleep(jitter(3500, 0.4));

  return await page
    .evaluate(() => {
      const ta = document.getElementById("g-recaptcha-response");
      return ta?.value?.length > 20 ? ta.value : null;
    })
    .catch(() => null);
};

const solveRecaptchaV2Audio = async (page) => {
  console.log("[crzcode/rcv2] starting audio solve");
  try {
    let challengeFrame = await _openChallenge(page);
    if (!challengeFrame) { console.log("[crzcode/rcv2] no challenge frame"); return null; }

    await _switchToAudio(challengeFrame);

    for (let attempt = 1; attempt <= MAX_AUDIO_ATTEMPTS; attempt++) {
      console.log(`[crzcode/rcv2] attempt ${attempt}/${MAX_AUDIO_ATTEMPTS}`);
      const token = await _solveOnce(page, challengeFrame);
      if (token) { console.log("[crzcode/rcv2] SUCCESS"); return token; }

      if (attempt < MAX_AUDIO_ATTEMPTS) {
        const newAudioBtn = await challengeFrame.$(".rc-audiochallenge-reload-button").catch(() => null);
        if (newAudioBtn) {
          await newAudioBtn.click().catch(() => {});
          await sleep(jitter(2000, 0.4));
        } else {
          break;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("[crzcode/rcv2]", e.message);
    return null;
  }
};

module.exports = { solveRecaptchaV2Audio };
