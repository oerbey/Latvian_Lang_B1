/* eslint-env node */
const { CosmosClient } = require('@azure/cosmos');

let client;

function requireSetting(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required Cosmos setting: ${name}`);
  return value;
}

function getClient() {
  if (!client) {
    client = new CosmosClient({
      endpoint: requireSetting('COSMOS_ENDPOINT'),
      key: requireSetting('COSMOS_KEY'),
    });
  }
  return client;
}

function getDatabase() {
  return getClient().database(requireSetting('COSMOS_DATABASE'));
}

function getProgressContainer() {
  return getDatabase().container(requireSetting('COSMOS_PROGRESS_CONTAINER'));
}

module.exports = {
  getProgressContainer,
};
