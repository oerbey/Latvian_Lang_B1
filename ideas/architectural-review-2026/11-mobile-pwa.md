# Mobile & PWA Improvements

**Date:** January 20, 2026  
**Category:** Mobile Experience & Progressive Web App

---

## 🔍 Current PWA Status

| Feature | Status | Notes |
|---------|--------|-------|
| Web App Manifest | ✅ Present | `manifest.json` |
| Service Worker | ✅ Registered | `sw.js` |
| Icons | ❌ Empty | No icons defined |
| Offline Support | ⚠️ Partial | Core assets cached |
| Add to Home Screen | ⚠️ Limited | No icons = poor experience |
| Theme Color | ✅ Defined | `#0e0f13` |
| Viewport | ✅ Configured | Responsive meta tag |

---

## 🔴 Critical Issues

### 1. PWA Manifest Missing Icons
**Location:** `manifest.json:8`

```json
{
  "name": "Latvian Language B1",
  "short_name": "Latvian B1",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0e0f13",
  "theme_color": "#0e0f13",
  "icons": []  // ← EMPTY!
}
```

**Problem:** 
- Can't install as PWA on mobile
- No home screen icon
- Browser will use generic icon or favicon

**Recommendation:** Add multiple icon sizes:
```json
{
  "icons": [
    {
      "src": "assets/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "assets/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Create icons using tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

---

## 🟠 High Priority Issues

### 2. Service Worker Cache Incomplete
**Location:** `sw.js:5-30`

**Current cached assets:**
```javascript
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  // ... some core files
  './conjugation-sprint.html',
  // Missing many game HTML files!
];
```

**Missing from cache:**
- `travel-tracker.html`
- `duty-dispatcher.html`
- `passive-lab.html`
- `decl6-detective.html`
- Game-specific JS modules
- Game-specific data files

**Recommendation:** Cache all game assets:
```javascript
const CORE_ASSETS = [
  // Core
  './',
  './index.html',
  './styles.css',
  './theme.js',
  './app.js',
  './manifest.json',
  
  // All game pages
  './conjugation-sprint.html',
  './travel-tracker.html',
  './duty-dispatcher.html',
  './passive-lab.html',
  './decl6-detective.html',
  './maini-vai-mainies.html',
  './endings-builder.html',
  './character-traits.html',
  './rakstura-ipasibas-match.html',
  './week1.html',
  
  // Game modules
  './src/games/travel-tracker/index.js',
  './src/games/duty-dispatcher/index.js',
  // ... etc
  
  // Data files
  './data/words.json',
  './data/travel-tracker/routes.json',
  './data/duty-dispatcher/roles.json',
  './data/duty-dispatcher/tasks.json',
  // ... etc
];
```

Or use dynamic caching approach:
```javascript
self.addEventListener('fetch', event => {
  // Cache JSON data on first access
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
  }
});
```

---

## 🟡 Medium Priority Issues

### 3. iOS Safari Touch Issues
**Location:** `styles.css:120-133`, `scripts/page-init.js:12-78`

**Problem:** Complex anti-scroll-trap code suggests ongoing touch handling issues

**Symptoms likely include:**
- Scroll bounce/rubber-banding issues
- Touch events not registering
- Page getting stuck

**Recommendation:** Simplify touch handling:
```css
/* Prefer CSS-only solutions */
html, body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

/* Avoid overflow:hidden on body */
body {
  overflow-y: auto;
  touch-action: pan-y;
}

/* Game containers should manage their own touch */
.game-container {
  touch-action: none;
  overflow: hidden;
}
```

### 4. No Splash Screen
**Problem:** PWA shows blank screen while loading

**Recommendation:** Add splash screen configuration:
```json
// manifest.json
{
  "background_color": "#0e0f13",
  "theme_color": "#0e0f13",
  // Add larger icon for splash
  "icons": [
    {
      "src": "assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

For iOS, add Apple-specific tags:
```html
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Latvian B1">

<!-- iOS splash screens -->
<link rel="apple-touch-startup-image" href="assets/splash/iphone.png" media="(device-width: 375px)">
```

### 5. Offline Detection UX
**Problem:** Users may not know they're offline or using cached content

**Current:** Some fallback handling exists, but no clear indication

**Recommendation:**
```javascript
// Add offline detection
window.addEventListener('online', () => showStatus('Back online'));
window.addEventListener('offline', () => showStatus('You are offline'));

function showStatus(message) {
  const toast = document.createElement('div');
  toast.className = 'offline-toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

```css
.offline-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
}
```

---

## 🟢 Low Priority Issues

### 6. No Share API Integration
**Opportunity:** Allow users to share scores/achievements

```javascript
async function shareScore(gameTitle, score) {
  if (!navigator.share) return false;
  
  try {
    await navigator.share({
      title: `${gameTitle} - Latvian B1`,
      text: `I scored ${score} points in ${gameTitle}!`,
      url: window.location.href,
    });
    return true;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Share failed', err);
    }
    return false;
  }
}
```

### 7. Push Notifications (Future)
**Opportunity:** Remind users to practice daily

**Note:** Requires backend service for push notifications

### 8. Background Sync (Future)
**Opportunity:** Sync progress when back online

```javascript
// In service worker
self.addEventListener('sync', event => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgressToServer());
  }
});
```

---

## 📱 Mobile Testing Matrix

| Device Type | OS | Browser | Priority |
|-------------|-----|---------|----------|
| iPhone SE | iOS 17 | Safari | High |
| iPhone 14 | iOS 17 | Safari | High |
| Pixel 7 | Android 14 | Chrome | High |
| Samsung S23 | Android 14 | Samsung Internet | Medium |
| iPad | iPadOS 17 | Safari | Medium |
| Older Android | Android 11 | Chrome | Low |

---

## 📊 PWA Audit Checklist

| Requirement | Status | Action |
|-------------|--------|--------|
| Valid manifest.json | ⚠️ | Add icons |
| Service worker registered | ✅ | - |
| HTTPS | ✅ | GitHub Pages |
| 192px icon | ❌ | Create |
| 512px icon | ❌ | Create |
| Installable | ❌ | After icons |
| Offline fallback | ⚠️ | Expand cache |
| Fast loading | ⚠️ | Optimize |
| Responsive | ✅ | - |

---

## 📎 Related Documents

- [Performance Optimization](./06-performance-optimization.md)
- [UI/UX Improvements](./04-ui-ux-improvements.md)

