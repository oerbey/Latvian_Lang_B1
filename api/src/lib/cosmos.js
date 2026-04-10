/* eslint-env node */
const { CosmosClient } = require('@azure/cosmos');

let client;

function getClient() {
  if (!client) {
    client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
    });
  }
  return client;
}

function getDatabase() {
  return getClient().database(process.env.COSMOS_DATABASE);
}

function getProgressContainer() {
  return getDatabase().container(process.env.COSMOS_PROGRESS_CONTAINER);
}

function getProfileContainer() {
  return getDatabase().container(process.env.COSMOS_PROFILE_CONTAINER);
}

module.exports = {
  getProgressContainer,
  getProfileContainer,
};
