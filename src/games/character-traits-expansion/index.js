/**
 * character-traits-expansion/index.js — Expanded personality-traits matching game.
 * =================================================================================
 * Uses the full (unlocked) word set by default (MODE_ALL).
 * Delegates all logic to the shared initTraitsMatching() from character-traits-match.
 */
import { MATCHING_CONSTANTS } from '../../lib/matching-game.js';
import { initTraitsMatching } from '../character-traits-match/matching.js';

initTraitsMatching({ defaultMode: MATCHING_CONSTANTS.MODE_ALL });
