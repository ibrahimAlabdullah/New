// يفتح index.html محلياً في Chromium مع توجيه مكتبات CDN والخطوط إلى نسخ محلية
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => path.join(root, 'node_modules', p);
// Playwright مثبت مسبقاً على مستوى النظام؛ نستخدم النسخة المحلية إن وجدت
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

export async function openHouse({ width = 1280, height = 720, record = true } = {}) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.169.0/', '');
    route.fulfill({ body: readFileSync(nm('three/' + rel)), contentType: 'application/javascript' });
  });
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: [500, 700].map((w) => `@font-face{font-family:'Tajawal';font-weight:${w};src:url(https://local.font/tajawal-${w}.woff2) format('woff2');}`).join('\n'),
  }));
  await page.route('https://local.font/**', (route) => {
    const w = route.request().url().match(/(\d+)\.woff2/)[1];
    route.fulfill({ body: readFileSync(nm(`@fontsource/tajawal/files/tajawal-arabic-${w}-normal.woff2`)), contentType: 'font/woff2' });
  });
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const doc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${html}</body></html>`;
  await page.route('https://house.local/**', (route) => route.fulfill({ body: doc, contentType: 'text/html' }));
  await page.goto('https://house.local/index.html' + (record ? '?record=1' : ''));
  return { browser, page };
}
