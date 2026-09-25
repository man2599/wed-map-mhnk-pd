/* ========================================
   Google Authentication Setup
   - Singleton pattern: Reuse auth + sheets instance

   ⚠️ ใช้ @googleapis/sheets ไม่ใช่ googleapis (ตัวเต็ม)
      googleapis bundle API ของ Google มาครบทุกตัว กางออกมา ~200MB
      ชนลิมิต serverless function ของ Vercel ที่ 250MB
      ตัวนี้เอาเฉพาะ Sheets v4 → เหลือไม่ถึง 1MB, API หน้าตาเหมือนเดิมเป๊ะ
   ======================================== */

const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const { sheets: sheetsApi } = require('@googleapis/sheets');
const config = require('./index');

let _sheets = null;

/**
 * Build Google Auth + Sheets instance (called once)
 */
function initAuth() {
    let authOptions = {
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    // Priority: GOOGLE_JSON_KEY (Env) -> credentials.json (File)
    if (process.env.GOOGLE_JSON_KEY) {
        authOptions.credentials = JSON.parse(process.env.GOOGLE_JSON_KEY);
    } else if (fs.existsSync(config.CREDENTIALS_PATH)) {
        authOptions.keyFile = config.CREDENTIALS_PATH;
    }

    const auth = new GoogleAuth(authOptions);
    _sheets = sheetsApi({ version: 'v4', auth });

    return _sheets;
}

/**
 * Get Sheets API instance (singleton)
 */
function getSheets() {
    if (!_sheets) {
        _sheets = initAuth();
    }
    return _sheets;
}

/**
 * Reset auth (for testing or credential rotation)
 */
function resetAuth() {
    _sheets = null;
}

module.exports = { getSheets };
