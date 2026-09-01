# @crxzcode/browser

Puppeteer wrapper with automation enhancements and challenge handling utilities.

## Install

```bash
npm install @crxzcode/browser
```

Requires Chromium. Set `PUPPETEER_EXECUTABLE_PATH` or pass `executablePath`.

```bash
apt-get install -y chromium
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Usage

```js
const { bypass } = require('@crxzcode/browser');

const result = await bypass('https://example.com/login', {
  headless: false,
  executablePath: '/usr/bin/chromium'
});

console.log(result.completed);
console.log(result.tokens);
console.log(result.session);

await result.browser.close();
```

## API

### bypass(url, options)

| Option | Type | Default | Description |
|---|---|---|---|
| `executablePath` | string | env `PUPPETEER_EXECUTABLE_PATH` | Chromium binary |
| `headless` | boolean | `true` | Headless mode |
| `runtimeFixMode` | string | `addBinding` | `addBinding` \| `alwaysIsolated` \| `enableDisable` \| `0` |
| `utilityWorldName` | string | `util` | Isolated world name |
| `sourceUrlMask` | string | `app.js` | Source URL mask |
| `debug` | boolean | `false` | Debug logs |
| `userAgent` | string | Chrome 124 | Custom UA |
| `viewport` | object | `{ width: 1280, height: 720 }` | Viewport |
| `timeout` | number | `60000` | Timeout ms |
| `waitAfterNav` | number | `3000` | Post-nav wait ms |
| `autoClose` | boolean | `false` | Auto close |
| `args` | array | `[]` | Extra Chromium args |

### launch(options)

```js
const { launch, newPage, deepDetect, collectTokens } = require('@crxzcode/browser');

const browser = await launch({ executablePath: '/usr/bin/chromium' });
const page = await newPage(browser);

await page.goto('https://example.com');

const detection = await deepDetect(page);
const tokens = await collectTokens(page);

await browser.close();
```

## CLI

```bash
npx @crxzcode/browser https://example.com/login
```

## Docker

```bash
docker pull ghcr.io/fidzzcodex-me/crzcode-browser:latest
docker run --rm ghcr.io/fidzzcodex-me/crzcode-browser https://example.com/login
```

## License

MIT