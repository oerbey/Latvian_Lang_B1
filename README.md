# Latvian Language B1 Games

A comprehensive browser-based collection of interactive educational games and tools designed to help learners master Latvian language skills at the B1 proficiency level. The project features multiple game modes, vocabulary trainers, and grammar exercises, all built with vanilla JavaScript and hosted as a Progressive Web App.

## 🎮 Features

- **Multiple Game Modes**: 10+ interactive games targeting different language skills
- **Progressive Web App**: Works offline with service worker caching
- **Responsive Design**: Mobile-friendly with Bootstrap 5 and custom responsive breakpoints
- **Multilingual Interface**: Support for Latvian, English, and Russian UI translations
- **Dark Mode Support**: Theme toggle with system preference detection
- **Accessibility**: Screen reader support, keyboard navigation, ARIA labels
- **No Build Required**: Pure ES modules, runs directly in the browser

## 🎯 Games & Activities

### Main Canvas Games (`index.html`)
- **Match Mode**: Pair Latvian vocabulary with translations, track accuracy/time/streak, keyboard-navigable
- **Forge Mode**: Quiz on verb prefixes with dynamic distractors and hint system

### Specialized Game Modules

| Game | Entry Point | Description |
|------|-------------|-------------|
| **Darbības Vārds** | `darbibas-vards.html` | Dual-column vocabulary card matcher with optional speech synthesis |
| **Conjugation Sprint** | `conjugation-sprint.html` | Timed multiple-choice quiz for verb conjugation across tenses and persons |
| **Endings Builder** | `endings-builder.html` | Drag-and-drop morphology trainer with strict diacritics mode and progress tracking |
| **Passive Lab** | `passive-lab.html` | Grammar exercises focused on passive voice (ciešamā kārta) |
| **Kas ir manā mājā?** | `decl6-detective.html` | Detective game for locative case (6th declension) usage |
| **Travel Tracker** | `travel-tracker.html` | Interactive map-based game with route/location vocabulary |
| **Maini vai mainies?** | `maini-vai-mainies.html` | Active vs. passive voice discrimination game |
| **Kas jādara kam?** | `duty-dispatcher.html` | Dative case practice through role assignment scenarios |
| **Rakstura īpašības — pāri** | `rakstura-ipasibas-match.html` | Character trait matching game |
| **Rakstura īpašības** | `character-traits.html` | Character traits vocabulary builder |
| **Week 1** | `week1.html` | Curated lesson for week 1 vocabulary and concepts |

## 🏗️ Project Structure

```
.
├── README.md                          # This file
├── AGENTS.md                          # Agent workflow guidelines
├── package.json                       # Dependencies & scripts
├── manifest.json                      # PWA manifest
├── sw.js                              # Service worker
├── index.html                         # Main entry point (canvas games)
├── *.html                             # Individual game entry points
├── app.js                             # Main canvas game controller
├── styles.css                         # Global styles
├── theme.js                           # Dark mode toggle
│
├── src/                               # Source code (ES modules)
│   ├── games/                         # Game implementations
│   │   ├── conjugation-sprint/
│   │   ├── endings-builder/           # Drag-and-drop morphology trainer
│   │   ├── travel-tracker/
│   │   ├── passive-lab/
│   │   ├── decl6-detective/
│   │   ├── duty-dispatcher/
│   │   ├── maini-vai-mainies/
│   │   ├── character-traits/
│   │   ├── character-traits-match/
│   │   └── character-traits-expansion/
│   └── lib/                           # Shared utilities
│       ├── dom.js                     # DOM safety helpers
│       ├── paths.js                   # Base-path-safe asset URLs
│       ├── storage.js                 # localStorage wrapper + migrations
│       ├── errors.js                  # Global error handling overlay
│       ├── utils.js                   # Shared pure helpers
│       ├── constants.js               # Shared constants
│       ├── safeHtml.js                # Trusted HTML helper
│       ├── matching-game.js           # Shared matching game logic
│       ├── personality-data.js        # Character traits data helpers
│       ├── match.js                   # Match game mode logic
│       ├── forge.js                   # Forge game mode logic
│       ├── render.js                  # Canvas rendering helpers
│       └── state.js                   # Global application state
│
├── data/                              # Vocabulary & game data
│   ├── words.json                     # Primary vocabulary list
│   ├── lv-en/                         # LV->EN unit indexes and unit files
│   ├── lv-ru/                         # LV->RU unit indexes and unit files
│   ├── routes.json                    # Legacy copy (Travel Tracker uses data/travel-tracker/routes.json)
│   ├── personality/                   # Character traits data
│   │   ├── words.csv                  # Source vocabulary list
│   │   └── words.json                 # Generated runtime artifact
│   ├── endings-builder/
│   │   ├── tables.json                # Morphology rule tables
│   │   └── items.json                 # Game item definitions
│   ├── duty-dispatcher/
│   │   ├── roles.json
│   │   └── tasks.json
│   ├── decl6-detective/
│   │   └── items.json
│   ├── maini-vai-mainies/
│   │   └── items.json
│   ├── passive-lab/
│   │   └── items.json
│   └── travel-tracker/
│       └── routes.json
│
├── i18n/                              # Internationalization files
│   ├── en.json                        # English UI strings
│   ├── lv.json                        # Latvian UI strings
│   ├── ru.json                        # Russian UI strings
│   ├── [game-name].en.json            # Game-specific translations
│   └── offline.js                     # Offline i18n loader
│
├── scripts/                           # Build & utility scripts
│   ├── xlsx_to_json.mjs               # Excel -> JSON converter
│   ├── personality_csv_to_json.mjs    # Personality CSV -> JSON converter
│   ├── build_week1_offline.py         # Offline pack builder
│   ├── page-init.js                   # Shared page initialization
│   └── legacy/
│       └── Latvian_Verb_Filler.py     # Verb conjugation scraper
│
├── assets/                            # Static assets
│   ├── app.js                         # Vocabulary matcher game
│   ├── styles.css                     # Asset-specific styles
│   └── img/                           # Game-specific images
│
├── test/                              # Test suites (Node.js)
│   ├── games/                         # Game unit tests
│   ├── lib/                           # Library tests
│   └── helpers/                       # DOM stubs & test utilities
│
├── docs/                              # Documentation & specs
│   ├── *-spec.md                      # Individual game specifications
│   └── endings-builder-analysis/      # Detailed analysis docs
│
└── [App-specific files]
    ├── assets/
    ├── styles.css
    └── manifest.json
```

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** (for build tooling and tests)
- **Python 3** (optional, for data regeneration)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/oerbey/Latvian_Lang_B1.git
cd Latvian_Lang_B1

# Install dependencies
npm install
```

### Running Locally

**Option 1: Using npm start (recommended)**
```bash
npm run start
# Open http://localhost:5173
```

**Option 2: Using Python's built-in server**
```bash
python3 -m http.server 8000
# Open http://localhost:8000/index.html
```

**Option 3: Using Node's http-server**
```bash
npx http-server .
# Open http://localhost:8080
```

**Option 4: Using serve package**
```bash
npm install -g serve
serve .
# Open http://localhost:3000
```

## 🛠️ Development

### Development Commands
```bash
npm install
npm run start
npm test
npm run test:watch
```

### Building Data

```bash
# Convert Excel spreadsheet to JSON
npm run build:data

# Build personality words JSON from CSV
npm run build:personality

# Generate offline study packs
npm run build:offline

# Run linter (ESLint + Prettier)
npm run lint
```

### Testing

```bash
# Run Node.js test suites
npm test

# Watch tests during development
npm run test:watch

# Tests mirror the src/ structure under test/
# Example: test/games/conjugation-sprint/index.test.js
```

CI runs `npm test` on every PR and push to `main`.

### Code Style

- **Language**: ES modules (no bundler needed)
- **Style**: 2-space indentation, camelCase naming
- **Formatting**: Prettier compatibility (run `prettier --write` before committing)
- **Linting**: ESLint with import plugin

## 📊 Data Management

### Vocabulary Data (`data/words.json`)
- **Source**: Excel spreadsheet converted via `npm run build:data`
- **Structure**: Array of word objects with `lv`, `eng`, `ru`, tags, and conjugation tables
- **Generated from**: `scripts/xlsx_to_json.mjs`

### Personality Traits Data (`data/personality/words.csv`)
- **Source**: CSV vocabulary list
- **Build step**: Run `npm run build:personality` after editing `data/personality/words.csv`
- **Output**: `data/personality/words.json` used at runtime

### Verb Inflections (`data/legacy/verbs_conjugated.json`)
- **Optional enrichment** from Tezaurs API
- **Generated by**: `scripts/legacy/Latvian_Verb_Filler.py`
- **Requires**: Python 3 + `requests` package

### Game-Specific Data
- **Endings Builder**: `data/endings-builder/tables.json` (morphology rules), `data/endings-builder/items.json` (exercises)
- **Travel Tracker**: `data/travel-tracker/routes.json` (map locations)
- **Duty Dispatcher**: `data/duty-dispatcher/roles.json`, `data/duty-dispatcher/tasks.json`
- **Decl6 Detective**: `data/decl6-detective/items.json`

### Offline Data
- Treat generated files like `words.offline.js` as build artifacts
- Regenerate with `npm run build:offline` after data changes

## 🌍 Internationalization (i18n)

### Adding a New Language

1. **Create translation file**: `i18n/[language-code].json`
   ```json
   {
     "nav.match": "Match",
     "nav.forge": "Forge",
     "game.score": "Score"
   }
   ```

2. **Add game-specific translations** (if needed):
   - `i18n/[game-name].[language-code].json`

3. **Update service worker**: Add new files to `CORE_ASSETS` in `sw.js`

4. **Update language selector**: Modify HTML language option lists

### Language Files Included
- **Latvian** (`i18n/lv.json`)
- **English** (`i18n/en.json`)
- **Russian** (`i18n/ru.json`)

## 📱 Progressive Web App

### Features
- **Offline Support**: Core pages and assets cached via service worker
- **Installable**: Add to home screen on mobile/desktop
- **Network Strategy**:
  - Vocabulary data: Network-first with cache fallback
  - Assets: Cache-first
  - HTML pages: Network-first

### Service Worker
- **File**: `sw.js`
- **Cache Version**: Update `CACHE_VERSION` when adding/changing assets
- **Precached Assets**: Defined in `CORE_ASSETS` array
- **Registration**: Handled by `scripts/page-init.js`
- **Updates**: Users see an “Update available” prompt and can reload to activate a new worker

### Manifest
- **File**: `manifest.json`
- **PWA Metadata**: Name, icons, theme color, display mode
- **To Ship**: Populate icons array with actual icon assets

## 🎨 Theming & Styling

### Global Design Tokens (`styles.css`)
- `--bg`: Background color
- `--surface`: Surface/card backgrounds
- `--text`: Primary text color
- `--muted`: Secondary text color
- `--border`: Border colors
- `--accent`: Primary action color
- `--accent-contrast`: Text on accent backgrounds
- `--hover`, `--disabled`: State modifiers

### Theme Toggle
- **File**: `theme.js`
- **Storage**: `localStorage` persistence
- **System Preference**: Respects `prefers-color-scheme` media query
- **Meta Tag Sync**: Updates `<meta name="theme-color">` for browser chrome

### Responsive Breakpoints
- **Mobile**: 320px (iPhone SE), 360px (Android), 375px (iPhone 6/7/8)
- **Tablet**: 390px, 412px (Android phones), 414px (iPhone Plus), 430px (modern phones)
- **Tablet Portrait**: 768px (iPad)
- **Desktop**: 1024px+

**Travel Tracker Specific Breakpoints**:
- Safe-area handling for notch/home indicator (iPhone X+)
- Clamp-based responsive heights for maps
- Touch target minimum: 44–48px

## ♿ Accessibility

### Screen Reader Support
- Canvas game mirrors interactions into screen-reader-only `<ul>` with `<button>` elements
- `aria-live` regions for game status updates

## 🔐 Security

- External CDN assets include Subresource Integrity (SRI) hashes.
- Content Security Policy is enforced via a meta tag in HTML.
- Prefer safe DOM APIs over `innerHTML` for user-facing content.
- ARIA labels on all interactive controls

### Keyboard Navigation
- Tab order managed; all controls reachable via keyboard
- Canvas games support arrow keys and Enter for selection
- Focus outlines visible in light and dark modes

### Mobile Accessibility
- Minimum touch targets: 44–48px
- Sufficient color contrast (WCAG AA)
- No reliance on hover-only interactions

## 📋 Git Workflow

### Branch Strategy
- **Feature branches**: `feature/<topic>` (e.g., `feature/character-traits-game`)
- **Commit style**: Imperative subject line, optional body for context
  - Example: `Add tense selector to Conjugation Sprint`

### Pull Requests
- Summarize the change
- Include reproduction steps (for bug fixes)
- Attach screenshots/videos for UI changes
- Mention related issues or cards
- Run `npm lint` and `npm test` before pushing

### After Switching Branches
```bash
git status  # Confirm sync with remote
npm install # Update dependencies if needed
```

## 🚢 Deployment

### GitHub Pages
1. Ensure `assetUrl()` in `app.js` resolves assets correctly relative to `document.baseURI`
2. Push changes to `main` branch
3. GitHub Pages will auto-deploy from the root directory

### Offline Verification
1. Open DevTools → Application → Service Workers
2. Disable network and verify cached pages load
3. Test vocabulary loading with network throttled

### Pre-Release Checklist
- [ ] Run `npm test` — all tests pass
- [ ] Run `npm lint` — no warnings
- [ ] Bump `CACHE_VERSION` in `sw.js` if assets changed
- [ ] Test on mobile (iOS + Android)
- [ ] Verify offline mode works
- [ ] Update `manifest.json` icons if needed

## 🐛 Troubleshooting

### Game Data Not Loading
- **Check**: Network tab in DevTools; ensure `data/words.json` is fetched
- **Fix**: Run `npm run build:data` if source Excel was updated
- **Offline**: Verify `sw.js` has the file in `CORE_ASSETS`

### Translations Missing
- **Check**: Console for missing i18n keys
- **Fix**: Add missing keys to `i18n/[language].json` and game-specific files
- **Rebuild**: Run `npm run build:offline` to update offline packs

### Service Worker Issues
- **Clear Cache**: DevTools → Application → Clear storage
- **Bump Version**: Update `CACHE_VERSION` in `sw.js`
- **Unregister**: Open DevTools → Application → Service Workers → Unregister

### Responsive Layout Broken
- **Check**: Use DevTools responsive mode at listed breakpoints (320px, 375px, 768px, etc.)
- **Fix**: Ensure no horizontal scroll; buttons ≥44px; focus outlines visible in both themes
- **Test**: Travel Tracker especially; check safe-area inset handling on iPhone X+

## 📚 Additional Documentation

- **AGENTS.md**: Guidelines for AI coding agents and development practices
- **documentation.md**: Comprehensive technical documentation
- **docs/**: Individual game specifications and design docs
  - `docs/*-spec.md`: Game-specific implementation details
  - `docs/endings-builder-analysis/`: In-depth morphology trainer analysis

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and test locally
3. Run linting and tests: `npm lint && npm test`
4. Format code: `prettier --write .`
5. Commit with clear messages (imperative style)
6. Push to your fork and open a Pull Request

## 📄 License

This project is part of a language learning initiative. Check individual files for license information.

## 👤 Author

Created by [oerbey](https://github.com/oerbey)

## 🎓 Learning Resources

- **Latvian B1 Level**: Designed for intermediate learners transitioning to upper-intermediate proficiency
- **Skill Coverage**: Vocabulary, verb conjugation, grammar (passive voice, declensions, prefixes)
- **Spaced Repetition**: Track scores and accuracy to guide practice
- **Mobile-First**: Learn on-the-go with full offline support

---

**Happy learning! Veiksmi mācībās!** 🇱🇻
