"use strict";

const { connect, _pageController }                                   = require("./browser");
const { bypass }                                                     = require("./bypass");
const { applyPatches }                                               = require("./patches/runtime-fix");
const { injectStealthScripts }                                       = require("./stealth/fingerprint");
const { applyAll: applyEvasions }                                    = require("./stealth/evasions");
const { attachCursor, injectMousePatch }                             = require("./cursor");
const { interceptNetworkTokens, injectDOMHarvester, collectTokens }  = require("./captcha/harvester");
const { deepDetect }                                                 = require("./captcha/detector");
const { checkTurnstile, turnstileSolverLoop }                        = require("./captcha/turnstile");
const { solveRecaptchaV2Audio }                                      = require("./captcha/recaptcha");
const { solveAudioCaptcha }                                          = require("./captcha/stt");
const { createVirtualDisplay, destroyVirtualDisplay }                = require("./display");

module.exports = {
  connect,
  bypass,
  _pageController,
  applyPatches,
  injectStealthScripts,
  applyEvasions,
  attachCursor,
  injectMousePatch,
  interceptNetworkTokens,
  injectDOMHarvester,
  collectTokens,
  deepDetect,
  checkTurnstile,
  turnstileSolverLoop,
  solveRecaptchaV2Audio,
  solveAudioCaptcha,
  createVirtualDisplay,
  destroyVirtualDisplay,
};
