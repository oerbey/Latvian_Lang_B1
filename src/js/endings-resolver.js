import ENDINGS from '../data/endings.json' with { type: 'json' };

export function getEnding({ pos, schema, gram }) {
  const table = ENDINGS[pos]?.[schema];
  if (!table) return null;

  if (pos === 'nouns') {
    return table[gram.case]?.[gram.number] ?? null;
  }

  const key = `${gram.number}_${gram.gender}`;
  return table[gram.case]?.[key] ?? null;
}

export function getTable(pos, schema) {
  return ENDINGS[pos]?.[schema] ?? null;
}
