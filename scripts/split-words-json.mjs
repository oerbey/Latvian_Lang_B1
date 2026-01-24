import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT_PATH = path.join(ROOT, 'data', 'words.json');
const OUT_DIR = path.join(ROOT, 'data', 'words');
const INDEX_PATH = path.join(OUT_DIR, 'index.json');
const CHUNK_SIZE = 100;

async function readWords() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('words.json must contain an array');
  }
  return data;
}

async function writeChunk(filePath, items) {
  const payload = `${JSON.stringify(items, null, 2)}\n`;
  await fs.writeFile(filePath, payload, 'utf8');
}

async function buildChunks(words) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const existing = await fs.readdir(OUT_DIR).catch(() => []);
  await Promise.all(
    existing
      .filter((file) => file.startsWith('chunk-') && file.endsWith('.json'))
      .map((file) => fs.unlink(path.join(OUT_DIR, file))),
  );
  const chunks = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunkItems = words.slice(i, i + CHUNK_SIZE);
    const fileName = `chunk-${String(chunks.length + 1).padStart(2, '0')}.json`;
    const filePath = path.join(OUT_DIR, fileName);
    await writeChunk(filePath, chunkItems);
    chunks.push(`data/words/${fileName}`);
  }
  return chunks;
}

async function writeIndex(total, chunks) {
  const index = {
    total,
    chunkSize: CHUNK_SIZE,
    chunks,
  };
  const payload = `${JSON.stringify(index, null, 2)}\n`;
  await fs.writeFile(INDEX_PATH, payload, 'utf8');
}

async function main() {
  const words = await readWords();
  const chunks = await buildChunks(words);
  await writeIndex(words.length, chunks);
  console.log(`Wrote ${chunks.length} word chunks to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
