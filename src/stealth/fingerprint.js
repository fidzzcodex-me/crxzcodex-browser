"use strict";

const STEALTH_SCRIPT = `
(function () {
  'use strict';

  const _defineProperty = Object.defineProperty;

  const stealthDefine = (obj, prop, value) => {
    try {
      _defineProperty(obj, prop, {
        get: typeof value === 'function' ? value : () => value,
        enumerable: true,
        configurable: true,
      });
    } catch (_) {}
  };

  stealthDefine(Navigator.prototype, 'webdriver', undefined);

  const fakePlugins = ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'];
  const pluginArray = Object.create(PluginArray.prototype);
  _defineProperty(pluginArray, 'length', { value: fakePlugins.length });
  fakePlugins.forEach((name, i) => {
    const p = Object.create(Plugin.prototype);
    _defineProperty(p, 'name', { value: name });
    _defineProperty(pluginArray, i, { value: p });
  });
  stealthDefine(Navigator.prototype, 'plugins', pluginArray);

  stealthDefine(Navigator.prototype, 'languages', ['en-US', 'en']);

  const origPermissions = window.navigator.permissions;
  if (origPermissions) {
    const origQuery = origPermissions.query.bind(origPermissions);
    stealthDefine(Permissions.prototype, 'query', function (params) {
      if (params && params.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission, onchange: null });
      }
      return origQuery(params);
    });
  }

  if (!window.chrome) {
    _defineProperty(window, 'chrome', { value: {}, configurable: true, writable: true });
  }
  if (!window.chrome.runtime) {
    _defineProperty(window.chrome, 'runtime', {
      value: {
        PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
        PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
        RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
        OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      },
      configurable: true,
    });
  }

  const origGetParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (param) {
    if (param === 37445) return 'Intel Inc.';
    if (param === 37446) return 'Intel Iris OpenGL Engine';
    return origGetParam.call(this, param);
  };
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel Iris OpenGL Engine';
      return origGetParam2.call(this, param);
    };
  }

  if (window.outerWidth === 0)  stealthDefine(window, 'outerWidth',  window.innerWidth);
  if (window.outerHeight === 0) stealthDefine(window, 'outerHeight', window.innerHeight + 85);

  if (window.screen.colorDepth !== 24) {
    stealthDefine(Screen.prototype, 'colorDepth', 24);
    stealthDefine(Screen.prototype, 'pixelDepth',  24);
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    stealthDefine(Notification, 'permission', 'denied');
  }

  const patchIframeWebdriver = (iframe) => {
    try {
      const cw = iframe.contentWindow;
      if (cw && cw.Navigator) {
        _defineProperty(cw.Navigator.prototype, 'webdriver', {
          get: () => undefined,
          configurable: true,
          enumerable: true,
        });
      }
    } catch (_) {}
  };

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'IFRAME') patchIframeWebdriver(node);
        node.querySelectorAll && node.querySelectorAll('iframe').forEach(patchIframeWebdriver);
      }
    }
  }).observe(document.documentElement, { subtree: true, childList: true });

  _defineProperty(Function.prototype, 'toString', {
    value: function () {
      if (this === WebGLRenderingContext.prototype.getParameter ||
          (typeof WebGL2RenderingContext !== 'undefined' && this === WebGL2RenderingContext.prototype.getParameter)) {
        return 'function getParameter() { [native code] }';
      }
      return 'function ' + (this.name || '') + '() { [native code] }';
    },
    writable: true,
    configurable: true,
  });
})();
`;

const MEDIA_CODECS_SCRIPT = `
(function () {
  const origCanPlayType = HTMLMediaElement.prototype.canPlayType;
  HTMLMediaElement.prototype.canPlayType = function (type) {
    if (type === 'video/webm; codecs="vp8, vorbis"') return 'probably';
    if (type === 'video/webm; codecs="vp9"')          return 'probably';
    if (type === 'audio/webm; codecs="opus"')          return 'probably';
    if (type === 'audio/ogg; codecs="vorbis"')         return 'probably';
    return origCanPlayType.call(this, type);
  };
})();
`;

const BATTERY_API_SCRIPT = `
(function () {
  if (!navigator.getBattery) return;
  const origGetBattery = navigator.getBattery.bind(navigator);
  Object.defineProperty(navigator, 'getBattery', {
    value: () => origGetBattery().then(b => {
      Object.defineProperty(b, 'charging',        { get: () => true  });
      Object.defineProperty(b, 'chargingTime',    { get: () => 0     });
      Object.defineProperty(b, 'dischargingTime', { get: () => Infinity });
      Object.defineProperty(b, 'level',           { get: () => 1.0  });
      return b;
    }),
    configurable: true,
  });
})();
`;

const TIMEZONE_SCRIPT = `
(function () {
  const origDateTimeFormat = Intl.DateTimeFormat;
  function PatchedDateTimeFormat(locales, options) {
    if (options && !options.timeZone) {
      options = { ...options, timeZone: 'America/New_York' };
    }
    return new origDateTimeFormat(locales, options);
  }
  PatchedDateTimeFormat.prototype = origDateTimeFormat.prototype;
  PatchedDateTimeFormat.supportedLocalesOf = origDateTimeFormat.supportedLocalesOf;
  try {
    Object.defineProperty(Intl, 'DateTimeFormat', { value: PatchedDateTimeFormat, configurable: true });
  } catch (_) {}
})();
`;

const HAIRLINE_FEATURE_SCRIPT = `
(function () {
  const testEl = document.createElement('div');
  testEl.style.cssText = 'border: 0.5px solid transparent';
  document.head && document.head.appendChild(testEl);
  window._crzHairlineFeature = testEl.offsetHeight === 1;
  document.head && document.head.removeChild(testEl);
})();
`;

const stealthScripts = [
  STEALTH_SCRIPT,
  MEDIA_CODECS_SCRIPT,
  BATTERY_API_SCRIPT,
  TIMEZONE_SCRIPT,
  HAIRLINE_FEATURE_SCRIPT,
];

const injectStealthScripts = async (page) => {
  for (const script of stealthScripts) {
    await page.evaluateOnNewDocument(script);
  }
};

module.exports = { injectStealthScripts, stealthScripts, STEALTH_SCRIPT };
