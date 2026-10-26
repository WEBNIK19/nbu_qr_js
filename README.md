# NBU QR Code Generator v3

[![npm version](https://badge.fury.io/js/nbu-qr-v3.svg)](https://www.npmjs.com/package/nbu-qr-v3)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Pure JavaScript](https://img.shields.io/badge/js-pure-brightgreen.svg)]

Pure JavaScript port of the PHP library for generating **QR-code payment URLs according to the National Bank of Ukraine (NBU) standard "format 003" (BCD service tag)**. Optionally renders a QR code image with a centred UAH logo overlay inside a white circle.

The URL generation is identical to the original; only the rendered image is enhanced with the logo.

## Features

* Generates NBU format-003 payment QR URLs (`https://qr.bank.gov.ua/...`)
* Parses existing NBU QR URLs back into payment fields
* Pure ES5 JavaScript — no build step, no dependencies for URL generation
* Optional QR code image generation (SVG or PNG/data URI) with centred UAH logo overlay via [`qrcode`](https://www.npmjs.com/package/qrcode)
* Browser global (`window.NBUQRCodeGenerator`) and CommonJS/ESM module export
* Validation of all payment fields (recipient, IBAN account, amount, recipient code, purpose, etc.)

## Install

### npm / bundler / Node

```bash
npm install nbu-qr-v3
```

```js
// CommonJS
const NBUQRCodeGenerator = require('nbu-qr-v3');

// ESM
import NBUQRCodeGenerator from 'nbu-qr-v3';
```

### Browser (standalone)

Include the `qrcode` browser build first (required only for image generation), then the library:

```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js"></script>
<script src="nbu-qr-v3.js"></script>
<script>
  const qr = new NBUQRCodeGenerator({
    recipient: 'ТОВ "Магазин"',
    account: 'UA123456789012345678901234567',
    amount: 150.75,
    recipient_code: '12345678',
    purpose: 'Оплата товарів'
  });
  const url = qr.generateURL(); // identical to the original PHP library
</script>
```

`nbu-qr-v3.js` is also available on unpkg/jsDelivr:

```html
<script src="https://unpkg.com/nbu-qr-v3@1/nbu-qr-v3.js"></script>
```

## Quick start

```js
const NBUQRCodeGenerator = require('nbu-qr-v3');

const qr = new NBUQRCodeGenerator({
  function: 'ICT',
  encoding: '2',           // Win1251
  recipient: 'ТОВ "Магазин"',
  account: 'UA123456789012345678901234567',
  amount: 150.75,
  currency: 'UAH',
  recipient_code: '12345678',
  category: '9',
  reference: 'INV-001',
  purpose: 'Оплата товарів',
  display: 'Оплата за рахунком',
  lock_mask: '',
  valid_until: new Date('2025-09-21T12:30:00'),
  created_at: new Date()
});

const url = qr.generateURL();
// https://qr.bank.gov.ua/Q0NCIDAwMyAyIElDVC...
```

## API

### `new NBUQRCodeGenerator([options], [baseUrl])`

Creates a generator instance. `options` may be an object with the fields below; `baseUrl` defaults to `https://qr.bank.gov.ua/`.

Returns `this` (chainable). Validation errors are collected in `getErrors()`.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `function` | `'UCT' \| 'ICT' \| 'XCT'` | `'ICT'` | Payment function |
| `encoding` | `'1' \| '2'` | `'2'` | `'1'` UTF-8, `'2'` Win1251 |
| `recipient` | string | `''` | Recipient name (max 140 chars, required) |
| `account` | string | `''` | UA IBAN `UA` + 27 digits, exactly 29 chars (required) |
| `amount` | number\|null | `null` | Amount 0–999999999.99 |
| `currency` | string | `'UAH'` | Only UAH supported |
| `recipient_code` | string | `''` | Recipient code (max 10 chars, required) |
| `category` | string | `''` | Payment category (max 9 chars) |
| `reference` | string | `''` | Reference / invoice id (max 35 chars) |
| `purpose` | string | `''` | Payment purpose (max 420 chars, required) |
| `display` | string | `''` | Additional display text (max 140 chars) |
| `lock_mask` | string | `''` | 4 hex characters |
| `valid_until` | Date\|string\|null | `null` | Expiry date/time |
| `created_at` | Date\|string\|null | `null` | Creation date/time |

### Instance methods

#### `setOptions(options)` → `this`
Replace/merge options and re-validate. Returns `this`.

#### `getOptions()` → `Object`
Returns the current options object.

#### `getErrors()` → `string[]`
Returns validation errors collected by the last `setOptions()`/`generateURL()` call.

#### `generateURL()` → `string`
Builds and returns the NBU QR payment URL. Throws if validation fails or the URL exceeds 507 chars.

#### `parseURL(url)` → `Object`
Parses an NBU QR URL back into its payment fields (`service_tag`, `version`, `encoding`, `function`, `unique_id`, `recipient`, `account`, `amount`, `recipient_code`, `category`, `reference`, `purpose`, `display`, `lock_mask`, `valid_until`, `created_at`, `signature`). Throws if the URL is invalid.

#### `generateQRCode([options])` → `Promise<string>`
Generates an SVG QR code (error-correction level `H`) with a centred UAH logo. Requires the [`qrcode`](https://www.npmjs.com/package/qrcode) browser build to be loaded (`QRCode` global).

```js
qr.generateQRCode({ width: 512, margin: 2 }).then(svg => {
  document.getElementById('qr').innerHTML = svg;
});
```

#### `generateQRCodePNG([options])` → `Promise<string>`
Generates a PNG QR code with logo overlay and resolves with a **binary string** (use with `CanvasImageSource`). Requires `qrcode` + Canvas.

#### `generateQRCodeDataURI([options])` → `Promise<string>`
Generates a base64 data URI PNG QR code with logo overlay.

### Static properties

| Property | Value |
|---|---|
| `NBUQRCodeGenerator.VERSION` | `'003'` |
| `NBUQRCodeGenerator.SERVICE_TAG` | `'BCD'` |
| `NBUQRCodeGenerator.DEFAULT_BASE_URL` | `'https://qr.bank.gov.ua/'` |
| `NBUQRCodeGenerator.MAX_DATA_SIZE` | `507` |
| `NBUQRCodeGenerator.FUNCTION_UCT` | `'UCT'` |
| `NBUQRCodeGenerator.FUNCTION_ICT` | `'ICT'` |
| `NBUQRCodeGenerator.FUNCTION_XCT` | `'XCT'` |
| `NBUQRCodeGenerator.ENCODING_UTF8` | `'1'` |
| `NBUQRCodeGenerator.ENCODING_WIN1251` | `'2'` |

## Example — full browser page

See `nbu-qr-test.html` for a complete working demo with a form, URL output, SVG rendering, copy/download buttons, and validation display.

## Validation rules

* `function` must be `UCT`, `ICT`, or `XCT`
* `encoding` must be `1` or `2`
* `recipient` required, max 140 chars
* `account` required, exactly 29 chars matching `^UA\d{27}$`
* `amount` (if given) between 0 and 999999999.99; currency must be `UAH`
* `recipient_code` required, max 10 chars
* `category` max 9 chars, `reference` max 35 chars
* `purpose` required, max 420 chars
* `display` max 140 chars
* `lock_mask` must be 4 hex chars if given

## Browser & Node support

URL generation/parsing works in any ES5 environment. Image generation (`generateQRCode`/PNG) requires a browser with `btoa`/`atob`, `Image`, `Canvas`, and the `qrcode` library loaded. In Node.js, image methods are not supported unless a DOM shim (e.g. JSDOM + canvas) is provided; URL methods work in Node 16+.

## Dependencies

* URL generation/parsing: **none**
* QR code image generation: [`qrcode`](https://www.npmjs.com/package/qrcode) (peer/browser build, loaded separately)

## License

MIT — see [LICENSE](LICENSE).

## See also

* Original PHP library: https://github.com/opencartbot/nbu-qr-v3
* NBU QR standard documentation: https://bank.gov.ua
