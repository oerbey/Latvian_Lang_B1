import { assetUrl } from '../../lib/paths.js';
import { setTrustedHTML } from '../../lib/safeHtml.js';

export async function fetchJSON(path) {
  const url = assetUrl(path);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

export async function loadText(path) {
  const url = assetUrl(path);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}

export async function loadStrings(lang) {
  const langToTry = [lang, 'en'];
  for (const code of langToTry) {
    try {
      const payload = await fetchJSON(`i18n/${code}.json`);
      if (payload?.travelTracker) {
        return { data: payload.travelTracker, lang: code };
      }
      throw new Error(`Missing travelTracker strings in i18n/${code}.json`);
    } catch (err) {
      console.warn(`Travel tracker strings unavailable for ${code}`, err);
    }
  }
  throw new Error('Travel tracker strings missing');
}

export async function loadMap(selectors, mapPath) {
  const markup = await loadText(mapPath);
  setTrustedHTML(selectors.mapInner, markup);
  const svg = selectors.mapInner.querySelector('svg');
  if (!svg) {
    throw new Error('Latvia SVG missing');
  }

  let viewBox = { width: 800, height: 500 };
  if (svg.hasAttribute('viewBox')) {
    const parts = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    viewBox = { width: parts[2], height: parts[3] };
  } else {
    const w = Number(svg.getAttribute('width') || 800);
    const h = Number(svg.getAttribute('height') || 500);
    viewBox = { width: w, height: h };
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  const cityCoords = new Map();
  svg.querySelectorAll('[data-city]').forEach((node) => {
    const name = node.getAttribute('data-city');
    const cx = Number(node.getAttribute('cx') || node.getAttribute('x'));
    const cy = Number(node.getAttribute('cy') || node.getAttribute('y'));
    if (name && Number.isFinite(cx) && Number.isFinite(cy)) {
      cityCoords.set(name.trim(), { x: cx, y: cy });
    }
  });

  const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.setAttribute('viewBox', `0 0 ${viewBox.width} ${viewBox.height}`);
  overlaySvg.setAttribute('aria-hidden', 'true');
  overlaySvg.setAttribute('focusable', 'false');
  selectors.routeLayer.replaceChildren();
  selectors.routeLayer.appendChild(overlaySvg);
  selectors.bus.classList.add('travel-map__bus--hidden');

  return { overlaySvg, viewBox, cityCoords };
}
