/* eslint-env node */

// Version 2 owns records through the hash of verified External ID tenant/user claims.
const PROGRESS_OWNERSHIP_SCHEMA_VERSION = 2;

function createProgressOwnership(principal) {
  return {
    userId: principal.userId,
    identityProvider: principal.identityProvider,
    ownershipSchemaVersion: PROGRESS_OWNERSHIP_SCHEMA_VERSION,
  };
}

module.exports = {
  createProgressOwnership,
  PROGRESS_OWNERSHIP_SCHEMA_VERSION,
};
