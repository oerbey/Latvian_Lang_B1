# Latvian B1 Project Review

Below is a quick audit of the current state of the **LATVIAN_LANG_B1** branch. The goal is to surface missing documentation, inconsistencies in data handling, and gaps that would help a new contributor understand what is required to support the B1 tier.

---

## 1. Data Model

| File                    | Current status                            | Missing pieces                                                                                |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `data/words.json`       | Full word list, no level metadata         | Add a `level: "b1"` field to each entry that belongs to the B1 tier.                          |
| `data/words/index.json` | Index of all words, no filtering by level | Update the build script to create a separate index for B1 words (`data/words/b1/index.json`). |

### Suggested Change

```js
// data/words.json example entry
{
  "word": "pasta",
  "meaning": "bread",
  "level": "b1"
}
```

---

## 2. Internationalisation (i18n)

| File                | Current status                                       | Missing pieces                                                                |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `i18n/latvian.json` | Contains all UI strings but no tier‑specific section | Add a comment header or key prefix (e.g., `b1.`) to indicate B1‑only strings. |
| `i18n/latvian.js`   | Generates the locale bundle, no filtering by level   | Update to expose a `b1` export or accept a tier parameter.                    |

---

## 3. Game Logic

| Path                      | Current status               | Missing pieces                                                                              |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `src/games/`              | General games load all words | Create a dedicated `src/games/b1/` folder and modify the loader to filter by `level: "b1"`. |
| `src/lib/wordsLoader.mjs` | Loads all words              | Add an optional `options.level` param that returns only matching entries.                   |

---

## 4. Build & Scripts

| Script                       | Current status               | Suggested new script                                                                        |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run build:words:chunks` | Splits all words into chunks | Add `npm run build:b1:words` that runs the chunking script with a level filter.             |
| `npm run validate:data`      | Validates JSON schemas       | Extend validation to check that each word has a `level` field when the B1 branch is active. |

---

## 5. Testing

| Test file            | Current status        | Missing tests                                                                  |
| -------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `test/words.test.js` | Tests general loading | Add tests that confirm B1 loader returns only words with `level: "b1"`.        |
| `test/games/b1`      | No tests yet          | Create a test suite that loads the B1 game and verifies it only uses B1 words. |

---

## 6. Documentation

- Add a **`docs/latvian-b1.md`** (or a section in the main README) that:
  - Explains how to enable B1 mode (e.g., a flag or environment variable).
  - Lists the required data files and their structure.
  - Describes the build commands specific to B1.
- Update the top‑level README with a quick “Getting Started” guide for contributors working on B1.

---

## 7. Miscellaneous

- Ensure that any generated files (e.g., `data/words/b1.offline.js`) are included in the `.gitignore` if they should not be committed.
- Verify that the `build:offline` script regenerates B1 bundles when run.

---

### Next Steps for the Team

1. **Add `level` metadata** to all B1 words.
2. **Create the dedicated B1 build script** and update `package.json` scripts.
3. **Implement tier‑aware loaders** in the game code.
4. **Write and run the B1 tests**.
5. **Document everything** in the `docs/` folder and update the README.

Feel free to reference this file when you make changes; it serves as a quick checklist for maintaining consistency across the B1 branch.
