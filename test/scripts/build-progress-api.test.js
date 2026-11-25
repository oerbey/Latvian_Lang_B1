import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildProgressApi } from '../../scripts/build-progress-api.mjs';

test('committed API contracts and vocabulary context match the browser sources', async () => {
  await buildProgressApi({ check: true });
});

test('API package loads contracts, dataset context and Functions with no website source tree', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'llb1-progress-api-'));
  try {
    for (const name of ['src', 'generated', 'package.json']) {
      await cp(new URL(`../../api/${name}`, import.meta.url), join(directory, name), {
        recursive: true,
      });
    }
    await symlink(
      fileURLToPath(new URL('../../api/node_modules', import.meta.url)),
      join(directory, 'node_modules'),
    );
    await writeFile(
      join(directory, 'verify.cjs'),
      `
      const assert = require('node:assert/strict');
      const { getProgressDefinitions } = require('./src/lib/progress-definitions');
      require('./src/functions/getProgress');
      require('./src/functions/saveProgress');
      require('./src/functions/getProgressSummary');
      getProgressDefinitions().then((definitions) => {
        assert.deepEqual(definitions.gameIds, ['word-quest', 'darbibas-vards', 'darbibas-vardi-v2', 'form-factory-v3', 'sentence-surgery-passive']);
        assert.equal(definitions.exercises.length, 21);
        assert.equal(definitions.getAdapter('darbibas-vards').validate(definitions.getAdapter('darbibas-vards').createDefault()), null);
        assert.ok(definitions.getAdapter('darbibas-vardi-v2'));
        assert.ok(definitions.contexts['form-factory-v3'].itemIds.includes('ff-001'));
        assert.ok(definitions.contexts['sentence-surgery-passive'].itemIds.length > 0);
        assert.ok(definitions.contexts['darbibas-vardi-v2'].itemIds.includes('būt'));
        assert.ok(definitions.contexts['darbibas-vards'].itemIds.length > 0);
        assert.equal(Object.values(definitions.contexts['word-quest'].worldNodeCounts).reduce((a,b) => a+b), 49);
      }).catch(() => { process.exitCode = 1; });
    `,
    );
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ['verify.cjs'], { cwd: directory, stdio: 'pipe' }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
