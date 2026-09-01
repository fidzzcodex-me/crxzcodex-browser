"use strict";

let createCursor;
try {
  createCursor = require("ghost-cursor").createCursor;
} catch {
  createCursor = null;
}

const attachCursor = (page) => {
  if (!createCursor) {
    page.realCursor = null;
    page.realClick  = page.click.bind(page);
    return;
  }
  const cursor    = createCursor(page);
  page.realCursor = cursor;
  page.realClick  = cursor.click.bind(cursor);
};

const mouseScreenXYPatch = `
(function () {
  Object.defineProperty(MouseEvent.prototype, 'screenX', {
    get: function () { return this.clientX + window.screenX; }
  });
  Object.defineProperty(MouseEvent.prototype, 'screenY', {
    get: function () { return this.clientY + window.screenY; }
  });
})();
`;

const injectMousePatch = async (page) => {
  await page.evaluateOnNewDocument(mouseScreenXYPatch);
};

module.exports = { attachCursor, injectMousePatch };
