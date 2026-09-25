/* ========================================
   Configuration - All env vars & constants

   ⚠️ ชื่อคีย์ MAP_SHEET_ID / SHEET_ID / CREDENTIALS_PATH ห้ามเปลี่ยน —
      map-module/server/poi-routes.js และ googleAuth.js เรียกตรงๆ
   ======================================== */

const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Config');

// ชี้ path แบบ absolute — ไม่ให้ขึ้นกับ cwd (กันโหลด .env ผิดไฟล์เวลารันจากโฟลเดอร์อื่น)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

if (!process.env.SHEET_ID && !process.env.MAP_SHEET_ID) {
    logger.warn('SHEET_ID / MAP_SHEET_ID is not defined in .env — จะ fallback ไปอ่าน data/poi-cache.json');
}
if (!process.env.ADMIN_PIN) {
    logger.warn('ADMIN_PIN is not defined in .env — จะแก้ไขแผนที่ไม่ได้เลย');
}

// เว็บนี้ใช้ GOOGLE_JSON_KEY ใน .env เป็นหลัก (ไม่มีไฟล์ credentials.json)
// CREDENTIALS_PATH ยังต้องคงไว้เพราะ googleAuth.js อ้างถึง (เป็น fallback ที่ไม่ถูกใช้)
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'credentials.json');
if (!process.env.GOOGLE_JSON_KEY && !require('fs').existsSync(CREDENTIALS_PATH)) {
    logger.warn('Google credentials (GOOGLE_JSON_KEY) not found in .env');
}

module.exports = {
    PORT: process.env.PORT || 3001,

    // รหัส 4 หลักสำหรับปลดล็อกการแก้ไขแผนที่
    ADMIN_PIN: process.env.ADMIN_PIN || '',

    // Google Sheets — poi-routes.js อ่าน MAP_SHEET_ID ก่อน แล้วค่อย fallback SHEET_ID
    SHEET_ID: process.env.SHEET_ID,
    MAP_SHEET_ID: process.env.MAP_SHEET_ID || process.env.SHEET_ID,
    CREDENTIALS_PATH,

    // Compression
    COMPRESSION_THRESHOLD: 512, // bytes
    COMPRESSION_LEVEL: 6,
};
