import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const output = new URL('../docs/designs/', import.meta.url);
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5181, strictPort: true } });
await server.listen();
const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1060 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const capture = async name => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.screenshot({ path: new URL(`${name}.jpg`, output).pathname, type: 'jpeg', quality: 82, fullPage: true });
};
try {
  await page.goto('http://127.0.0.1:5181', { waitUntil: 'networkidle' });
  await capture('01-discovery');
  await page.getByRole('button', { name: 'Compare shortlist' }).click();
  await page.getByRole('grid', { name: 'Equipment comparison' }).waitFor();
  await capture('02-comparison');
  await page.getByRole('button', { name: 'Build a rental enquiry' }).click();
  await page.getByRole('textbox', { name: 'Your name' }).waitFor();
  await capture('03-enquiry');
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await capture('04-enquiry-dark');
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5181', { waitUntil: 'networkidle' });
  await capture('05-discovery-mobile');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Captured five rendered designs. No page errors.');
} finally { await browser.close(); await server.close(); }
