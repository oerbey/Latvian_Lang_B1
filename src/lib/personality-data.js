function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

export function parsePersonalityCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  lines.shift(); // header
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    if (cols.length < 4) continue;
    const [id, lv, en, group] = cols;
    if (!id.trim() || !lv.trim() || !en.trim()) continue;
    rows.push({
      id: id.trim(),
      lv: lv.trim(),
      eng: en
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean)
        .join(' / '),
      group: group.trim(),
    });
  }
  return rows;
}

export async function loadPersonalityWords() {
  const res = await fetch(assetUrl('data/personality_words.csv'));
  if (!res.ok) throw new Error('Neizdevās ielādēt CSV');
  const csvText = await res.text();
  const rows = parsePersonalityCsv(csvText);
  if (!rows.length) throw new Error('Dati nav atrasti.');
  return rows;
}
