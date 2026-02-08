Sentence Surgery — Passive Voice (Ciešamā kārta) — B1 Pack
========================================================

Contents
- sentence_surgery_passive_dataset.json  (primary dataset)
- sentence_surgery_passive_dataset.csv   (spreadsheet-friendly export)

Dataset notes
- Each item contains:
  - target_lv: correct sentence
  - broken_lv: same sentence with exactly one intentional error
  - errors: list with 1 object (type, wrong, correct)
  - word_bank: token list (includes distractors)

Meta
- name: Sentence Surgery — Passive Voice (Ciešamā kārta) — B1 dataset
- version: 0.2
- created: 2026-02-07

Quick usage
- Use `target_lv` as the answer key.
- Render `broken_lv` to the player and let them fix it using tokens from `word_bank`.
- Use `errors[0]` for feedback (highlight what was wrong and what the fix is).

Encoding
- UTF-8 (Latvian diacritics preserved)

Generated on: 2026-02-07
