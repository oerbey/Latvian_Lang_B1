import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baseLang = 'en';
const languages = ['en', 'lv', 'ru'];

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function compareTrees(base, target, prefix, report) {
  if (isPlainObject(base)) {
    if (!isPlainObject(target)) {
      report.typeMismatches.push(prefix || '<root>');
      return;
    }
    for (const key of Object.keys(base)) {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        report.missing.push(nextPath);
        continue;
      }
      compareTrees(base[key], target[key], nextPath, report);
    }
    for (const key of Object.keys(target)) {
      if (!Object.prototype.hasOwnProperty.call(base, key)) {
        const extraPath = prefix ? `${prefix}.${key}` : key;
        report.extra.push(extraPath);
      }
    }
    return;
  }

  if (isPlainObject(target)) {
    report.typeMismatches.push(prefix || '<root>');
  }
}

async function main() {
  const basePath = path.join(root, 'i18n', `${baseLang}.json`);
  const baseData = await readJson(basePath);
  let hasError = false;

  for (const lang of languages) {
    const filePath = path.join(root, 'i18n', `${lang}.json`);
    const data = await readJson(filePath);
    const report = { missing: [], extra: [], typeMismatches: [] };
    compareTrees(baseData, data, '', report);
    if (report.missing.length || report.extra.length || report.typeMismatches.length) {
      hasError = true;
      console.error(`i18n validation failed for ${lang}:`);
      if (report.missing.length) {
        console.error(`  missing keys (${report.missing.length}):`);
        report.missing.forEach(key => console.error(`    - ${key}`));
      }
      if (report.extra.length) {
        console.error(`  extra keys (${report.extra.length}):`);
        report.extra.forEach(key => console.error(`    - ${key}`));
      }
      if (report.typeMismatches.length) {
        console.error(`  type mismatches (${report.typeMismatches.length}):`);
        report.typeMismatches.forEach(key => console.error(`    - ${key}`));
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }
  console.log('i18n validation passed.');
}

main();
