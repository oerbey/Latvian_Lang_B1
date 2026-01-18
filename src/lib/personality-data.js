import { assetUrl } from './paths.js';

function parseEngVariants(value) {
  if (typeof value !== 'string') return [];
  const parts = value.includes(';') ? value.split(';') : value.split(' / ');
  return parts
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeEng(value) {
  const parts = parseEngVariants(value);
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
      const rawEng = typeof item.eng === 'string' ? item.eng : item.en;
      const eng = normalizeEng(rawEng);
      if (!id || !lv || !eng) return null;
      const enVariants = parseEngVariants(eng);
      return {
        id,
        lv,
        eng,
        en: enVariants.join('; '),
        enVariants,
        group: typeof item.group === 'string' ? item.group.trim().toLowerCase() : '',
        notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      };
    })
    .filter(Boolean);
  if (!rows.length) throw new Error('Dati nav atrasti.');
  return rows;
}
