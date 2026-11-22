import { darbibasVardiV2Progress } from '../../lib/progress/darbibas-vardi-v2.js';
import { normalizeRecords } from './logic.js';

/** The old unscoped save belongs to the guest. Keep the legacy entry as a backup. */
export function readLegacyV2Progress(storage, userId) {
  if (userId !== null) return null;
  try {
    const saved = JSON.parse(storage.getItem('llb1:progress'))?.games?.['darbibas-vardi-v2']?.data;
    if (!saved || typeof saved !== 'object') return null;
    const data = darbibasVardiV2Progress.createDefault();
    for (const key of ['xp', 'bestStreak', 'dailyStreak', 'roundsPlayed']) {
      const count = Math.floor(Number(saved[key]));
      if (Number.isSafeInteger(count) && count >= 0) data[key] = count;
    }
    data.records = normalizeRecords(saved.records);
    if (typeof saved.lastPlayedISO === 'string' && Number.isFinite(Date.parse(saved.lastPlayedISO)))
      data.lastPlayedISO = new Date(saved.lastPlayedISO).toISOString();
    data.language = saved.language === 'ru' ? 'ru' : 'en';
    data.speech = saved.speech === true;
    data.haptics = saved.haptics !== false;
    return darbibasVardiV2Progress.validate(data) ? null : { data, revision: null, pending: false };
  } catch {
    return null;
  }
}
