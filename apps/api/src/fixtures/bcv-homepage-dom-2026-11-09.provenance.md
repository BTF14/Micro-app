# BCV homepage DOM capture — provenance

- Source URL: https://www.bcv.org.ve/
- Capture date: 2026-11-09 (America/Caracas)
- Page title: Banco Central de Venezuela |
- Document URL: https://www.bcv.org.ve/
- Browser result: `Page loaded successfully` (the automation did not expose a numeric HTTP status or response headers)
- Capture method: browser `document.documentElement.outerHTML` after page load.
- Original DOM serialization UTF-8 byte length: 93797.
- Original DOM serialization SHA-256: `97fe86647e11fae932c8f4495524ba0a7ed0a756bea85576079f63ec5333feb9`.
- Stored fixture: `apps/api/src/fixtures/bcv-homepage-dom-2026-11-09.html`; SHA-256 after redaction: `a10241b7fab8349aab1e8ba51faacc6501e7af6203cbd391fffd0264de33d36e`.
- Redactions: public Drupal search form `form_build_id` and `form_token` values; ephemeral `blob:` image URL. No rate/date text was changed.
- Parser oracle: USD `897.53830000`, effective date `2026-11-09`.

## Evidence limitations

This is a full browser DOM serialization, not the byte-for-byte original HTTP response body. The browser may have normalized or mutated the DOM, and the tool did not expose response headers or a numeric HTTP status. It is suitable as a reproducible parser regression input for the observed markup, but it does **not** replace a raw-response capture with HTTP status, content-type, capture timestamp and SHA-256. It is a historical test fixture only, never a live rate source.
