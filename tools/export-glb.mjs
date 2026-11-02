// يصدّر النموذج ثلاثي الأبعاد كاملاً إلى ملف GLB
// الاستخدام: node tools/export-glb.mjs [ملف الإخراج]
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { openHouse } from './page.mjs';

const out = path.resolve(process.argv[2] || 'output/house.glb');
mkdirSync(path.dirname(out), { recursive: true });
const { browser, page } = await openHouse();
await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
const b64 = await page.evaluate(async () => {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const g = window.__groups;
  const root = new (window.__scene.constructor)();
  const names = { site: 'الموقع', g0: 'الطابق الأرضي', f0: 'أثاث الطابق الأرضي', slab1: 'بلاطة الطابق الأول', g1: 'الطابق الأول', f1: 'أثاث الطابق الأول', veranda: 'البرندا', roof: 'السطح' };
  for (const [k, grp] of Object.entries(g)) { const c = grp.clone(); c.name = names[k] || k; c.visible = true; root.add(c); }
  const buf = await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: 1024 });
  let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
});
writeFileSync(out, Buffer.from(b64, 'base64'));
await browser.close();
console.log('تم:', out);
