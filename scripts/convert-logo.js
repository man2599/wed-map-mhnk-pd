/* ========================================
   แปลง public/logo.gif → public/logo.webp

   ต้นฉบับเป็น GIF 256x256 / 252 เฟรม / ~33fps = 2.26MB
   ซึ่งใหญ่กว่า tile ทั้งหมดที่โหลดตอนเปิดเว็บรวมกัน และมันอยู่บน boot screen พอดี

   สคริปต์นี้เก็บ 1 ใน 4 เฟรม (เหลือ 63 เฟรม ~8fps) แล้วออกเป็น animated WebP
   ความยาวลูปเท่าเดิม (63 x 120ms = 7.56s) แต่ไฟล์เหลือ ~283KB (-87%)

   ข้อจำกัด: WebP รับภาพสูงสุด 16383px — 63 เฟรม x 256px = 16128px พอดี
   ถ้าจะเก็บเฟรมมากกว่านี้ต้องย่อขนาดเฟรมลงก่อน ไม่งั้น sharp จะ throw

   วิธีรัน (sharp ไม่ได้อยู่ใน package.json เพราะใช้ครั้งเดียว ไม่อยากให้ Vercel ลงทุก deploy):
     npm i -D sharp && node scripts/convert-logo.js && npm un sharp
   ======================================== */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'logo.gif');
const OUT = path.join(ROOT, 'public', 'logo.webp');

const KEEP_EVERY = 4;
const QUALITY = 75;

(async () => {
    if (!fs.existsSync(SRC)) {
        console.error(`[logo] ไม่พบ ${SRC}`);
        process.exit(1);
    }

    const src = sharp(SRC, { animated: true });
    const md = await src.metadata();
    const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });

    const frameBytes = info.width * md.pageHeight * info.channels;
    const keep = [];
    for (let i = 0; i < md.pages; i += KEEP_EVERY) keep.push(i);

    if (md.pageHeight * keep.length > 16383) {
        console.error(`[logo] ${keep.length} เฟรม x ${md.pageHeight}px เกินลิมิต WebP (16383px) — เพิ่ม KEEP_EVERY`);
        process.exit(1);
    }

    const strip = Buffer.concat(keep.map(i => data.subarray(i * frameBytes, (i + 1) * frameBytes)));
    const delay = keep.map(i => (md.delay[i] || 30) * KEEP_EVERY);

    // pageHeight ต้องอยู่ใน raw เท่านั้น — ถ้าใส่ไว้ชั้นนอก sharp จะเงียบ ๆ แล้วออกเป็นภาพนิ่งแถวยาวแทน
    const out = await sharp(strip, {
        raw: {
            width: info.width,
            height: md.pageHeight * keep.length,
            channels: info.channels,
            pageHeight: md.pageHeight
        }
    }).webp({ quality: QUALITY, effort: 6, delay }).toBuffer();

    fs.writeFileSync(OUT, out);

    const before = fs.statSync(SRC).size;
    console.log(`[logo] ${md.pages} → ${keep.length} เฟรม`);
    console.log(`[logo] ${(before / 1024).toFixed(0)} KB → ${(out.length / 1024).toFixed(0)} KB (-${((1 - out.length / before) * 100).toFixed(1)}%)`);
})();
