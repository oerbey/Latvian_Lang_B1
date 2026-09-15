/* eslint-env node */

function toPublicProgressItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    userId: item.userId,
    gameId: item.gameId,
    data: item.data,
    revision: item.revision,
    updatedAt: item.updatedAt,
  };
}

module.exports = {
  toPublicProgressItem,
};
