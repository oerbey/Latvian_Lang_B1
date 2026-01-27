# Internationalization (i18n) Improvements

**Date:** January 20, 2026  
**Category:** Localization & Language Support

---

## 🔍 Current i18n Architecture

| Aspect                 | Status                    |
| ---------------------- | ------------------------- |
| Languages Supported    | LV, EN, RU                |
| Translation Files      | Per-game JSON files       |
| Runtime Loading        | Dynamic fetch             |
| Fallback Chain         | User lang → EN → Embedded |
| RTL Support            | Not applicable            |
| Pluralization          | Not implemented           |
| Date/Number Formatting | Inconsistent              |

---

## 🟠 High Priority Issues

### 1. i18n Loading Race Condition

**Problem:** UI may render before translations load

**Location:** Multiple game entry points

**Current pattern:**

```javascript
let strings = await loadStrings();
applyStrings();
```

**Issue:** If HTML has hardcoded text, it flashes before translation applies

**Recommendation:**

1. Hide content until translations load:

```javascript
document.body.classList.add('i18n-loading');

async function init() {
  const strings = await loadStrings();
  applyStrings(strings);
  document.body.classList.remove('i18n-loading');
}
```

```css
.i18n-loading [data-i18n-key] {
  visibility: hidden;
}
```

2. Use server-side rendering or build-time translation for initial HTML

### 2. Inconsistent Translation Key Patterns

**Problem:** Different naming conventions across files

**Examples:**

```javascript
// Some use dot notation
i18n.buttons.modeMatch;
i18n.labels.loading;

// Some use flat keys
strings.title;
strings.check;

// Some use nested paths
getTranslation('tenseOptions.present');
```

**Recommendation:** Standardize on dot-notation with namespace:

```json
{
  "common": {
    "buttons": {
      "check": "Check",
      "next": "Next",
      "start": "Start"
    },
    "labels": {
      "score": "Score",
      "streak": "Streak"
    }
  },
  "games": {
    "travelTracker": {
      "title": "Travel Tracker"
    }
  }
}
```

---

## 🟡 Medium Priority Issues

### 3. Duplicate Translation Files

**Problem:** Game-specific translations duplicated across files

**Current structure:**

```
i18n/
├── en.json              # Main app
├── lv.json
├── ru.json
├── passive-lab.en.json  # Game-specific
├── passive-lab.lv.json
├── travel-tracker.en.json
├── travel-tracker.lv.json
└── ...
```

**Issue:** Common strings repeated in each game file

**Recommendation:** Merge into single file per language with namespacing:

```
i18n/
├── en.json    # All English strings
├── lv.json    # All Latvian strings
└── ru.json    # All Russian strings
```

```json
// en.json
{
  "meta": { "language": "English", "code": "en" },
  "common": {
    /* shared strings */
  },
  "index": {
    /* home page */
  },
  "travelTracker": {
    /* game-specific */
  },
  "passiveLab": {
    /* game-specific */
  }
}
```

### 4. Missing Translation Coverage

**Problem:** Some games may have incomplete translations

**Recommendation:** Add translation validation script:

```javascript
// scripts/validate-i18n.mjs
import { readFileSync, readdirSync } from 'fs';

const BASE_LANG = 'en';
const baseFile = JSON.parse(readFileSync(`i18n/${BASE_LANG}.json`));
const baseKeys = getAllKeys(baseFile);

for (const file of readdirSync('i18n').filter((f) => f.endsWith('.json'))) {
  if (file === `${BASE_LANG}.json`) continue;

  const translated = JSON.parse(readFileSync(`i18n/${file}`));
  const translatedKeys = getAllKeys(translated);

  const missing = baseKeys.filter((k) => !translatedKeys.includes(k));
  const extra = translatedKeys.filter((k) => !baseKeys.includes(k));

  if (missing.length || extra.length) {
    console.log(`\n${file}:`);
    if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
    if (extra.length) console.log(`  Extra: ${extra.join(', ')}`);
  }
}
```

### 5. No Pluralization Support

**Problem:** Count-dependent strings are awkward

**Current:**

```javascript
`${count} item${count !== 1 ? 's' : ''}`;
```

**Recommendation:** Use Intl.PluralRules:

```javascript
function pluralize(count, forms) {
  const rules = new Intl.PluralRules(currentLang);
  const category = rules.select(count);
  return forms[category] || forms.other;
}

// Usage
const message = pluralize(count, {
  one: '1 item',
  other: `${count} items`,
});

// Latvian example
const lvMessage = pluralize(count, {
  one: '1 vārds',
  other: `${count} vārdi`,
});
```

### 6. Date/Time Formatting Inconsistencies

**Problem:** Dates formatted inconsistently

**Locations:**

- `decl6-detective/index.js:102` — `formatLastPlayed()`
- `passive-lab/index.js:114` — `formatLastPlayed()`

**Current:**

```javascript
function formatLastPlayed(value) {
  if (!value) return '—';
  const when = new Date(value);
  return when.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}
```

**Issue:** Empty locale `[]` uses system default, not app language

**Recommendation:**

```javascript
function formatLastPlayed(value, locale = currentLang) {
  if (!value) return '—';
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return '—';

  return when.toLocaleString(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
```

---

## 🟢 Low Priority Issues

### 7. No RTL Language Support

**Note:** Not needed for current languages (LV, EN, RU), but good for future

**Recommendation:** If adding Hebrew, Arabic, etc.:

```css
[dir='rtl'] {
  direction: rtl;
  text-align: right;
}
```

```javascript
const RTL_LANGUAGES = ['ar', 'he', 'fa'];
document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
```

### 8. Missing Language Selector Accessibility

**Current:** Language selector exists in some games

**Recommendation:** Ensure proper labeling:

```html
<label for="language-select" class="visually-hidden">
  Select language / Izvēlieties valodu / Выберите язык
</label>
<select id="language-select" aria-label="Language">
  <option value="lv">Latviešu</option>
  <option value="en">English</option>
  <option value="ru">Русский</option>
</select>
```

---

## 🌍 Proposed i18n Architecture

### Unified Translation Loader

```javascript
// src/lib/i18n.js
let translations = {};
let currentLang = 'lv';
const listeners = new Set();

export async function loadTranslations(lang) {
  const fallbackChain = [lang, 'en'];

  for (const code of fallbackChain) {
    try {
      const url = assetUrl(`i18n/${code}.json`);
      const response = await fetch(url);
      if (!response.ok) continue;

      translations = await response.json();
      currentLang = code;
      document.documentElement.lang = code;
      listeners.forEach((fn) => fn(translations));
      return translations;
    } catch (err) {
      console.warn(`Failed to load ${code} translations`, err);
    }
  }

  throw new Error('No translations available');
}

export function t(key, replacements = {}) {
  const value = key.split('.').reduce((obj, k) => obj?.[k], translations);

  if (typeof value !== 'string') {
    console.warn(`Missing translation: ${key}`);
    return key;
  }

  return value.replace(/\{(\w+)\}/g, (_, token) => replacements[token] ?? `{${token}}`);
}

export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getCurrentLang() {
  return currentLang;
}
```

### Usage

```javascript
import { loadTranslations, t, onLanguageChange } from '../../lib/i18n.js';

// Initialize
await loadTranslations(userPreferredLang);

// Use in code
const message = t('games.travelTracker.welcome');
const scoreText = t('common.labels.scoreWithValue', { score: 42 });

// React to language changes
onLanguageChange((newTranslations) => {
  updateUI();
});
```

---

## 📊 Language Coverage Matrix

| Key Area             | LV  | EN  | RU  |
| -------------------- | --- | --- | --- |
| Home page            | ✅  | ✅  | ✅  |
| Match game           | ✅  | ✅  | ✅  |
| Travel Tracker       | ✅  | ✅  | ❓  |
| Passive Lab          | ✅  | ✅  | ❓  |
| Endings Builder      | ✅  | ✅  | ❓  |
| Error messages       | ✅  | ✅  | ❓  |
| Accessibility labels | ⚠️  | ⚠️  | ⚠️  |

---

## 📎 Related Documents

- [UI/UX Improvements](./04-ui-ux-improvements.md)
- [Data Modeling](./05-data-modeling.md)
