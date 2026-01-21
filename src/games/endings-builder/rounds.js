import { shuffle } from '../../lib/utils.js';
import { getEnding, getTable } from './endings-resolver.js';

export function buildFullForm(stem, ending) {
  if (ending === '-!') return stem;
  const suffix = ending.startsWith('-') ? ending.slice(1) : ending;
  return `${stem}${suffix}`;
}

export function buildRounds(items) {
  const rounds = [];
  for (const item of items) {
    for (const gram of item.grams) {
      const ending = getEnding({ pos: item.pos, schema: item.schema, gram });
      if (!ending) continue;
      const id = `${item.id}|${gram.case}|${gram.number}${gram.gender ? '|' + gram.gender : ''}`;
      rounds.push({
        id,
        item,
        gram,
        ending,
        fullForm: buildFullForm(item.stem, ending)
      });
    }
  }
  return rounds;
}

export function buildOptions(round, items) {
  const values = new Set();
  const table = getTable(round.item.pos, round.item.schema);
  if (table) {
    for (const entry of Object.values(table)) {
      for (const val of Object.values(entry)) {
        if (typeof val === 'string') values.add(val);
      }
    }
  }
  const choices = [...values].filter(v => v != null);
  const correct = round.ending;
  const filtered = shuffle(choices.filter(v => v !== correct));
  const needed = Math.max(0, 3 - filtered.length);
  if (needed > 0) {
    const global = shuffle(collectGlobalEndings(items, correct));
    filtered.push(...global.slice(0, needed));
  }
  const picked = shuffle([correct, ...filtered.slice(0, 3)]);
  return picked;
}

function collectGlobalEndings(items, skip) {
  const vals = new Set();
  const tables = items.map(item => getTable(item.pos, item.schema)).filter(Boolean);
  for (const table of tables) {
    for (const entry of Object.values(table)) {
      for (const val of Object.values(entry)) {
        if (typeof val === 'string' && val !== skip) vals.add(val);
      }
    }
  }
  return [...vals];
}
