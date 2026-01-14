import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'personality', 'words.csv');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'personality', 'words.json');

function splitCsvLine(line) {
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
  return cols;
}

export function normalizeEnglish(value) {
  if (typeof value !== 'string') return '';
  const parts = value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return parts.join(' / ');
}

export function buildPersonalityData(text) {
  const lines = text.split(/\r?\n/);
  if (!lines.length) return { items: [], skipped: [] };
  lines.shift();
  const items = [];
  const skipped = [];
  lines.forEach((line, index) => {
    const lineNumber = index + 2;
    if (!line.trim()) return;
    const cols = splitCsvLine(line);
    if (cols.length < 4) {
      skipped.push({ line: lineNumber, reason: 'missing columns' });
      return;
    }
    const [id, lv, en, group, ...rest] = cols;
    if (!id?.trim() || !lv?.trim() || !en?.trim()) {
      skipped.push({ line: lineNumber, reason: 'missing required fields' });
      return;
    }
    const eng = normalizeEnglish(en);
    if (!eng) {
      skipped.push({ line: lineNumber, reason: 'missing eng after normalization' });
      return;
    }
    items.push({
      id: id.trim(),
      lv: lv.trim(),
      eng,
      group: (group || '').trim(),
      notes: rest.join(',').trim(),
    });
  });

  items.sort((a, b) => a.id.localeCompare(b.id));
  return { items, skipped };
}

async function run() {
  const csvText = await readFile(INPUT_PATH, 'utf8');
  const { items, skipped } = buildPersonalityData(csvText);
  if (!items.length) {
    throw new Error('No valid personality words found.');
  }
  if (skipped.length) {
    const lines = skipped.map((entry) => `${entry.line} (${entry.reason})`).join(', ');
    console.warn(`Skipped ${skipped.length} row(s): ${lines}`);
  }
  const jsonText = `${JSON.stringify(items, null, 2)}\n`;
  await writeFile(OUTPUT_PATH, jsonText, 'utf8');
  console.log(`Wrote ${items.length} items to ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
