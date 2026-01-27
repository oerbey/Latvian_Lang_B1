# Security Considerations

**Date:** January 20, 2026  
**Category:** Security

---

## 🔍 Current Security Posture

| Aspect          | Status                             |
| --------------- | ---------------------------------- |
| CSP             | Implemented (with `unsafe-inline`) |
| XSS Prevention  | Partial (safeHtml.js exists)       |
| Data Validation | Minimal                            |
| Dependencies    | Few, audited                       |
| Secrets         | None (client-side only)            |

---

## 🔴 Critical Issues

### 1. CSP Allows `unsafe-inline`

**Location:** `index.html:7`

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' https: 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; ..."
/>
```

**Problem:** `'unsafe-inline'` defeats much of CSP's XSS protection

**Current necessity:** Inline scripts in HTML files

- Footer year calculation
- Game card generation
- Inline event handlers

**Recommendation:**

1. Move inline scripts to external files
2. Use nonce-based CSP:

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-{{nonce}}'" />
<script nonce="{{nonce}}" src="scripts/inline-init.js"></script>
```

3. Generate nonces during build or use strict-dynamic:

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'strict-dynamic' 'nonce-abc123'" />
```

---

## 🟠 High Priority Issues

### 2. setTrustedHTML Usage

**Location:** `src/lib/safeHtml.js`, used in `app.js:77`

```javascript
setTrustedHTML(mustId('legend'), i18n.labels.legend);
```

**Problem:** Function name suggests it trusts the input, but source is user-controlled (i18n files)

**Current implementation:** Unknown (need to verify it sanitizes)

**Recommendation:**

- Verify `setTrustedHTML` uses DOMPurify or equivalent
- Add JSDoc indicating trust boundary
- Consider using template literals with text-only insertion:

```javascript
// Safer: text-only insertion
element.textContent = i18n.labels.legend;

// If HTML needed, use sanitizer
element.innerHTML = DOMPurify.sanitize(i18n.labels.legend);
```

### 3. No Input Sanitization on User Answers

**Locations:** Multiple game inputs

```javascript
// duty-dispatcher, maini-vai-mainies, etc.
const answer = normalizeAnswer(input.value);
```

**Problem:** While `normalizeAnswer` processes input, it doesn't sanitize for storage/display

**Attack vector:** If user input is ever reflected in UI (e.g., "You typed: X"), XSS possible

**Recommendation:**

```javascript
function sanitizeUserInput(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(
      /[<>'"&]/g,
      (char) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
          '&': '&amp;',
        })[char],
    )
    .slice(0, 1000); // Length limit
}
```

---

## 🟡 Medium Priority Issues

### 4. LocalStorage Data Trust

**Problem:** Data from localStorage is trusted without validation

**Location:** `src/lib/storage.js:65-77`

```javascript
export function loadJSON(key, fallback, validate) {
  // ...
  const parsed = JSON.parse(raw);
  if (typeof validate === 'function' && !validate(parsed)) return fallback;
  return parsed ?? fallback;
}
```

**Good:** Validation function parameter exists
**Bad:** Not consistently used across games

**Recommendation:** Enforce validation for all game progress:

```javascript
// Centralized progress validation
const progressSchema = {
  xp: (v) => typeof v === 'number' && v >= 0,
  streak: (v) => typeof v === 'number' && v >= 0,
  lastPlayedISO: (v) => v === null || typeof v === 'string',
};

function validateProgress(data) {
  if (!data || typeof data !== 'object') return false;
  return Object.entries(progressSchema).every(
    ([key, validator]) => !(key in data) || validator(data[key]),
  );
}

// Usage
const progress = loadJSON(STORAGE_KEY, defaultProgress, validateProgress);
```

### 5. External CDN Integrity

**Location:** `index.html:15-17`

```html
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
  rel="stylesheet"
  integrity="sha384-..."
  crossorigin="anonymous"
/>
```

**Good:** SRI (Subresource Integrity) is used
**Verify:** Ensure all external resources have valid integrity hashes

**Audit checklist:**

- [ ] Bootstrap CSS: Has integrity ✓
- [ ] Bootstrap Icons: Has integrity ✓
- [ ] Bootstrap JS: Has integrity ✓

---

## 🟢 Low Priority Issues

### 6. Service Worker Scope

**Location:** `sw.js`

**Observation:** Service worker has broad scope, caching all assets

**Recommendation:** Review cached content for sensitive data:

```javascript
// sw.js - avoid caching dynamic/sensitive data
const CACHE_EXCLUDE = [
  '/api/', // If any API calls exist
  '/.env', // Never cache env files
];

if (CACHE_EXCLUDE.some((path) => url.pathname.startsWith(path))) {
  return;
}
```

### 7. Error Message Information Disclosure

**Location:** `src/lib/errors.js`

**Observation:** Error overlay shows stack traces

```javascript
const details = doc.createElement('details');
// Shows full error.stack
```

**Recommendation:** In production, limit error details:

```javascript
const isProduction = location.hostname !== 'localhost';

if (!isProduction) {
  // Show full stack trace
} else {
  // Show generic error message
}
```

---

## 🔒 Security Checklist

| Check              | Status     | Notes                                      |
| ------------------ | ---------- | ------------------------------------------ |
| CSP implemented    | ⚠️ Partial | Has `unsafe-inline`                        |
| XSS prevention     | ⚠️ Partial | safeHtml exists, not always used           |
| SRI for CDN        | ✅ Yes     | Bootstrap resources verified               |
| Input validation   | ⚠️ Partial | Normalization exists, sanitization missing |
| Storage validation | ⚠️ Partial | Validate function available, not enforced  |
| HTTPS only         | ✅ Yes     | GitHub Pages enforces                      |
| No secrets in code | ✅ Yes     | Client-side only                           |
| Dependency audit   | ✅ Good    | Minimal dependencies                       |

---

## 🛡️ Recommended Security Headers

For server configuration or meta tags:

```html
<!-- Additional security headers -->
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="X-Frame-Options" content="DENY" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()" />
```

Ideal CSP (after removing inline scripts):

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net;
  style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
  img-src 'self' data:;
  font-src 'self' https://cdnjs.cloudflare.com;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
"
/>
```

---

## 📎 Related Documents

- [Quick Wins](./13-quick-wins.md) — Low-effort security improvements
