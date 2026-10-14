import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve('node_modules/@azure/msal-browser');
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
if (packageJson.version !== '5.25.0') throw new Error('Unexpected MSAL version');
const destination = resolve(process.argv[2] || '.', 'assets/vendor/msal-browser');
await mkdir(destination, { recursive: true });
await copyFile(
  resolve(packageRoot, 'lib/msal-browser.min.js'),
  resolve(destination, 'msal-browser.min.js'),
);
await copyFile(resolve(packageRoot, 'LICENSE'), resolve(destination, 'LICENSE'));
