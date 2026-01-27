# “Kas ir manā mājā?” — 6th Declension Detective (v1)

## Focus

Train **6th declension** feminine nouns (ending in -s) and plural‑only nouns in realistic **home/house** contexts.
We practice **Genitive (Ģ.), Accusative (A.), Locative (L.)** and common **preposition + case** frames:

- **pie, aiz, virs, bez, no, pēc** → **Ģenitīvs** (“pie **krāsns**”, “aiz **telts**”).
- **uz** → **Ģen.** (location: “uz **plīts**”), **Akuz.** (direction: “uz **plīti**”).
- **starp, caur, pār, pa** → mostly **Akuz.** (“starp **pirti** un **klēti**”, “pāri **klintij**”).
- **kur?** → **Lokatīvs** (“krāsnī”, “pirtī”, “valstī”).

Week‑4 notes list household & place nouns: _krāsns, plīts, pirts, telts, klēts, kūts_, cities from _pils_ (Daugavpils), and nature set _klints, zivs, govs, zoss, smiltis, debesis_; plural‑only _durvis, brokastis_ are also used.

## Modes

1. **Detective Cards (MCQ):** Read a clue with a preposition or question (Kur?/Ko?/Kā?), pick the correct form from 4 options.
2. **Room Builder (Type‑in):** Given a room scene (kitchen, sauna room, barn, camping), type the missing noun form. Accept diacritics‑insensitive match.

## Files

```
/decl6-detective.html
/src/games/decl6-detective/index.js
/src/games/decl6-detective/styles.css
/data/decl6-detective/items.json
/i18n/decl6-detective.lv.json
/i18n/decl6-detective.en.json
/assets/img/decl6-detective/plan.svg
```

LocalStorage key: `llb1:decl6-detective:progress`

## Data model (`items.json`)

Each item is one clue. `lemma` gives dictionary form; `answer` is the required surface form and `case` is the target case.

```json
{
  "id": "d6-01",
  "scene": "virtuve",
  "lemma": "plīts",
  "prompt": "Katls stāv uz _____.",
  "case": "GenSg (location with 'uz')",
  "options": ["plīts", "plītis", "plīti", "plītī"],
  "answer": "plīts",
  "hint": "‘uz’ (kur?) → Ģenitīvs; plīts → plīts (Ģ.v.)",
  "explain": "Location uses Genitive after ‘uz’: uz plīts."
}
```

## Scoring & UX

+5 correct first try (−1 per retry, min 1). Streak +10 every 5 in a row. ARIA live feedback, keyboard focus order, mobile‑first layout.

## Authoring rules

- Use only nouns from the Week‑4 decks for 6th declension and plural‑only groups.
- Provide **four** options: at least one wrong case and one number (sg/pl) distractor, and one wrong stem (e.g., -ts vs -ta pattern).
- Prefer **home/house** scenes (virtuve, pirts, klēts, kūts, telts, viesistaba, vannas istaba).

_Generated: 2025-11-10_
