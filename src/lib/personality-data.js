import { assetUrl } from './paths.js';

function parseEnVariants(value) {
  if (typeof value !== 'string') return [];
  const parts = value.includes(';') ? value.split(';') : value.split(' / ');
  return parts.map((part) => part.trim()).filter(Boolean);
}

function normalizeEn(value) {
  const parts = parseEnVariants(value);
  return parts.join(' / ');
}

export async function loadPersonalityWords() {
  const url = assetUrl('data/personality/words.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const payload = await res.json();
  const source = Array.isArray(payload) ? payload : [];
  const rows = source
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const lv = typeof item.lv === 'string' ? item.lv.trim() : '';
      const rawEn = typeof item.en === 'string' ? item.en : '';
      const en = normalizeEn(rawEn);
      if (!id || !lv || !en) return null;
      const enVariants = parseEnVariants(en);
      return {
        id,
        lv,
        en,
        enVariants,
        group: typeof item.group === 'string' ? item.group.trim().toLowerCase() : '',
        notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      };
    })
    .filter(Boolean);
  if (!rows.length) throw new Error('Dati nav atrasti.');
  return rows;
}
