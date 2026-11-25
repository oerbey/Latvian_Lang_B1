import { FORM_FACTORY_DECKS, formFactoryV3Progress } from '../../lib/progress/form-factory-v3.js';
import { normalizeRecords } from './logic.js';

/** Read old Form Factory v3 data as guest progress while preserving the original save. */
export function readLegacyFormFactoryV3(storage, userId) {
  if (userId !== null) return null;
  try {
    const saved = JSON.parse(storage.getItem('llb1:progress'))?.games?.['form-factory-v3']?.data;
    if (!saved || typeof saved !== 'object') return null;
    const data = formFactoryV3Progress.createDefault();
    for (const key of ['xp', 'bestStreak', 'roundsPlayed', 'lastAccuracy']) {
      const count = Math.floor(Number(saved[key]));
      if (Number.isSafeInteger(count) && count >= 0) data[key] = count;
    }
    data.lastAccuracy = Math.min(100, data.lastAccuracy);
    data.records = normalizeRecords(saved.records);
    if (typeof saved.lastPlayedISO === 'string' && Number.isFinite(Date.parse(saved.lastPlayedISO)))
      data.lastPlayedISO = new Date(saved.lastPlayedISO).toISOString();
    if (typeof saved.deckId === 'string' && Object.hasOwn(FORM_FACTORY_DECKS, saved.deckId))
      data.deckId = saved.deckId;
    return formFactoryV3Progress.validate(data) ? null : { data, revision: null, pending: false };
  } catch {
    return null;
  }
}
