# Maini vai mainies? — Game Spec (v1)

## TL;DR
A B1 mini-game to master **reflexive vs. non‑reflexive** Latvian verbs (e.g., **mainīt**/*change something* vs **mainīties**/*change oneself*). Players choose the correct form in short real‑life scenarios; an avatar reacts to illustrate the meaning.

## Goals
- Distinguish pairs like **mainīt** (transitive: *ko?* + Acc.) vs **mainīties** (intransitive: *kas?* + Nom.).
- Extend with high‑frequency pairs: **mācīt/mācīties**, **satikt/satikties**, **iepazīt/iepazīties**, **interesēt/interesēties**, **saukt/saukties**, **sarunāt/sarunāties**.
- Reinforce case governance: *ko?* (Acc.), *ar ko?*, *par ko?* cues appear in items.

## Game loop
1. Show a one‑sentence scenario with a gap and two big buttons (non‑reflexive vs reflexive).
2. On correct answer: short feedback + avatar change; on error: hint with case cue.
3. Score, streak, level unlocks. Keyboard accessible (Tab/Enter), ARIA live feedback.

## Files & structure
```
/maini-vai-mainies.html
/src/games/maini-vai-mainies/index.js
/src/games/maini-vai-mainies/styles.css
/data/maini-vai-mainies/items.json       <-- this file
/i18n/maini-vai-mainies.lv.json
/i18n/maini-vai-mainies.en.json
/assets/img/maini-vai-mainies/avatars/   <-- simple SVG avatars
```
LocalStorage key: `llb1:maini-vai-mainies:progress`

## Data model (`items.json`)
Each item:
```json
{
  "id": "m1",
  "sentence": "Anna ____ darbu.",
  "choices": ["maina","mainās"],
  "answer": "maina",
  "hint": "mainīt ko? + akuzatīvs (darbu).",
  "explain": "Transitive action on an object."
}
```

## Scoring
+5 first‑try correct, −2 per retry (min 1). Streak bonus +10 every 5 correct.

## Accessibility
- Buttons reachable via Tab; Enter/Space activates.
- Live region for feedback text.
- ARIA labels for choices.

## Authoring notes
- Keep `choices[0]` = non‑reflexive, `choices[1]` = reflexive for consistency.
- Use clear case cues: **ko?**, **kas?**, **ar ko?**, **par ko?** in `hint`.
- Group items with a `tags` array if you later want adaptive review.

*Package generated: 2025-11-02*
