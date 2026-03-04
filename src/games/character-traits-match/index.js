/**
 * character-traits-match/index.js — Personality-traits matching game (standard version).
 * ========================================================================================
 * Pair Latvian personality traits (e.g. "optimistisks") with their English translations.
 * Uses the shared initTraitsMatching() engine from matching.js with MODE_ALL by default.
 */
import { MATCHING_CONSTANTS } from '../../lib/matching-game.js';
import { initTraitsMatching } from './matching.js';

initTraitsMatching({ defaultMode: MATCHING_CONSTANTS.MODE_ALL });
