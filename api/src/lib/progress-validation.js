/* eslint-env node */

const GAME_ID = 'word-quest';
const MAX_PROGRESS_BYTES = 64 * 1024;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateWordQuestState(data) {
  if (!isPlainObject(data)) return 'data must be an object';

  const numericFields = ['xp', 'level', 'streak', 'bestStreak', 'totalCorrect', 'totalWrong'];
  for (const field of numericFields) {
    if (field in data && !isNonNegativeNumber(data[field])) {
      return `${field} must be a non-negative number`;
    }
  }

  const integerFields = ['level', 'streak', 'bestStreak', 'totalCorrect', 'totalWrong'];
  for (const field of integerFields) {
    if (field in data && !isNonNegativeInteger(data[field])) {
      return `${field} must be a non-negative integer`;
    }
  }

  if ('worlds' in data && !isPlainObject(data.worlds)) return 'worlds must be an object';
  if ('schemaVersion' in data && !isNonNegativeInteger(data.schemaVersion)) {
    return 'schemaVersion must be a non-negative integer';
  }

  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return 'data must be JSON serializable';
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PROGRESS_BYTES) {
    return `data exceeds ${MAX_PROGRESS_BYTES} bytes`;
  }

  return null;
}

function validateSaveRequest(body) {
  if (!isPlainObject(body)) return { error: 'request body must be an object' };
  if (body.gameId !== GAME_ID) return { error: `gameId must be ${GAME_ID}` };

  const dataError = validateWordQuestState(body.data);
  if (dataError) return { error: dataError };

  if (!Number.isInteger(body.expectedRevision) || body.expectedRevision < 0) {
    return { error: 'expectedRevision must be a non-negative integer' };
  }

  return {
    value: { gameId: body.gameId, data: body.data, expectedRevision: body.expectedRevision },
  };
}

module.exports = {
  GAME_ID,
  MAX_PROGRESS_BYTES,
  isPlainObject,
  validateSaveRequest,
  validateWordQuestState,
};
