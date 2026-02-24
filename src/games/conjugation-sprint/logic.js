const PRONOUNS = ['es', 'tu', 'viņš/viņa', 'mēs', 'jūs', 'viņi/viņas'];
const SLOT_BY_PRONOUN = {
  es: '1s',
  tu: '2s',
  'viņš/viņa': '3s',
  mēs: '1p',
  jūs: '2p',
  'viņi/viņas': '3p',
};
const TENSES = ['present', 'past', 'future'];
const INVALID_FORMS = new Set(['', '-', '–', '—']);

export const PACE_MODES = ['timed', 'untimed'];

function shuffle(values) {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isValidForm(form) {
  if (typeof form !== 'string') return false;
  const normalized = form.trim();
  if (INVALID_FORMS.has(normalized)) return false;
  return normalized.length > 0;
}

function normalizeMode(mode) {
  return TENSES.includes(mode) ? mode : 'random';
}

export function buildPromptPool(items, tenseMode = 'random') {
  const mode = normalizeMode(tenseMode);
  const allowedTenses = mode === 'random' ? TENSES : [mode];
  if (!Array.isArray(items)) return [];

  const prompts = [];
  items.forEach((verb, verbIndex) => {
    const lv = typeof verb?.lv === 'string' ? verb.lv.trim() : '';
    if (!lv) return;

    allowedTenses.forEach((tense) => {
      const table = verb?.conj?.[tense];
      if (!table || typeof table !== 'object') return;

      PRONOUNS.forEach((pronoun) => {
        const slot = SLOT_BY_PRONOUN[pronoun];
        const raw = table[slot];
        if (!isValidForm(raw)) return;

        prompts.push({
          key: `${verbIndex}:${tense}:${slot}`,
          verbIndex,
          lv,
          en: typeof verb?.en === 'string' ? verb.en : '',
          tense,
          pronoun,
          slot,
          correct: raw.trim(),
        });
      });
    });
  });

  return prompts;
}

function addUnique(bucket, value) {
  if (!isValidForm(value)) return;
  const clean = value.trim();
  if (!bucket.includes(clean)) {
    bucket.push(clean);
  }
}

export function buildOptions(prompt, promptPool) {
  if (!prompt || !Array.isArray(promptPool)) return [];

  const distractors = [];

  promptPool.forEach((candidate) => {
    if (!candidate || candidate.key === prompt.key) return;
    if (candidate.verbIndex !== prompt.verbIndex) return;
    if (candidate.tense !== prompt.tense) return;
    addUnique(distractors, candidate.correct);
  });

  if (distractors.length < 3) {
    promptPool.forEach((candidate) => {
      if (!candidate || candidate.key === prompt.key) return;
      if (candidate.verbIndex === prompt.verbIndex) return;
      if (candidate.tense !== prompt.tense || candidate.slot !== prompt.slot) return;
      addUnique(distractors, candidate.correct);
    });
  }

  if (distractors.length < 3) {
    promptPool.forEach((candidate) => {
      if (!candidate || candidate.key === prompt.key) return;
      if (candidate.tense !== prompt.tense) return;
      addUnique(distractors, candidate.correct);
    });
  }

  if (distractors.length < 3) {
    promptPool.forEach((candidate) => {
      if (!candidate || candidate.key === prompt.key) return;
      addUnique(distractors, candidate.correct);
    });
  }

  const filteredDistractors = distractors.filter((form) => form !== prompt.correct);
  if (filteredDistractors.length < 3) return [];

  return shuffle([prompt.correct, ...filteredDistractors.slice(0, 3)]);
}

export function calculateScoreDelta({ result, paceMode = 'timed', remainingMs = 0 }) {
  if (result === 'correct') {
    let bonus = 0;
    if (paceMode === 'timed') {
      if (remainingMs >= 5000) {
        bonus = 2;
      } else if (remainingMs >= 2000) {
        bonus = 1;
      }
    }
    return 2 + bonus;
  }

  if (result === 'wrong' || result === 'skip' || result === 'timeout') {
    return -1;
  }

  return 0;
}

export function normalizePaceMode(mode) {
  return PACE_MODES.includes(mode) ? mode : 'timed';
}

export const CONJUGATION_SPRINT_CONSTANTS = {
  PRONOUNS,
  SLOT_BY_PRONOUN,
  TENSES,
};
