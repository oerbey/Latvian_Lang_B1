# Future Build Ideas

- **Adaptive Decks & Spaced Repetition**  
  Track per-word accuracy across games and resurface weak vocabulary through spaced repetition schedules, optionally syncing progress via browser storage or lightweight backend.

- **Custom Lesson Builder**  
  Let teachers or learners assemble their own units by uploading CSV/JSON or selecting from existing words, then share a link that preloads tailored decks in Match, Forge, or Sprint modes.

- **Multiplayer Challenges**  
  Introduce timed head-to-head rounds (WebRTC or Firebase) where learners race to complete the same deck, encouraging social reinforcement and repeat play.

- **Pronunciation Practice Mode**  
  Integrate Web Speech API or third-party ASR to allow learners to speak answers; provide immediate feedback on pronunciation and accent marks, especially valuable for endings builder.

- **Expanded Morphology Games**  
  Build noun/adjective declension drills using `endings-resolver.js` tables, plus new mini-games for prepositions or particles that require matching with correct cases.

- **Progress Dashboard & Analytics**  
  Surface aggregated stats (accuracy by tense, prefix families, cases) across all games, highlighting growth and suggesting next-focus areas.

- **Offline-first Content Packs**  
  Package additional data (e.g., thematic vocabulary, idioms) as downloadable JSON bundles that the service worker caches for offline study sessions.

- **Localization Toolkit**  
  Add an in-app translation editor that previews new locales, exports diff-friendly JSON, and validates coverage for UI keys before shipping another language.

- **Mobile-friendly Gestures & Haptics**  
  Enhance touch interactions with drag handles, haptic feedback, and gesture shortcuts (e.g., swipe to skip, long-press for hints) to improve playability on phones and tablets.

- **Daily Challenge & Streaks**  
  Offer a curated daily mix of games with a leaderboard or badge system to encourage consistent practice and shareable milestones.

