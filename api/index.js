/* ========================================
   Vercel serverless entry — import app เดิมทั้งก้อน
   ไม่ต้องแก้ server/index.js เลย (กันพัง DirectAdmin/Render)

   บน Vercel ตัวนี้รับเฉพาะ /api/* เท่านั้น
   ไฟล์ static + หน้า HTML ให้ Vercel เสิร์ฟตรงจาก dist/ (ดู vercel.json)
   ======================================== */
const app = require('../server/index');

module.exports = app;
