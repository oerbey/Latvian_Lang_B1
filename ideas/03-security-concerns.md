# Security Concerns — Latvian_Lang_B1

This document identifies security vulnerabilities and provides remediation recommendations.

---

## Issue: Unsafe JSON Parsing from localStorage

**Priority**: High  
**Category**: Security, Input Validation  
**Effort**: Small

### Current State

Multiple files parse JSON from localStorage without validation:

```javascript
// duty-dispatcher/index.js
function readProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // ... uses parsed data
  } catch (err) {
    return null;
  }
}

// endings-builder/index.js
function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw); // No validation
  } catch (_) {
    return {};
  }
}
```

### Problem

- Malicious or corrupted localStorage data could cause unexpected behavior
- Prototype pollution attacks possible if object properties aren't validated
- No schema validation for expected structure
- Silent failures hide data corruption

### Recommendation

Implement safe JSON parsing with schema validation:

```javascript
// src/lib/storage/safe-parse.js
export function safeJsonParse(str, defaultValue = null) {
  if (typeof str !== 'string') return defaultValue;

  try {
    const parsed = JSON.parse(str);

    // Protect against prototype pollution
    if (parsed !== null && typeof parsed === 'object') {
      if ('__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed) {
        console.warn('Potential prototype pollution attempt detected');
        return defaultValue;
      }
    }

    return parsed;
  } catch (e) {
    console.warn('Failed to parse JSON:', e.message);
    return defaultValue;
  }
}

// Schema-based validation
export function validateProgress(data) {
  const schema = {
    xp: { type: 'number', min: 0, default: 0 },
    streak: { type: 'number', min: 0, default: 0 },
    lastPlayedISO: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}/, optional: true },
  };

  if (!data || typeof data !== 'object') {
    return getDefaults(schema);
  }

  const result = {};
  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];

    if (value === undefined) {
      result[key] = rules.default;
      continue;
    }

    if (typeof value !== rules.type) {
      result[key] = rules.default;
      continue;
    }

    if (rules.min !== undefined && value < rules.min) {
      result[key] = rules.min;
      continue;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      result[key] = rules.default;
      continue;
    }

    result[key] = value;
  }

  return result;
}

// Usage
function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse(raw, {});
  return validateProgress(parsed);
}
```

### Impact

- Protection against prototype pollution
- Validated data structure
- Graceful handling of corrupted data
- Better debugging with warnings

---

## Issue: Missing Content Security Policy

**Priority**: Medium  
**Category**: Security, XSS Prevention  
**Effort**: Small

### Current State

No Content Security Policy (CSP) headers or meta tags observed in the HTML files.

```html
<!-- week1.html - No CSP -->
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <!-- Missing: Content-Security-Policy meta tag -->
</head>
```

### Problem

- Vulnerable to XSS attacks
- No protection against inline script injection
- External scripts from CDN could be compromised

### Recommendation

Add CSP meta tag to HTML files:

```html
<head>
  <meta charset="utf-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
    font-src 'self' https://cdnjs.cloudflare.com;
    img-src 'self' data: blob:;
    connect-src 'self' https://api.github.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
  "
  />
</head>
```

**Note about GitHub Pages:** GitHub Pages does **not** support Netlify-style `_headers` files for setting response headers.

✅ On GitHub Pages you can still use the CSP **meta tag** shown above.

If you need **real security headers** (`X-Content-Type-Options`, `X-Frame-Options`, strict `Referrer-Policy`, etc.), deploy via a host/proxy that lets you configure them (e.g., Netlify, Cloudflare, a custom server), then add those headers at the platform level.

### Impact

- Protection against XSS attacks
- Limits damage from compromised CDN
- Industry best practice compliance
- Reduced attack surface

---

## Issue: External CDN Dependencies Without Integrity Checks

**Priority**: High  
**Category**: Security, Supply Chain  
**Effort**: Small

### Current State

External scripts and stylesheets are loaded without Subresource Integrity (SRI):

```html
<!-- week1.html -->
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
  rel="stylesheet"
/>
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.13.1/font/bootstrap-icons.min.css"
  rel="stylesheet"
/>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
```

### Problem

- If CDN is compromised, malicious code could be injected
- No verification that received files match expected content
- Supply chain attack vector

### Recommendation

Add SRI hashes to all external resources:

```html
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
  rel="stylesheet"
  integrity="sha384-..."
  crossorigin="anonymous"
/>

<link
  href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.13.1/font/bootstrap-icons.min.css"
  rel="stylesheet"
  integrity="sha384-..."
  crossorigin="anonymous"
/>

<script
  src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

Generate SRI hashes using:

```bash
curl -s https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css | openssl dgst -sha384 -binary | openssl base64 -A
```

Or use https://www.srihash.org/

### Impact

- Protection against CDN compromises
- Guaranteed file integrity
- Browser blocks modified files
- Industry security best practice

---

## Issue: Potential XSS in Dynamic Content

**Priority**: Medium  
**Category**: Security, XSS  
**Effort**: Medium

### Current State

Some code uses `innerHTML` with content that could contain user or data-driven content:

```javascript
// app.js
document.getElementById('legend').innerHTML = i18n.labels.legend;

// duty-dispatcher/index.js
function formatScore(value) {
  return `${state.strings.scoreLabel ?? 'Score'}: ${value}`;
}
// Later used with textContent (safe)

// travel-tracker/index.js
selectors.progress.innerHTML = `${label} <strong>${current}/${total}</strong>`;
```

### Problem

- If i18n strings are compromised, XSS is possible
- Future changes might introduce user input into these paths
- innerHTML should be avoided when possible

### Recommendation

Create safe HTML rendering utilities:

```javascript
// src/lib/safe-html.js

// Escape HTML special characters
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Safe template literal tag
export function html(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const value = values[i - 1];
    const escaped = typeof value === 'string' ? escapeHtml(value) : value;
    return result + escaped + str;
  });
}

// Usage
import { html, escapeHtml } from './safe-html.js';

// Safe: values are escaped
element.innerHTML = html`<strong>${current}</strong> / ${total}`;

// For i18n with known safe HTML, use explicit marker
const SAFE_I18N_KEYS = ['labels.legend', 'help.lines'];

function setI18nHtml(element, key, value) {
  if (SAFE_I18N_KEYS.includes(key)) {
    element.innerHTML = value;
  } else {
    element.textContent = value;
  }
}
```

### Impact

- XSS protection for dynamic content
- Safe by default approach
- Explicit opt-in for HTML content
- Future-proofed against i18n attacks

---

## Issue: No Rate Limiting on Analytics Events

**Priority**: Low  
**Category**: Security, Abuse Prevention  
**Effort**: Small

### Current State

Analytics events are dispatched without throttling:

```javascript
// duty-dispatcher/index.js
function dispatchAnalytics(event, meta = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent('llb1:track', {
        detail: { game: GAME_NAME, event, meta },
      }),
    );
  } catch (err) {
    console.warn('Analytics dispatch failed', err);
  }
}
```

### Problem

- Could be abused to flood analytics
- No protection against automated event generation
- May impact performance with rapid events

### Recommendation

Add throttling/debouncing:

```javascript
// src/lib/analytics.js
const eventTimestamps = new Map();
const THROTTLE_MS = 1000;
const MAX_EVENTS_PER_MINUTE = 60;

let eventCount = 0;
let countResetTime = Date.now();

export function trackEvent(game, event, meta = {}) {
  const now = Date.now();

  // Reset counter every minute
  if (now - countResetTime > 60000) {
    eventCount = 0;
    countResetTime = now;
  }

  // Rate limit
  if (eventCount >= MAX_EVENTS_PER_MINUTE) {
    console.warn('Analytics rate limit exceeded');
    return false;
  }

  // Throttle duplicate events
  const eventKey = `${game}:${event}`;
  const lastTime = eventTimestamps.get(eventKey) || 0;

  if (now - lastTime < THROTTLE_MS) {
    return false;
  }

  eventTimestamps.set(eventKey, now);
  eventCount++;

  try {
    window.dispatchEvent(
      new CustomEvent('llb1:track', {
        detail: { game, event, meta, timestamp: now },
      }),
    );
    return true;
  } catch (err) {
    console.warn('Analytics dispatch failed', err);
    return false;
  }
}
```

### Impact

- Prevention of analytics abuse
- Better performance
- Reduced noise in analytics data
- Protection against automated attacks

---

## Issue: localStorage Data Not Encrypted

**Priority**: Low  
**Category**: Security, Data Protection  
**Effort**: Medium

### Current State

Progress data is stored in plain text in localStorage:

```javascript
localStorage.setItem(
  STORAGE_KEY,
  JSON.stringify({
    xp: state.score,
    streak: state.streak,
    lastPlayedISO: new Date().toISOString(),
  }),
);
```

### Problem

- Data is readable by any script on the same origin
- Browser extensions could access data
- No protection if browser profile is shared

### Context

For a language learning app, this is **low priority** because:

- No sensitive personal data is stored
- Only game progress (scores, streaks)
- Privacy impact is minimal

### Recommendation (Optional)

If future features store more sensitive data:

```javascript
// src/lib/storage/encrypted-storage.js
import { encrypt, decrypt } from './crypto.js';

const STORAGE_PREFIX = 'llb1:enc:';

export async function setSecure(key, value) {
  const serialized = JSON.stringify(value);
  const encrypted = await encrypt(serialized);
  localStorage.setItem(STORAGE_PREFIX + key, encrypted);
}

export async function getSecure(key, defaultValue = null) {
  const encrypted = localStorage.getItem(STORAGE_PREFIX + key);
  if (!encrypted) return defaultValue;

  try {
    const decrypted = await decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (e) {
    console.warn('Failed to decrypt storage:', e);
    return defaultValue;
  }
}
```

### Impact

- Protection for sensitive data
- Defense in depth
- Only needed for future sensitive features

---

## Issue: Missing Security Headers Documentation

**Priority**: Low  
**Category**: Security, Documentation  
**Effort**: Small

### Current State

No documentation on recommended security headers for deployment.

### Recommendation

Create `docs/security-headers.md`:

```markdown
# Security Headers for Deployment

When deploying Latvian_Lang_B1, configure these security headers:

## Recommended Headers

### Netlify / Cloudflare (\_headers file)

GitHub Pages does **not** support `_headers`. Use a CSP meta tag on GitHub Pages, or deploy behind Netlify/Cloudflare to set real headers.
```

/\*
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: blob:

````

### Vercel (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
````

### Apache (.htaccess)

```
Header set X-Frame-Options "DENY"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

```

### Impact
- Clear guidance for deployers
- Consistent security across deployments
- Reduced misconfiguration risk

---

## OWASP Top 10 Checklist

| Risk | Status | Notes |
|------|--------|-------|
| A01 Broken Access Control | ✅ N/A | No authentication/authorization |
| A02 Cryptographic Failures | ✅ Low | No sensitive data stored |
| A03 Injection | ⚠️ Medium | innerHTML usage needs review |
| A04 Insecure Design | ✅ Good | Client-only, minimal attack surface |
| A05 Security Misconfiguration | ⚠️ Medium | Missing CSP, SRI |
| A06 Vulnerable Components | ⚠️ Check | Verify Bootstrap version |
| A07 Auth Failures | ✅ N/A | No authentication |
| A08 Data Integrity Failures | ⚠️ Medium | Missing SRI on CDN resources |
| A09 Logging Failures | ✅ N/A | Client-side only |
| A10 SSRF | ✅ N/A | No server-side code |

---

## Summary Table

| Issue | Priority | Effort | OWASP |
|-------|----------|--------|-------|
| Unsafe JSON Parsing | High | Small | A03 |
| Missing CSP | Medium | Small | A05 |
| No SRI on CDN | High | Small | A08 |
| XSS in innerHTML | Medium | Medium | A03 |
| No Analytics Rate Limiting | Low | Small | - |
| Unencrypted localStorage | Low | Medium | A02 |
| Missing Security Docs | Low | Small | A05 |
```
