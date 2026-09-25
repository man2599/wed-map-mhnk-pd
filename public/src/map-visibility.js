/* ========================================
   MHNK Map - สวิตช์ซ่อนจุดทั้งแผนที่ (โหมดสอบ)

   ปุ่มนั่งแทนที่โลโก้ในแถบขวา ซ้ายมือของปุ่มใส่รหัส
   ล็อกอยู่ = เห็นโลโก้ / ใส่รหัสแล้ว = โลโก้กลายเป็นปุ่มนี้

   การซ่อนจริงทำที่ server (server/poi-visibility.js) — /api/poi คืน []
   ฝั่งนี้แค่แสดงสถานะกับสั่งสลับ ไม่ได้ซ่อนอะไรเอง
   คนที่ใส่รหัสแล้วยังเห็นจุดครบตามเดิม จะได้คุมสอบไปแก้แผนที่ไปได้

   ⚠️ จงใจไม่ยุ่งกับ marker บนแผนที่เลย — ไม่ clearPois ไม่ addPoi ไม่แตะ tooltip
      เพราะ MHNK_LABELS ครอบ MHNK_MAP.addPoi กับ event mouseover/mouseout ไว้
      ถ้ามาสั่งวาดหมุดใหม่ตรงนี้ด้วย ป้ายชื่อหมุดจะเพี้ยนแบบที่เคยเจอ
   ======================================== */

const MHNK_VIS = {
  hidden: false,
  _busy: false,

  ICON_ON: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'
    + '<path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>'
    + '</svg>',

  ICON_OFF: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'
    + '<path d="M2.1 3.5 3.5 2.1l18.4 18.4-1.4 1.4-3.2-3.2A11 11 0 0 1 12 19C7 19 3 14.5 2 12c.6-1.4 2-3.5 4.2-5.1L2.1 3.5Zm5.6 5.6A4 4 0 0 0 12 16c.7 0 1.4-.2 2-.5l-1.5-1.5a2 2 0 0 1-2.5-2.5L7.7 9.1ZM12 5c5 0 9 4.5 10 7-.5 1.2-1.6 2.9-3.3 4.3l-2.8-2.8A4 4 0 0 0 10.5 8l-2-2c1.1-.6 2.3-1 3.5-1Z"/>'
    + '</svg>',

  /** เรียกครั้งเดียวหลัง DOM พร้อม */
  init() {
    var self = this;
    var btn = this._btn();
    if (btn) btn.addEventListener('click', function () { self.toggle(); });
  },

  /** MHNK_DC เรียกทุกครั้งที่สถานะรหัสเปลี่ยน */
  setUnlocked(on) {
    var unlocked = !!on;
    var logo = document.getElementById('mhnk-sidebar-badge');
    var btn = this._btn();
    if (logo) logo.style.display = unlocked ? 'none' : 'flex';
    if (btn) btn.style.display = unlocked ? 'flex' : 'none';
    // คนที่ยังไม่ใส่รหัสไม่เห็นปุ่ม เลยไม่ต้องยิงถามสถานะให้เปลือง
    if (unlocked) this._load();
  },

  async toggle() {
    if (this._busy) return;
    this._busy = true;
    this._render();
    try {
      var res = await fetch('/api/poi/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ hidden: !this.hidden })
      });
      var data = await res.json();
      if (res.ok && data.success) this.hidden = !!data.hidden;
    } catch (e) {
      console.error('[MHNK-VIS] สลับสถานะไม่สำเร็จ:', e);
    } finally {
      this._busy = false;
      this._render();
    }
  },

  // ───────── ภายใน ─────────

  _btn() { return document.getElementById('mhnk-vis-btn'); },

  async _load() {
    try {
      var res = await fetch('/api/poi/visibility', { credentials: 'same-origin' });
      var data = await res.json();
      this.hidden = !!(data && data.hidden);
    } catch (e) {
      console.error('[MHNK-VIS] อ่านสถานะไม่ได้:', e);
    }
    this._render();
  },

  _render() {
    var btn = this._btn();
    if (!btn) return;
    btn.innerHTML = this.hidden ? this.ICON_OFF : this.ICON_ON;
    btn.classList.toggle('is-hidden', this.hidden);
    btn.disabled = this._busy;
    btn.title = this.hidden
      ? 'จุดถูกซ่อนจากคนทั่วไปอยู่ — กดเพื่อเปิดให้เห็น'
      : 'คนทั่วไปเห็นจุดอยู่ — กดเพื่อซ่อนทั้งหมด';
    btn.setAttribute('aria-pressed', this.hidden ? 'true' : 'false');
  }
};

if (typeof window !== 'undefined') { window.MHNK_VIS = MHNK_VIS; }
