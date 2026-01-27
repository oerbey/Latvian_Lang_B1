# Performance Optimizations — Latvian_Lang_B1

This document identifies performance bottlenecks and optimization opportunities.

---

## Issue: Canvas Redraws on Every State Change

**Priority**: High  
**Category**: Performance, Rendering  
**Effort**: Medium

### Current State

The canvas redraws completely on every state change:

```javascript
// app.js
function draw() {
  if (state.mode === MODES.MATCH) {
    if (state.matchState) drawMatch(); // Full redraw
  } else {
    if (state.forgeState) drawForge(); // Full redraw
  }
  if (renderConfetti()) requestAnimationFrame(draw);
  if (state.showHelp) drawHelp();
}
setRedraw(draw);

// src/lib/match.js - drawMatch() clears and redraws everything
export function drawMatch() {
  const ms = state.matchState;
  clear(); // Clears entire canvas
  resetClicks();
  // ... redraws all elements
}
```

### Problem

- Full canvas clear and redraw on every interaction
- Redraws unchanged elements unnecessarily
- Performance issues on lower-end devices
- Battery drain on mobile

### Recommendation

Implement dirty rectangle rendering:

```javascript
// src/lib/render/dirty-regions.js
class DirtyRegionManager {
  constructor() {
    this.dirtyRects = [];
    this.fullRedraw = true;
  }

  markDirty(x, y, w, h) {
    this.dirtyRects.push({ x, y, w, h });
  }

  markFullRedraw() {
    this.fullRedraw = true;
  }

  getDirtyRegion() {
    if (this.fullRedraw) {
      this.fullRedraw = false;
      this.dirtyRects = [];
      return null; // Indicates full redraw
    }

    if (this.dirtyRects.length === 0) {
      return { x: 0, y: 0, w: 0, h: 0 }; // Nothing to redraw
    }

    // Calculate bounding box of all dirty rects
    const region = this.dirtyRects.reduce(
      (acc, rect) => ({
        x: Math.min(acc.x, rect.x),
        y: Math.min(acc.y, rect.y),
        x2: Math.max(acc.x2, rect.x + rect.w),
        y2: Math.max(acc.y2, rect.y + rect.h),
      }),
      { x: Infinity, y: Infinity, x2: 0, y2: 0 },
    );

    this.dirtyRects = [];

    return {
      x: region.x,
      y: region.y,
      w: region.x2 - region.x,
      h: region.y2 - region.y,
    };
  }
}

// Optimized draw function
function draw() {
  const dirtyRegion = dirtyManager.getDirtyRegion();

  if (dirtyRegion === null) {
    // Full redraw
    clear();
    drawAll();
  } else if (dirtyRegion.w > 0 && dirtyRegion.h > 0) {
    // Partial redraw
    ctx.save();
    ctx.beginPath();
    ctx.rect(dirtyRegion.x, dirtyRegion.y, dirtyRegion.w, dirtyRegion.h);
    ctx.clip();
    ctx.clearRect(dirtyRegion.x, dirtyRegion.y, dirtyRegion.w, dirtyRegion.h);
    drawRegion(dirtyRegion);
    ctx.restore();
  }
  // else: nothing to redraw
}
```

### Impact

- 50-80% reduction in rendering work for typical interactions
- Smoother animations
- Better mobile battery life
- Improved perceived performance

---

## Issue: Synchronous Data Loading Blocks Rendering

**Priority**: High  
**Category**: Performance, UX  
**Effort**: Medium

### Current State

Data loading happens synchronously in the initialization chain:

```javascript
// endings-builder/index.js
const ITEMS = await loadItems(); // Top-level await blocks everything
// ...
let strings = await loadStrings();

// app.js
async function startInit() {
  try {
    await loadTranslations(currentLang); // Blocks
  } catch (e) {
    /* ... */
  }

  try {
    await loadVocabulary('lv', target); // Blocks
  } catch (e) {
    /* ... */
  }

  initializeGame(); // Only runs after all loading
}
```

### Problem

- User sees blank/loading screen longer than necessary
- Resources loaded sequentially instead of in parallel
- No progressive rendering during load
- Poor perceived performance

### Recommendation

Implement parallel loading with progressive rendering:

```javascript
// src/lib/loader.js
export async function loadWithProgress(tasks, onProgress) {
  const total = tasks.length;
  let completed = 0;
  const results = [];

  await Promise.all(
    tasks.map(async (task, index) => {
      try {
        const result = await task.load();
        results[index] = { status: 'fulfilled', value: result };
      } catch (error) {
        results[index] = { status: 'rejected', reason: error };
      }

      completed++;
      onProgress({
        completed,
        total,
        percent: (completed / total) * 100,
        label: task.label,
      });
    }),
  );

  return results;
}

// Usage
async function startInit() {
  showLoadingUI();

  const tasks = [
    { label: 'Translations', load: () => loadTranslations(currentLang) },
    { label: 'Vocabulary', load: () => loadVocabulary('lv', target) },
    { label: 'Offline Data', load: () => loadOfflineFallback() },
  ];

  const results = await loadWithProgress(tasks, (progress) => {
    updateLoadingBar(progress.percent);
    updateLoadingText(`Loading ${progress.label}...`);
  });

  // Handle partial failures gracefully
  const [translationsResult, vocabularyResult] = results;

  if (translationsResult.status === 'rejected') {
    console.warn('Using fallback translations');
    applyFallbackTranslations();
  }

  hideLoadingUI();
  initializeGame();
}
```

### Impact

- Faster perceived load time
- Visual feedback during loading
- Parallel resource fetching
- Graceful degradation on failures

---

## Issue: No Asset Preloading

**Priority**: Medium  
**Category**: Performance, Loading  
**Effort**: Small

### Current State

Assets are loaded on demand when games are started:

```javascript
// travel-tracker/index.js
const MAP_PATH = 'assets/img/travel-tracker/latvia.svg';
// Loaded only when game starts

// No preload hints in HTML
```

### Problem

- Delay when starting a game for the first time
- No hint to browser about critical assets
- Network waterfall delays

### Recommendation

Add resource hints to HTML:

```html
<head>
  <!-- Preconnect to CDNs -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin />

  <!-- DNS prefetch as fallback -->
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />

  <!-- Preload critical assets -->
  <link rel="preload" href="i18n/lv.json" as="fetch" crossorigin />
  <link rel="preload" href="data/lv-en/units.json" as="fetch" crossorigin />

  <!-- Prefetch game-specific assets (lower priority) -->
  <link rel="prefetch" href="assets/img/travel-tracker/latvia.svg" />
  <link rel="prefetch" href="data/travel-tracker/routes.json" />
</head>
```

Also implement programmatic preloading:

```javascript
// src/lib/preloader.js
const preloadCache = new Map();

export function preloadAsset(url, type = 'fetch') {
  if (preloadCache.has(url)) {
    return preloadCache.get(url);
  }

  let promise;

  switch (type) {
    case 'image':
      promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
      break;

    case 'fetch':
    default:
      promise = fetch(url).then((res) => res.clone());
  }

  preloadCache.set(url, promise);
  return promise;
}

// Preload when user hovers over game link
document.querySelectorAll('[data-game]').forEach((link) => {
  link.addEventListener(
    'mouseenter',
    () => {
      const game = link.dataset.game;
      preloadGameAssets(game);
    },
    { once: true },
  );
});
```

### Impact

- Faster game startup
- Better resource utilization
- Improved user experience
- Reduced perceived wait time

---

## Issue: Large Inline Event Handlers

**Priority**: Medium  
**Category**: Performance, Memory  
**Effort**: Small

### Current State

Event handlers are created inline in loops:

```javascript
// src/lib/match.js
function drawColumn(items, x, side) {
  for (let i = 0; i < items.length; i++) {
    // New function created for each item on every render
    const handler = () => handleSelection(side, it, y + boxH / 2);
    clickables.push({ x, y, w: boxW, h: boxH, tag: `${side}:${i}`, data: it, onClick: handler });

    // DOM elements created on every render
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.addEventListener('click', () => handleSelection(side, it));
  }
}
```

### Problem

- New function objects created on every render
- DOM elements created and discarded repeatedly
- Memory churn triggers garbage collection
- Performance degradation on frequent redraws

### Recommendation

Use event delegation and stable references:

```javascript
// Stable handler using data lookup
function handleCanvasClick(e) {
  const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
  const hit = hitAt(x, y);

  if (hit && hit.onClick) {
    // Handler looks up current state instead of capturing it
    const data = getCurrentItemData(hit.tag);
    processSelection(data);
  }
}

// Single event listener on canvas
canvas.addEventListener('click', handleCanvasClick);

// For accessibility DOM elements, use document-level delegation
document.getElementById('sr-game-state').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-item-key]');
  if (button) {
    const key = button.dataset.itemKey;
    const side = button.dataset.side;
    processSelection({ key, side });
  }
});

// Render accessibility buttons once, update content
function updateAccessibilityList(items, side) {
  const container = document.getElementById(`sr-list-${side}`);

  items.forEach((item, index) => {
    let button = container.children[index];

    if (!button) {
      // Create only if doesn't exist
      button = document.createElement('button');
      button.dataset.side = side;
      container.appendChild(button);
    }

    button.textContent = item.txt;
    button.dataset.itemKey = item.key;
    button.disabled = state.matchState.solved.has(item.key);
  });

  // Remove extra buttons
  while (container.children.length > items.length) {
    container.lastChild.remove();
  }
}
```

### Impact

- Reduced memory allocation
- Fewer garbage collection pauses
- Smoother animations
- Better mobile performance

---

## Issue: No Request Caching Strategy

**Priority**: Medium  
**Category**: Performance, Network  
**Effort**: Small

### Current State

Fetch requests include `cache: 'no-store'`:

```javascript
// travel-tracker/index.js
async function loadJSON(path) {
  const res = await fetch(assetUrl(path), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
```

### Problem

- Forces network request every time
- No benefit from browser cache
- Slower repeat visits
- Higher data usage

### Recommendation

Implement smart caching with versioning:

```javascript
// src/lib/fetch-with-cache.js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `llb1-${CACHE_VERSION}`;

export async function fetchWithCache(url, options = {}) {
  const {
    maxAge = 3600000, // 1 hour default
    forceNetwork = false,
  } = options;

  // Check memory cache first
  const cached = await getCached(url);

  if (cached && !forceNetwork) {
    const age = Date.now() - cached.timestamp;

    if (age < maxAge) {
      return cached.data;
    }

    // Stale-while-revalidate: return cached, update in background
    fetchAndCache(url);
    return cached.data;
  }

  return fetchAndCache(url);
}

async function getCached(url) {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const data = await response.json();
      const timestamp = parseInt(response.headers.get('x-cached-at') || '0');
      return { data, timestamp };
    }
  }
  return null;
}

async function fetchAndCache(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);

  const data = await response.json();

  // Cache for future use
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    const headers = new Headers(response.headers);
    headers.set('x-cached-at', Date.now().toString());

    const cachedResponse = new Response(JSON.stringify(data), {
      headers,
      status: 200,
    });
    cache.put(url, cachedResponse);
  }

  return data;
}
```

### Impact

- Faster repeat visits
- Reduced network usage
- Works offline after first load
- Better mobile experience

---

## Issue: Font Loading Not Optimized

**Priority**: Low  
**Category**: Performance, CLS  
**Effort**: Small

### Current State

The app waits for fonts before initializing:

```javascript
// app.js
if (document.fonts && document.fonts.ready) {
  const ready = Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  ready.then(() => setTimeout(startGame, 50)).catch(startGame);
}
```

### Problem

- Delay waiting for fonts
- Potential layout shift when fonts load
- Uses external font from CDN

### Recommendation

Optimize font loading:

```html
<head>
  <!-- Preload critical font -->
  <link
    rel="preload"
    href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.13.1/fonts/bootstrap-icons.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- Font-display swap for system fonts -->
  <style>
    @font-face {
      font-family: 'Bootstrap Icons';
      font-display: swap;
      src: url('https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.13.1/fonts/bootstrap-icons.woff2')
        format('woff2');
    }
  </style>
</head>
```

Use system font stack (already in use, which is good):

```css
font-family:
  system-ui,
  Segoe UI,
  Roboto,
  Helvetica,
  Arial,
  sans-serif;
```

### Impact

- Faster initial render
- No layout shift from font swap
- Better Core Web Vitals scores

---

## Issue: No Image Optimization

**Priority**: Low  
**Category**: Performance, Assets  
**Effort**: Medium

### Current State

SVG files used for maps and icons. No evidence of optimization.

### Recommendation

1. Optimize SVGs:

```bash
# Install SVGO
npm install -g svgo

# Optimize all SVGs
svgo -r assets/img/
```

2. Add build script:

```javascript
// scripts/optimize-assets.js
import { optimize } from 'svgo';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const svgoConfig = {
  plugins: ['preset-default', 'removeDimensions', { name: 'removeViewBox', active: false }],
};

async function optimizeSvgs(dir) {
  const files = await readdir(dir, { recursive: true });

  for (const file of files) {
    if (file.endsWith('.svg')) {
      const path = join(dir, file);
      const content = await readFile(path, 'utf-8');
      const result = optimize(content, svgoConfig);
      await writeFile(path, result.data);
      console.log(`Optimized: ${file}`);
    }
  }
}

optimizeSvgs('assets/img');
```

### Impact

- Reduced asset size
- Faster loading
- Lower bandwidth usage

---

## Performance Metrics to Track

### Core Web Vitals

| Metric                         | Target  | Current (Estimated) |
| ------------------------------ | ------- | ------------------- |
| LCP (Largest Contentful Paint) | < 2.5s  | ~2s ✅              |
| FID (First Input Delay)        | < 100ms | ~50ms ✅            |
| CLS (Cumulative Layout Shift)  | < 0.1   | ~0.05 ✅            |
| TTFB (Time to First Byte)      | < 600ms | Varies              |

### Custom Metrics to Add

```javascript
// src/lib/performance.js
export function trackPerformance() {
  // Time to Interactive
  const tti = performance.now();
  console.log(`Time to Interactive: ${tti.toFixed(0)}ms`);

  // Game load time
  performance.mark('game-load-start');
  // ... after loading
  performance.mark('game-load-end');
  performance.measure('game-load', 'game-load-start', 'game-load-end');

  // Frame rate during game
  let frames = 0;
  let lastTime = performance.now();

  function measureFps() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      console.log(`FPS: ${frames}`);
      frames = 0;
      lastTime = now;
    }
    requestAnimationFrame(measureFps);
  }
}
```

---

## Summary Table

| Issue                 | Priority | Effort | Impact                  |
| --------------------- | -------- | ------ | ----------------------- |
| Full Canvas Redraws   | High     | Medium | 50-80% render reduction |
| Synchronous Loading   | High     | Medium | Faster perceived load   |
| No Asset Preloading   | Medium   | Small  | Faster game startup     |
| Inline Event Handlers | Medium   | Small  | Less memory churn       |
| No Request Caching    | Medium   | Small  | Faster repeat visits    |
| Font Loading          | Low      | Small  | Better CWV scores       |
| Image Optimization    | Low      | Medium | Smaller assets          |
