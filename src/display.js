"use strict";

let VirtualDisplay;
try {
  VirtualDisplay = require("virtual-display-linux").VirtualDisplay;
} catch {
  VirtualDisplay = null;
}

const createVirtualDisplay = (width = 1920, height = 1080, depth = 24) => {
  if (process.platform !== "linux" || !VirtualDisplay) return null;
  try {
    const display = new VirtualDisplay({ width, height, depth });
    display.start();
    return display;
  } catch {
    return null;
  }
};

const destroyVirtualDisplay = (display) => {
  if (!display) return;
  try { display.stop(); } catch {}
};

module.exports = { createVirtualDisplay, destroyVirtualDisplay };
