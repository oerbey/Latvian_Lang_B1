/* eslint-env node */

// Version 1 records ownership directly against the app-scoped Static Web Apps user ID.
const PROGRESS_OWNERSHIP_SCHEMA_VERSION = 1;

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
