# “Kas jādara kam?” — Duty Dispatcher (v1)

## TL;DR
A drag‑and‑drop board for the **Debitive (Vajadzības izteiksme)**: players assign a duty card like **“jāmaksā rēķini”** to the correct recipient shown in **Dative** (Kam?).

## Learning goals
- Form the debitive: **kam (Dative) + (bija|ir|būs) jā + 3rd‑person verb + kas (Nominative/phrase)**. Example pattern from notes: *Bērnam (ir) jā lasa grāmata.* For past/future: *Bērnam bija jālasa grāmata*, *Bērnam būs jālasa grāmata*. 
- Recognize common verbs used in debitive (incl. 3rd‑conjugation): *jācer, jāatbild, jāpeld, jāgrib, jāredz, jāsēž, jāguļ, jādzird, jāmīl*.
- Use **preposition + case** with the debitive (e.g., *jārunā ar sievu*, *jādomā par nākotni*, *jāsēž uz dīvāna*, *jābrauc uz centru*, *jāatbild uz jautājumu*).

(See Week 3 slides for examples and tables.)

## Game loop
1) Read a short scenario (e.g., “Rīt eksāmens.”) and a duty card (e.g., **“jāmācīties”**).  
2) Drag the card onto the correct recipient tile (e.g., **studentam/studentei**, **tev**, **viņam/viņai**, **mums**, etc.).  
3) Immediate feedback: correct (snap + green glow) or hint with a rule cue (“**kam** Dative + **jā** + 3rd‑person”).  
4) Score, streak, level unlocks; keyboard alternative for accessibility.

## Files
```
/duty-dispatcher.html
/src/games/duty-dispatcher/index.js
/src/games/duty-dispatcher/styles.css
/data/duty-dispatcher/roles.json        <-- recipients with Dative forms
/data/duty-dispatcher/tasks.json        <-- this content pack (CSV also provided)
/i18n/duty-dispatcher.lv.json
/i18n/duty-dispatcher.en.json
/assets/img/duty-dispatcher/office.svg  <-- background
/assets/img/duty-dispatcher/role-*.svg  <-- simple role avatars
```
LocalStorage key: `llb1:duty-dispatcher:progress`

## Data schemas
### roles.json
```json
[
  {"id":"man","label":"Es","dative":"man","avatar":"role-user"},
  {"id":"tev","label":"Tu","dative":"tev","avatar":"role-user"},
  {"id":"vinam","label":"Viņš","dative":"viņam","avatar":"role-user"},
  {"id":"vinai","label":"Viņa","dative":"viņai","avatar":"role-user"},
  {"id":"mums","label":"Mēs","dative":"mums","avatar":"role-user"},
  {"id":"jums","label":"Jūs","dative":"jums","avatar":"role-user"},
  {"id":"vini","label":"Viņi","dative":"viņiem","avatar":"role-user"},
  {"id":"vinas","label":"Viņas","dative":"viņām","avatar":"role-user"},

  {"id":"mammai","label":"Mamma","dative":"mammai","avatar":"role-parent"},
  {"id":"tetim","label":"Tētis","dative":"tētim","avatar":"role-parent"},
  {"id":"bernam","label":"Bērns","dative":"bērnam","avatar":"role-child"},
  {"id":"studentam","label":"Students","dative":"studentam","avatar":"role-student"},
  {"id":"studentei","label":"Studente","dative":"studentei","avatar":"role-student"},
  {"id":"arstam","label":"Ārsts","dative":"ārstam","avatar":"role-doctor"},
  {"id":"arstei","label":"Ārste","dative":"ārstei","avatar":"role-doctor"},
  {"id":"skolotajai","label":"Skolotāja","dative":"skolotājai","avatar":"role-teacher"},
  {"id":"vaditajam","label":"Vadītājs","dative":"vadītājam","avatar":"role-manager"},
  {"id":"klientam","label":"Klients","dative":"klientam","avatar":"role-customer"}
]
```

### tasks.json
```json
[
  {
    "id":"d1",
    "s":"Kaķis ir izsalcis.",
    "card":"jābaro kaķis",
    "tense":"present",
    "validRecipients":["mammai","tetim","bernam"],
    "hint":"kam + jā + 3.p. (baro) + kas?",
    "explain":"Sievietei bija jābaro kaķis (pagātne)."
  }
]
```
CSV columns mirror the JSON fields: `id,s,card,tense,validRecipients|;|,hint,explain`.

## Scoring
+10 first‑try; −3 retry (min 1). Streak bonus +10 per 5 correct. Win the level at ≥80 pts.

## Accessibility
- Mouse and keyboard drag‑drop (roving tabindex).  
- Live region for “Pareizi!” / “Mēģini vēlreiz!”.  
- Clear color + icon changes; avatar “bounce” on success.

*Generated: 2025-11-02*
