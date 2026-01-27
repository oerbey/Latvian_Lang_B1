# Performance Optimization

**Date:** January 20, 2026  
**Category:** Performance

---

## 🔍 Current Performance Profile

- **Bundle size:** No bundling, raw ES modules (~50+ network requests)
- **Rendering:** HTML5 Canvas with manual redraw management
- **Data loading:** JSON fetched at game initialization
- **Caching:** Service worker with stale-while-revalidate

---

## 🟠 High Priority Issues

### 1. Canvas Render Loop Inefficiency

**Location:** `src/lib/render.js:87-92`

```javascript
export function renderConfetti() {
  if (!bursts.length) return false;
  bursts.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.vy += 0.06;
    b.life--;
  });
  bursts = bursts.filter((b) => b.life > 0);
  // ...
  return bursts.length > 0;
}
```

**Problems:**

- Creates new array on every frame with `filter()`
- No use of `requestAnimationFrame` ID tracking
- Potential memory leaks if animation runs indefinitely

**Recommendation:**

```javascript
let animationFrameId = null;

export function startConfetti(count) {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  const animate = () => {
    updateBursts();
    renderBursts();
    if (bursts.length > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}

function updateBursts() {
  let writeIndex = 0;
  for (let i = 0; i < bursts.length; i++) {
    const b = bursts[i];
    b.x += b.vx;
    b.y += b.vy;
    b.vy += 0.06;
    b.life--;
    if (b.life > 0) {
      bursts[writeIndex++] = b;
    }
  }
  bursts.length = writeIndex; // Reuse array
}
```

### 2. Module Loading Waterfall

**Problem:** Many small ES module files create request waterfall

**Current:** 50+ HTTP requests for a single game

**Recommendation:** Consider esbuild/rollup for production builds:

```javascript
// package.json
{
  "scripts": {
    "build:prod": "esbuild app.js --bundle --outdir=dist --format=esm"
  }
}
```

Keep raw modules for development:

```javascript
// Different entry points
"dev": "http-server . -p 5173",
"prod": "http-server dist -p 8080"
```

---

## 🟡 Medium Priority Issues

### 3. Large JSON Data Loading

**Location:** `data/words.json` — 3,818 lines, ~150KB

**Problem:** Full vocabulary loaded even if only subset needed

**Recommendation:**

- Split data by game/unit
- Implement lazy loading per game
- Consider IndexedDB for large datasets:

```javascript
async function loadVocabulary(gameId) {
  const cached = await idb.get('vocabulary', gameId);
  if (cached && !isStale(cached)) return cached.data;

  const fresh = await fetch(`/data/${gameId}/items.json`);
  await idb.put('vocabulary', { id: gameId, data: fresh, timestamp: Date.now() });
  return fresh;
}
```

### 4. Canvas Redraw Frequency

**Problem:** Full canvas redraw on every state change

**Location:** `src/lib/state.js:37`

```javascript
export function triggerRedraw() {
  redraw();
}
```

**Recommendation:**

- Implement dirty regions
- Use `requestAnimationFrame` throttling
- Consider partial redraws:

```javascript
const dirtyRegions = new Set();

function markDirty(region) {
  dirtyRegions.add(region);
  scheduleRedraw();
}

const scheduleRedraw = debounce(() => {
  requestAnimationFrame(() => {
    dirtyRegions.forEach((region) => renderRegion(region));
    dirtyRegions.clear();
  });
}, 16); // ~60fps
```

### 5. Font Rendering Performance

**Location:** `src/lib/render.js:65-73`

```javascript
export function drawText(txt, x, y, opts = {}) {
  // Complex font size calculation on every call
  const baseFontSize = parseInt(opts.font) || 16;
  const isMobile = scale < 0.7;
  // ...
}
```

**Recommendation:**

- Cache computed font sizes
- Precompute on resize, not on every draw
- Use consistent font stacks

### 6. Image Loading for Games

**Problem:** SVG and image assets loaded without preloading

**Locations:**

- `travel-tracker` — SVG map loaded on demand
- `maini-vai-mainies` — Avatar images loaded per state change

**Recommendation:**

```javascript
// Preload critical images
const imageCache = new Map();

async function preloadImages(paths) {
  await Promise.all(
    paths.map((path) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imageCache.set(path, img);
          resolve();
        };
        img.onerror = reject;
        img.src = assetUrl(path);
      });
    }),
  );
}

// Call during game init
await preloadImages([
  'assets/img/avatar-neutral.svg',
  'assets/img/avatar-happy.svg',
  'assets/img/avatar-thinking.svg',
]);
```

---

## 🟢 Low Priority Issues

### 7. CSS Bundle Size

**Problem:** Bootstrap 5 CSS loaded in full (~200KB minified)

**Recommendation:**

- Use PurgeCSS to remove unused styles
- Or use Bootstrap's Sass imports for only needed components:

```scss
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/grid';
@import 'bootstrap/scss/buttons';
// Only what's needed
```

### 8. Service Worker Cache Strategy

**Location:** `sw.js:79-100`

**Problem:** Stale-while-revalidate may serve outdated code

**Recommendation:**

- Implement cache versioning in filenames
- Add cache busting for critical JS/CSS
- Consider workbox for more sophisticated strategies:

```javascript
// sw.js with cache-first for immutable assets
if (url.pathname.includes('.v')) {
  event.respondWith(caches.match(request).then((r) => r || fetch(request)));
}
```

---

## 📊 Performance Metrics to Track

| Metric                   | Target  | Current (Estimated) |
| ------------------------ | ------- | ------------------- |
| First Contentful Paint   | < 1.5s  | ~2s                 |
| Time to Interactive      | < 3s    | ~4s                 |
| Largest Contentful Paint | < 2.5s  | ~3s                 |
| Total Blocking Time      | < 200ms | ~300ms              |
| Cumulative Layout Shift  | < 0.1   | ~0.15               |
| Bundle Size (gzipped)    | < 100KB | N/A (no bundling)   |
| Network Requests         | < 20    | 50+                 |

---

## 🛠️ Recommended Tools

| Tool            | Purpose                   |
| --------------- | ------------------------- |
| Lighthouse      | Performance auditing      |
| esbuild         | Fast bundling             |
| PurgeCSS        | CSS tree-shaking          |
| workbox         | Service worker management |
| Chrome DevTools | Profiling                 |

---

## 📎 Related Documents

- [Platform & Tooling](./07-platform-and-tooling.md)
- [Mobile & PWA](./11-mobile-pwa.md)
