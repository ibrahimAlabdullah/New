// يصدّر صوراً ثابتة لكل غرفة من الجولة، ومنظراً علوياً لكل طابق
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { openHouse } from './page.mjs';

const dir = path.resolve(process.argv[2] || 'output/images');
mkdirSync(dir, { recursive: true });
const shots = [
  ['01-الواجهة', 1.5], ['03-الصالة', 22.5], ['04-غرفة-الجلوس', 27.5],
  ['05-المطبخ', 32.6], ['06-رخامة-المطبخ', 34.6], ['07-المجلس-العربي', 50.5], ['08-مغسلة-اليدين', 60.6],
  ['09-غرفة-الطعام', 67.6], ['10-غرفة-النوم-1', 77.4], ['11-غرفة-النوم-2', 87.4], ['14-بيت-الدرج', 113.0], ['15-صالة-الطابق-الأول', 127.8], ['17-المنزل-كاملاً', 149.5],
];
const { browser, page } = await openHouse({ width: 1280, height: 720 });
await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await page.evaluate(() => document.fonts.ready);
const save = (name, data) => writeFileSync(path.join(dir, name + '.jpg'), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
for (const [name, t] of shots) { save(name, await page.evaluate((t) => window.__frame(t), t)); console.log(name); }
// لقطات بزوايا مختارة: [الاسم، موقع الكاميرا، نقطة النظر، العنوان]
const custom = [
  ['02-المدخل', [7.65, 2.5, 5.9], [7.65, 1.9, 0], 'المدخل'],
  ['12-غرفة-الغسيل', [6.55, 2.35, 13.85], [5.1, 1.0, 15.3], 'غرفة الغسيل'],
  ['13-الحمام', [8.45, 2.35, 13.85], [7.2, 1.0, 15.4], 'الحمام'],
  ['16-البرندا', [13.6, 5.7, -1.55], [3.0, 4.7, -0.6], 'البرندا الأمامية'],
];
for (const [name, p, l, label] of custom) { save(name, await page.evaluate(([p, l, label]) => window.__shot(...p, ...l, label), [p, l, label])); console.log(name); }
// منظر علوي لكل طابق بدون سقف
for (const [name, level] of [['18-مخطط-الطابق-الأرضي', 0], ['19-مخطط-الطابق-الأول', 1]]) {
  save(name, await page.evaluate((level) => {
    const g = window.__groups;
    g.roof.visible = false;
    for (const k of ['g1', 'f1', 'veranda', 'slab1']) g[k].visible = level === 1;
    const y = level ? 4.1 : 0.9;
    return window.__shot(7, y + 17, 17.5, 7, y, 7.4, level ? 'الطابق الأول من الأعلى' : 'الطابق الأرضي من الأعلى');
  }, level));
  console.log(name);
}
await browser.close();
