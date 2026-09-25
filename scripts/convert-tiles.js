/* ========================================
   แปลง map tile ทุกไฟล์ใต้ map-module/map-styles/ จาก {z}/{x}/{y}.jpg → .webp

   ต้นฉบับเป็น JPEG q~81 chroma 4:2:0 รวม 2,730 ไฟล์ ~50MB
   WebP q80 ให้ไฟล์เล็กลง 71-89% โดย PSNR สูงกว่าการ re-encode เป็น JPEG ที่ขนาดพอกัน
   (atlas เป็นภาพ flat art บีบได้เยอะกว่า satellite ซึ่งเป็นภาพถ่าย)

   แปลงครั้งเดียวแล้ว commit — ไม่เอาไปทำตอน build เพราะ scripts/build-vercel.js
   แค่ cpSync เฉย ๆ ถ้าแปลงตอน build ต้องลง sharp ทุก deploy แล้วแปลงใหม่ทุกครั้ง

   รันซ้ำได้ ไฟล์ที่แปลงแล้วจะข้าม

   วิธีรัน:
     npm i -D sharp && node scripts/convert-tiles.js && npm un sharp
   ======================================== */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

sharp.concurrency(4);

const ROOT = path.join(__dirname, '..', 'map-module', 'map-styles');
const QUALITY = 80;
const POOL = 8;

/* เดินเฉพาะที่อยู่ใต้โฟลเดอร์ zoom (ชื่อเป็นตัวเลข) เท่านั้น
   เพราะ map-styles/ ยังมีไฟล์อื่นปนอยู่ที่ไม่ใช่ tile และไม่มีโค้ดไหนเรียก:
     styleSatelite/satellite.jpg  ภาพต้นฉบับ 8192x8192 ที่ใช้ตัด tile (10.5MB)
     styleXxx เอง empty.jpg        placeholder ที่เลิกใช้แล้ว (errorTileUrl ใช้ base64 inline แทน)
   ห้ามแปลงสองอย่างนี้ — แปลงไปก็ไม่มีใครโหลด มีแต่ทำให้ dist บวม */
function listTiles(dir, insideZoom = false) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...listTiles(p, insideZoom || /^\d+$/.test(e.name)));
        else if (insideZoom && /\.jpg$/i.test(e.name)) out.push(p);
    }
    return out;
}

(async () => {
    if (!fs.existsSync(ROOT)) {
        console.error(`[tiles] ไม่พบ ${ROOT}`);
        process.exit(1);
    }

    const files = listTiles(ROOT);
    if (!files.length) {
        console.log('[tiles] ไม่มี .jpg เหลือแล้ว — ข้าม');
        return;
    }

    let before = 0;
    let after = 0;
    let done = 0;
    let skipped = 0;
    const started = Date.now();

    const queue = files.slice();
    await Promise.all(Array.from({ length: POOL }, async () => {
        while (queue.length) {
            const src = queue.pop();
            const out = src.replace(/\.jpg$/i, '.webp');

            if (fs.existsSync(out)) {
                skipped++;
                continue;
            }

            const buf = await sharp(src)
                .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
                .toBuffer();

            fs.writeFileSync(out, buf);
            before += fs.statSync(src).size;
            after += buf.length;

            if (++done % 500 === 0) console.log(`[tiles] ${done}/${files.length}`);
        }
    }));

    const mb = n => (n / 1048576).toFixed(2) + ' MB';
    console.log(`[tiles] แปลง ${done} ไฟล์ (ข้ามของเดิม ${skipped}) ใน ${((Date.now() - started) / 1000).toFixed(1)}s`);
    if (done) console.log(`[tiles] ${mb(before)} → ${mb(after)} (-${((1 - after / before) * 100).toFixed(1)}%)`);
    console.log('[tiles] ตรวจผลแล้วค่อยลบของเก่า (เฉพาะใต้โฟลเดอร์ zoom):');
    console.log('[tiles]   find map-module/map-styles -path "*/[0-9]*/*" -name "*.jpg" -delete');
})();
