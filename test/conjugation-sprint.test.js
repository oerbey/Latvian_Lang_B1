import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve(__dirname, '../../conjugation-sprint.html'), 'utf8');

let dom;
let window;
let document;

describe('Conjugation Sprint Game', () => {
  beforeEach(() => {
    dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    window = dom.window;
    document = window.document;
  });

  test('should load the game environment', () => {
    expect(document.title).toBe('Conjugation Sprint — Latvian B1');
    const h1 = document.querySelector('h1');
    expect(h1.textContent).toBe('Conjugation Sprint');
  });

  test('should have all necessary elements present', () => {
    expect(document.getElementById('qtext')).not.toBeNull();
    expect(document.getElementById('meta')).not.toBeNull();
    expect(document.getElementById('choices')).not.toBeNull();
    expect(document.getElementById('score')).not.toBeNull();
    expect(document.getElementById('streak')).not.toBeNull();
    expect(document.getElementById('round')).not.toBeNull();
    expect(document.getElementById('skip')).not.toBeNull();
    expect(document.getElementById('again')).not.toBeNull();
    expect(document.getElementById('perstats')).not.toBeNull();
  });
});
