# “Ciešamās Kārtas Laboratorija” — Passive Voice Builder (v1)

## Goal
Master Latvian passive with **tikt** (+ participle) across tenses and agreement:
- Present: **tiek** + -ts/-ta/-ti/-tas
- Past: **tika** + participle
- Future: **tiks** + participle
Accept also **(būt)** patterns: **ir/bija/būs** + participle when feasible.

## Mechanic
- Show an **active** sentence; player builds the **passive** by picking: *tense* (tagadne/pagātne/nākotne), *patient* (subject in Nom.), and the **correct participle ending**.
- Two modes:
  1) **Builder** (step-by-step selectors: tense → patient → verb → ending)
  2) **Type-in** (free input; check against `expected.*` and `alsoAccept`)

## Files (expected paths)
```
/passive-lab.html
/src/games/passive-lab/index.js
/src/games/passive-lab/styles.css
/data/passive-lab/items.json
/i18n/passive-lab.lv.json
/i18n/passive-lab.en.json
/assets/img/passive-lab/lab.svg
/assets/img/passive-lab/glyph-*.svg
```
LocalStorage key: `llb1:passive-lab:progress`

## Data model (`items.json`)
Each item contains the **active** base and precomputed **expected** passives. `patient` encodes gender/number for agreement.
```json
{
  "id": "p01",
  "active": "Skolotāja sagatavo jautājumus.",
  "patient": { "form": "Jautājumi", "gender": "m", "number": "pl" },
  "verb": "sagatavot",
  "expected": {
    "present": "Jautājumi tiek sagatavoti.",
    "past":    "Jautājumi tika sagatavoti.",
    "future":  "Jautājumi tiks sagatavoti."
  },
  "alsoAccept": [
    "Jautājumi ir sagatavoti.", "Jautājumi bija sagatavoti.", "Jautājumi būs sagatavoti."
  ],
  "hint": "Ciešamā kārta: tiek/tika/tiks + -ti (m.pl.).",
  "explain": "Patient (Nom.) + tikt + passive participle; agree gender/number."
}
```

## Scoring
+5 correct on first try; −1 per retry (min 1). +10 streak every 5 correct. Builder mode gives +1 less per item than Type‑in.

## Accessibility
Keyboard-first UI, ARIA live region feedback. Clear error for wrong endings (e.g., -ts vs -ta), and tooltip reminding agreement.

## Authoring rules
- Prefer **no agent** (darītājs nav minēts). If an agent is shown in the source sentence, omit it in the passive output.
- Ensure noun agreement drives the participle ending:
  - **m.sg** → -ts, **f.sg** → -ta, **m.pl** → -ti, **f.pl** → -tas.
- Keep punctuation and capitalization consistent with Latvian norms.

*Generated: 2025-11-08*
