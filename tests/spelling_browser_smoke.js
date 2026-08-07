import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-output');
fs.mkdirSync(output, { recursive: true });

const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_PATH || (fs.existsSync(defaultChromePath) ? defaultChromePath : undefined);
let browser;

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', (request) => {
    if (request.url().includes('clarity.ms/')) return;
    errors.push(`request: ${request.url()} ${request.failure()?.errorText || 'failed'}`);
  });

  await page.goto('http://127.0.0.1:4173/?testMode=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__runeRampartTest));
  if (await page.title() !== '词垒守卫 · Lexi Rampart') throw new Error('Unexpected page title');
  if (await page.locator('meta[name="description"]').getAttribute('content').then((value) => !value?.includes('英语单词补全'))) throw new Error('Missing spelling-defense meta description');
  if (await page.locator('.difficulty-card').count() !== 3) throw new Error('Difficulty picker does not have three levels');
  const difficultyCopy = await page.locator('.difficulty-card strong').allInnerTexts();
  if (!difficultyCopy.join(' ').includes('A1–A2') || !difficultyCopy.join(' ').includes('C1–C2')) throw new Error(`Difficulty vocabulary ranges are missing: ${difficultyCopy.join(' / ')}`);

  await page.locator('#startButton').click();
  await page.locator('.letter-button').first().waitFor({ state: 'visible' });
  if (await page.locator('.letter-button').count() !== 26) throw new Error('Alphabet does not contain 26 buttons');
  if (await page.locator('.letter-button').allInnerTexts().then((letters) => letters.join('')) !== 'QWERTYUIOPASDFGHJKLZXCVBNM') throw new Error('Alphabet is not in QWERTY order');
  if (await page.locator('.letter-button:enabled').count() !== 26) throw new Error('Alphabet was not enabled after starting');

  const forced = await page.evaluate(() => window.__runeRampartTest.forceWord('defense', 'B1', [1, 3, 6], 'mana', 2));
  if (!forced) throw new Error('Could not install deterministic spelling round');
  const masked = await page.locator('#wordPrompt').innerText();
  if (masked.replace(/\s+/g, '') !== 'D_F_NS_') throw new Error(`Unexpected masked word: ${masked}`);
  await page.locator('.letter-button[data-letter="E"]').click();
  await page.keyboard.press('e');
  await page.evaluate(() => window.__runeRampartTest.inputLetter('E'));
  const completed = await page.evaluate(() => ({
    round: window.__runeRampartTest.spellingRound(),
    snapshot: window.__runeRampartTest.snapshot(),
    status: document.querySelector('#wordStatus').textContent
  }));
  if (completed.snapshot.totalWords !== 1 || completed.snapshot.mana < 8) {
    throw new Error(`Correct word did not settle: ${JSON.stringify(completed)}`);
  }

  await page.waitForTimeout(950);
  await page.evaluate(() => window.__runeRampartTest.forceWord('apple', 'A1', [1], 'coin', 1));
  const revealed = await page.evaluate(() => {
    window.__runeRampartTest.inputLetter('x');
    window.__runeRampartTest.inputLetter('x');
    window.__runeRampartTest.inputLetter('x');
    return {
      round: window.__runeRampartTest.spellingRound(),
      prompt: document.querySelector('#wordPrompt').textContent,
      status: document.querySelector('#wordStatus').textContent,
      totalWords: window.__runeRampartTest.snapshot().totalWords
    };
  });
  if (revealed.round.status !== 'revealed' || revealed.round.errors !== 3 || !revealed.prompt.includes('APPLE') || revealed.totalWords !== 1) {
    throw new Error(`Third error did not reveal without reward: ${JSON.stringify(revealed)}`);
  }

  await page.waitForTimeout(1050);
  await page.evaluate(() => window.__runeRampartTest.forceWord('apple', 'A1', [1], 'ember', 1));
  await page.locator('#pauseButton').click();
  const save = await page.evaluate(() => window.__runeRampartTest.savedProgress());
  if (save?.version !== 2 || save?.spellingRound?.word !== 'apple' || !Array.isArray(save?.wordBag) || !Array.isArray(save?.runeBag)) {
    throw new Error(`Spelling checkpoint is incomplete: ${JSON.stringify(save)}`);
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#resumeButton').waitFor({ state: 'visible' });
  await page.locator('#resumeButton').click();
  const restored = await page.evaluate(() => ({ round: window.__runeRampartTest.spellingRound(), snapshot: window.__runeRampartTest.snapshot() }));
  if (restored.round.word !== 'apple' || restored.round.errors !== 0 || restored.snapshot.paused) {
    throw new Error(`Spelling checkpoint was not restored: ${JSON.stringify(restored)}`);
  }

  await page.screenshot({ path: path.join(output, 'lexi-rampart-spelling.png'), fullPage: false });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Spelling browser smoke test passed.');
} finally {
  await browser?.close();
}
