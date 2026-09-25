/* ========================================
   Build step สำหรับ Vercel — รวมไฟล์ static ทั้งหมดไว้ที่ dist/

   ทำไมต้องมี:
   Vercel แพ็กไฟล์เข้า serverless function โดยไล่ตาม require() เท่านั้น
   ไฟล์ที่เปิดด้วย path.join() ตอน runtime (map.html, tile, ไอคอนหมุด) มันมองไม่เห็น
   → express.static / res.sendFile บน Vercel จะได้ ENOENT ทุกตัว

   เลยยกงานเสิร์ฟ static ออกจาก function ทั้งหมด ให้ Vercel CDN เสิร์ฟจาก dist/ แทน
   (map-styles อย่างเดียว 2,730 tile — ยิงผ่าน function ทั้งช้าและชนลิมิต 250MB)

   server/index.js ไม่ต้องแก้ ยังเสิร์ฟ static เองเหมือนเดิมตอนรันบน DirectAdmin/Render
   ======================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// path ในนี้ต้องตรงกับที่ server/index.js mount ไว้เป๊ะ ไม่งั้น local กับ Vercel จะไม่เหมือนกัน
const COPY = [
    // public/ ทั้งก้อน → root ของ dist (logo.webp, map.html, src/map-pin.js, src/map-pin.css)
    ['public', ''],
    ['map-module/src', 'map-module/src'],
    ['map-module/map-styles', 'map-module/map-styles'],
    ['map-module/blips', 'map-module/blips'],
    ['map-module/Challenge', 'map-module/Challenge'],
    ['map-module/overlay/src', 'map-module/overlay/src']
];

function countFiles(dir) {
    let n = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        n += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
    }
    return n;
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

let total = 0;
for (const [from, to] of COPY) {
    const src = path.join(ROOT, from);
    if (!fs.existsSync(src)) {
        console.warn(`[build] ข้าม ${from} — ไม่มีโฟลเดอร์นี้`);
        continue;
    }
    const dest = path.join(DIST, to);
    fs.cpSync(src, dest, { recursive: true });
    const n = countFiles(src);
    total += n;
    console.log(`[build] ${from} → dist/${to || '.'}  (${n} ไฟล์)`);
}

console.log(`[build] เสร็จ — ${total} ไฟล์ใน dist/`);
