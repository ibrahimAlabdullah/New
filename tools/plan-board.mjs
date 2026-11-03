// يرسم مخططاً معمارياً ملوّناً (ثنائي الأبعاد) لكل طابق بالمقاسات والأثاث، ويصدّره صورة PNG
// الاستخدام: node tools/plan-board.mjs [مجلد الإخراج]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'output/plans'));
mkdirSync(outDir, { recursive: true });
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const font = (w) => readFileSync(path.join(root, `node_modules/@fontsource/tajawal/files/tajawal-arabic-${w}-normal.woff2`)).toString('base64');

/* ---------- الهندسة (نفس أرقام النموذج ثلاثي الأبعاد) ---------- */
const S = 56;                 // بكسل لكل متر
const OX = 170, OZ = 470;     // موضع الزاوية (0،0) للمبنى
const X = (x) => OX + x * S, Z = (z) => OZ + z * S;
const T_OUT = 0.25, T_IN = 0.15;
const door = (c, w = 0.9, o = {}) => ({ c, w, kind: 'door', ...o });
const win = (c, w = 1.5, o = {}) => ({ c, w, kind: 'window', ...o });
const walls = (upper) => [
  { z: 0, x1: 0, x2: 6.6, out: -1, o: [win(3.3, 1.8)] },
  { z: 0, x1: 8.7, x2: 14, out: -1, o: [win(11.35, 1.8)] },
  { x: 6.6, z1: 0, z2: 2.4, out: 1, o: [] },
  { x: 8.7, z1: 0, z2: 2.4, out: -1, o: [] },
  { z: 2.4, x1: 6.6, x2: 8.7, out: -1, o: [door(7.65, 1.6, { entry: true, swing: 1 })] },
  { x: 0, z1: 0, z2: 16, out: -1, o: [win(2.2, 1.5), win(5.6, 1.0), upper ? win(7.9, 1.0) : door(7.9, 1.0, { swing: 1, hinge: 'end' }), win(10.4, 1.5), win(14.1, 1.5)] },
  { z: 16, x1: 0, x2: 14, out: 1, o: [win(2.4, 1.6), door(5.85, 0.9, { swing: -1 }), win(7.75, 0.7), win(11.35, 1.8)] },
  { x: 14, z1: 0, z2: 16, out: 1, o: [win(3.5, 1.8), win(9.0, 1.4), win(13.4, 1.6)] },
  { z: 4.45, x1: 0, x2: 6.6, o: [] },
  { x: 6.6, z1: 2.4, z2: 6.3, o: [door(3.45, 0.95, { swing: -1 })] },
  { x: 8.7, z1: 2.4, z2: 10.85, o: [door(6.25, 0.95, { swing: 1 })] },
  { x: 4.2, z1: 4.45, z2: 8.6, o: [door(7.95, 0.95, { swing: 1, hinge: 'end' })] },
  { z: 6.3, x1: 4.2, x2: 5.5, o: [door(4.85, 0.75, { swing: -1 })] },
  { x: 5.5, z1: 4.45, z2: 6.3, o: [] },
  { z: 8.6, x1: 0, x2: 4.85, o: [] },
  { x: 4.85, z1: 8.6, z2: 16, o: [door(11.55, 0.9, { swing: -1 }), door(12.85, 0.9, { swing: -1 })] },
  { z: 12.15, x1: 0, x2: 4.85, o: [] },
  { z: 10.85, x1: 8.7, x2: 14, o: [] },
  { x: 8.7, z1: 10.85, z2: 16, o: [door(11.45, 0.9, { swing: 1 })] },
  { z: 12.3, x1: 6.4, x2: 7.7, o: [] },
  { x: 6.4, z1: 12.3, z2: 13.6, o: [] },
  { x: 7.7, z1: 12.3, z2: 13.6, o: [door(12.95, 0.7, { swing: -1 })] },
  { z: 13.6, x1: 4.85, x2: 8.7, o: [door(5.45, 0.9, { swing: 1 }), door(8.15, 0.7, { swing: 1, hinge: 'end' })] },
  { x: 6.8, z1: 13.6, z2: 16, o: [] },
];

/* ---------- أدوات الرسم ---------- */
const C = {
  yard: '#9dbbe0', yardEdge: '#6f93c2', wall: '#2f3337', floor: '#fbfaf6', hall: '#dc8f45', hallTile: '#c97b33',
  corridor: '#f0cf5f', kitchen: '#a48a5a', stairs: '#c7598f', wet: '#d6dde3', wetLine: '#bcc6ce', green: '#9cc56a',
  win: '#cfe3f3', text: '#22272b', sub: '#4d5459', dim: '#3d4448', wood: '#b8875a', woodDark: '#7a5236',
  fabric: '#8f9aa3', fabricLight: '#d9d3c8', majlis: '#8c2d2d', gold: '#d2ac43', bed: '#f2efe9', bedThrow: '#7f97a8',
  bedThrow2: '#c08e78', marble: '#ece7e1', cab: '#3f4b45', porcelain: '#ffffff', plant: '#5f9a4a',
};
let svg = [];
const rect = (x1, z1, x2, z2, fill, extra = '') => svg.push(`<rect x="${X(Math.min(x1, x2))}" y="${Z(Math.min(z1, z2))}" width="${Math.abs(x2 - x1) * S}" height="${Math.abs(z2 - z1) * S}" fill="${fill}" ${extra}/>`);
const line = (x1, z1, x2, z2, stroke, w = 1, extra = '') => svg.push(`<line x1="${X(x1)}" y1="${Z(z1)}" x2="${X(x2)}" y2="${Z(z2)}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`);
const circle = (x, z, r, fill, extra = '') => svg.push(`<circle cx="${X(x)}" cy="${Z(z)}" r="${r * S}" fill="${fill}" ${extra}/>`);
const text = (x, z, s, size, fill = C.text, weight = 700, extra = '') => svg.push(`<text x="${X(x)}" y="${Z(z)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="middle" ${extra}>${s}</text>`);

function drawWalls(upper) {
  for (const w of walls(upper)) {
    const horiz = w.z !== undefined;
    const t = w.out ? T_OUT : T_IN, ext = w.out ? T_OUT / 2 : 0;
    const a = (horiz ? w.x1 : w.z1) - ext, b = (horiz ? w.x2 : w.z2) + ext, c = horiz ? w.z : w.x;
    const seg = (u1, u2, fill = C.wall) => horiz ? rect(u1, c - t / 2, u2, c + t / 2, fill) : rect(c - t / 2, u1, c + t / 2, u2, fill);
    let cur = a;
    for (const op of [...w.o].sort((p, q) => p.c - q.c)) {
      const u1 = op.c - op.w / 2, u2 = op.c + op.w / 2;
      seg(cur, u1);
      if (op.kind === 'window') {
        seg(u1, u2, C.win);
        const l = (v) => horiz ? line(u1, c + v, u2, c + v, C.wall, 1.4) : line(c + v, u1, c + v, u2, C.wall, 1.4);
        l(-t / 2); l(0); l(t / 2);
        if (horiz) { line(u1, c - t / 2, u1, c + t / 2, C.wall, 1.4); line(u2, c - t / 2, u2, c + t / 2, C.wall, 1.4); }
        else { line(c - t / 2, u1, c + t / 2, u1, C.wall, 1.4); line(c - t / 2, u2, c + t / 2, u2, C.wall, 1.4); }
      } else drawDoor(horiz, c, u1, u2, t, op);
      cur = u2;
    }
    seg(cur, b);
  }
}
function drawDoor(horiz, c, u1, u2, t, op) {
  const s = op.swing || 1;
  const leaf = (hu, width, dir) => {
    const v0 = c + s * t / 2, v1 = v0 + s * width, far = hu + dir * width;
    const P = (u, v) => horiz ? [X(u), Z(v)] : [X(v), Z(u)];
    const [hx, hy] = P(hu, v0), [lx, ly] = P(hu, v1), [fx, fy] = P(far, v0);
    svg.push(`<line x1="${hx}" y1="${hy}" x2="${lx}" y2="${ly}" stroke="${C.wall}" stroke-width="2.2"/>`);
    const sweep = ((horiz ? 1 : -1) * s * dir) > 0 ? 0 : 1;
    svg.push(`<path d="M ${lx} ${ly} A ${width * S} ${width * S} 0 0 ${sweep} ${fx} ${fy}" fill="none" stroke="${C.wall}" stroke-width="1" stroke-dasharray="4 3"/>`);
  };
  if (op.entry) { leaf(u1, (u2 - u1) / 2, 1); leaf(u2, (u2 - u1) / 2, -1); }
  else if (op.hinge === 'end') leaf(u2, u2 - u1, -1);
  else leaf(u1, u2 - u1, 1);
}

/* ---------- الأثاث (منظر علوي) ---------- */
const stroke = `stroke="${C.wall}" stroke-width="0.8"`;
function bed(cx, z1, throwCol) {
  rect(cx - 1.05, z1, cx + 1.05, z1 + 0.12, C.woodDark, stroke);
  rect(cx - 0.95, z1 + 0.12, cx + 0.95, z1 + 2.15, C.bed, stroke);
  rect(cx - 0.95, z1 + 1.35, cx + 0.95, z1 + 2.15, throwCol, stroke);
  rect(cx - 0.8, z1 + 0.22, cx - 0.1, z1 + 0.6, '#ffffff', stroke); rect(cx + 0.1, z1 + 0.22, cx + 0.8, z1 + 0.6, '#ffffff', stroke);
  for (const sx of [-1, 1]) { rect(cx + sx * 1.35 - 0.25, z1 + 0.02, cx + sx * 1.35 + 0.25, z1 + 0.47, C.wood, stroke); circle(cx + sx * 1.35, z1 + 0.25, 0.1, '#f6d88f', stroke); }
}
function chair(x, z) { rect(x - 0.22, z - 0.22, x + 0.22, z + 0.22, C.wood, stroke); }
function plant(x, z, r = 0.28) { circle(x, z, r, C.plant, `stroke="#3f6e30" stroke-width="1"`); circle(x - r * 0.3, z - r * 0.3, r * 0.45, '#78b35e'); }
function toilet(x, z, dir = 1) { rect(x - 0.2, z, x + 0.2, z + dir * 0.18, C.porcelain, stroke); svg.push(`<ellipse cx="${X(x)}" cy="${Z(z + dir * 0.42)}" rx="${0.18 * S}" ry="${0.26 * S}" fill="${C.porcelain}" ${stroke}/>`); }
function sink(x, z, r = 0.16) { svg.push(`<ellipse cx="${X(x)}" cy="${Z(z)}" rx="${r * S}" ry="${r * 0.8 * S}" fill="${C.porcelain}" ${stroke}/>`); }

function furniture() {
  // المجلس العربي
  rect(0.15, 0.15, 0.9, 4.35, C.majlis, stroke); rect(0.9, 0.15, 5.6, 0.9, C.majlis, stroke); rect(0.9, 3.6, 5.6, 4.35, C.majlis, stroke);
  rect(0.15, 0.15, 0.3, 4.35, '#6e2020'); rect(0.9, 0.15, 5.6, 0.3, '#6e2020'); rect(0.9, 4.2, 5.6, 4.35, '#6e2020');
  rect(1.2, 1.1, 5.2, 3.4, '#a33a3a', `stroke="${C.gold}" stroke-width="3"`); rect(1.45, 1.35, 4.95, 3.15, 'none', `stroke="#1f3557" stroke-width="2"`);
  circle(3.2, 2.8, 0.42, C.gold, stroke);
  plant(6.15, 4.05, 0.25);
  // غرفة الجلوس
  rect(8.8, 1.6, 9.25, 4.2, C.woodDark, stroke); rect(8.8, 2.15, 8.9, 3.65, '#111');
  rect(12.9, 1.5, 13.8, 4.5, C.fabric, stroke); rect(13.55, 1.5, 13.8, 4.5, '#77828b');
  rect(10.65, 4.9, 12.85, 5.8, C.fabric, stroke); rect(10.65, 5.55, 12.85, 5.8, '#77828b');
  rect(9.9, 1.6, 12.8, 4.7, '#e6e1d6', `stroke="#9aa597" stroke-width="2"`);
  rect(10.8, 2.75, 12.0, 3.45, C.marble, stroke); circle(11.4, 3.1, 0.08, '#d4566b');
  rect(9.85, 0.75, 10.55, 1.45, '#5f6b70', stroke); plant(9.2, 0.6); plant(13.45, 6.4, 0.22); circle(13.4, 0.6, 0.15, '#f6d88f', stroke);
  // المطبخ: خزائن على الجدار الخلفي والأيمن + الرخامة الفاصلة
  rect(9.45, 10.17, 13.875, 10.775, C.marble, stroke); rect(13.27, 7.9, 13.875, 10.17, C.marble, stroke);
  rect(8.8, 10.0, 9.42, 10.775, '#b9bec2', stroke); rect(8.8, 9.2, 9.42, 9.98, '#e8e6e1', stroke);
  for (const [x, z] of [[10.85, 10.33], [11.35, 10.33], [10.85, 10.57], [11.35, 10.57]]) circle(x, z, 0.09, 'none', stroke);
  rect(13.4, 8.6, 13.8, 9.4, '#c9ced2', stroke);
  rect(10.32, 6.68, 12.68, 7.47, '#e7b7a7', `stroke="${C.wall}" stroke-width="1.2"`);
  for (const x of [10.8, 11.5, 12.2]) circle(x, 7.75, 0.19, C.wood, stroke);
  // الصالة والمدخل
  rect(4.95, 8.85, 5.85, 10.65, '#5f6b70', stroke); rect(6.1, 9.25, 6.7, 10.25, C.wood, stroke);
  rect(6.68, 4.7, 7.05, 5.9, C.woodDark, stroke); plant(4.6, 6.8); plant(8.35, 2.75, 0.22);
  rect(6.9, 2.6, 8.4, 4.2, '#2f4b56', `stroke="${C.gold}" stroke-width="2"`);
  // غرفة الطعام
  rect(9.9, 12.4, 12.9, 14.9, '#d8cbb8', `stroke="#7d6b55" stroke-width="2"`);
  rect(10.2, 13.1, 12.6, 14.2, C.woodDark, stroke);
  for (const x of [10.6, 11.4, 12.2]) { chair(x, 12.85); chair(x, 14.45); }
  chair(9.9, 13.65); chair(12.9, 13.65);
  rect(10.3, 10.94, 12.5, 11.4, C.wood, stroke); plant(13.5, 11.3); plant(9.15, 15.5);
  // غرف النوم
  bed(2.3, 8.7, C.bedThrow); rect(0.2, 11.475, 2.9, 12.075, '#e8e6e1', stroke); plant(4.4, 9.0, 0.22);
  bed(2.3, 12.245, C.bedThrow2); rect(4.2, 13.55, 4.775, 15.85, '#e8e6e1', stroke);
  rect(2.35, 15.25, 3.65, 15.85, C.wood, stroke); chair(3.0, 14.95); plant(0.5, 15.5, 0.22);
  // الحمامات والمغسلة والغسيل
  toilet(4.85, 4.5); rect(4.28, 5.55, 4.6, 6.1, C.porcelain, stroke);
  rect(5.6, 4.53, 6.5, 5.05, C.marble, stroke); sink(6.05, 4.8);
  toilet(7.05, 12.43); rect(6.48, 13.0, 6.8, 13.5, C.porcelain, stroke);
  rect(6.9, 14.8, 8.0, 15.9, '#c7d6e0', stroke); line(6.9, 14.8, 8.0, 15.9, C.wetLine, 1); line(8.0, 14.8, 6.9, 15.9, C.wetLine, 1);
  toilet(8.25, 15.88, -1); rect(6.9, 13.72, 7.45, 14.62, C.marble, stroke); sink(7.15, 14.17);
  rect(4.95, 14.0, 5.6, 14.65, '#ffffff', stroke); circle(5.27, 14.32, 0.22, 'none', stroke);
  rect(4.95, 14.7, 5.6, 15.35, '#ffffff', stroke); circle(5.27, 15.02, 0.22, 'none', stroke);
}

/* ---------- الدرج ---------- */
function stairs(upper) {
  rect(0.125, 7.3, 4.2, 8.6, C.stairs); rect(0.125, 4.45, 1.4, 5.6, C.stairs); rect(2.9, 4.45, 4.2, 5.6, C.stairs);
  rect(0.125, 5.6, 1.4, 7.3, '#ffffff'); rect(1.4, 4.45, 2.9, 5.6, '#ffffff'); rect(2.9, 5.6, 4.2, 7.3, '#ffffff');
  const tz = 1.7 / 6, tx = 1.5 / 6;
  for (let k = 1; k < 6; k++) { line(0.125, 5.6 + k * tz, 1.4, 5.6 + k * tz, C.dim, 1); line(1.4 + k * tx, 4.45, 1.4 + k * tx, 5.6, C.dim, 1); line(2.9, 5.6 + k * tz, 4.2, 5.6 + k * tz, C.dim, 1); }
  rect(1.4, 5.6, 2.9, 7.3, upper ? '#eef2f5' : '#ffffff', `stroke="${C.wall}" stroke-width="2"`);
  line(1.4, 5.6, 2.9, 7.3, C.wall, 1.2); line(2.9, 5.6, 1.4, 7.3, C.wall, 1.2);
  // سهم الصعود
  const arrow = `stroke="${C.text}" stroke-width="2" fill="none" marker-end="url(#arr)"`;
  svg.push(`<path d="M ${X(0.76)} ${Z(7.2)} L ${X(0.76)} ${Z(5.03)} L ${X(3.55)} ${Z(5.03)} L ${X(3.55)} ${Z(7.15)}" ${arrow}/>`);
  text(0.76, 7.75, upper ? 'نزول' : 'صعود', 15, C.text, 700);
  if (upper) line(0.125, 7.3, 2.9, 7.3, C.wall, 3);
}

/* ---------- خطوط المقاسات ---------- */
function dimChain(axis, at, marks, labels, flip = false) {
  const g = []; const tick = 7;
  const P = (u) => axis === 'x' ? [X(u), Z(at)] : [X(at), Z(u)];
  const [a1, a2] = [P(marks[0]), P(marks[marks.length - 1])];
  g.push(`<line x1="${a1[0]}" y1="${a1[1]}" x2="${a2[0]}" y2="${a2[1]}" stroke="${C.dim}" stroke-width="1.2"/>`);
  marks.forEach((m) => { const [px, py] = P(m); g.push(`<line x1="${px - tick}" y1="${py + tick}" x2="${px + tick}" y2="${py - tick}" stroke="${C.dim}" stroke-width="1.6"/>`); });
  for (let i = 0; i < labels.length; i++) {
    const mid = (marks[i] + marks[i + 1]) / 2; const [px, py] = P(mid);
    if (axis === 'x') g.push(`<text x="${px}" y="${py - 9}" font-size="16" font-weight="500" fill="${C.dim}" text-anchor="middle">${labels[i]}</text>`);
    else g.push(`<text x="${px + (flip ? 12 : -12)}" y="${py}" font-size="16" font-weight="500" fill="${C.dim}" text-anchor="middle" transform="rotate(-90 ${px + (flip ? 12 : -12)} ${py})">${labels[i]}</text>`);
  }
  svg.push(...g);
}

/* ---------- لوحة الطابق ---------- */
function board(level) {
  svg = [];
  const upper = level === 1;
  // الفناء / البرندا مع الحافة الأمامية المقوّسة
  const yz1 = -2.0;
  svg.push(`<path d="M ${X(-1)} ${Z(17)} L ${X(-1)} ${Z(yz1 + 0.35)} Q ${X(-0.6)} ${Z(yz1 + 0.35)} ${X(-0.4)} ${Z(yz1)} Q ${X(2.2)} ${Z(yz1 - 0.55)} ${X(4.9)} ${Z(yz1)} L ${X(5.3)} ${Z(yz1)} L ${X(8.5)} ${Z(yz1)} L ${X(8.8)} ${Z(yz1)} Q ${X(11.6)} ${Z(yz1 - 0.55)} ${X(14.4)} ${Z(yz1)} Q ${X(14.6)} ${Z(yz1 + 0.35)} ${X(15)} ${Z(yz1 + 0.35)} L ${X(15)} ${Z(17)} Z" fill="${C.yard}" stroke="${C.yardEdge}" stroke-width="2" stroke-dasharray="${upper ? '0' : '8 5'}"/>`);
  if (upper) svg.push(`<path d="M ${X(-0.94)} ${Z(16.94)} L ${X(-0.94)} ${Z(yz1 + 0.4)} M ${X(14.94)} ${Z(yz1 + 0.4)} L ${X(14.94)} ${Z(16.94)} L ${X(-0.94)} ${Z(16.94)}" fill="none" stroke="#4f6f99" stroke-width="3"/>`);
  if (!upper) {
    // الدرج الأمامي وأحواض الزرع
    rect(3.4, -2.9, 5.25, -2.0, C.green, stroke); rect(8.55, -2.9, 10.4, -2.0, C.green, stroke);
    rect(5.3, -3.5, 8.5, -2.0, '#dfe6cf', stroke);
    for (let k = 1; k < 5; k++) line(5.3, -3.5 + k * 0.3, 8.5, -3.5 + k * 0.3, C.dim, 1);
    svg.push(`<path d="M ${X(6.9)} ${Z(-3.4)} L ${X(6.9)} ${Z(-2.1)}" stroke="${C.text}" stroke-width="2" marker-end="url(#arr)"/>`);
    for (const x of [0.45, 4.9, 8.8, 13.5]) circle(x, -1.45, 0.17, '#ffffff', `stroke="${C.wall}" stroke-width="2"`);
  } else {
    for (const x of [0.45, 4.9, 8.8, 13.5]) circle(x, -1.45, 0.17, 'none', `stroke="${C.wall}" stroke-width="1" stroke-dasharray="3 3"`);
  }
  // الأرضيات
  rect(0, 2.4, 14, 16, C.floor); rect(0, 0, 6.6, 2.4, C.floor); rect(8.7, 0, 14, 2.4, C.floor);
  rect(6.6, 2.4, 8.7, 6.3, C.hall); rect(4.2, 6.3, 8.7, 8.6, C.hall); rect(4.85, 8.6, 8.7, 10.85, C.hall);
  rect(4.85, 10.85, 8.7, 12.3, C.corridor); rect(4.85, 12.3, 6.4, 13.6, C.corridor); rect(7.7, 12.3, 8.7, 13.6, C.corridor);
  rect(8.7, 7.0, 14, 10.85, C.kitchen);
  rect(5.5, 4.45, 6.6, 6.3, C.corridor);
  for (const r of [[4.2, 4.45, 5.5, 6.3], [6.4, 12.3, 7.7, 13.6], [6.8, 13.6, 8.7, 16], [4.85, 13.6, 6.8, 16]]) {
    rect(...r, C.wet);
    for (let x = r[0] + 0.3; x < r[2]; x += 0.3) line(x, r[1], x, r[3], C.wetLine, 0.6);
    for (let z = r[1] + 0.3; z < r[3]; z += 0.3) line(r[0], z, r[2], z, C.wetLine, 0.6);
  }
  stairs(upper);
  furniture();
  drawWalls(upper);
  // أسماء الغرف
  const pill = (x, z, w, h) => svg.push(`<rect x="${X(x) - w / 2}" y="${Z(z) - h / 2}" width="${w}" height="${h}" rx="8" fill="#ffffff" fill-opacity="0.82"/>`);
  const L = (x, z, name, size) => {
    const w = Math.max(name.length * 12.5, size ? size.length * 9 : 0) + 22;
    pill(x, z + (size ? 0.24 : 0), w, size ? 62 : 34);
    text(x, z, name, 21, C.text, 700); if (size) text(x, z + 0.48, size, 16, C.sub, 500, 'direction="ltr"');
  };
  L(3.2, 1.55, 'المجلس العربي', '6.50 × 4.20 م');
  L(11.35, 1.95, 'غرفة الجلوس', '5.00 × 7.00 م');
  L(11.6, 8.55, 'مطبخ أمريكي', '5.00 × 3.85 م');
  text(11.5, 7.07, 'رخامة فاصلة', 13, C.text, 700);
  L(11.4, 11.85, 'غرفة الطعام', '4.75 × 4.75 م');
  L(2.4, 10.95, 'غرفة نوم', '4.75 × 3.30 م');
  L(1.5, 14.65, 'غرفة نوم', '4.75 × 3.50 م');
  L(7.0, 8.0, 'الصالة', '4.35 م عرض');
  L(7.65, 1.2, upper ? 'برندا' : 'المدخل', '');
  L(4.85, 5.75, 'WC', ''); L(6.05, 5.75, 'مغسلة', '');
  L(7.05, 13.25, 'WC', ''); L(8.05, 14.15, 'حمام', '2.00 × 2.20');
  L(6.2, 14.3, 'غسيل', '');
  L(2.15, 6.45, 'فراغ', '');
  L(2.15, 8.15, 'بيت الدرج', '');
  text(1.2, 16.55, upper ? 'برندا' : 'فناء مبلّط', 16, '#2d4f7d', 700);
  text(7.0, -1.0, upper ? 'برندا أمامية' : 'فناء أمامي', 16, '#2d4f7d', 700);
  if (!upper) { text(-0.5, 7.9, 'مدخل الطابق الأول', 13, '#2d4f7d', 700, `transform="rotate(-90 ${X(-0.5)} ${Z(7.9)})"`); text(5.85, 16.55, 'باب خدمة', 13, '#2d4f7d', 700); }
  // المقاسات
  dimChain('x', -4.1, [-1, 0, 6.75, 8.75, 14, 15], ['1.00', '6.75', '2.00', '5.25', '1.00']);
  dimChain('x', -4.8, [0, 14], ['14.00 م']);
  dimChain('x', 17.7, [-1, 0, 5, 9.1, 14, 15], ['1.00', '5.00', '4.10', '4.90', '1.00']);
  dimChain('z', -1.9, [0, 4.5, 5.6, 8.8, 12.35, 16], ['4.50', '1.10', '3.20', '3.55', '3.65']);
  dimChain('z', -2.6, [0, 16], ['16.00 م']);
  dimChain('z', 15.8, [-2, 0, 7.25, 11.0, 16, 17], ['2.00', '7.25', '3.75', '5.00', '1.00'], true);

  const title = upper ? 'مخطط الطابق الأول' : 'مخطط الطابق الأرضي';
  const sub = upper ? 'نفس توزيع الأرضي · المساحة الزرقاء برندا بدرابزين زجاجي' : 'منسوب الأرضية +0.90 م · ارتفاع السقف 3.00 م';
  const W = X(15) + 170, H = Z(17.7) + 150;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:500;src:url(data:font/woff2;base64,${font(500)}) format('woff2')}
@font-face{font-family:T;font-weight:700;src:url(data:font/woff2;base64,${font(700)}) format('woff2')}
html,body{margin:0;background:#f4f1ea}
svg{display:block;font-family:T,sans-serif}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.text}"/></marker></defs>
<rect width="${W}" height="${H}" fill="#f4f1ea"/>
<text x="${W / 2}" y="66" font-size="38" font-weight="700" fill="${C.text}" text-anchor="middle">${title}</text>
<text x="${W / 2}" y="108" font-size="19" font-weight="500" fill="${C.sub}" text-anchor="middle">${sub}</text>
${svg.join('\n')}
<rect x="${W / 2 - 230}" y="${H - 78}" width="460" height="50" rx="25" fill="#1f3d6b"/>
<text x="${W / 2}" y="${H - 51}" font-size="21" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">مساحة الطابق: 14.00 × 16.00 = 224 م²</text>
<g transform="translate(${W - 92} ${150})"><circle r="30" fill="none" stroke="${C.dim}" stroke-width="1.5"/><path d="M0,-26 L9,8 L0,2 L-9,8 Z" fill="${C.text}"/><text y="-36" font-size="14" font-weight="700" text-anchor="middle" fill="${C.text}">الشارع</text></g>
</svg></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [level, name] of [[0, 'مخطط-الطابق-الأرضي'], [1, 'مخطط-الطابق-الأول']]) {
  const html = board(level);
  writeFileSync(path.join(outDir, name + '.html'), html);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$('svg');
  await el.screenshot({ path: path.join(outDir, name + '.png') });
  console.log('تم:', name);
}
await browser.close();
