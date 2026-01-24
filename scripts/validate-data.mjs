import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';

const ROOT = process.cwd();

const DATASETS = [
  {
    name: 'words',
    dataPath: 'data/words.json',
    schemaPath: 'schemas/words.schema.json',
  },
  {
    name: 'words index',
    dataPath: 'data/words/index.json',
    schemaPath: 'schemas/words-index.schema.json',
  },
  {
    name: 'maini-vai-mainies items',
    dataPath: 'data/maini-vai-mainies/items.json',
    schemaPath: 'schemas/maini-vai-mainies-items.schema.json',
  },
  {
    name: 'duty-dispatcher roles',
    dataPath: 'data/duty-dispatcher/roles.json',
    schemaPath: 'schemas/duty-dispatcher-roles.schema.json',
  },
  {
    name: 'duty-dispatcher tasks',
    dataPath: 'data/duty-dispatcher/tasks.json',
    schemaPath: 'schemas/duty-dispatcher-tasks.schema.json',
  },
  {
    name: 'travel-tracker routes',
    dataPath: 'data/travel-tracker/routes.json',
    schemaPath: 'schemas/travel-tracker-routes.schema.json',
  },
];

const ajv = new Ajv({ allErrors: true, strict: false });

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function formatErrors(errors = []) {
  return errors.map((error) => {
    const instancePath = error.instancePath || '/';
    const message = error.message || 'Invalid value';
    return `  - ${instancePath} ${message}`;
  });
}

async function validateDataset(entry) {
  const dataFile = path.resolve(ROOT, entry.dataPath);
  const schemaFile = path.resolve(ROOT, entry.schemaPath);

  const schema = await readJson(schemaFile);
  const validate = ajv.compile(schema);
  const data = await readJson(dataFile);
  const valid = validate(data);

  if (!valid) {
    const lines = formatErrors(validate.errors);
    console.error(`\nSchema validation failed for ${entry.name}`);
    console.error(`File: ${entry.dataPath}`);
    lines.forEach((line) => console.error(line));
  }

  return valid;
}

async function validateWordChunks() {
  const indexFile = path.resolve(ROOT, 'data/words/index.json');
  const wordsSchemaFile = path.resolve(ROOT, 'schemas/words.schema.json');
  const index = await readJson(indexFile);
  const wordsSchema = await readJson(wordsSchemaFile);
  const validate = ajv.compile(wordsSchema);

  const chunks = Array.isArray(index?.chunks) ? index.chunks : [];
  if (!chunks.length) {
    console.error('\nSchema validation failed for words chunks');
    console.error('File: data/words/index.json');
    console.error('  - /chunks must contain at least one entry');
    return false;
  }

  let ok = true;
  let totalCount = 0;

  for (const chunkPath of chunks) {
    const dataFile = path.resolve(ROOT, chunkPath);
    const data = await readJson(dataFile);
    totalCount += Array.isArray(data) ? data.length : 0;
    const valid = validate(data);
    if (!valid) {
      ok = false;
      const lines = formatErrors(validate.errors);
      console.error(`\nSchema validation failed for words chunk`);
      console.error(`File: ${chunkPath}`);
      lines.forEach((line) => console.error(line));
    }
  }

  if (Number.isInteger(index.total) && totalCount !== index.total) {
    ok = false;
    console.error('\nWords chunk total mismatch');
    console.error(`Expected ${index.total}, found ${totalCount}`);
  }

  return ok;
}

async function main() {
  let ok = true;
  for (const entry of DATASETS) {
    try {
      const valid = await validateDataset(entry);
      if (!valid) ok = false;
    } catch (err) {
      ok = false;
      console.error(`\nFailed to validate ${entry.name}`);
      console.error(`File: ${entry.dataPath}`);
      console.error(err instanceof Error ? err.message : String(err));
    }
  }

  try {
    const validChunks = await validateWordChunks();
    if (!validChunks) ok = false;
  } catch (err) {
    ok = false;
    console.error('\nFailed to validate word chunks');
    console.error(err instanceof Error ? err.message : String(err));
  }

  if (!ok) {
    process.exitCode = 1;
  } else {
    console.log('Data validation passed.');
  }
}

main();
