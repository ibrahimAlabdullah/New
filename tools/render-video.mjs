// يصدّر الجولة التلقائية إلى ملف فيديو MP4
// الاستخدام: node tools/render-video.mjs [fps] [ملف الإخراج]
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openHouse } from './page.mjs';

const fps = Number(process.argv[2] || 24);
const out = path.resolve(process.argv[3] || 'output/house-tour.mp4');
mkdirSync(path.dirname(out), { recursive: true });

const { browser, page } = await openHouse({ width: 1280, height: 720 });
await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__tour.duration);
const total = Math.ceil(duration * fps);
console.log(`مدة الجولة ${duration.toFixed(1)} ث — ${total} لقطة بمعدل ${fps} لقطة/ث`);

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-vf', `fade=t=in:st=0:d=0.8,fade=t=out:st=${(duration - 1.2).toFixed(2)}:d=1.2,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const data = await page.evaluate((t) => window.__frame(t), i / fps);
  const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 100 === 0) {
    const el = (Date.now() - t0) / 1000, eta = i ? (el / i) * (total - i) : 0;
    console.log(`${i}/${total} لقطة — متبقٍ تقريباً ${Math.round(eta / 60)} دقيقة`);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('تم:', out);
