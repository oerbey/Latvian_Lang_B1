# Data Modeling Improvements

**Date:** January 20, 2026  
**Category:** Data Architecture

---

## 🔍 Current Data Landscape

The project uses JSON files for all game data:
- `data/words.json` — 3,818 lines, primary vocabulary (~300+ entries)
- `data/*/items.json` — Game-specific data files
- `i18n/*.json` — Translation strings
- `data/*.offline.js` — Embedded fallbacks for offline use

---

## 🔴 Critical Issues

### 1. No Schema Validation
**Problem:** JSON files have no formal schema, allowing silent failures

**Example issue:** If `words.json` entry is missing `conj.present`:
```javascript
const conjugation = word.conj.present['1s']; // undefined, no error
```

**Recommendation:** Implement JSON Schema validation:

```json
// schemas/word.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["lv", "eng"],
  "properties": {
    "lv": { "type": "string", "minLength": 1 },
    "eng": { "type": "string" },
    "ru": { "type": "string" },
    "conj": {
      "type": "object",
      "properties": {
        "present": { "$ref": "#/definitions/tenseMap" },
        "past": { "$ref": "#/definitions/tenseMap" },
        "future": { "$ref": "#/definitions/tenseMap" }
      }
    }
  },
  "definitions": {
    "tenseMap": {
      "type": "object",
      "properties": {
        "1s": { "type": "string" },
        "2s": { "type": "string" },
        "3s": { "type": "string" },
        "1p": { "type": "string" },
        "2p": { "type": "string" },
        "3p": { "type": "string" }
      }
    }
  }
}
```

Add build-time validation:
```javascript
// scripts/validate-data.mjs
import Ajv from 'ajv';
import wordSchema from '../schemas/word.schema.json' assert { type: 'json' };
```

---

## 🟠 High Priority Issues

### 2. Data Redundancy Across Games
**Problem:** Similar vocabulary data is duplicated in multiple files

**Examples:**
- Character traits in both `personality/words.json` and translation files
- Verb conjugations in both `words.json` and game-specific items

**Recommendation:** 
- Create normalized reference data
- Use IDs/references instead of duplicating content
- Single source of truth for each vocabulary item

```json
// data/vocabulary/index.json
{
  "items": {
    "v001": { "lv": "mainīt", "eng": "to change", "ru": "менять" },
    "v002": { "lv": "mainīties", "eng": "to change (self)", "ru": "меняться" }
  }
}

// data/maini-vai-mainies/items.json
{
  "rounds": [
    { "refId": "v001", "type": "transitive", "sentence": "..." }
  ]
}
```

### 3. Large Monolithic Data Files
**Problem:** `words.json` at 3,818 lines is difficult to:
- Edit manually
- Code review
- Load incrementally

**Recommendation:** Split by category or first letter:
```
data/vocabulary/
├── index.json           # References all chunks
├── a-d.json
├── e-l.json
├── m-p.json
└── r-z.json
```

Or split by word type:
```
data/vocabulary/
├── verbs.json
├── nouns.json
├── adjectives.json
└── phrases.json
```

---

## 🟡 Medium Priority Issues

### 4. Inconsistent Field Naming
**Problem:** Mixed naming conventions across data files

**Examples:**
- `words.json`: `eng`, `ru`, `lv`
- `i18n`: `en`, `ru`, `lv`
- Some files use `translation`, others use language codes

**Recommendation:** Standardize on ISO 639-1 codes:
- `en` (English)
- `lv` (Latvian)  
- `ru` (Russian)

### 5. Missing Metadata Fields
**Problem:** Data files lack useful metadata

**Missing in vocabulary:**
- CEFR level (A1-C2)
- Frequency ranking
- Part of speech tags
- Semantic categories
- Audio file references

**Recommendation:**
```json
{
  "lv": "mainīt",
  "en": "to change",
  "ru": "менять",
  "meta": {
    "cefr": "B1",
    "pos": "verb",
    "frequency": 1250,
    "categories": ["change", "action"],
    "audio": "mainit.mp3"
  }
}
```

### 6. Progress Data Model
**Problem:** Progress is stored with game-specific keys, making cross-game analytics difficult

**Current (inconsistent):**
```javascript
// Different games use different schemas:
'llb1:travel-tracker:progress': { xp, streak, completed, lastPlayedISO }
'llb1:duty-dispatcher:progress': { xp, streak, lastPlayedISO }
'eb-progress-v1': { attempts, correct, streak, lastAttemptISO }
```

**Recommendation:** Unified progress schema:
```json
{
  "schemaVersion": 2,
  "games": {
    "travel-tracker": {
      "xp": 150,
      "streak": { "current": 3, "best": 7 },
      "completed": ["route-1", "route-2"],
      "stats": { "correct": 45, "attempts": 52 },
      "lastPlayed": "2026-01-20T10:30:00Z"
    }
  },
  "global": {
    "totalXp": 1250,
    "dailyStreak": 5,
    "achievements": ["first-game", "perfect-score"]
  }
}
```

---

## 🟢 Low Priority Issues

### 7. Build Artifact Management
**Problem:** Generated files (`.offline.js`) are committed to repo

**Recommendation:**
- Add to `.gitignore`
- Generate during CI/build
- Document regeneration process

### 8. Data Version Control
**Problem:** No versioning for data schema changes

**Recommendation:** Add version field:
```json
{
  "$version": "1.2.0",
  "$schema": "./schemas/words.schema.json",
  "items": [...]
}
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐     ┌──────────────┐
│ Excel Source    │────▶│ Build Script │
│ (manual edit)   │     │ xlsx_to_json │
└─────────────────┘     └──────┬───────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   words.json     │
                    │ (validated)      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Match    │  │ Forge    │  │ Conjugation
        │ Game     │  │ Game     │  │ Sprint    │
        └──────────┘  └──────────┘  └──────────┘
```

**Improved flow:**
```
┌─────────────────┐     ┌──────────────┐     ┌───────────┐
│ Excel Source    │────▶│ Build Script │────▶│ Validate  │
└─────────────────┘     │ (transform)  │     │ (schema)  │
                        └──────────────┘     └─────┬─────┘
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │  Normalized Data │
                                        │  (versioned)     │
                                        └────────┬─────────┘
                                                 │
                    ┌──────────────┬─────────────┼─────────────┬──────────────┐
                    ▼              ▼             ▼             ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
              │ Offline  │  │ Game-    │  │ Runtime  │  │ i18n     │  │ Analytics│
              │ Bundles  │  │ Specific │  │ Loader   │  │ Data     │  │ Schemas  │
              └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 📎 Related Documents

- [Platform & Tooling](./07-platform-and-tooling.md)
- [Performance Optimization](./06-performance-optimization.md)

