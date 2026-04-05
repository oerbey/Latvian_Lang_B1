# Character Traits Game – “Kāds es esmu? Rakstura īpašības” 😄

## Purpose

Interactive browser game for Latvian B-level learners to practise:

- personality adjectives and related nouns / phrases,
- understanding which traits match an optimist or a pessimist,
- Latvian → English vocabulary recognition.

The game must fit into the existing `Latvian_Lang_B1` project and reuse its layout, CSS and general feel.

## Data source

Use `data/personality/words.csv` as the canonical list of vocabulary items.

Columns:

- `id`: stable identifier, lowercase, no spaces.
- `lv`: Latvian word or phrase.
- `en`: English gloss (1–2 short possibilities separated by `;`).
- `group`: `"optimists"`, `"pesimists"` or `"neutral"`.
- `notes`: free text notes (e.g. “abstract noun”, “phrase about behaviour”).

Only `"optimists"` and `"pesimists"` rows are used in the “optimist vs pessimist” mode. All rows are used in the translation mode.

## Data management

- CSV is the editable source at `data/personality/words.csv`.
- Run `npm run build:personality` to generate `data/personality/words.json`.
- JSON is a runtime artifact; do not edit it directly.
- Workflow: edit CSV → run build → commit both files.
- Folder structure mirrors the pattern used by `data/duty-dispatcher/`.
- The folder layout supports future packs (e.g., regional variants) without changing the loader.

Future enhancement (not implemented yet): add multiple packs under `data/personality/` (e.g., regional variants or difficulty tiers) and select them in the UI.

## Game page

New file in repo root: `character-traits.html`.

### UI structure

- Reuse global header / navigation and theme behaviour as in the other games.
- Page `<title>` and main heading: **“Kāds es esmu? Rakstura īpašības”**.
- Short intro text in Latvian that explains:
  - you will see character traits,
  - sometimes you decide: optimist or pessimist,
  - sometimes you choose the correct English translation.

- Main content area:
  1. **Mode selector** (two buttons or tabs):
     - “Optimists vai pesimists”
     - “Latviešu ➜ angļu”
  2. **Question card**:
     - big Latvian word / phrase,
     - answer options.
  3. **Feedback area**:
     - correctness,
     - explanation, English gloss.
  4. **Score + controls**:
     - score and question number,
     - “Sākt no jauna” / “Spēlēt vēlreiz” button.

Use existing CSS classes and modern responsive layout that already exists in the project. No new CSS file.

## Logic

### Data loading

- On page load, fetch `data/personality/words.json`.
- Load JSON into an array of objects `{ id, lv, eng, group, notes }`.
- Disable interaction until data is loaded; show a short “Ielādē datus…” message.

### Rounds and scoring

- Each round has **10 questions** (easy to change via a constant).
- Track:
  - `questionIndex` (0–9),
  - `correctCount`,
  - `askedCount`,
  - list of mistakes with full info.

- UI should display something like “Jautājums 3 / 10” and “Punkti: 2 / 3”.

### Mode A – “Optimists vai pesimists”

- Use only items where `group` is `"optimists"` or `"pesimists"`.
- For each question:
  - show `lv`,
  - provide two answer buttons: “Optimists” and “Pesimists”.

- After click:
  - colour feedback (same style as other games),
  - short Latvian text, e.g.
    - correct: “Pareizi, šī īpašība raksturo optimistu.”
    - wrong: “Nē, tas vairāk raksturo pesimistu.”

  - show English translation from `en`,
  - store mistakes,
  - move to next question (either automatically after a short delay or after “Nākamais”).

### Mode B – “Latviešu ➜ angļu”

- Use **all** rows from CSV.
- For each question:
  - show `lv` as the prompt,
  - generate **4 options**:
    - one correct (`en`),
    - three distractors chosen from other items’ `en` values.

  - shuffle the options.

- After click:
  - show correct / incorrect message in Latvian,
  - clearly show the correct English gloss,
  - record mistakes and continue.

### End-of-round summary

When 10 questions are answered:

- Show summary card:
  - correct answers,
  - percentage,
  - short Latvian evaluation depending on score, e.g.
    - 9–10: “Lieliski!”
    - 6–8: “Labi, tu labi pārzini rakstura īpašības.”
    - 0–5: “Vajag vēl patrennēties.”

- Show table / list of mistakes with:
  - Latvian word / phrase,
  - correct English translation,
  - correct group (“optimists” or “pesimists”) where applicable.

- “Spēlēt vēlreiz” button starts a fresh round in the currently selected mode.

## Index integration

- Add link / card in `index.html` that opens `character-traits.html`.
- Reuse same visual pattern as other games.
- Suggested Latvian label:
  - Title: **“Rakstura īpašības”**
  - Description: _“Iemācies raksturot optimistu un pesimistu un atkārto rakstura īpašības.”_

## Technical notes

- Reuse `styles.css`, `app.js`, `theme.js` and any shared helpers from the repo.
- Follow `.eslintrc.cjs` and `.prettierrc.json`.
- No new dependencies; plain JavaScript and HTML only.
- New page must work when opened directly in browser like the existing HTML games.
