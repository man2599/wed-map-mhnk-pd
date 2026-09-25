/* ========================================
   แปลงไอคอนหมุด map-module/blips/custom/*.png → *.webp

   ต้นฉบับส่วนใหญ่ ~120x120px แต่แสดงจริงแค่ 34x34 (.mhnk-marker-img)
   → ย่อเหลือ 80px (2x สำหรับจอ retina) แล้วบีบเป็น WebP q88 alpha เต็ม

   ⚠ ห้ามเปลี่ยน "ชื่อไฟล์" เด็ดขาด เปลี่ยนได้แค่นามสกุล
   เพราะ scanCustomIcons() ใน map-module/server/poi-routes.js เอาชื่อไฟล์ที่ตัด
   นามสกุลออกมาเป็น category id ตรง ๆ และ id นั้นคือค่าที่เก็บอยู่ในชีต MapPOI
   เปลี่ยนชื่อเมื่อไหร่ = POI หลุดหมวดทันที

   วิธีรัน:
     npm i -D sharp && node scripts/convert-blips.js && npm un sharp
   ======================================== */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'map-module', 'blips', 'custom');
const MAX_PX = 80;
const QUALITY = 88;

(async () => {
    const files = fs.readdirSync(DIR).filter(f => /\.png$/i.test(f));
    if (!files.length) {
        console.log('[blips] ไม่มี .png เหลือแล้ว — ข้าม');
        return;
    }

    let before = 0;
    let after = 0;

    for (const f of files) {
        const src = path.join(DIR, f);
        const out = path.join(DIR, f.replace(/\.png$/i, '.webp'));

        const buf = await sharp(src)
            .resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
            .toBuffer();

        fs.writeFileSync(out, buf);
        before += fs.statSync(src).size;
        after += buf.length;
    }

    console.log(`[blips] ${files.length} ไฟล์: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (-${((1 - after / before) * 100).toFixed(1)}%)`);
    console.log('[blips] ตรวจผลแล้วค่อยลบของเก่า:  find map-module/blips/custom -name "*.png" -delete');
})();
