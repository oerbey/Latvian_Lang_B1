import { shuffle } from '../../lib/utils.js';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function dedupeKey(entry) {
  return `${entry.en.toLocaleLowerCase('en-US')}|${entry.lv.toLocaleLowerCase('lv-LV')}`;
}

/**
 * Normalize `data/lv-en/units/*.json` payloads into deduplicated EN->LV pairs.
 *
 * @param {unknown[]} unitPayloads
 * @returns {Array<{id: string, en: string, lv: string, unit: string, tags: string[]}>}
 */
export function normalizeLvEnUnits(unitPayloads) {
  if (!Array.isArray(unitPayloads)) return [];
  const seen = new Set();
  const rows = [];

  for (const payload of unitPayloads) {
    const unit = normalizeText(payload?.name);
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];

    for (const item of entries) {
      const en = normalizeText(item?.translations?.en);
      const lv = normalizeText(item?.translations?.lv);
      if (!en || !lv) continue;

      const entry = {
        id: '',
        en,
        lv,
        unit,
        tags: Array.isArray(item?.tags)
          ? item.tags
              .map((tag) => normalizeText(tag))
              .filter((tag, idx, source) => tag && source.indexOf(tag) === idx)
          : [],
      };

      const key = dedupeKey(entry);
      if (seen.has(key)) continue;
      seen.add(key);
      entry.id = `lv-en-${rows.length + 1}`;
      rows.push(entry);
    }
  }

  return rows;
}

function uniqueDistractors(promptEntry, entries) {
  const promptLv = promptEntry.lv.toLocaleLowerCase('lv-LV');
  const promptEn = promptEntry.en.toLocaleLowerCase('en-US');
  const byLv = new Map();

  for (const item of entries) {
    if (!item || item.id === promptEntry.id) continue;
    const lv = normalizeText(item.lv);
    const en = normalizeText(item.en);
    if (!lv || !en) continue;
    const lvKey = lv.toLocaleLowerCase('lv-LV');
    if (lvKey === promptLv) continue;
    if (en.toLocaleLowerCase('en-US') === promptEn) continue;
    if (!byLv.has(lvKey)) byLv.set(lvKey, item);
  }

  return Array.from(byLv.values());
}

/**
 * Build one game round around a prompt pair.
 *
 * @param {{id: string, en: string, lv: string}} promptEntry
 * @param {Array<{id: string, en: string, lv: string}>} entries
 * @param {() => number} [rng]
 * @param {number} [optionCount]
 * @returns {{prompt: {id: string, en: string, lv: string}, options: Array<{entryId: string, lv: string, isCorrect: boolean}>}}
 */
export function buildRound(promptEntry, entries, rng = Math.random, optionCount = 3) {
  if (!promptEntry || !Array.isArray(entries) || entries.length === 0) {
    return { prompt: promptEntry, options: [] };
  }

  const maxOptions = Math.max(2, Math.floor(optionCount));
  const distractors = shuffle(uniqueDistractors(promptEntry, entries), rng).slice(
    0,
    maxOptions - 1,
  );

  if (distractors.length < maxOptions - 1) {
    const fallback = shuffle(
      entries.filter(
        (item) =>
          item?.id !== promptEntry.id &&
          normalizeText(item?.lv).toLocaleLowerCase('lv-LV') !==
            normalizeText(promptEntry?.lv).toLocaleLowerCase('lv-LV'),
      ),
      rng,
    );

    for (const item of fallback) {
      if (distractors.length >= maxOptions - 1) break;
      if (!distractors.some((candidate) => candidate.id === item.id)) {
        distractors.push(item);
      }
    }
  }

  const options = shuffle(
    [
      {
        entryId: promptEntry.id,
        lv: promptEntry.lv,
        isCorrect: true,
      },
      ...distractors.slice(0, maxOptions - 1).map((item) => ({
        entryId: item.id,
        lv: item.lv,
        isCorrect: false,
      })),
    ],
    rng,
  );

  return {
    prompt: promptEntry,
    options,
  };
}
