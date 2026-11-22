import { loadCloudProgressSummary } from '../lib/cloud-progress.js';
import { getCurrentUser, onAuthChange, reconcileAccount } from '../lib/email-auth.js';
import { EXERCISES } from '../lib/exercise-registry.js';
import { openProgressStore } from '../lib/progress-store.js';
import { darbibasVardsProgress } from '../lib/progress/darbibas-vards.js';
import { wordQuestProgress } from '../lib/progress/word-quest.js';
import { WORD_QUEST_NODE_COUNTS } from '../lib/progress/word-quest-worlds.js';
import { readLegacyMatchingProgress } from '../games/darbibas-vards/legacy-progress.js';
import { readLegacyWordQuestProgress } from '../games/word-quest/legacy-progress.js';
import { loadWords } from '../lib/words-data.js';

import { darbibasVardiV2Progress } from '../lib/progress/darbibas-vardi-v2.js';
import { readLegacyV2Progress } from '../games/darbibas-vardi-v2/legacy-progress.js';
import { normalizeVerbs } from '../games/darbibas-vardi-v2/logic.js';

const cards = document.getElementById('progress-cards');
const catalogue = document.getElementById('progress-catalogue');
const notice = document.getElementById('progress-notice');
const retry = document.getElementById('progress-retry');
const language = document.getElementById('progress-language');
const tracked = EXERCISES.filter((exercise) => exercise.tracking === 'cloud');
const translations = window.__LL_I18N__;
let strings = translations.en.myProgress;
let numberFormat;
let percentFormat;
let dateFormat;
let view = { status: 'checking', entries: new Map() };
let request;
let verifiedOwner = null;

const localAdapters = {
  'darbibas-vardi-v2': {
    adapter: darbibasVardiV2Progress,
    legacy: readLegacyV2Progress,
    async summaryContext() {
      const result = await loadWords().catch(() => null);
      return result ? { itemIds: normalizeVerbs(result.items).map(({ id }) => id) } : {};
    },
  },
  'word-quest': {
    adapter: wordQuestProgress,
    legacy: readLegacyWordQuestProgress,
    summaryContext: () => ({ worldNodeCounts: WORD_QUEST_NODE_COUNTS }),
  },
  'darbibas-vards': {
    adapter: darbibasVardsProgress,
    legacy: readLegacyMatchingProgress,
    async summaryContext() {
      const result = await loadWords().catch(() => null);
      return result ? { itemIds: result.items.map((item) => `${item.lv}|${item.en || ''}`) } : {};
    },
  },
};

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function exerciseLink(exercise, status) {
  const label =
    status === 'not-connected' ? 'play' : status === 'not-started' ? 'start' : 'continue';
  const link = element('a', strings[label], 'dp-btn dp-btn--outline');
  link.href = exercise.href;
  link.setAttribute(
    'aria-label',
    strings[`${label}Exercise`].replace('{exercise}', exercise.title),
  );
  return link;
}

function metricValue(key, value) {
  if (key === 'lastPlayedAt') {
    const date = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(date) ? dateFormat.format(date) : null;
  }
  const fractionField = { completion: 'completed', coverage: 'practised', mastery: 'mastered' }[
    key
  ];
  if (fractionField) {
    const count = value?.[fractionField];
    if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !Number.isSafeInteger(value.total) ||
      value.total <= 0 ||
      count > value.total
    )
      return null;
    return strings.fraction
      .replace('{count}', numberFormat.format(count))
      .replace('{total}', numberFormat.format(value.total));
  }
  if (!Number.isFinite(value) || value < 0) return null;
  if (key === 'accuracy') return value <= 100 ? percentFormat.format(value / 100) : null;
  return numberFormat.format(value);
}

function exerciseCard(exercise) {
  const entry = view.entries.get(exercise.id);
  const status = entry?.status ?? (view.status === 'checking' ? 'loading' : 'unavailable');
  const card = element('article', null, 'progress-card');
  card.setAttribute('aria-labelledby', `progress-${exercise.id}`);
  const heading = element('h2', exercise.title);
  heading.id = `progress-${exercise.id}`;
  const statusLabel = element('p', strings[entry?.source ?? status]);
  card.append(heading, statusLabel);
  if (entry?.summary) {
    const metrics = element('dl', null, 'progress-metrics');
    for (const key of exercise.metrics) {
      const value = metricValue(key, entry.summary[key]);
      if (value === null) continue;
      const pair = element('div');
      pair.append(element('dt', strings.metrics[key]), element('dd', value));
      metrics.append(pair);
    }
    card.append(metrics);
  }
  card.append(exerciseLink(exercise, status));
  return card;
}

function render() {
  notice.textContent = strings[view.status];
  retry.hidden = !['accountUnavailable', 'cloudUnavailable', 'partial'].includes(view.status);
  cards.replaceChildren(...tracked.map(exerciseCard));
}

function renderLanguage() {
  const locale = language.value;
  strings = translations[locale].myProgress;
  document.documentElement.lang = locale;
  document.title = `${strings.title} — Latvian B`;
  document.getElementById('progress-title').textContent = strings.title;
  document.getElementById('progress-language-label').textContent = strings.language;
  document.getElementById('progress-catalogue-title').textContent = strings.catalogue;
  cards.setAttribute('aria-label', strings.tracked);
  retry.textContent = strings.retry;
  numberFormat = new Intl.NumberFormat(locale);
  percentFormat = new Intl.NumberFormat(locale, { style: 'percent' });
  dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  catalogue.replaceChildren(
    ...EXERCISES.filter((exercise) => exercise.tracking !== 'cloud').map((exercise) => {
      const row = element('li');
      const description = element('div');
      description.append(element('h3', exercise.title), element('p', strings['not-connected']));
      row.append(description, exerciseLink(exercise, 'not-connected'));
      return row;
    }),
  );
  render();
}

async function deviceEntry(exercise, owner) {
  try {
    const { adapter, legacy, summaryContext } = localAdapters[exercise.id];
    const { data } = openProgressStore(
      exercise.id,
      owner,
      window.localStorage,
      adapter,
      owner === null ? legacy : undefined,
    ).read({ migrateLegacy: false });
    const activity = adapter.summarize(data);
    const played =
      Boolean(data.checkpoint) ||
      activity.attempts > 0 ||
      activity.xp > 0 ||
      activity.bestStreak > 0 ||
      data.level > 1 ||
      Object.values(data.worlds ?? {}).some((world) => world?.completed?.length > 0);
    if (!played) return { status: owner === null ? 'not-started' : 'unavailable' };
    return {
      status: 'saved',
      source: owner === null ? 'guestSaved' : 'deviceSaved',
      summary: adapter.summarize(data, await summaryContext()),
    };
  } catch {
    return { status: 'unavailable' };
  }
}

async function showDevice(status, owner, signal, entries = new Map()) {
  await Promise.all(
    tracked.map(async (exercise) => {
      const entry = entries.get(exercise.id);
      if (entry && ['saved', 'not-started'].includes(entry.status)) return;
      entries.set(exercise.id, await deviceEntry(exercise, owner));
    }),
  );
  if (signal.aborted) return;
  view = { status, entries };
  render();
}

function beginCheck() {
  request?.abort();
  request = new AbortController();
  view = { status: 'checking', entries: new Map() };
  render();
  return request.signal;
}

function showReauth() {
  verifiedOwner = null;
  view = { status: 'reauth', entries: new Map() };
  render();
  window.dispatchEvent(new Event('llb1:auth-required'));
}

async function refresh() {
  const signal = beginCheck();
  if (!navigator.onLine)
    return showDevice(verifiedOwner ? 'offlineAccount' : 'offlineGuest', verifiedOwner, signal);

  const session = await getCurrentUser();
  if (signal.aborted) return;
  verifiedOwner = session.user?.userId ?? null;
  if (session.status === 'reauth') return showReauth();
  if (session.status !== 'authenticated') {
    const status =
      session.status === 'anonymous'
        ? 'guest'
        : verifiedOwner
          ? 'cloudUnavailable'
          : 'accountUnavailable';
    return showDevice(status, verifiedOwner, signal);
  }

  const result = await loadCloudProgressSummary({ userId: verifiedOwner, signal });
  if (signal.aborted) return;
  if (['reauth', 'unauthenticated', 'forbidden'].includes(result.status)) return showReauth();
  if (result.status !== 'ok') return showDevice('cloudUnavailable', verifiedOwner, signal);

  const entries = new Map(result.exercises.map((entry) => [entry.gameId, entry]));
  if (
    tracked.some((exercise) => !['saved', 'not-started'].includes(entries.get(exercise.id)?.status))
  )
    return showDevice('partial', verifiedOwner, signal, entries);

  view = { status: 'account', entries };
  render();
}

language.addEventListener('change', renderLanguage);
retry.addEventListener('click', () => void refresh());
onAuthChange(({ reason }) => {
  verifiedOwner = null;
  if (reason === 'signed-out') {
    const signal = beginCheck();
    void showDevice(navigator.onLine ? 'guest' : 'offlineGuest', null, signal);
  } else if (reason === 'signing-in') beginCheck();
  else void refresh();
});
window.addEventListener('online', () => void refresh());
window.addEventListener('offline', () => void refresh());
window.addEventListener('pagehide', (event) => {
  if (event.persisted) {
    verifiedOwner = null;
    beginCheck();
  } else request?.abort();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    reconcileAccount();
    void refresh();
  }
});
window.addEventListener('storage', (event) => {
  if (
    event.key?.startsWith('llb1:progress:v1:') &&
    event.key.endsWith(':guest') &&
    (view.status === 'guest' || view.status === 'offlineGuest')
  )
    void refresh();
});

renderLanguage();
void refresh();
