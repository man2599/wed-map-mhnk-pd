/* ========================================
   POI Backup — สำรองชีต MapPOI ลงไฟล์ตอนเซิร์ฟเวอร์เริ่มทำงาน

   เป็นตาข่ายรองรับชั้นสุดท้าย เผื่อข้อมูลในชีตหายอีก จะได้กู้ได้ทันที
   โดยไม่ต้องพึ่ง Google Sheets version history

   ⚠️ โมดูลนี้ "อ่านอย่างเดียว" จากชีต ไม่เขียนกลับเด็ดขาด
   ======================================== */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { createLogger } = require('./utils/logger');

const logger = createLogger('PoiBackup');

const SHEET_NAME = 'MapPOI';
const DATA_DIR = path.join(__dirname, '..', 'data');
const KEEP_DAYS = 7;
const FILE_RE = /^poi-backup-\d{4}-\d{2}-\d{2}\.json$/;

/** นับแถวที่เป็นจุดจริง (คอลัมน์ A มี id) — ไม่นับ header */
function countValid(rows) {
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        if (row[0] && String(row[0]).trim()) n++;
    }
    return n;
}

/** ลบไฟล์สำรองที่เก่ากว่า KEEP_DAYS ไฟล์ล่าสุด */
function prune() {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => FILE_RE.test(f)).sort();
        while (files.length > KEEP_DAYS) {
            const old = files.shift();
            fs.unlinkSync(path.join(DATA_DIR, old));
            logger.debug(`ลบไฟล์สำรองเก่า: ${old}`);
        }
    } catch (e) {
        // ไม่สำคัญพอที่จะให้ server พัง
    }
}

/**
 * ดึงชีตมาเก็บเป็นไฟล์ — เรียกครั้งเดียวตอน start
 * @param {Function} getSheets - ฟังก์ชันคืน Google Sheets client
 */
async function run(getSheets) {
    const sid = config.MAP_SHEET_ID || config.SHEET_ID;
    if (!sid) {
        logger.warn('ไม่มี SHEET_ID — ข้ามการสำรองข้อมูล');
        return;
    }

    try {
        const sheets = getSheets();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: sid,
            range: `${SHEET_NAME}!A:K`
        });
        const rows = res.data.values || [];
        const valid = countValid(rows);

        // กันเขียนทับไฟล์ดีด้วยไฟล์ว่าง: ถ้าชีตไม่มีจุดเลย แปลว่าผิดปกติ อย่าสำรอง
        if (valid === 0) {
            logger.error('ชีตไม่มีจุดเลยสักจุด — ไม่สำรอง (ไฟล์สำรองเดิมยังอยู่ครบ) ⚠️ ควรเข้าไปตรวจชีตด่วน');
            return;
        }

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        const stamp = new Date().toISOString().slice(0, 10);
        const file = path.join(DATA_DIR, `poi-backup-${stamp}.json`);

        // ถ้ามีไฟล์ของวันนี้อยู่แล้วและเก็บจุดไว้มากกว่า → อย่าเขียนทับ
        if (fs.existsSync(file)) {
            try {
                const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (typeof prev.poiCount === 'number' && prev.poiCount > valid) {
                    logger.warn(`ไฟล์สำรองของวันนี้มี ${prev.poiCount} จุด แต่ชีตตอนนี้เหลือ ${valid} จุด — ไม่เขียนทับ`);
                    return;
                }
            } catch (e) {
                // อ่านไฟล์เดิมไม่ได้ ก็เขียนทับไปเลย
            }
        }

        fs.writeFileSync(file, JSON.stringify({
            savedAt: new Date().toISOString(),
            spreadsheetId: sid,
            sheet: SHEET_NAME,
            poiCount: valid,
            rowCount: rows.length,
            rows
        }, null, 2), 'utf8');

        logger.info(`สำรองข้อมูลแล้ว ${valid} จุด → data/poi-backup-${stamp}.json`);
        prune();
    } catch (err) {
        logger.error('สำรองข้อมูลไม่สำเร็จ: ' + err.message);
    }
}

module.exports = { run };
