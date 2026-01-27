import { assetUrl } from '../../lib/paths.js';

export async function loadItems(path) {
  const url = assetUrl(path);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

export function classifyAlternates(item) {
  const byTense = { present: [], past: [], future: [] };
  (item.alsoAccept || []).forEach((text) => {
    const lower = text.trim().toLowerCase();
    if (lower.startsWith('ir ')) {
      byTense.present.push(text);
    } else if (lower.startsWith('bija ')) {
      byTense.past.push(text);
    } else if (lower.startsWith('būs ')) {
      byTense.future.push(text);
    }
  });
  item.alsoAcceptByTense = byTense;
}

export function patientKey(patient) {
  return `${patient.form}|${patient.gender}.${patient.number}`;
}

export function buildPatientBank(items) {
  const seen = new Map();
  items.forEach((item) => {
    if (!item?.patient) return;
    const key = patientKey(item.patient);
    if (seen.has(key)) return;
    seen.set(key, {
      ...item.patient,
      form: item.patient.form,
      gender: item.patient.gender,
      number: item.patient.number,
      key,
    });
  });
  return Array.from(seen.values());
}
