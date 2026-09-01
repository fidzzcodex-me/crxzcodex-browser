"use strict";

const VALID_FIX_MODES = ["addBinding", "alwaysIsolated", "enableDisable", "0"];

const applyRuntimeFixMode = (mode = "addBinding") => {
  if (!VALID_FIX_MODES.includes(mode)) {
    throw new Error(
      `[crzcode/browser] Invalid RUNTIME_FIX_MODE: "${mode}". Must be one of: ${VALID_FIX_MODES.join(", ")}`
    );
  }
  process.env["REBROWSER_PATCHES_RUNTIME_FIX_MODE"] = mode;
};

const applyUtilityWorldName = (name = "util") => {
  process.env["REBROWSER_PATCHES_UTILITY_WORLD_NAME"] = name;
};

const applySourceUrlMask = (url = "app.js") => {
  process.env["REBROWSER_PATCHES_SOURCE_URL"] = url;
};

const applyDebug = (enabled = false) => {
  if (enabled) {
    process.env["REBROWSER_PATCHES_DEBUG"] = "1";
  } else {
    delete process.env["REBROWSER_PATCHES_DEBUG"];
  }
};

const applyPatches = ({
  runtimeFixMode   = "addBinding",
  utilityWorldName = "util",
  sourceUrlMask    = "app.js",
  debug            = false,
} = {}) => {
  applyRuntimeFixMode(runtimeFixMode);
  applyUtilityWorldName(utilityWorldName);
  applySourceUrlMask(sourceUrlMask);
  applyDebug(debug);
};

module.exports = { applyPatches, applyRuntimeFixMode, applyUtilityWorldName, applySourceUrlMask, applyDebug };
