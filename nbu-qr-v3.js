/**
 * NBU QR Code Generator v3 — pure JavaScript port of the PHP library
 * https://github.com/opencartbot/nbu-qr-v3
 *
 * Generates QR-code payment URLs according to the National Bank of Ukraine
 * standard "format 003" (BCD service tag).
 *
 * Visual version: overlays the UAH logo (./nbu-qr-v3-main/UAH.svg) inside a
 * white circle centred on the QR code (10% of the code area). URL generation
 * is identical to the original; only the rendered image is enhanced.
 *
 * Usage (include in <head> after the `qrcode` browser build):
 *
 *   <script src="https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js"></script>
 *   <script src="nbu-qr-v3.js"></script>
 *   <script>
 *     const qr = new NBUQRCodeGenerator({
 *       recipient: 'ТОВ "Магазин"',
 *       account: 'UA123456789012345678901234567',
 *       amount: 150.75,
 *       recipient_code: '12345678',
 *       purpose: 'Оплата товарів'
 *     });
 *     const url = qr.generateURL();            // identical to original
 *     const svg = await qr.generateQRCode();    // SVG with centred logo
 *   </script>
 *
 * MIT License
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Embedded logo SVG — exact copy of ./nbu-qr-v3-main/UAH.svg
   * ------------------------------------------------------------------ */

  var LOGO_SVG = `<g transform="translate(39.6,39.6)">
      <circle cx="0" cy="0" r="12.5" fill="#ffffff"/>
      <g transform="translate(-8.5,-12.7) scale(0.065)">
        <path d="M113.31345 346.21673c-24.835001-4.06427-45.467101-15.06428-62.680226-32.56382-11.2861-12.80757-18.661134-35.25322-17.088787-52.00911.743772-7.92618 4.584014-19.23337 6.254865-22.11227.393829-.67857 2.615267-4.66777 1.849652-4.67602-6.88844-.26398-15.215986-.47303-19.112205-.53671-.67026-1.04729 3.329377-31.67345 3.657711-31.71445.346265-.04323 2.510637 0 21.770875 0h21.297879l4.316515-3.14548c2.374081-1.73001 6.059706-4.60284 8.190272-6.38406l3.873756-3.23861-29.053172-.02875-29.053171-.02875c1.188213-10.7809 2.049064-21.19187 3.320362-31.75629 0-.16931 21.800869-.30783 48.446391-.30783h48.446393l8.9405-8.81763c12.5815-12.40861 16.24125-18.54334 16.80268-28.16585.3375-5.78452-.01974-8.45563-1.50094-11.22245-9.54222-17.824558-30.32981-25.335611-61.921893-22.373869-10.942963 1.025891-20.988222 3.135347-43.937217 9.226611-4.077261 1.082217-4.163402 1.074233-8.015775 2.001111-.371508.089384.048588-5.364007.506256-10.654587 2.823569-32.640154 3.733327-40.756997 4.701921-41.950563 3.00024-1.129524 7.347337-2.155822 10.566256-2.834805 7.522425-1.237795 30.398339-4.773225 48.906622-5.559047 38.31547-1.625956 73.44087 5.21286 103.48463 29.04403 21.07792 20.793975 25.8274 52.124589 11.97817 79.015799-1.9298 4.47874-5.0182 8.29065-7.41268 12.50501 3.11184.17349 38.86788.76266 39.62873.73429l-4.02575 31.11607h-68.948l-6.84537 5.61122c-3.76495 3.08617-7.7072 7.04075-7.74599 7.48163 5.00757.03746 54.16324.91144 81.95104.55565l-3.16295 30.70687-59.24317.5344-59.24316.5344-3.96117 4.27522c-7.96854 8.60029-13.27232 17.21903-13.13397 27.34979 1.0834 18.42903 14.39169 25.94614 29.32987 29.99708 31.96471 6.50029 64.05714-1.93474 93.7788-13.10862 4.70589-1.91783 8.91875-3.13684 9.36189-2.70889-2.03412 21.81127-3.14424 36.30632-4.76806 56.02289.18756.32781-13.7884 3.09167-32.51878 6.14864-28.86728 5.58899-58.74693 5.49058-87.9896 3.03775z" />
    </g>
  </g>`;

  var LOGO_INNER_SVG = (function () {
    var inner = LOGO_SVG
      .replace(/<\?xml[^>]*\?>\s*/i, '')
      .replace(/<svg[^>]*>/i, '')
      .replace(/<\/svg>\s*/i, '');
    return inner.trim();
  })();

  /* ------------------------------------------------------------------ *
   * Logo geometry helpers
   * ------------------------------------------------------------------ */

  function logoCircleRadius(width, height, ratio) {
    var area = (ratio || 0.10) * width * height;
    return Math.sqrt(area / Math.PI);
  }

  function logoTransform(width, height, ratio) {
    var cx = width / 2;
    var cy = height / 2;
    var r = logoCircleRadius(width, height, ratio);
    var w = 270;
    var h = 380;
    var diag = Math.sqrt(w * w + h * h);
    var scale = (2 * r) / diag;
    var sw = w * scale;
    var sh = h * scale;
    return {
      cx: cx,
      cy: cy,
      r: r,
      scale: scale,
      sw: sw,
      sh: sh,
      tx: -sw / 2,
      ty: -sh / 2
    };
  }

  /* ------------------------------------------------------------------ *
   * Overlay a white circle + centred logo onto a QR-code SVG string
   * ------------------------------------------------------------------ */

  function embedLogoSVG(qrSvg, width, height, ratio) {
    var g = logoTransform(width, height, ratio);
    var group = LOGO_INNER_SVG;

    return qrSvg.replace(/<\/svg>/i, group + '</svg>');
  }

  /* ------------------------------------------------------------------ *
   * Overlay a white circle + centred logo onto a QR-code canvas (PNG)
   * ------------------------------------------------------------------ */

  function drawLogoOnCanvas(ctx, width, height, ratio, callback) {
    var g = logoTransform(width, height, ratio);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var logoDataUrl = 'data:image/svg+xml;base64,' + btoa(LOGO_SVG);
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, g.cx + g.tx, g.cy + g.ty, g.sw, g.sh);
      callback();
    };
    img.onerror = function () {
      callback();
    };
    img.src = logoDataUrl;
  }

  /**
   * QR Code Generator for the NBU standard (format version 003).
   *
   * @param {Object} [options]                 - Payment data options.
   * @param {string} [options.function='ICT']  - Payment function: UCT | ICT | XCT.
   * @param {string} [options.encoding='2']    - Encoding: '1' (UTF-8) | '2' (Win1251).
   * @param {string} [options.recipient='']    - Recipient name (max 140 chars).
   * @param {string} [options.account='']      - Recipient IBAN (UA + 27 digits).
   * @param {number|null} [options.amount=null] - Payment amount (0 – 999999999.99).
   * @param {string} [options.currency='UAH']  - Currency (only UAH supported).
   * @param {string} [options.recipient_code=''] - Recipient code (max 10 chars).
   * @param {string} [options.category='']     - Payment category (max 9 chars).
   * @param {string} [options.reference='']    - Reference / invoice id (max 35 chars).
   * @param {string} [options.purpose='']      - Payment purpose (max 420 chars).
   * @param {string} [options.display='']      - Additional display text (max 140 chars).
   * @param {string} [options.lock_mask='']    - Lock mask (4 hex chars).
   * @param {Date|string|null} [options.valid_until=null] - Expiry date/time.
   * @param {Date|string|null} [options.created_at=null]   - Creation date/time.
   * @param {string} [baseUrl]                 - Base URL for the QR endpoint.
   */
  function NBUQRCodeGenerator(options, baseUrl) {
    this.VERSION = '003';
    this.SERVICE_TAG = 'BCD';
    this.DEFAULT_BASE_URL = 'https://qr.bank.gov.ua/';
    this.MAX_DATA_SIZE = 507;

    this.FUNCTION_UCT = 'UCT';
    this.FUNCTION_ICT = 'ICT';
    this.FUNCTION_XCT = 'XCT';

    this.ENCODING_UTF8 = '1';
    this.ENCODING_WIN1251 = '2';

    this.LOGO_AREA_RATIO = 0.10;

    this.baseUrl = (baseUrl || this.DEFAULT_BASE_URL).replace(/\/+$/, '') + '/';
    this.errors = [];

    this.setOptions(options || {});
  }

  /* ------------------------------------------------------------------ *
   * Options / validation
   * ------------------------------------------------------------------ */

  NBUQRCodeGenerator.prototype.setOptions = function (options) {
    var defaults = {
      function: this.FUNCTION_ICT,
      encoding: this.ENCODING_WIN1251,
      recipient: '',
      account: '',
      amount: null,
      currency: 'UAH',
      recipient_code: '',
      category: '',
      reference: '',
      purpose: '',
      display: '',
      lock_mask: '',
      valid_until: null,
      created_at: null
    };

    this.options = Object.assign({}, defaults, options);
    this.validateOptions();
    return this;
  };

  NBUQRCodeGenerator.prototype.getOptions = function () {
    return this.options;
  };

  NBUQRCodeGenerator.prototype.getErrors = function () {
    return this.errors;
  };

  NBUQRCodeGenerator.prototype.validateOptions = function () {
    var self = this;
    var o = this.options;
    var errors = [];

    var validFunctions = [self.FUNCTION_UCT, self.FUNCTION_ICT, self.FUNCTION_XCT];
    if (validFunctions.indexOf(o.function) === -1) {
      errors.push('Invalid function');
    }

    var validEncodings = [self.ENCODING_UTF8, self.ENCODING_WIN1251];
    if (validEncodings.indexOf(o.encoding) === -1) {
      errors.push('Invalid encoding');
    }

    if (!o.recipient) {
      errors.push('Recipient is required');
    } else if (this._mbLen(o.recipient) > 140) {
      errors.push('Recipient name too long (max 140 characters)');
    }

    if (!o.account) {
      errors.push('Account is required');
    } else {
      var account = o.account.replace(/\s+/g, '');
      if (account.length !== 29) {
        errors.push('Account must be exactly 29 characters');
      } else if (!/^UA\d{27}$/.test(account)) {
        errors.push('Invalid Ukrainian IBAN format');
      }
    }

    if (o.amount !== null && o.amount !== undefined) {
      if (isNaN(o.amount) || o.amount < 0 || o.amount > 999999999.99) {
        errors.push('Amount must be between 0 and 999999999.99');
      }
      if (o.currency !== 'UAH') {
        errors.push('Only UAH currency is supported');
      }
    }

    if (!o.recipient_code) {
      errors.push('Recipient code is required');
    } else if (this._mbLen(o.recipient_code) > 10) {
      errors.push('Recipient code too long (max 10 characters)');
    }

    if (o.category && this._mbLen(o.category) > 9) {
      errors.push('Category too long (max 9 characters)');
    }

    if (o.reference && this._mbLen(o.reference) > 35) {
      errors.push('Reference too long (max 35 characters)');
    }

    if (!o.purpose) {
      errors.push('Purpose is required');
    } else if (this._mbLen(o.purpose) > 420) {
      errors.push('Purpose too long (max 420 characters)');
    }

    if (o.display && this._mbLen(o.display) > 140) {
      errors.push('Display text too long (max 140 characters)');
    }

    if (o.lock_mask && !/^[0-9A-Fa-f]{4}$/.test(o.lock_mask)) {
      errors.push('Lock mask must be 4 hex characters');
    }

    this.errors = errors;
  };

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  // Approximate mb_strlen using Array.from (handles surrogate pairs /
  // multi-byte UTF-16 code units).  For Cyrillic text this is accurate.
  NBUQRCodeGenerator.prototype._mbLen = function (str) {
    return Array.from(String(str)).length;
  };

  NBUQRCodeGenerator.prototype._formatAmount = function () {
    var amount = this.options.amount;
    if (amount === null || amount === undefined) {
      return '';
    }

    // number_format(amount, 2, '.', '') then strip trailing zeros / dot
    var formatted = amount.toFixed(2);
    formatted = formatted.replace(/\.?0+$/, '');
    if (formatted === '') {
      formatted = '0';
    }
    return this.options.currency + formatted;
  };

  // Format a Date (or date string) as "ymjHi" + "00" — e.g. 2025-09-21 12:30:45 → 250921123000
  NBUQRCodeGenerator.prototype._formatDateTime = function (dateTime) {
    if (!dateTime) {
      return '';
    }

    var d;
    if (dateTime instanceof Date) {
      d = dateTime;
    } else if (typeof dateTime === 'string') {
      d = new Date(dateTime);
    } else {
      return '';
    }

    if (isNaN(d.getTime())) {
      return '';
    }

    var yy = String(d.getFullYear()).slice(-2);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var HH = String(d.getHours()).padStart(2, '0');
    var ii = String(d.getMinutes()).padStart(2, '0');

    return yy + mm + dd + HH + ii + '00';
  };

  NBUQRCodeGenerator.prototype._buildQRData = function () {
    var o = this.options;
    var parts = [
      this.SERVICE_TAG,
      this.VERSION,
      o.encoding,
      o.function,
      '', // unique_id — RFU
      o.recipient,
      String(o.account || '').replace(/\s+/g, ''),
      this._formatAmount(),
      o.recipient_code,
      o.category,
      o.reference,
      o.purpose,
      o.display,
      o.lock_mask,
      this._formatDateTime(o.valid_until),
      this._formatDateTime(o.created_at),
      '' // signature — RFU
    ];

    return parts.join('\n');
  };

  /* ------------------------------------------------------------------ *
   * Base64 URL encoding / decoding
   * ------------------------------------------------------------------ */

  NBUQRCodeGenerator.prototype._base64UrlEncode = function (str) {
    var binary = this._toBinary(str);
    var base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  NBUQRCodeGenerator.prototype._base64UrlDecode = function (str) {
    var base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad to a multiple of 4
    while (base64.length % 4) {
      base64 += '=';
    }
    var binary = atob(base64);
    return this._fromUtf8Binary(binary);
  };

  // Convert a JS string to a UTF-8 binary string (for btoa)
  NBUQRCodeGenerator.prototype._toBinary = function (str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        out += String.fromCharCode(c);
      } else if (c < 0x800) {
        out += String.fromCharCode(0xc0 | (c >> 6));
        out += String.fromCharCode(0x80 | (c & 0x3f));
      } else {
        out += String.fromCharCode(0xe0 | (c >> 12));
        out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
        out += String.fromCharCode(0x80 | (c & 0x3f));
      }
    }
    return out;
  };

  // Convert a UTF-8 binary string back to a JS string
  NBUQRCodeGenerator.prototype._fromUtf8Binary = function (binary) {
    var out = '';
    var i = 0;
    while (i < binary.length) {
      var c = binary.charCodeAt(i);
      if (c < 0x80) {
        out += String.fromCharCode(c);
        i++;
      } else if (c >= 0xc0 && c < 0xe0) {
        out += String.fromCharCode(((c & 0x1f) << 6) | (binary.charCodeAt(i + 1) & 0x3f));
        i += 2;
      } else {
        out += String.fromCharCode(
          ((c & 0x0f) << 12) |
          ((binary.charCodeAt(i + 1) & 0x3f) << 6) |
          (binary.charCodeAt(i + 2) & 0x3f)
        );
        i += 3;
      }
    }
    return out;
  };

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */

  NBUQRCodeGenerator.prototype.generateURL = function () {
    if (this.errors.length > 0) {
      throw new Error('Validation failed: ' + this.errors.join(', '));
    }

    var qrData = this._buildQRData();
    var encodedData = this._base64UrlEncode(qrData);
    var url = this.baseUrl + encodedData;

    if (url.length > this.MAX_DATA_SIZE) {
      throw new Error('QR data size exceeds maximum allowed');
    }

    return url;
  };

  NBUQRCodeGenerator.prototype.parseURL = function (url) {
    if (url.indexOf(this.baseUrl) !== 0) {
      throw new Error('Invalid QR URL format');
    }

    var encodedData = url.substring(this.baseUrl.length);
    var decodedData = this._base64UrlDecode(encodedData);
    var parts = decodedData.split('\n');

    if (parts.length < 17) {
      throw new Error('Invalid QR data structure');
    }

    return {
      service_tag: parts[0] || '',
      version: parts[1] || '',
      encoding: parts[2] || '',
      function: parts[3] || '',
      unique_id: parts[4] || '',
      recipient: parts[5] || '',
      account: parts[6] || '',
      amount: parts[7] || '',
      recipient_code: parts[8] || '',
      category: parts[9] || '',
      reference: parts[10] || '',
      purpose: parts[11] || '',
      display: parts[12] || '',
      lock_mask: parts[13] || '',
      valid_until: parts[14] || '',
      created_at: parts[15] || '',
      signature: parts[16] || ''
    };
  };

  /**
   * Generate an SVG QR-code (with centred UAH logo) for the payment URL.
   *
   * Uses error-correction level "H" so the code stays scannable despite the
   * centred logo overlay.  Requires the `qrcode` browser build.
   *
   * @param {Object} [options] - Override options passed to QRCode.toString.
   * @returns {Promise<string>} Resolves with an SVG string.
   */
  NBUQRCodeGenerator.prototype.generateQRCode = function (options) {
    var self = this;
    var url = this.generateURL();
    var opts = Object.assign(
      {
        type: 'svg',
        errorCorrectionLevel: 'H',
        width: 256,
        height: 256,
        margin: 2
      },
      options || {}
    );

    return new Promise(function (resolve, reject) {
      if (typeof QRCode === 'undefined') {
        return reject(new Error('QRCode library is not loaded. Include qrcode before using this method.'));
      }
      try {
        QRCode.toString(url, opts, function (err, svg) {
          if (err) {
            return reject(err);
          }
          const width = opts.width;
          const height = opts.height;
          resolve(embedLogoSVG(svg, width, height, self.LOGO_AREA_RATIO));
        });
      } catch (e) {
        // Some builds of qrcode return synchronously when no callback is given
        try {
          var result = QRCode.toString(url, opts);
          resolve(embedLogoSVG(result, width, height, self.LOGO_AREA_RATIO));
        } catch (e2) {
          reject(e2);
        }
      }
    });
  };

  /**
   * Generate a PNG QR-code as a binary string (with centred UAH logo).
   *
   * Uses error-correction level "H" so the code stays scannable despite the
   * centred logo overlay.  Requires the `qrcode` browser build and a Canvas.
   *
   * @param {Object} [options] - Override options passed to QRCode.toDataURL.
   * @returns {Promise<string>} Resolves with a binary string (use with CanvasImageSource).
   */
  NBUQRCodeGenerator.prototype.generateQRCodePNG = function (options) {
    var self = this;
    var url = this.generateURL();
    var opts = Object.assign(
      {
        type: 'png',
        errorCorrectionLevel: 'H',
        width: 256,
        height: 256,
        margin: 2
      },
      options || {}
    );

    var width = typeof opts.width === 'number' ? opts.width : 256;
    var height = typeof opts.height === 'number' ? opts.height : 256;

    return new Promise(function (resolve, reject) {
      if (typeof QRCode === 'undefined') {
        return reject(new Error('QRCode library is not loaded. Include qrcode before using this method.'));
      }
      try {
        QRCode.toDataURL(url, opts, function (err, dataUrl) {
          if (err) {
            return reject(err);
          }
          self._overlayLogoOntoPNG(dataUrl, width, height).then(function (finalUrl) {
            var base64 = finalUrl.replace(/^data:image\/[^;]+;base64,/, '');
            resolve(self._base64ToBinary(base64));
          }, reject);
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  /**
   * Generate a QR-code as a data URI (base64 PNG, with centred UAH logo).
   *
   * Uses error-correction level "H" so the code stays scannable despite the
   * centred logo overlay.  Requires the `qrcode` browser build and a Canvas.
   *
   * @param {Object} [options] - Override options passed to QRCode.toDataURL.
   * @returns {Promise<string>} Resolves with a data URI string.
   */
  NBUQRCodeGenerator.prototype.generateQRCodeDataURI = function (options) {
    var self = this;
    var url = this.generateURL();
    var opts = Object.assign(
      {
        type: 'png',
        errorCorrectionLevel: 'H',
        width: 256,
        height: 256,
        margin: 2
      },
      options || {}
    );

    var width = typeof opts.width === 'number' ? opts.width : 256;
    var height = typeof opts.height === 'number' ? opts.height : 256;

    return new Promise(function (resolve, reject) {
      if (typeof QRCode === 'undefined') {
        return reject(new Error('QRCode library is not loaded. Include qrcode before using this method.'));
      }
      try {
        QRCode.toDataURL(url, opts, function (err, dataUrl) {
          if (err) {
            return reject(err);
          }
          self._overlayLogoOntoPNG(dataUrl, width, height).then(resolve, reject);
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  /**
   * Draw the QR PNG onto a canvas together with a white circle and the
   * centred UAH logo.  Falls back to the original data URL when Canvas or the
   * logo image is unavailable, so functionality is never broken.
   */
  NBUQRCodeGenerator.prototype._overlayLogoOntoPNG = function (qrDataUrl, width, height) {
    var self = this;
    return new Promise(function (resolve) {
      if (typeof document === 'undefined' || typeof Image === 'undefined' || !document.createElement) {
        return resolve(qrDataUrl);
      }

      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        drawLogoOnCanvas(ctx, width, height, self.LOGO_AREA_RATIO, function () {
          resolve(canvas.toDataURL('image/png'));
        });
      };
      img.onerror = function () {
        resolve(qrDataUrl);
      };
      img.src = qrDataUrl;
    });
  };

  NBUQRCodeGenerator.prototype._base64ToBinary = function (base64) {
    var binary = atob(base64);
    var out = '';
    for (var i = 0; i < binary.length; i++) {
      out += String.fromCharCode(binary.charCodeAt(i) & 0xff);
    }
    return out;
  };

  /* ------------------------------------------------------------------ *
   * Export
   * ------------------------------------------------------------------ */

  // Browser global
  if (typeof window !== 'undefined') {
    window.NBUQRCodeGenerator = NBUQRCodeGenerator;
  }

  // CommonJS (Node.js / bundlers)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NBUQRCodeGenerator;
  }

})(typeof window !== 'undefined' ? window : global);
