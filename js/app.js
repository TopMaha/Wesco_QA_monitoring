/* =========================================================================
 * Wesco QA Monitor — UI
 * Routes: #/board  #/new  #/history  #/settings  #/tv
 * ========================================================================= */
(function () {
  'use strict';

  const S = window.Store;
  const MIN = S.MIN;

  const app = document.getElementById('app');
  const dlg = document.getElementById('modal');
  const toastsEl = document.getElementById('toasts');

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const LOCALE = 'th-TH-u-ca-gregory';
  const ms = (iso) => new Date(iso).getTime();

  const fmtTime = (iso) => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
  const fmtDate = (iso, year) => new Date(iso).toLocaleDateString(LOCALE, year ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
  const fmtDT = (iso) => (isToday(iso) ? 'วันนี้' : fmtDate(iso)) + ' ' + fmtTime(iso);
  function clockStr(d) {
    const s = Math.floor(Math.abs(d) / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? h + ':' + pad(m) + ':' + pad(x) : pad(m) + ':' + pad(x);
  }
  function humanDur(d) {
    const m = Math.max(1, Math.ceil(Math.abs(d) / MIN)), h = Math.floor(m / 60), r = m % 60;
    return h ? h + ' ชม.' + (r ? ' ' + r + ' นาที' : '') : m + ' นาที';
  }
  const toLocalInput = (t) => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const todayStr = () => toLocalInput(Date.now()).slice(0, 10);
  const roundUp5 = (t) => Math.ceil(t / (5 * MIN)) * 5 * MIN;
  const initials = (name) => { const p = String(name || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase(); };
  const firstName = (name) => String(name || '').split(' ')[0];
  const safeGet = (k, st) => { try { return JSON.parse((st || localStorage).getItem(k)); } catch (e) { return null; } };
  const safeSet = (k, v, st) => { try { (st || localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

  /* ---------------------------------------------------------------- icons (Lucide) */
  const ICONS = {
    board: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'clipboard-plus': '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M12 17v-6"/>',
    'clipboard-check': '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'clock-plus': '<path d="M21.9 13.5A10 10 0 1 0 12.5 21.9"/><path d="M12 6v6l3 1.5"/><path d="M19 16v6"/><path d="M16 19h6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/>',
    hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    'volume-x': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'
  };
  const ic = (name, cls) => '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';

  /* ---------------------------------------------------------------- session & permissions */
  const PREF_KEY = 'wesco.qa.prefs';
  let user = null; // { id, name, role } — session is kept by Store
  const prefs = Object.assign({ sound: true }, safeGet(PREF_KEY));
  const ROLE = { admin: 'Admin', qa: 'QA Inspector', prod: 'Production' };
  const can = {
    inspect: () => !!user && (user.role === 'qa' || user.role === 'admin'),
    admin: () => !!user && user.role === 'admin',
    cancel: (r) => !!user && (user.role === 'admin' || (r.requester && r.requester.id === user.id))
  };

  /* ---------------------------------------------------------------- router */
  const ROUTES = ['board', 'new', 'history', 'settings', 'tv'];
  let page = 'board';
  function readRoute() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    page = ROUTES.indexOf(h) >= 0 ? h : 'board';
  }

  /* ---------------------------------------------------------------- UI state */
  let kpiRange = 'today';
  const boardFilter = { q: '', process: '', phase: '' };
  const hist = { range: 'today', result: '', q: '' };
  let prefill = null;
  let flashId = null;
  let modalKind = null, modalId = null, modalReturn = null;
  let tvPage = 0, tvPages = 1, tvTick = 0;
  let selfAction = false; // true while this tab writes to the store
  const mine = (fn) => { selfAction = true; try { return fn(); } finally { selfAction = false; } };

  /* ================================================================ data helpers */
  const activeReqs = () => S.state.requests.filter((r) => r.status === 'waiting' || r.status === 'inspecting');
  const byPlan = (a, b) => ms(a.planAt) - ms(b.planAt);

  function rangeStart(range) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (range === '7d') d.setDate(d.getDate() - 6);
    if (range === '30d') d.setDate(d.getDate() - 29);
    if (range === 'all') return 0;
    return d.getTime();
  }

  function stats(range) {
    const from = rangeStart(range), now = Date.now();
    const rs = S.state.requests;
    const done = rs.filter((r) => r.status === 'done' && ms(r.resultAt) >= from);
    const ok = done.filter((r) => r.result === 'OK').length;
    const waiting = rs.filter((r) => r.status === 'waiting');
    return {
      total: done.length, ok, ng: done.length - ok,
      waiting: waiting.length,
      inspecting: rs.filter((r) => r.status === 'inspecting').length,
      due: waiting.filter((r) => S.phase(r, now) === 'due').length,
      rate: done.length ? Math.round((ok / done.length) * 100) : null
    };
  }

  function statusInfo(r, ph, now) {
    const max = S.state.settings.maxInspectMin;
    switch (ph) {
      case 'scheduled': return { cls: 'st-scheduled', icon: 'clock', s1: 'รอคิวตรวจ', s2: 'อีก ' + humanDur(ms(r.planAt) - now) };
      case 'soon': return { cls: 'st-soon', icon: 'bell', s1: 'ใกล้ถึงคิว', s2: 'อีก ' + clockStr(ms(r.planAt) - now) };
      case 'due': return { cls: 'st-due', icon: 'alert', s1: 'ถึงเวลาตรวจ', s2: 'เลยมา ' + clockStr(now - ms(r.planAt)) };
      case 'inspecting':
      case 'overtime': {
        const el = now - ms(r.acceptedAt);
        return {
          cls: ph === 'overtime' ? 'st-overtime' : 'st-inspecting', icon: ph === 'overtime' ? 'alert' : 'scan',
          s1: ph === 'overtime' ? 'เกินเวลาตรวจ' : 'กำลังตรวจ', s2: clockStr(el) + ' / ' + pad(max) + ':00',
          prog: Math.min(1, el / (max * MIN))
        };
      }
      default: return { cls: 'st-cancelled', icon: 'info', s1: ph, s2: '' };
    }
  }

  /* ================================================================ shared fragments */
  function statusHTML(r, now) {
    const ph = S.phase(r, now), s = statusInfo(r, ph, now), hasProg = s.prog != null;
    return '<div class="status ' + s.cls + (hasProg ? ' has-prog' : '') + '" data-cd="' + r.id + '" data-ph="' + ph + '">' +
      '<span class="s1">' + ic(s.icon, 'icon-sm') + '<span>' + s.s1 + '</span></span>' +
      '<span class="s2">' + s.s2 + '</span>' +
      (hasProg ? '<span class="prog" aria-hidden="true"><i style="width:' + (s.prog * 100).toFixed(1) + '%"></i></span>' : '') +
      '</div>';
  }

  function resultPill(r) {
    if (r.status === 'cancelled') return '<span class="pill cx">' + ic('x', 'icon-sm') + 'ยกเลิก</span>';
    return r.result === 'OK'
      ? '<span class="pill ok">' + ic('check', 'icon-sm') + 'OK</span>'
      : '<span class="pill ng">' + ic('x', 'icon-sm') + 'NG</span>';
  }

  function detailTag(r) {
    const cls = S.isFirst(r.detail) ? ' first' : S.isLast(r.detail) ? ' last' : '';
    return '<span class="tag' + cls + '">' + esc(r.detail) + '</span>';
  }
  function extraTags(r) {
    let h = '';
    if (r.round > 1) h += '<span class="tag re">' + ic('reset', 'icon-sm') + 'ตรวจซ้ำ รอบ ' + r.round + '</span>';
    if (r.postpones && r.postpones.length && r.status === 'waiting') h += '<span class="tag pp">' + ic('clock-plus', 'icon-sm') + 'เลื่อนเวลา</span>';
    if (r.remark) h += '<span class="tag" title="' + esc(r.remark) + '">' + ic('message', 'icon-sm') + '<span class="sr-only">มีหมายเหตุ</span></span>';
    if (r.photo) h += '<span class="tag">' + ic('image', 'icon-sm') + '<span class="sr-only">มีรูป</span></span>';
    return h;
  }

  function timeCell(r) {
    const orig = r.postpones && r.postpones.length ? r.postpones[0].from : null;
    return '<div class="t-time">' + fmtTime(r.planAt) + (orig ? '<span class="old" aria-label="เวลาเดิม">' + fmtTime(orig) + '</span>' : '') + '</div>' +
      (!isToday(r.planAt) ? '<span class="t-date">' + fmtDate(r.planAt) + '</span>' : '');
  }

  function inspectorHTML(r) {
    if (!r.inspector) return '<span class="dash">—</span>';
    return '<span class="insp"><span class="avatar" aria-hidden="true">' + initials(r.inspector.name) + '</span>' + esc(r.inspector.name) + '</span>';
  }

  function actionsHTML(r, ph) {
    if (!can.inspect()) return '';
    if (r.status === 'waiting') {
      return '<button class="btn btn-sm" data-act="postpone" data-id="' + r.id + '">' + ic('clock-plus', 'icon-sm') + 'เลื่อนเวลา</button>' +
        '<button class="btn btn-sm ' + (ph === 'due' || ph === 'soon' ? 'btn-primary' : '') + '" data-act="accept" data-id="' + r.id + '">' + ic('check', 'icon-sm') + 'ยอมรับ</button>';
    }
    if (r.status === 'inspecting') {
      return '<button class="btn btn-sm btn-primary" data-act="result" data-id="' + r.id + '">' + ic('clipboard-check', 'icon-sm') + 'ลงผลตรวจ</button>';
    }
    return '';
  }

  const rowCls = (ph) => ({ due: 'row-due', soon: 'row-soon', inspecting: 'row-insp', overtime: 'row-over' }[ph] || '');

  /* ================================================================ LOGIN */
  function loginHTML() {
    return '' +
      '<div class="login">' +
      '<aside class="login-brand" aria-hidden="true">' +
        '<div>' +
          '<div class="logo-tile"><img src="assets/wesco-logo.png" alt="" width="100" height="84"></div>' +
          '<h2>ติดตามคิวงาน<br>รอ QA ตรวจ แบบเรียลไทม์</h2>' +
          '<p>แจ้งงาน นับถอยหลังถึงคิวตรวจ แจ้งเตือนล่วงหน้า 30 นาที และสรุปผล Accept / Reject ในหน้าเดียว ใช้ได้ทั้งมือถือและคอมพิวเตอร์</p>' +
          '<ul>' +
            '<li>' + ic('bell') + '<span>แจ้งเตือนเมื่อใกล้ถึงคิว และเมื่อถึงเวลาตรวจ</span></li>' +
            '<li>' + ic('flag') + '<span>1st piece ต้องตรวจ Last piece ผ่านก่อนปิด Job</span></li>' +
            '<li>' + ic('monitor') + '<span>โหมดจอ TV แบบบอร์ดสนามบิน สำหรับหน้างาน</span></li>' +
          '</ul>' +
          '<div class="preview-board">' +
            '<div class="pb-head"><span>Time · Job</span><span>Status</span></div>' +
            '<div class="pb-row"><b class="mono">09:15</b><span class="mono">J2610-0412</span><span class="pill ng">ถึงเวลาตรวจ</span></div>' +
            '<div class="pb-row"><b class="mono">09:40</b><span class="mono">J2610-0415</span><span class="pill" style="color:var(--soon-ink);background:var(--soon-bg);border-color:var(--soon-bd)">ใกล้ถึงคิว</span></div>' +
            '<div class="pb-row"><b class="mono">10:20</b><span class="mono">J2610-0388</span><span class="pill" style="color:var(--insp-ink);background:var(--insp-bg);border-color:var(--insp-bd)">กำลังตรวจ</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="foot">Wesco · QA Inspection Monitor</div>' +
      '</aside>' +
      '<main class="login-main"><div class="login-card">' +
        '<img class="login-logo" src="assets/wesco-logo.png" alt="Wesco" width="132" height="111">' +
        '<h1>เข้าสู่ระบบ</h1>' +
        '<p class="sub">QA Inspection Monitor · ระบบติดตามงานรอ QA ตรวจ</p>' +
        '<form id="login-form" novalidate>' +
          '<div class="field"><label for="lg-id">รหัสพนักงาน (Employee ID)</label>' +
            '<input class="input mono" id="lg-id" name="id" autocomplete="username" autocapitalize="characters" spellcheck="false" placeholder="เช่น E343997" required autofocus>' +
            '<p class="error" id="lg-err" role="alert"></p></div>' +
          '<button class="btn btn-primary btn-lg btn-block" type="submit" id="lg-btn">' + ic('login') + 'เข้าสู่ระบบ</button>' +
        '</form>' +
      '</div></main></div>';
  }

  function bindLogin() {
    const form = $('#login-form'), err = $('#lg-err'), idI = $('#lg-id'), btn = $('#lg-btn');
    const fail = (msg) => { err.innerHTML = ic('alert', 'icon-sm') + esc(msg); idI.setAttribute('aria-invalid', 'true'); idI.focus(); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!idI.value.trim()) return fail('กรุณากรอกรหัสพนักงาน');
      btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>กำลังเข้าสู่ระบบ…';
      try {
        await S.login(idI.value);
        setUser(S.me());
      } catch (ex) {
        btn.disabled = false; btn.innerHTML = ic('login') + 'เข้าสู่ระบบ';
        fail(ex.code === 'not_found' ? 'ไม่พบรหัสพนักงานนี้ในระบบ กรุณาติดต่อ Admin' : ex.message);
      }
    });
    idI.addEventListener('input', () => { err.innerHTML = ''; idI.removeAttribute('aria-invalid'); });
  }

  function setUser(u) {
    user = u;
    resetAlerted(); // new user on this device → show current alerts again
    if (!location.hash || location.hash === '#/') location.hash = '#/board';
    readRoute(); render();
    toast('ok', 'ยินดีต้อนรับ ' + firstName(u.name), ROLE[u.role]);
    setTimeout(() => tick(), 300);
  }

  function logout(msg) {
    user = null;
    S.logout();
    closeModal(); render();
    if (msg) toast('info', msg);
  }

  function loadingHTML(failed) {
    return '<div class="boot"><img src="assets/wesco-logo.png" alt="Wesco" width="120" height="101">' +
      (failed
        ? '<p class="boot-msg">' + ic('alert') + 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</p><p class="help">ตรวจสอบอินเทอร์เน็ต แล้วลองใหม่</p>' +
          '<div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-primary" data-act="retry">' + ic('reset') + 'ลองใหม่</button><button class="btn" data-act="logout">ออกจากระบบ</button></div>'
        : '<p class="boot-msg"><span class="spinner dark" aria-hidden="true"></span>กำลังโหลดข้อมูล…</p>') +
      '</div>';
  }

  function boot() {
    const sess = S.session();
    if (!sess) { render(); return; }
    user = sess.user;
    app.innerHTML = loadingHTML(false);
    S.resume().then((me) => {
      if (!me) return logout('บัญชีนี้ถูกลบออกจากระบบแล้ว');
      user = me; render(); setTimeout(() => tick(), 300);
    }).catch((e) => {
      if (e.code === 'auth') return; // handled by 'auth' event
      app.innerHTML = loadingHTML(true);
    });
  }

  /* ================================================================ SHELL */
  const NAV = [
    { id: 'board', label: 'บอร์ดติดตาม', short: 'บอร์ด', icon: 'board' },
    { id: 'new', label: 'แจ้งงานตรวจ', short: 'แจ้งตรวจ', icon: 'clipboard-plus' },
    { id: 'history', label: 'ประวัติ', short: 'ประวัติ', icon: 'history' },
    { id: 'settings', label: 'ตั้งค่า', short: 'ตั้งค่า', icon: 'sliders', admin: true }
  ];

  function shellHTML() {
    const nav = NAV.filter((n) => !n.admin || can.admin());
    const notifBtn = ('Notification' in window && Notification.permission !== 'granted')
      ? '<button role="menuitem" data-act="notify">' + ic('bell') + 'เปิดแจ้งเตือนบนเครื่อง</button>' : '';
    return '' +
      '<a class="skip-link" href="#page" data-act="skip">ข้ามไปยังเนื้อหา</a>' +
      '<header class="app-header">' +
        '<a class="brand" href="#/board" aria-label="หน้าบอร์ดติดตาม">' +
          '<img src="assets/wesco-logo.png" alt="Wesco" width="53" height="44">' +
          '<span class="titles"><span class="t1">QA Inspection Monitor</span><span class="t2">ระบบติดตามงานรอ QA ตรวจ</span></span>' +
        '</a>' +
        '<nav class="top-nav" aria-label="เมนูหลัก">' +
          nav.map((n) => '<a href="#/' + n.id + '"' + (page === n.id ? ' aria-current="page"' : '') + '>' + ic(n.icon) + n.label + '</a>').join('') +
        '</nav>' +
        '<div class="header-right">' +
          '<span class="clock" id="clock" aria-label="เวลาปัจจุบัน"></span>' +
          '<button class="btn btn-ghost icon-btn" data-act="sound" aria-pressed="' + prefs.sound + '" aria-label="' + (prefs.sound ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน') + '" title="เสียงแจ้งเตือน">' + ic(prefs.sound ? 'volume' : 'volume-x') + '</button>' +
          '<button class="btn btn-ghost icon-btn bell" data-act="alerts" aria-label="การแจ้งเตือน" title="การแจ้งเตือน">' + ic('bell') + '<span class="badge" id="badge" hidden></span></button>' +
          '<button class="user-chip" data-act="menu" aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu">' +
            '<span class="avatar" aria-hidden="true">' + initials(user.name) + '</span>' +
            '<span class="meta"><b>' + esc(firstName(user.name)) + '</b><small>' + ROLE[user.role] + '</small></span>' +
            '<span class="sr-only">เมนูผู้ใช้</span>' +
          '</button>' +
        '</div>' +
      '</header>' +
      '<div class="menu" id="user-menu" role="menu" hidden>' +
        '<div class="who"><b>' + esc(user.name) + '</b><small class="mono">' + esc(user.id) + ' · ' + ROLE[user.role] + '</small></div>' +
        notifBtn +
        '<button role="menuitem" data-act="tv">' + ic('monitor') + 'โหมดจอ TV</button>' +
        '<button role="menuitem" class="danger" data-act="logout">' + ic('logout') + 'ออกจากระบบ</button>' +
      '</div>' +
      '<main id="page" tabindex="-1"></main>' +
      '<nav class="bottom-nav" aria-label="เมนูหลัก">' +
        nav.map((n) => '<a href="#/' + n.id + '"' + (page === n.id ? ' aria-current="page"' : '') + (n.id === 'new' && page !== 'new' ? ' class="pill-new"' : '') + '>' + ic(n.icon) + '<span>' + n.short + '</span></a>').join('') +
      '</nav>';
  }

  function render() {
    closeMenu();
    if (!user) { app.innerHTML = loginHTML(); bindLogin(); return; }
    if (!S.ready) { app.innerHTML = loadingHTML(!S.online); return; }
    if (page === 'tv') { app.innerHTML = tvHTML(); tvLayout(); updateClocks(Date.now()); return; }
    app.innerHTML = shellHTML();
    renderPage();
    updateClocks(Date.now());
    updateBadge(Date.now());
  }

  function renderPage() {
    const el = $('#page'); if (!el) return;
    if (page === 'board') { el.innerHTML = boardPageHTML(); bindBoard(); }
    else if (page === 'new') { el.innerHTML = newPageHTML(); bindNew(); }
    else if (page === 'history') { el.innerHTML = historyPageHTML(); bindHistory(); }
    else if (page === 'settings') { el.innerHTML = settingsPageHTML(); bindSettings(); }
  }

  /* ================================================================ BOARD */
  function boardPageHTML() {
    const lead = S.state.settings.leadMin;
    const seg = [['today', 'วันนี้'], ['7d', '7 วัน'], ['30d', '30 วัน']];
    return '' +
      '<div class="page-title"><div><h1>บอร์ดติดตามงานรอ QA ตรวจ</h1><p>อัปเดตทุกวินาที · แจ้งเตือนก่อนถึงคิว ' + lead + ' นาที</p></div>' +
        '<div class="seg" role="group" aria-label="ช่วงเวลาของสถิติ">' +
          seg.map((s) => '<button type="button" data-kpi="' + s[0] + '" aria-pressed="' + (kpiRange === s[0]) + '">' + s[1] + '</button>').join('') +
        '</div></div>' +
      '<section class="kpis" id="kpis" aria-label="สรุปผลการตรวจ">' + kpisHTML() + '</section>' +
      '<div id="banner">' + bannerHTML() + '</div>' +
      '<section class="card board" aria-labelledby="board-h">' +
        '<div class="board-bar"><h2 id="board-h">' + ic('clipboard-check') + 'คิวรอตรวจ <small>Inspection queue</small></h2>' +
          '<span class="live" aria-hidden="true"><i></i>LIVE</span><span class="spacer"></span>' +
          '<a class="btn btn-sm" href="#/tv" aria-label="โหมดจอ TV">' + ic('monitor', 'icon-sm') + '<span>โหมดจอ TV</span></a></div>' +
        '<div class="toolbar">' +
          '<div class="search">' + ic('search') + '<label class="sr-only" for="bf-q">ค้นหา</label><input class="input" id="bf-q" type="search" placeholder="ค้นหา Job No., Product" value="' + esc(boardFilter.q) + '"></div>' +
          '<label class="sr-only" for="bf-proc">กรอง Process</label><select class="select" id="bf-proc"><option value="">ทุก Process</option>' +
            S.state.processes.map((p) => '<option' + (boardFilter.process === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select>' +
          '<label class="sr-only" for="bf-ph">กรองสถานะ</label><select class="select" id="bf-ph">' +
            [['', 'ทุกสถานะ'], ['due', 'ถึงเวลาตรวจ'], ['soon', 'ใกล้ถึงคิว'], ['scheduled', 'รอคิวตรวจ'], ['inspecting', 'กำลังตรวจ']]
              .map((o) => '<option value="' + o[0] + '"' + (boardFilter.phase === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
        '</div>' +
        '<div id="board-body">' + boardBodyHTML() + '</div>' +
      '</section>' +
      '<section class="card card-pad" style="margin-top:16px" id="await" aria-labelledby="await-h">' + awaitHTML() + '</section>';
  }

  function kpisHTML() {
    const s = stats(kpiRange);
    const label = { today: 'วันนี้', '7d': '7 วันล่าสุด', '30d': '30 วันล่าสุด' }[kpiRange];
    return '' +
      '<div class="kpi k-total"><div class="k-top"><span>ตรวจแล้ว</span><span class="k-ico">' + ic('clipboard-check') + '</span></div>' +
        '<div class="k-val">' + s.total + '</div><div class="k-sub">' + label + (s.rate != null ? ' · ผ่าน ' + s.rate + '%' : '') + '</div>' +
        (s.total ? '<div class="ratebar" role="img" aria-label="อัตราผ่าน ' + s.rate + '%"><i style="width:' + s.rate + '%"></i></div>' : '') + '</div>' +
      '<div class="kpi k-ok"><div class="k-top"><span>Accept (OK)</span><span class="k-ico">' + ic('check-circle') + '</span></div>' +
        '<div class="k-val">' + s.ok + '</div><div class="k-sub">ผ่านการตรวจ</div></div>' +
      '<div class="kpi k-ng"><div class="k-top"><span>Reject (NG)</span><span class="k-ico">' + ic('x-circle') + '</span></div>' +
        '<div class="k-val">' + s.ng + '</div><div class="k-sub">ไม่ผ่าน · ต้องตรวจซ้ำ</div></div>' +
      '<div class="kpi k-wait"><div class="k-top"><span>รอตรวจ</span><span class="k-ico">' + ic('hourglass') + '</span></div>' +
        '<div class="k-val">' + s.waiting + '</div><div class="k-sub">กำลังตรวจ ' + s.inspecting + ' · ถึงเวลา ' + s.due + '</div></div>';
  }

  function bannerHTML() {
    const now = Date.now(), act = activeReqs();
    const due = act.filter((r) => S.phase(r, now) === 'due').length;
    const over = act.filter((r) => S.phase(r, now) === 'overtime').length;
    const soon = act.filter((r) => S.phase(r, now) === 'soon').length;
    if (due || over) {
      const parts = [];
      if (due) parts.push('ถึงเวลาตรวจ ' + due + ' งาน');
      if (over) parts.push('ตรวจเกินเวลา ' + over + ' งาน');
      return '<div class="alert-banner" role="alert">' + ic('alert', 'icon-lg') +
        '<div class="txt">' + parts.join(' · ') + '<small>' + (can.inspect() ? 'กด “ยอมรับ” เพื่อเริ่มตรวจ หรือ “เลื่อนเวลา” หากยังไปตรวจไม่ได้' : 'รอ QA ยอมรับงาน') + '</small></div>' +
        '<button class="btn btn-sm btn-danger" data-act="alerts">ดูรายการ</button></div>';
    }
    if (soon) {
      return '<div class="alert-banner soon" role="status">' + ic('bell', 'icon-lg') +
        '<div class="txt">อีกไม่เกิน ' + S.state.settings.leadMin + ' นาที จะถึงคิวตรวจ ' + soon + ' งาน<small>เตรียมตัวไปตรวจงาน</small></div>' +
        '<button class="btn btn-sm" data-act="alerts">ดูรายการ</button></div>';
    }
    return '';
  }

  function boardList() {
    const now = Date.now(), q = boardFilter.q.trim().toLowerCase();
    return activeReqs().filter((r) => {
      if (boardFilter.process && r.process !== boardFilter.process) return false;
      if (boardFilter.phase) {
        const ph = S.phase(r, now);
        if (boardFilter.phase === 'inspecting' ? !(ph === 'inspecting' || ph === 'overtime') : ph !== boardFilter.phase) return false;
      }
      if (q && (r.jobNo + ' ' + r.product + ' ' + r.process + ' ' + r.detail).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(byPlan);
  }

  function boardBodyHTML() {
    const now = Date.now(), list = boardList();
    if (!list.length) {
      const filtered = boardFilter.q || boardFilter.process || boardFilter.phase;
      return '<div class="empty">' + ic(filtered ? 'search' : 'check-circle') +
        '<b>' + (filtered ? 'ไม่พบรายการตามตัวกรอง' : 'ไม่มีงานรอตรวจในขณะนี้') + '</b>' +
        (filtered ? 'ลองล้างคำค้นหาหรือเปลี่ยนตัวกรอง' : 'งานที่แจ้งใหม่จะแสดงที่นี่ทันที') +
        (!filtered ? '<div style="margin-top:14px"><a class="btn btn-primary" href="#/new">' + ic('plus') + 'แจ้งงานตรวจ</a></div>' : '') + '</div>';
    }
    const withAct = can.inspect();
    const table = '' +
      '<table class="btable"><caption class="sr-only">รายการงานรอ QA ตรวจ</caption><thead><tr>' +
        '<th scope="col">เวลานัดตรวจ</th><th scope="col">Job No. / Product</th><th scope="col">Process</th><th scope="col">Process Detail</th>' +
        '<th scope="col">Inspector</th><th scope="col">Status</th>' + (withAct ? '<th scope="col"><span class="sr-only">การทำงาน</span></th>' : '') +
      '</tr></thead><tbody>' +
      list.map((r) => {
        const ph = S.phase(r, now);
        return '<tr class="' + rowCls(ph) + (r.id === flashId ? ' flash' : '') + '" data-act="open" data-id="' + r.id + '" tabindex="0">' +
          '<td>' + timeCell(r) + '</td>' +
          '<td><div class="t-job">' + esc(r.jobNo) + '</div><div class="t-prod">' + esc(r.product) + '</div></td>' +
          '<td>' + esc(r.process) + '</td>' +
          '<td><div class="t-sub" style="margin:0">' + detailTag(r) + extraTags(r) + '</div></td>' +
          '<td>' + inspectorHTML(r) + '</td>' +
          '<td>' + statusHTML(r, now) + '</td>' +
          (withAct ? '<td><div class="row-actions">' + actionsHTML(r, ph) + '</div></td>' : '') +
        '</tr>';
      }).join('') +
      '</tbody></table>';
    const cards = '<div class="bcards">' + list.map((r) => {
      const ph = S.phase(r, now), acts = actionsHTML(r, ph);
      return '<article class="bcard ' + rowCls(ph) + (r.id === flashId ? ' flash' : '') + '" data-act="open" data-id="' + r.id + '" tabindex="0" aria-label="Job ' + esc(r.jobNo) + '">' +
        '<div>' + timeCell(r) + '</div>' +
        '<div class="b-main">' +
          '<div class="b-top"><span class="t-job">' + esc(r.jobNo) + '</span></div>' +
          '<div class="t-prod">' + esc(r.product) + '</div>' +
          '<div class="t-sub"><span class="tag">' + esc(r.process) + '</span>' + detailTag(r) + extraTags(r) + '</div>' +
          (r.inspector ? '<div class="b-insp">' + ic('user', 'icon-sm') + 'Inspector: <b>' + esc(r.inspector.name) + '</b></div>' : '') +
          statusHTML(r, now) +
          (acts ? '<div class="row-actions">' + acts + '</div>' : '') +
        '</div></article>';
    }).join('') + '</div>';
    return table + cards;
  }

  function awaitHTML() {
    const list = S.jobsAwaitingLast();
    const lastName = (S.state.details.find((d) => d.id === 'last') || {}).name || 'Last piece';
    return '' +
      '<div class="card-head"><h2 id="await-h">' + ic('flag') + 'Job รอตรวจ ' + esc(lastName) + ' <span class="tag">' + list.length + '</span></h2>' +
        '<span class="help">ผ่าน 1st piece แล้ว — ต้องตรวจ ' + esc(lastName) + ' ผ่านจึงจะปิด Job ได้</span></div>' +
      (list.length
        ? '<div class="await-list">' + list.map((r) => '' +
            '<div class="await-item"><div class="ai-main"><span class="t-job">' + esc(r.jobNo) + '</span><b>' + esc(r.product) + '</b>' +
              '<span class="help">' + esc(r.process) + ' · 1st piece OK ' + fmtDT(r.resultAt) + (r.inspector ? ' · ' + esc(firstName(r.inspector.name)) : '') + '</span></div>' +
              '<button class="btn btn-sm btn-primary" data-act="req-last" data-id="' + r.id + '">' + ic('plus', 'icon-sm') + 'แจ้งตรวจ</button></div>').join('') + '</div>'
        : '<div class="empty" style="padding:20px">' + ic('check-circle') + '<b>ไม่มี Job ค้างรอ ' + esc(lastName) + '</b></div>');
  }

  function bindBoard() {
    $$('[data-kpi]').forEach((b) => b.addEventListener('click', () => {
      kpiRange = b.dataset.kpi;
      $$('[data-kpi]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#kpis').innerHTML = kpisHTML();
    }));
    let t;
    $('#bf-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { boardFilter.q = e.target.value; $('#board-body').innerHTML = boardBodyHTML(); }, 150); });
    $('#bf-proc').addEventListener('change', (e) => { boardFilter.process = e.target.value; $('#board-body').innerHTML = boardBodyHTML(); });
    $('#bf-ph').addEventListener('change', (e) => { boardFilter.phase = e.target.value; $('#board-body').innerHTML = boardBodyHTML(); });
    if (flashId) setTimeout(() => { flashId = null; }, 2500);
  }

  function refreshBoard() {
    if (page !== 'board' || !$('#board-body')) return;
    $('#kpis').innerHTML = kpisHTML();
    $('#banner').innerHTML = bannerHTML();
    $('#board-body').innerHTML = boardBodyHTML();
    $('#await').innerHTML = awaitHTML();
  }

  /* ================================================================ NEW REQUEST */
  function chipsHTML(name, items, selected) {
    return items.map((v) => '<label class="chip"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (v === selected ? ' checked' : '') + '><span>' + esc(v) + '</span></label>').join('');
  }

  function newPageHTML() {
    const p = prefill || {};
    const products = Array.from(new Set(S.state.requests.slice().reverse().map((r) => r.product))).slice(0, 60);
    const jobs = Array.from(new Set(activeReqs().map((r) => r.jobNo).concat(S.jobsAwaitingLast().map((r) => r.jobNo))));
    const plan = p.planAt || toLocalInput(roundUp5(Date.now() + 60 * MIN));
    return '' +
      '<div class="form-wrap">' +
      '<div class="page-title"><div><h1>แจ้งงานรอ QA ตรวจ</h1><p>กรอกข้อมูลแล้วกด “บันทึกข้อมูล” — งานจะขึ้นบนบอร์ดทันที</p></div></div>' +
      '<form id="req-form" class="card card-pad" novalidate>' +
      '<div class="form-grid">' +
        '<div class="requester"><span class="avatar" aria-hidden="true">' + initials(user.name) + '</span><span>ผู้แจ้งงาน: <b>' + esc(user.name) + '</b> <span class="mono help">' + esc(user.id) + '</span></span></div>' +
        '<p class="section-label">ข้อมูลงาน</p>' +
        '<div class="form-grid two">' +
          '<div class="field"><label for="f-date">Date Received<span class="req">*</span></label>' +
            '<input class="input" id="f-date" name="dateReceived" type="date" value="' + (p.dateReceived || todayStr()) + '" required><p class="error" id="e-date"></p></div>' +
          '<div class="field"><label for="f-job">Job No.<span class="req">*</span></label>' +
            '<input class="input mono" id="f-job" name="jobNo" list="dl-jobs" autocapitalize="characters" spellcheck="false" autocomplete="off" placeholder="เช่น J2610-0421" value="' + esc(p.jobNo || '') + '" required>' +
            '<datalist id="dl-jobs">' + jobs.map((j) => '<option value="' + esc(j) + '">').join('') + '</datalist><p class="error" id="e-job"></p></div>' +
        '</div>' +
        '<div class="field"><label for="f-prod">Product<span class="req">*</span></label>' +
          '<input class="input" id="f-prod" name="product" list="dl-prod" autocomplete="off" placeholder="ชื่อ / รหัสสินค้า" value="' + esc(p.product || '') + '" required>' +
          '<datalist id="dl-prod">' + products.map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist><p class="error" id="e-prod"></p></div>' +
        '<div id="job-hint"></div>' +
        '<fieldset class="fieldset"><legend>Process<span class="req">*</span></legend>' +
          '<div class="chips" id="c-proc">' + chipsHTML('process', S.state.processes, p.process) + '</div><p class="error" id="e-proc"></p></fieldset>' +
        '<fieldset class="fieldset"><legend>Process Detail<span class="req">*</span></legend>' +
          '<div class="chips" id="c-detail">' + chipsHTML('detail', S.state.details.map((d) => d.name), p.detail) + '</div>' +
          '<p class="help" id="detail-help"></p><p class="error" id="e-detail"></p></fieldset>' +
        '<div class="field"><label for="f-plan">Plan to inspection (เวลาที่ต้องการให้ตรวจ)<span class="req">*</span></label>' +
          '<input class="input" id="f-plan" name="planAt" type="datetime-local" value="' + plan + '" required>' +
          '<div class="quick" role="group" aria-label="ตั้งเวลาด่วน">' +
            [[30, '+30 นาที'], [60, '+1 ชม.'], [120, '+2 ชม.'], [240, '+4 ชม.']].map((q) => '<button type="button" data-plus="' + q[0] + '">' + q[1] + '</button>').join('') +
          '</div><p class="help">ระบบจะแจ้งเตือนก่อนถึงเวลา ' + S.state.settings.leadMin + ' นาที</p><p class="error" id="e-plan"></p></div>' +
        '<p class="section-label">ข้อมูลเพิ่มเติม (ถ้ามี)</p>' +
        '<div class="field"><label for="f-remark">Remark <span class="opt">(ไม่บังคับ)</span></label>' +
          '<textarea class="textarea" id="f-remark" name="remark" maxlength="500" placeholder="เช่น ล็อตเร่งด่วน, จุดที่ต้องการให้ตรวจเป็นพิเศษ">' + esc(p.remark || '') + '</textarea></div>' +
        photoFieldHTML('f-photo', 'รูปถ่าย') +
        '<div class="form-actions">' +
          '<button type="reset" class="btn">ล้างฟอร์ม</button>' +
          '<button type="submit" class="btn btn-primary btn-lg" id="f-submit">' + ic('save') + 'บันทึกข้อมูล</button>' +
        '</div>' +
      '</div></form></div>';
  }

  function photoFieldHTML(id, label) {
    return '<div class="field"><span class="label" id="' + id + '-lbl">' + label + ' <span class="opt">(ไม่บังคับ)</span></span>' +
      '<div class="photo-drop" data-photo="' + id + '">' +
        '<div class="thumb" id="' + id + '-thumb">' + ic('camera', 'icon-lg') + '</div>' +
        '<div class="pd-txt"><b id="' + id + '-name">ยังไม่มีรูป</b>ถ่ายรูปหรือเลือกจากเครื่อง (ระบบจะย่อขนาดให้อัตโนมัติ)</div>' +
        '<label class="btn btn-sm" for="' + id + '">' + ic('camera', 'icon-sm') + '<span>เลือกรูป</span></label>' +
        '<button type="button" class="btn btn-sm btn-ghost icon-btn" id="' + id + '-clear" aria-label="ลบรูป" hidden>' + ic('trash', 'icon-sm') + '</button>' +
        '<input type="file" id="' + id + '" accept="image/*" class="sr-only" aria-labelledby="' + id + '-lbl">' +
      '</div></div>';
  }

  function bindPhoto(id, onChange) {
    const input = $('#' + id), thumb = $('#' + id + '-thumb'), name = $('#' + id + '-name'), clear = $('#' + id + '-clear');
    const reset = () => { thumb.innerHTML = ic('camera', 'icon-lg'); name.textContent = 'ยังไม่มีรูป'; clear.hidden = true; input.value = ''; onChange(''); };
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0]; if (!f) return;
      name.textContent = 'กำลังประมวลผลรูป…';
      try {
        const data = await compressImage(f);
        thumb.innerHTML = '<img src="' + data + '" alt="ตัวอย่างรูปที่เลือก">';
        name.textContent = f.name; clear.hidden = false; onChange(data);
      } catch (e) { toast('err', 'อ่านไฟล์รูปไม่สำเร็จ', 'กรุณาเลือกไฟล์รูปภาพ (JPG/PNG)'); reset(); }
    });
    clear.addEventListener('click', reset);
    return reset;
  }

  function compressImage(file, max) {
    max = max || 1024;
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('not image'));
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.7));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function bindNew() {
    const form = $('#req-form');
    const jobI = $('#f-job'), prodI = $('#f-prod'), planI = $('#f-plan');
    let photo = '';
    const resetPhoto = bindPhoto('f-photo', (d) => { photo = d; });
    const checked = (n) => { const x = form.querySelector('input[name="' + n + '"]:checked'); return x ? x.value : ''; };
    const lastName = (S.state.details.find((d) => d.id === 'last') || {}).name;
    const firstNm = (S.state.details.find((d) => d.id === 'first') || {}).name;

    function jobHint() {
      const job = jobI.value.trim().toUpperCase(), box = $('#job-hint');
      if (!job) { box.innerHTML = ''; return; }
      const reqs = S.state.requests.filter((r) => r.jobNo === job && r.status !== 'cancelled');
      if (!reqs.length) { box.innerHTML = ''; return; }
      const st = S.jobState(job), pending = reqs.filter((r) => r.status === 'waiting' || r.status === 'inspecting');
      if (!prodI.value.trim()) prodI.value = reqs[reqs.length - 1].product;
      if (st === 'awaitingLast' && !pending.length) {
        box.innerHTML = '<div class="hint-box warn">' + ic('flag') + '<div>Job <b class="mono">' + esc(job) + '</b> ผ่าน ' + esc(firstNm) + ' แล้ว — ต้องตรวจ <b>' + esc(lastName) + '</b> ผ่านจึงจะปิด Job ได้ ' +
          '<button type="button" class="btn btn-sm" data-pick-last style="margin-top:6px">เลือก ' + esc(lastName) + '</button></div></div>';
        const b = box.querySelector('[data-pick-last]');
        b.addEventListener('click', () => {
          const r = form.querySelector('input[name="detail"][value="' + CSS.escape(lastName) + '"]'); if (r) { r.checked = true; detailHelp(); }
          const pr = form.querySelector('input[name="process"][value="' + CSS.escape(reqs[reqs.length - 1].process) + '"]'); if (pr && !checked('process')) pr.checked = true;
        });
      } else if (pending.length) {
        box.innerHTML = '<div class="hint-box">' + ic('info') + '<div>Job นี้มีรายการรอตรวจ/กำลังตรวจอยู่ ' + pending.length + ' รายการ: ' +
          pending.map((r) => esc(r.detail) + ' (' + fmtTime(r.planAt) + ')').join(', ') + '</div></div>';
      } else if (st === 'closed') {
        box.innerHTML = '<div class="hint-box">' + ic('check-circle') + '<div>Job นี้เคยแจ้งตรวจและผ่านครบแล้ว — แจ้งเพิ่มได้หากเป็นรอบตรวจใหม่</div></div>';
      } else box.innerHTML = '';
    }
    function detailHelp() {
      const d = checked('detail'), h = $('#detail-help');
      h.textContent = d === firstNm ? firstNm + ' → ต้องมีรอบตรวจ ' + lastName + ' ผ่าน จึงจะปิด Job นี้ได้' : d === lastName ? 'เมื่อ ' + lastName + ' ผ่าน จะถือว่าปิด Job' : '';
    }
    jobI.addEventListener('change', jobHint);
    jobI.addEventListener('blur', jobHint);
    $('#c-detail').addEventListener('change', detailHelp);
    $$('[data-plus]', form).forEach((b) => b.addEventListener('click', () => {
      planI.value = toLocalInput(roundUp5(Date.now() + Number(b.dataset.plus) * MIN));
      setErr('e-plan', '', planI);
    }));
    form.addEventListener('reset', () => { setTimeout(() => { resetPhoto(); $('#job-hint').innerHTML = ''; detailHelp(); planI.value = toLocalInput(roundUp5(Date.now() + 60 * MIN)); $('#f-date').value = todayStr(); $$('.error', form).forEach((e) => { e.innerHTML = ''; }); $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid')); }); });
    // clear error on edit
    form.addEventListener('input', (e) => { const f = e.target.closest('.field, .fieldset'); if (f) { const er = f.querySelector('.error'); if (er) er.innerHTML = ''; e.target.removeAttribute('aria-invalid'); const ch = f.querySelector('.chips'); if (ch) ch.removeAttribute('aria-invalid'); } });

    if (prefill) { jobHint(); detailHelp(); prefill = null; }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        dateReceived: $('#f-date').value, jobNo: jobI.value.trim().toUpperCase(), product: prodI.value.trim(),
        process: checked('process'), detail: checked('detail'), planAt: planI.value, remark: $('#f-remark').value, photo
      };
      const errs = [];
      if (!data.dateReceived) errs.push(['e-date', 'กรุณาเลือกวันที่รับงาน', $('#f-date')]);
      if (!data.jobNo) errs.push(['e-job', 'กรุณากรอก Job No.', jobI]);
      if (!data.product) errs.push(['e-prod', 'กรุณากรอก Product', prodI]);
      if (!data.process) errs.push(['e-proc', 'กรุณาเลือก Process', $('#c-proc')]);
      if (!data.detail) errs.push(['e-detail', 'กรุณาเลือก Process Detail', $('#c-detail')]);
      if (!data.planAt) errs.push(['e-plan', 'กรุณาระบุเวลาที่ต้องการให้ตรวจ', planI]);
      if (data.jobNo && data.detail) {
        const dup = activeReqs().find((r) => r.jobNo === data.jobNo && r.detail === data.detail);
        if (dup) errs.push(['e-detail', 'Job นี้มีรายการ “' + data.detail + '” รอตรวจอยู่แล้ว (' + fmtTime(dup.planAt) + ')', $('#c-detail')]);
      }
      $$('.error', form).forEach((x) => { x.innerHTML = ''; });
      if (errs.length) {
        errs.forEach((x) => setErr(x[0], x[1], x[2]));
        const first = errs[0][2]; (first.matches('.chips') ? first.querySelector('input') : first).focus();
        return;
      }
      const btn = $('#f-submit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>กำลังบันทึก…';
      setTimeout(() => {
        data.planAt = new Date(data.planAt).toISOString();
        const r = S.createRequest(data, user);
        if (!r) { btn.disabled = false; btn.innerHTML = ic('save') + 'บันทึกข้อมูล'; return; }
        flashId = r.id;
        toast('ok', 'บันทึกข้อมูลแล้ว', 'Job ' + r.jobNo + ' · ' + r.detail + ' นัดตรวจ ' + fmtTime(r.planAt));
        location.hash = '#/board';
      }, 350);
    });
  }

  function setErr(id, msg, field) {
    const el = $('#' + id); if (el) el.innerHTML = msg ? ic('alert', 'icon-sm') + esc(msg) : '';
    if (field) { if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid'); }
  }

  /* ================================================================ HISTORY */
  function historyList() {
    const from = rangeStart(hist.range), q = hist.q.trim().toLowerCase();
    return S.state.requests.filter((r) => r.status === 'done' || r.status === 'cancelled')
      .map((r) => Object.assign({ _t: ms(r.resultAt || r.cancelledAt) }, r))
      .filter((r) => r._t >= from)
      .filter((r) => !hist.result || (hist.result === 'CX' ? r.status === 'cancelled' : r.result === hist.result))
      .filter((r) => !q || (r.jobNo + ' ' + r.product + ' ' + r.process + ' ' + r.detail + ' ' + (r.inspector ? r.inspector.name : '')).toLowerCase().indexOf(q) >= 0)
      .sort((a, b) => b._t - a._t);
  }
  const durMin = (r) => (r.acceptedAt && r.resultAt ? Math.max(1, Math.round((ms(r.resultAt) - ms(r.acceptedAt)) / MIN)) + ' นาที' : '—');

  function historyPageHTML() {
    const seg = [['today', 'วันนี้'], ['7d', '7 วัน'], ['30d', '30 วัน']];
    return '' +
      '<div class="page-title"><div><h1>ประวัติการตรวจ</h1><p>รายการที่ลงผลแล้ว (OK / NG) และรายการที่ยกเลิก</p></div>' +
        '<button class="btn" data-act="export">' + ic('download') + 'Export CSV</button></div>' +
      '<section class="card">' +
        '<div class="toolbar" style="border-radius:var(--r-lg) var(--r-lg) 0 0">' +
          '<div class="seg" role="group" aria-label="ช่วงเวลา">' + seg.map((s) => '<button type="button" data-hr="' + s[0] + '" aria-pressed="' + (hist.range === s[0]) + '">' + s[1] + '</button>').join('') + '</div>' +
          '<label class="sr-only" for="h-res">ผลตรวจ</label><select class="select" id="h-res">' +
            [['', 'ทุกผล'], ['OK', 'OK'], ['NG', 'NG'], ['CX', 'ยกเลิก']].map((o) => '<option value="' + o[0] + '"' + (hist.result === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
          '<div class="search">' + ic('search') + '<label class="sr-only" for="h-q">ค้นหา</label><input class="input" id="h-q" type="search" placeholder="ค้นหา Job, Product, Inspector" value="' + esc(hist.q) + '"></div>' +
        '</div>' +
        '<div id="h-body">' + historyBodyHTML() + '</div>' +
      '</section>';
  }

  function historyBodyHTML() {
    const list = historyList();
    const ok = list.filter((r) => r.result === 'OK').length, ng = list.filter((r) => r.result === 'NG').length;
    const summary = '<div class="help" style="padding:12px 16px;border-bottom:1px solid var(--border)">แสดง <b>' + list.length + '</b> รายการ · OK <b style="color:var(--ok-ink)">' + ok + '</b> · NG <b style="color:var(--ng-ink)">' + ng + '</b></div>';
    if (!list.length) return summary + '<div class="empty">' + ic('history') + '<b>ยังไม่มีประวัติในช่วงเวลานี้</b>ลองเลือกช่วงเวลาอื่น</div>';
    const table = '<table class="htable"><caption class="sr-only">ประวัติการตรวจ</caption><thead><tr>' +
      '<th scope="col">เวลาลงผล</th><th scope="col">Job No.</th><th scope="col">Product</th><th scope="col">Process</th><th scope="col">Detail</th><th scope="col">รอบ</th><th scope="col">Inspector</th><th scope="col">ใช้เวลา</th><th scope="col">ผล</th><th scope="col">หมายเหตุ</th>' +
      '</tr></thead><tbody>' + list.map((r) => '' +
        '<tr data-act="open" data-id="' + r.id + '" tabindex="0">' +
          '<td class="mono">' + fmtDT(new Date(r._t).toISOString()) + '</td>' +
          '<td class="t-job">' + esc(r.jobNo) + '</td><td>' + esc(r.product) + '</td><td>' + esc(r.process) + '</td><td>' + detailTag(r) + '</td>' +
          '<td class="mono">' + r.round + '</td><td>' + (r.inspector ? esc(r.inspector.name) : '—') + '</td><td class="mono">' + durMin(r) + '</td>' +
          '<td>' + resultPill(r) + '</td><td>' + esc(r.resultRemark || '') + '</td>' +
        '</tr>').join('') + '</tbody></table>';
    const cards = '<div class="hcards">' + list.map((r) => '' +
      '<div class="hcard" data-act="open" data-id="' + r.id + '" tabindex="0">' +
        '<div class="hc-top"><span class="t-job">' + esc(r.jobNo) + '</span>' + resultPill(r) + '</div>' +
        '<div class="t-prod">' + esc(r.product) + '</div>' +
        '<div class="t-sub"><span class="tag">' + esc(r.process) + '</span>' + detailTag(r) + (r.round > 1 ? '<span class="tag re">รอบ ' + r.round + '</span>' : '') + '</div>' +
        '<div class="help" style="margin-top:6px">' + fmtDT(new Date(r._t).toISOString()) + (r.inspector ? ' · ' + esc(r.inspector.name) : '') + ' · ' + durMin(r) + '</div>' +
        (r.resultRemark ? '<div class="help" style="color:var(--ng-ink)">' + esc(r.resultRemark) + '</div>' : '') +
      '</div>').join('') + '</div>';
    return summary + table + cards;
  }

  function bindHistory() {
    const upd = () => { $('#h-body').innerHTML = historyBodyHTML(); };
    $$('[data-hr]').forEach((b) => b.addEventListener('click', () => {
      hist.range = b.dataset.hr; $$('[data-hr]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); upd();
    }));
    $('#h-res').addEventListener('change', (e) => { hist.result = e.target.value; upd(); });
    let t; $('#h-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { hist.q = e.target.value; upd(); }, 150); });
  }

  function exportCSV() {
    const rows = historyList();
    const head = ['Result time', 'Date Received', 'Job No', 'Product', 'Process', 'Process Detail', 'Round', 'Plan to inspection', 'Requester', 'Inspector', 'Accepted at', 'Duration (min)', 'Result', 'Result remark', 'Remark'];
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const dt = (iso) => (iso ? toLocalInput(iso).replace('T', ' ') : '');
    const lines = [head.map(q).join(',')].concat(rows.map((r) => [
      dt(new Date(r._t).toISOString()), r.dateReceived, r.jobNo, r.product, r.process, r.detail, r.round, dt(r.planAt),
      r.requester ? r.requester.name : '', r.inspector ? r.inspector.name : '', dt(r.acceptedAt),
      r.acceptedAt && r.resultAt ? Math.round((ms(r.resultAt) - ms(r.acceptedAt)) / MIN) : '',
      r.status === 'cancelled' ? 'CANCELLED' : r.result, r.resultRemark, r.remark
    ].map(q).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'qa-history-' + todayStr() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('ok', 'Export แล้ว', rows.length + ' รายการ');
  }

  /* ================================================================ SETTINGS */
  function settingsPageHTML() {
    if (!can.admin()) {
      return '<div class="card card-pad"><div class="empty">' + ic('lock') + '<b>เฉพาะผู้ดูแลระบบ (Admin)</b>กรุณาเข้าสู่ระบบด้วยบัญชี Admin เพื่อแก้ไขการตั้งค่า</div></div>';
    }
    const st = S.state;
    const roleCls = { admin: 'admin', qa: 'qa', prod: 'prod' };
    return '' +
      '<div class="page-title"><div><h1>ตั้งค่า</h1><p>จัดการรายชื่อพนักงาน, Process, Process Detail และการแจ้งเตือน</p></div></div>' +
      '<div class="settings-grid">' +
        '<div style="display:grid;gap:16px">' +
          '<section class="card card-pad" aria-labelledby="s-emp"><div class="card-head"><h2 id="s-emp">' + ic('users') + 'พนักงาน <span class="tag">' + st.employees.length + '</span></h2></div>' +
            '<ul class="list">' + st.employees.map((e) => '' +
              '<li><span class="avatar" aria-hidden="true">' + initials(e.name) + '</span><div class="grow"><b>' + esc(e.name) + '</b><small class="mono">' + esc(e.id) + '</small></div>' +
                '<span class="role ' + roleCls[e.role] + '">' + ROLE[e.role] + '</span>' +
                (e.id === user.id ? '<span class="lock">' + ic('user', 'icon-sm') + 'คุณ</span>'
                  : '<button class="btn btn-sm btn-ghost icon-btn" data-act="del-emp" data-id="' + esc(e.id) + '" aria-label="ลบ ' + esc(e.name) + '">' + ic('trash', 'icon-sm') + '</button>') +
              '</li>').join('') + '</ul>' +
            '<form class="add-row emp" id="emp-form" novalidate>' +
              '<div class="field"><label for="ne-id">รหัสพนักงาน</label><input class="input mono" id="ne-id" autocapitalize="characters" placeholder="E000000" required></div>' +
              '<div class="field"><label for="ne-name">ชื่อ-นามสกุล</label><input class="input" id="ne-name" required></div>' +
              '<div class="field"><label for="ne-role">สิทธิ์</label><select class="select" id="ne-role"><option value="qa">QA Inspector</option><option value="prod">Production</option><option value="admin">Admin</option></select></div>' +
              '<button class="btn btn-primary" type="submit">' + ic('plus') + 'เพิ่ม</button>' +
              '<p class="error" id="ne-err" style="grid-column:1/-1"></p>' +
            '</form>' +
            '<p class="help" style="margin:8px 0 0">QA Inspector และ Admin กด “ยอมรับ” งานตรวจได้ — ชื่อจะขึ้นในคอลัมน์ Inspector</p>' +
          '</section>' +
          '<section class="card card-pad" aria-labelledby="s-alert"><div class="card-head"><h2 id="s-alert">' + ic('bell') + 'การแจ้งเตือน</h2></div>' +
            '<form id="alert-form" class="form-grid" novalidate>' +
              '<div class="field"><label for="st-lead">แจ้งเตือนก่อนถึงเวลาตรวจ</label><div class="num-input"><input class="input mono" id="st-lead" type="number" min="5" max="180" step="5" value="' + st.settings.leadMin + '"><span>นาที</span></div></div>' +
              '<div class="field"><label for="st-max">เวลาตรวจสูงสุดต่อรายการ (เกินแล้วแจ้งเตือน)</label><div class="num-input"><input class="input mono" id="st-max" type="number" min="5" max="240" step="5" value="' + st.settings.maxInspectMin + '"><span>นาที</span></div></div>' +
              '<p class="error" id="st-err"></p>' +
              '<div><button class="btn btn-primary" type="submit">' + ic('save') + 'บันทึก</button></div>' +
            '</form></section>' +
        '</div>' +
        '<div style="display:grid;gap:16px">' +
          '<section class="card card-pad" aria-labelledby="s-proc"><div class="card-head"><h2 id="s-proc">' + ic('package') + 'Process</h2></div>' +
            '<ul class="list">' + st.processes.map((p) => '<li><div class="grow">' + esc(p) + '</div><button class="btn btn-sm btn-ghost icon-btn" data-act="del-proc" data-id="' + esc(p) + '" aria-label="ลบ ' + esc(p) + '">' + ic('trash', 'icon-sm') + '</button></li>').join('') + '</ul>' +
            '<form class="add-row one" id="proc-form" novalidate><div class="field"><label class="sr-only" for="np">ชื่อ Process ใหม่</label><input class="input" id="np" placeholder="เพิ่ม Process ใหม่"></div><button class="btn btn-primary" type="submit">' + ic('plus') + 'เพิ่ม</button><p class="error" id="np-err" style="grid-column:1/-1"></p></form>' +
          '</section>' +
          '<section class="card card-pad" aria-labelledby="s-det"><div class="card-head"><h2 id="s-det">' + ic('clipboard-check') + 'Process Detail</h2></div>' +
            '<ul class="list">' + st.details.map((d) => '<li><div class="grow">' + esc(d.name) + (d.system ? '<small>ใช้ในกฎ: 1st piece ต้องมี Last piece จึงปิด Job</small>' : '') + '</div>' +
              (d.system ? '<span class="lock" title="ลบไม่ได้">' + ic('lock', 'icon-sm') + 'ระบบ</span>' : '<button class="btn btn-sm btn-ghost icon-btn" data-act="del-det" data-id="' + esc(d.id) + '" aria-label="ลบ ' + esc(d.name) + '">' + ic('trash', 'icon-sm') + '</button>') + '</li>').join('') + '</ul>' +
            '<form class="add-row one" id="det-form" novalidate><div class="field"><label class="sr-only" for="nd">ชื่อ Process Detail ใหม่</label><input class="input" id="nd" placeholder="เพิ่ม Process Detail ใหม่"></div><button class="btn btn-primary" type="submit">' + ic('plus') + 'เพิ่ม</button><p class="error" id="nd-err" style="grid-column:1/-1"></p></form>' +
          '</section>' +
        '</div>' +
      '</div>';
  }

  function bindSettings() {
    if (!can.admin()) return;
    $('#emp-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#ne-id').value.trim(), name = $('#ne-name').value.trim(), role = $('#ne-role').value;
      const err = $('#ne-err');
      if (!/^[A-Za-z0-9-]{3,20}$/.test(id)) { err.innerHTML = ic('alert', 'icon-sm') + 'รหัสพนักงานต้องเป็นตัวอักษร/ตัวเลข 3–20 ตัว'; $('#ne-id').focus(); return; }
      if (!name) { err.innerHTML = ic('alert', 'icon-sm') + 'กรุณากรอกชื่อ-นามสกุล'; $('#ne-name').focus(); return; }
      const msg = S.addEmployee({ id, name, role });
      if (msg) { err.innerHTML = ic('alert', 'icon-sm') + esc(msg); return; }
      toast('ok', 'เพิ่มพนักงานแล้ว', name + ' · ' + ROLE[role]);
    });
    $('#proc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#np').value.trim(); if (!v) { $('#np-err').innerHTML = ic('alert', 'icon-sm') + 'กรุณากรอกชื่อ Process'; return; }
      const msg = S.addProcess(v); if (msg) { $('#np-err').innerHTML = ic('alert', 'icon-sm') + esc(msg); return; }
      toast('ok', 'เพิ่ม Process แล้ว', v);
    });
    $('#det-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#nd').value.trim(); if (!v) { $('#nd-err').innerHTML = ic('alert', 'icon-sm') + 'กรุณากรอกชื่อ Process Detail'; return; }
      const msg = S.addDetail(v); if (msg) { $('#nd-err').innerHTML = ic('alert', 'icon-sm') + esc(msg); return; }
      toast('ok', 'เพิ่ม Process Detail แล้ว', v);
    });
    $('#alert-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const lead = Number($('#st-lead').value), max = Number($('#st-max').value);
      if (!(lead >= 5 && lead <= 180) || !(max >= 5 && max <= 240)) { $('#st-err').innerHTML = ic('alert', 'icon-sm') + 'กรุณาระบุตัวเลข 5–180 (แจ้งเตือน) และ 5–240 (เวลาตรวจ)'; return; }
      S.updateSettings({ leadMin: lead, maxInspectMin: max });
      toast('ok', 'บันทึกการตั้งค่าแล้ว', 'แจ้งเตือนก่อน ' + lead + ' นาที · ตรวจไม่เกิน ' + max + ' นาที');
    });
  }

  /* ================================================================ MODALS */
  function openModal(html, opts) {
    opts = opts || {};
    dlg.innerHTML = '<div class="modal-wrap" data-backdrop><div class="modal-panel' + (opts.wide ? ' wide' : '') + '">' + html + '</div></div>';
    if (!dlg.open) dlg.showModal();
    const f = dlg.querySelector('[autofocus]'); if (f) f.focus();
  }
  function closeModal() {
    modalKind = null; modalId = null; modalReturn = null;
    if (dlg.open) dlg.close();
    dlg.innerHTML = '';
  }
  dlg.addEventListener('click', (e) => {
    if (e.target.matches('[data-backdrop]')) closeModal();
    else if (e.target.closest('[data-close]')) closeModal();
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });

  const modalHead = (icon, title) => '<div class="modal-head"><h2>' + ic(icon) + '<span>' + title + '</span></h2><button class="btn btn-ghost icon-btn" data-close aria-label="ปิด">' + ic('x') + '</button></div>';
  const summaryBox = (r) => '<div class="notice" style="display:block"><span class="t-job">' + esc(r.jobNo) + '</span> · <b>' + esc(r.product) + '</b><div class="t-sub"><span class="tag">' + esc(r.process) + '</span>' + detailTag(r) + extraTags(r) + '<span>นัดตรวจ ' + fmtDT(r.planAt) + '</span></div></div>';

  function confirmBox(o) {
    return new Promise((resolve) => {
      modalKind = 'confirm';
      openModal(modalHead(o.danger ? 'alert' : 'info', esc(o.title)) +
        '<div class="modal-body"><p style="margin:0">' + o.message + '</p></div>' +
        '<div class="modal-foot"><button class="btn" data-c="0">ยกเลิก</button><button class="btn ' + (o.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-c="1" autofocus>' + esc(o.ok || 'ยืนยัน') + '</button></div>');
      const done = (v) => { closeModal(); resolve(v); };
      dlg.querySelector('[data-c="0"]').addEventListener('click', () => done(false));
      dlg.querySelector('[data-c="1"]').addEventListener('click', () => done(true));
    });
  }

  /* ---------- detail ---------- */
  function openDetail(id) {
    const r = S.find(id); if (!r) return closeModal();
    modalKind = 'detail'; modalId = id;
    const now = Date.now(), active = r.status === 'waiting' || r.status === 'inspecting';
    const js = S.jobState(r.jobNo);
    const lastName = (S.state.details.find((d) => d.id === 'last') || {}).name;
    const jobNote = js === 'awaitingLast'
      ? '<div class="hint-box warn">' + ic('flag') + '<div>Job นี้ยังไม่ปิด — ผ่าน 1st piece แล้ว รอตรวจ <b>' + esc(lastName) + '</b></div></div>'
      : js === 'closed' ? '<div class="hint-box" style="background:var(--ok-bg);border-color:var(--ok-bd);color:var(--ok-ink)">' + ic('check-circle') + '<div>Job นี้ตรวจผ่านครบแล้ว</div></div>' : '';
    const kv = (k, v) => '<div><small>' + k + '</small><b>' + v + '</b></div>';
    const orig = r.postpones.length ? r.postpones[0].from : null;

    // job timeline (all rounds of this Job)
    const ev = [];
    S.state.requests.filter((x) => x.jobNo === r.jobNo).forEach((x) => {
      const tag = esc(x.detail) + (x.round > 1 ? ' (รอบ ' + x.round + ')' : '');
      ev.push({ t: ms(x.createdAt), dot: '', icon: 'clipboard-plus', h: 'แจ้งตรวจ ' + tag, s: fmtDT(x.createdAt) + ' · ' + esc(x.requester ? x.requester.name : '') });
      (x.postpones || []).forEach((p) => ev.push({ t: ms(p.at), dot: 'pp', icon: 'clock-plus', h: 'เลื่อนเวลา ' + tag + ' ' + fmtTime(p.from) + ' → ' + fmtTime(p.to), s: fmtDT(p.at) + ' · ' + esc(p.by.name) + (p.reason ? ' · ' + esc(p.reason) : '') }));
      if (x.acceptedAt) ev.push({ t: ms(x.acceptedAt), dot: 'in', icon: 'scan', h: 'ยอมรับตรวจ ' + tag, s: fmtDT(x.acceptedAt) + ' · ' + esc(x.inspector ? x.inspector.name : '') });
      if (x.resultAt) ev.push({ t: ms(x.resultAt), dot: x.result === 'NG' ? 'ng' : '', icon: x.result === 'NG' ? 'x' : 'check', h: 'ผลตรวจ ' + tag + ': <b>' + x.result + '</b>', s: fmtDT(x.resultAt) + (x.resultRemark ? ' · ' + esc(x.resultRemark) : '') });
      if (x.status === 'cancelled') ev.push({ t: ms(x.cancelledAt), dot: 'ng', icon: 'x', h: 'ยกเลิก ' + tag, s: fmtDT(x.cancelledAt) + ' · ' + esc(x.cancelledBy ? x.cancelledBy.name : '') });
    });
    ev.sort((a, b) => a.t - b.t);

    let foot = '';
    if (r.status === 'waiting' && can.cancel(r)) foot += '<button class="btn btn-danger" data-act="cancel" data-id="' + r.id + '" style="margin-right:auto">' + ic('trash', 'icon-sm') + 'ยกเลิกรายการ</button>';
    if (r.status === 'waiting' && can.inspect()) foot += '<button class="btn" data-act="postpone" data-id="' + r.id + '">' + ic('clock-plus') + 'Reject · เลื่อนเวลา</button><button class="btn btn-primary" data-act="accept" data-id="' + r.id + '">' + ic('check') + 'ยอมรับ</button>';
    if (r.status === 'inspecting' && can.inspect()) foot += '<button class="btn btn-primary" data-act="result" data-id="' + r.id + '">' + ic('clipboard-check') + 'ลงผลตรวจ</button>';
    if (!foot) foot = '<button class="btn" data-close>ปิด</button>';

    openModal(
      modalHead('package', '<span class="mono">' + esc(r.jobNo) + '</span>') +
      '<div class="modal-body">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
          '<div style="min-width:0"><div class="t-prod" style="font-size:18px">' + esc(r.product) + '</div><div class="t-sub"><span class="tag">' + esc(r.process) + '</span>' + detailTag(r) + extraTags(r) + '</div></div>' +
          (active ? statusHTML(r, now) : resultPill(r)) +
        '</div>' +
        jobNote +
        '<div class="kv">' +
          kv('Date Received', r.dateReceived ? fmtDate(r.dateReceived + 'T00:00', true) : '—') +
          kv('Plan to inspection', fmtDT(r.planAt) + (orig ? ' <span class="help">(เดิม ' + fmtTime(orig) + ')</span>' : '')) +
          kv('รอบตรวจ', r.round) +
          kv('ผู้แจ้งงาน', esc(r.requester ? r.requester.name : '—')) +
          kv('Inspector', r.inspector ? esc(r.inspector.name) : '—') +
          kv('เริ่มตรวจ', r.acceptedAt ? fmtDT(r.acceptedAt) : '—') +
        '</div>' +
        (r.remark ? '<div><small class="help">Remark</small><div>' + esc(r.remark) + '</div></div>' : '') +
        (r.photo ? '<img class="photo-full" src="' + esc(S.photoSrc(r.photo)) + '" alt="รูปถ่ายประกอบการแจ้งงาน" data-act="zoom" loading="lazy">' : '') +
        (r.resultAt ? '<div><small class="help">ผลตรวจ (' + fmtDT(r.resultAt) + ')</small><div>' + resultPill(r) + ' ' + esc(r.resultRemark) + '</div></div>' : '') +
        (r.resultPhoto ? '<img class="photo-full" src="' + esc(S.photoSrc(r.resultPhoto)) + '" alt="รูปถ่ายผลการตรวจ" data-act="zoom" loading="lazy">' : '') +
        '<div><h3 style="font-size:15px;margin:0 0 10px">ประวัติของ Job นี้</h3><ol class="timeline">' +
          ev.map((e) => '<li><span class="dot ' + e.dot + '">' + ic(e.icon) + '</span><div class="tl-t">' + e.h + '<small>' + e.s + '</small></div></li>').join('') +
        '</ol></div>' +
      '</div>' +
      '<div class="modal-foot">' + foot + '</div>', { wide: true });
  }

  /* ---------- postpone (reject at alert) ---------- */
  function openPostpone(id, returnTo) {
    const r = S.find(id); if (!r || r.status !== 'waiting') return;
    modalKind = 'postpone'; modalId = id; modalReturn = returnTo || null;
    const def = toLocalInput(roundUp5(Date.now() + 30 * MIN));
    openModal(
      modalHead('clock-plus', 'Reject · เลื่อนเวลาตรวจ') +
      '<form id="pp-form" novalidate><div class="modal-body">' + summaryBox(r) +
        '<div class="field"><label for="pp-at">เลื่อนไปตรวจเวลา<span class="req">*</span></label>' +
          '<input class="input" id="pp-at" type="datetime-local" value="' + def + '" required autofocus>' +
          '<div class="quick" role="group" aria-label="เลื่อนด่วน">' + [[15, '+15 นาที'], [30, '+30 นาที'], [60, '+1 ชม.'], [120, '+2 ชม.']].map((q) => '<button type="button" data-plus="' + q[0] + '">' + q[1] + '</button>').join('') + '</div>' +
          '<p class="help">นับจากเวลาปัจจุบัน — บอร์ดจะแสดงเวลาใหม่พร้อมเวลาเดิม</p><p class="error" id="pp-err"></p></div>' +
        '<div class="field"><label for="pp-reason">เหตุผล <span class="opt">(ถ้ามี)</span></label><input class="input" id="pp-reason" maxlength="200" placeholder="เช่น ติดตรวจงานอื่น"></div>' +
      '</div><div class="modal-foot"><button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" class="btn btn-primary">' + ic('clock-plus') + 'ยืนยันเลื่อนเวลา</button></div></form>');
    const at = $('#pp-at', dlg);
    $$('[data-plus]', dlg).forEach((b) => b.addEventListener('click', () => { at.value = toLocalInput(roundUp5(Date.now() + Number(b.dataset.plus) * MIN)); setErr('pp-err', '', at); }));
    $('#pp-form', dlg).addEventListener('submit', (e) => {
      e.preventDefault();
      if (!at.value) return setErr('pp-err', 'กรุณาระบุเวลาใหม่', at);
      const t = new Date(at.value).getTime();
      if (t <= Date.now()) return setErr('pp-err', 'เวลาใหม่ต้องเป็นเวลาในอนาคต', at);
      const ret = modalReturn;
      if (mine(() => S.postpone(id, new Date(t).toISOString(), $('#pp-reason', dlg).value, user))) {
        toast('ok', 'เลื่อนเวลาแล้ว', r.jobNo + ' · ' + r.detail + ' → ' + fmtTime(new Date(t).toISOString()));
        afterAction(ret);
      }
    });
  }

  /* ---------- result ---------- */
  function openResult(id, returnTo) {
    const r = S.find(id); if (!r || r.status !== 'inspecting') return;
    modalKind = 'result'; modalId = id; modalReturn = returnTo || null;
    const firstNm = (S.state.details.find((d) => d.id === 'first') || {}).name;
    const lastNm = (S.state.details.find((d) => d.id === 'last') || {}).name;
    const rule = S.isFirst(r.detail)
      ? '<div class="hint-box">' + ic('flag') + '<div>รายการนี้เป็น <b>' + esc(firstNm) + '</b> — ถ้าผล OK Job จะยังไม่ปิดจนกว่าจะตรวจ <b>' + esc(lastNm) + '</b> ผ่าน</div></div>'
      : S.isLast(r.detail) ? '<div class="hint-box">' + ic('flag') + '<div>รายการนี้เป็น <b>' + esc(lastNm) + '</b> — ถ้าผล OK จะถือว่าปิด Job</div></div>' : '';
    openModal(
      modalHead('clipboard-check', 'ลงผลการตรวจ') +
      '<form id="rs-form" novalidate><div class="modal-body">' + summaryBox(r) +
        '<div class="help">Inspector: <b>' + esc(r.inspector ? r.inspector.name : user.name) + '</b> · ใช้เวลาตรวจ <b class="mono" id="rs-el">' + clockStr(Date.now() - ms(r.acceptedAt)) + '</b></div>' +
        rule +
        '<fieldset class="fieldset"><legend>ผลการตรวจ<span class="req">*</span></legend><div class="result-choice">' +
          '<label class="ok"><input type="radio" name="res" value="OK"><span>' + ic('check-circle', 'icon-lg') + 'OK · Accept<small>ผ่าน — นำออกจากบอร์ด</small></span></label>' +
          '<label class="ng"><input type="radio" name="res" value="NG"><span>' + ic('x-circle', 'icon-lg') + 'NG · Reject<small>ไม่ผ่าน — ต้องตรวจซ้ำ</small></span></label>' +
        '</div><p class="error" id="rs-e-res"></p></fieldset>' +
        '<div class="field"><label for="rs-remark" id="rs-remark-lbl">Remark <span class="opt">(ถ้ามี)</span></label><textarea class="textarea" id="rs-remark" maxlength="500"></textarea><p class="error" id="rs-e-remark"></p></div>' +
        '<div class="field" id="rs-re-wrap" hidden><label for="rs-re">นัดตรวจซ้ำเวลา<span class="req">*</span></label>' +
          '<input class="input" id="rs-re" type="datetime-local" value="' + toLocalInput(roundUp5(Date.now() + 30 * MIN)) + '">' +
          '<div class="quick" role="group" aria-label="ตั้งเวลาด่วน">' + [[30, '+30 นาที'], [60, '+1 ชม.'], [120, '+2 ชม.']].map((q) => '<button type="button" data-plus="' + q[0] + '">' + q[1] + '</button>').join('') + '</div>' +
          '<p class="help">ระบบจะสร้างรอบตรวจใหม่ (รอบที่ ' + (r.round + 1) + ') ขึ้นบอร์ดอัตโนมัติ จนกว่าผลจะ OK</p><p class="error" id="rs-e-re"></p></div>' +
        photoFieldHTML('rs-photo', 'รูปถ่ายผลตรวจ') +
      '</div><div class="modal-foot"><button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" class="btn btn-primary">' + ic('save') + 'บันทึกผลตรวจ</button></div></form>', { wide: true });

    let photo = '';
    bindPhoto('rs-photo', (d) => { photo = d; });
    const form = $('#rs-form', dlg), re = $('#rs-re', dlg);
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'res') return;
      const ng = e.target.value === 'NG';
      $('#rs-re-wrap', dlg).hidden = !ng;
      $('#rs-remark-lbl', dlg).innerHTML = ng ? 'สาเหตุการ Reject<span class="req">*</span>' : 'Remark <span class="opt">(ถ้ามี)</span>';
      setErr('rs-e-res', '');
    });
    $$('[data-plus]', dlg).forEach((b) => b.addEventListener('click', () => { re.value = toLocalInput(roundUp5(Date.now() + Number(b.dataset.plus) * MIN)); }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const res = (form.querySelector('input[name="res"]:checked') || {}).value;
      const remark = $('#rs-remark', dlg).value.trim();
      if (!res) { setErr('rs-e-res', 'กรุณาเลือกผลการตรวจ'); form.querySelector('input[name="res"]').focus(); return; }
      let reAt = null;
      if (res === 'NG') {
        if (!remark) { setErr('rs-e-remark', 'กรุณาระบุสาเหตุการ Reject', $('#rs-remark', dlg)); $('#rs-remark', dlg).focus(); return; }
        if (!re.value || new Date(re.value).getTime() <= Date.now()) { setErr('rs-e-re', 'กรุณาระบุเวลานัดตรวจซ้ำที่เป็นเวลาในอนาคต', re); re.focus(); return; }
        reAt = new Date(re.value).toISOString();
      }
      const ret = modalReturn;
      const out = mine(() => S.submitResult(id, { result: res, remark, photo, reinspectAt: reAt }, user));
      if (!out) return;
      if (res === 'OK') toast('ok', 'บันทึกผล OK แล้ว', r.jobNo + ' · ' + r.detail + (out.awaitingLast ? ' — Job ยังไม่ปิด รอตรวจ ' + lastNm : ' — นำออกจากบอร์ดแล้ว'));
      else toast('warn', 'บันทึกผล NG แล้ว', 'สร้างรอบตรวจซ้ำ (รอบ ' + out.next.round + ') เวลา ' + fmtTime(out.next.planAt));
      afterAction(ret);
    });
  }

  function afterAction(ret) {
    if (ret === 'alerts' && attentionCount(Date.now()) > 0) openAlerts();
    else if (ret === 'detail' && modalId && S.find(modalId)) openDetail(modalId);
    else closeModal();
  }

  /* ---------- alert center ---------- */
  function attentionCount(now) {
    return activeReqs().filter((r) => { const p = S.phase(r, now); return p === 'due' || p === 'overtime'; }).length;
  }

  function openAlerts() {
    modalKind = 'alerts'; modalId = null; modalReturn = null;
    openModal(alertsHTML(), { wide: true });
  }

  function alertsHTML() {
    const now = Date.now(), act = activeReqs().sort(byPlan);
    const due = act.filter((r) => S.phase(r, now) === 'due');
    const over = act.filter((r) => S.phase(r, now) === 'overtime');
    const soon = act.filter((r) => S.phase(r, now) === 'soon');
    const insp = can.inspect();
    const item = (r, cls, btns) => '<div class="alert-item ' + cls + '"><div class="ai-top"><div style="min-width:0"><span class="t-job">' + esc(r.jobNo) + '</span><div class="t-prod">' + esc(r.product) + '</div>' +
      '<div class="t-sub"><span class="tag">' + esc(r.process) + '</span>' + detailTag(r) + extraTags(r) + '<span>นัด ' + fmtTime(r.planAt) + '</span></div></div>' + statusHTML(r, now) + '</div>' +
      (btns ? '<div class="row-actions">' + btns + '</div>' : '') + '</div>';
    const sec = (title, list, cls, btnFn) => list.length ? '<div><h3 style="font-size:15px;margin:0 0 10px">' + title + ' (' + list.length + ')</h3><div style="display:grid;gap:10px">' + list.map((r) => item(r, cls, insp ? btnFn(r) : '')).join('') + '</div></div>' : '';
    const body =
      sec('ถึงเวลาตรวจ', due, '', (r) => '<button class="btn" data-act="postpone" data-id="' + r.id + '" data-from="alerts">' + ic('clock-plus') + 'Reject · เลื่อนเวลา</button><button class="btn btn-primary" data-act="accept" data-id="' + r.id + '">' + ic('check') + 'ยอมรับ</button>') +
      sec('ตรวจเกินเวลา ' + S.state.settings.maxInspectMin + ' นาที', over, '', (r) => '<button class="btn btn-primary" data-act="result" data-id="' + r.id + '" data-from="alerts">' + ic('clipboard-check') + 'ลงผลตรวจ</button>') +
      sec('ใกล้ถึงคิว (ภายใน ' + S.state.settings.leadMin + ' นาที)', soon, 'soon', (r) => '<button class="btn" data-act="postpone" data-id="' + r.id + '" data-from="alerts">' + ic('clock-plus') + 'เลื่อนเวลา</button><button class="btn" data-act="accept" data-id="' + r.id + '">' + ic('check') + 'ยอมรับก่อนเวลา</button>');
    const notif = ('Notification' in window && Notification.permission === 'default') ? '<button class="btn" data-act="notify" style="margin-right:auto">' + ic('bell') + 'เปิดแจ้งเตือนบนเครื่อง</button>' : '';
    return modalHead('bell', 'การแจ้งเตือน') +
      '<div class="modal-body">' + (body || '<div class="empty">' + ic('check-circle') + '<b>ไม่มีงานที่ต้องดำเนินการ</b>ระบบจะแจ้งเตือนเมื่อใกล้ถึงคิวตรวจ</div>') +
      (!insp && body ? '<p class="help" style="margin:0">รอ QA Inspector กด “ยอมรับ” งาน</p>' : '') + '</div>' +
      '<div class="modal-foot">' + notif + '<button class="btn" data-close>ปิด</button></div>';
  }

  /* ================================================================ TV MODE */
  function tvHTML() {
    const now = Date.now(), s = stats('today'), list = activeReqs().sort(byPlan);
    const rows = list.map((r) => {
      const ph = S.phase(r, now), st = statusInfo(r, ph, now);
      const pp = r.postpones.length ? '<span class="tv-pp"> · เลื่อนจาก ' + fmtTime(r.postpones[0].from) + '</span>' : '';
      return '<tr><td class="tv-time">' + fmtTime(r.planAt) + '</td><td class="tv-job">' + esc(r.jobNo) + '</td><td class="tv-prod">' + esc(r.product) + '</td>' +
        '<td class="tv-hide-sm">' + esc(r.process) + '<span class="tv-det">' + esc(r.detail) + (r.round > 1 ? ' · ตรวจซ้ำ R' + r.round : '') + '</span></td>' +
        '<td class="tv-hide-sm">' + (r.inspector ? esc(firstName(r.inspector.name)) : '<span style="opacity:.5">—</span>') + '</td>' +
        '<td><div class="tv-st ' + ph + '" data-cd="' + r.id + '" data-ph="' + ph + '"><span class="lbl">' + st.s1 + '</span><span class="cd s2">' + st.s2 + '</span>' + (r.status === 'waiting' ? pp : '') + '</div></td></tr>';
    }).join('');
    return '' +
      '<div class="tv">' +
        '<header class="tv-head"><div class="logo"><img src="assets/wesco-logo.png" alt="Wesco" width="62" height="52"></div>' +
          '<h1>QA INSPECTION QUEUE<small>คิวงานรอ QA ตรวจ</small></h1>' +
          '<div class="tv-kpis">' +
            '<div class="tv-kpi wait"><b>' + s.waiting + '</b><small>รอตรวจ</small></div>' +
            '<div class="tv-kpi in"><b>' + s.inspecting + '</b><small>กำลังตรวจ</small></div>' +
            '<div class="tv-kpi ok"><b>' + s.ok + '</b><small>OK วันนี้</small></div>' +
            '<div class="tv-kpi ng"><b>' + s.ng + '</b><small>NG วันนี้</small></div>' +
          '</div>' +
          '<div class="tv-clock" id="tv-clock"></div></header>' +
        '<div class="tv-main">' +
          (rows
            ? '<table class="tv-table"><thead><tr><th>Time</th><th>Job No.</th><th>Product</th><th class="tv-hide-sm">Process / Detail</th><th class="tv-hide-sm">Inspector</th><th>Status</th></tr></thead><tbody id="tv-body">' + rows + '</tbody></table>'
            : '<div class="tv-empty">ไม่มีงานรอตรวจ · No pending inspection</div>') +
        '</div>' +
        '<footer class="tv-foot"><span id="tv-date"></span><span id="tv-page"></span>' +
          '<span class="tv-btns"><button class="btn btn-sm" data-act="fullscreen">' + ic('monitor', 'icon-sm') + 'เต็มจอ</button>' +
          '<a class="btn btn-sm" href="#/board">' + ic('x', 'icon-sm') + 'ออก (Esc)</a></span></footer>' +
      '</div>';
  }

  function tvLayout() {
    const body = $('#tv-body'); if (!body) { tvPages = 1; return; }
    const rows = $$('tr', body); rows.forEach((r) => { r.hidden = false; });
    const avail = $('.tv-main').clientHeight - $('.tv-table thead').offsetHeight;
    const rh = Math.max(40, rows[0].offsetHeight);
    const per = Math.max(1, Math.floor(avail / rh));
    tvPages = Math.max(1, Math.ceil(rows.length / per));
    if (tvPage >= tvPages) tvPage = 0;
    rows.forEach((r, i) => { r.hidden = Math.floor(i / per) !== tvPage; });
    $('#tv-page').textContent = tvPages > 1 ? 'หน้า ' + (tvPage + 1) + ' / ' + tvPages : '';
  }

  /* ================================================================ toasts / sound / notifications */
  function toast(type, title, msg, action) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'err' ? 'alert' : 'status');
    const icon = { ok: 'check-circle', warn: 'alert', err: 'x-circle', info: 'info' }[type] || 'info';
    el.innerHTML = ic(icon) + '<div class="tt"><b>' + esc(title) + '</b>' + (msg ? esc(msg) : '') + '</div>' +
      (action ? '<button class="btn btn-sm" data-t="act">' + esc(action.label) + '</button>' : '') +
      '<button class="btn btn-sm icon-btn" data-t="x" aria-label="ปิดข้อความ">' + ic('x', 'icon-sm') + '</button>';
    const remove = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); };
    el.querySelector('[data-t="x"]').addEventListener('click', remove);
    if (action) el.querySelector('[data-t="act"]').addEventListener('click', () => { action.fn(); remove(); });
    toastsEl.appendChild(el);
    while (toastsEl.children.length > 4) toastsEl.firstChild.remove();
    setTimeout(remove, action ? 7000 : type === 'err' || type === 'warn' ? 6000 : 4000);
  }

  let actx = null;
  function unlockAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { /* no audio */ }
  }
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);
  function beep(kind) {
    if (!prefs.sound || !actx || actx.state !== 'running') return;
    const seq = kind === 'due' ? [[880, 0], [660, 0.22], [880, 0.44], [660, 0.66]] : [[740, 0], [988, 0.18]];
    seq.forEach((s) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + s[1];
      o.type = 'sine'; o.frequency.value = s[0];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.22);
    });
  }
  function sysNotify(title, body, tag) {
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification(title, { body, tag, icon: 'assets/wesco-logo.png' });
      }
    } catch (e) { /* ignore */ }
  }

  /* ================================================================ alert engine */
  const ALERT_KEY = 'wesco.qa.alerted';
  const alerted = Object.assign({ soon: [], due: [], over: [] }, safeGet(ALERT_KEY, sessionStorage));
  function resetAlerted() { alerted.soon = []; alerted.due = []; alerted.over = []; safeSet(ALERT_KEY, alerted, sessionStorage); }
  function checkAlerts(now) {
    const nSoon = [], nDue = [], nOver = [];
    activeReqs().forEach((r) => {
      const ph = S.phase(r, now), key = r.id + '@' + r.planAt;
      if (ph === 'soon' && alerted.soon.indexOf(key) < 0) { alerted.soon.push(key); nSoon.push(r); }
      if (ph === 'due' && alerted.due.indexOf(key) < 0) { alerted.due.push(key); nDue.push(r); }
      if (ph === 'overtime' && alerted.over.indexOf(r.id) < 0) { alerted.over.push(r.id); nOver.push(r); }
    });
    if (!nSoon.length && !nDue.length && !nOver.length) return;
    ['soon', 'due', 'over'].forEach((k) => { alerted[k] = alerted[k].slice(-300); });
    safeSet(ALERT_KEY, alerted, sessionStorage);
    const jobs = (l) => l.slice(0, 3).map((r) => r.jobNo + ' (' + r.detail + ')').join(', ') + (l.length > 3 ? ' …' : '');

    if (nDue.length) {
      beep('due');
      sysNotify('ถึงเวลาตรวจ ' + nDue.length + ' งาน', jobs(nDue), 'due');
      if (can.inspect() && page !== 'tv' && (!dlg.open || modalKind === 'alerts')) openAlerts();
      else toast('err', 'ถึงเวลาตรวจ ' + nDue.length + ' งาน', jobs(nDue), page !== 'tv' ? { label: 'ดู', fn: openAlerts } : null);
    } else if (nSoon.length) {
      beep('soon');
      sysNotify('อีก ' + S.state.settings.leadMin + ' นาทีถึงคิวตรวจ', jobs(nSoon), 'soon');
    }
    if (nSoon.length) toast('warn', 'อีกไม่เกิน ' + S.state.settings.leadMin + ' นาทีถึงคิวตรวจ ' + nSoon.length + ' งาน', jobs(nSoon));
    if (nOver.length && can.inspect()) {
      toast('warn', 'ตรวจเกิน ' + S.state.settings.maxInspectMin + ' นาที', jobs(nOver), page !== 'tv' ? { label: 'ลงผล', fn: () => openResult(nOver[0].id) } : null);
    }
  }

  function updateBadge(now) {
    const b = $('#badge'); if (!b) return;
    const n = attentionCount(now);
    b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n);
    const bell = b.closest('button'); if (bell) bell.setAttribute('aria-label', n ? 'การแจ้งเตือน ' + n + ' รายการ' : 'การแจ้งเตือน');
  }

  function updateClocks(now) {
    const d = new Date(now), t = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    const c = $('#clock'); if (c) c.textContent = t;
    const tc = $('#tv-clock'); if (tc) tc.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const td = $('#tv-date');
    if (td) {
      const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      td.textContent = W[d.getDay()] + ' ' + pad(d.getDate()) + ' ' + M[d.getMonth()] + ' ' + d.getFullYear() + '   ' + t;
    }
  }

  /** อัปเดตตัวนับเวลาทุกวินาที; ถ้าสถานะเปลี่ยนช่วง (เช่น รอคิว → ใกล้ถึงคิว) ให้วาดใหม่ */
  function updateCountdowns(now) {
    let changed = false;
    $$('[data-cd]').forEach((el) => {
      const r = S.find(el.dataset.cd);
      if (!r) { changed = true; return; }
      const ph = S.phase(r, now);
      if (ph !== el.dataset.ph) { changed = true; return; }
      const s = statusInfo(r, ph, now);
      const s2 = el.querySelector('.s2'); if (s2 && s2.textContent !== s.s2) s2.textContent = s.s2;
      const bar = el.querySelector('.prog i'); if (bar && s.prog != null) bar.style.width = (s.prog * 100).toFixed(1) + '%';
    });
    if (changed) refreshLive();
  }

  function refreshLive() {
    if (page === 'board') refreshBoard();
    if (page === 'tv' && user) { app.innerHTML = tvHTML(); tvLayout(); updateClocks(Date.now()); }
    if (modalKind === 'alerts') openAlerts();
    else if (modalKind === 'detail' && modalId) openDetail(modalId);
  }

  function tick() {
    const now = Date.now();
    updateClocks(now);
    if (!user || !S.ready) return;
    updateCountdowns(now);
    updateBadge(now);
    const el = $('#rs-el', dlg); if (el && modalKind === 'result') { const r = S.find(modalId); if (r && r.acceptedAt) el.textContent = clockStr(now - ms(r.acceptedAt)); }
    checkAlerts(now);
    if (page === 'tv' && tvPages > 1 && ++tvTick >= 10) { tvTick = 0; tvPage = (tvPage + 1) % tvPages; tvLayout(); }
  }

  /* ================================================================ store changes (incl. other devices) */
  const netEl = document.getElementById('net');
  S.on((type, payload) => {
    if (type === 'error') { toast('err', 'ทำรายการไม่สำเร็จ', payload); return; }
    if (type === 'auth') { if (user) logout('กรุณาเข้าสู่ระบบใหม่'); return; }
    if (type === 'net') { if (netEl) netEl.hidden = payload || !user; return; }
    if (!user || !S.ready) return;
    // role may have been changed / account removed by Admin
    const me = S.me();
    if (!me) { logout('บัญชีนี้ถูกลบออกจากระบบแล้ว'); return; }
    if (me.role !== user.role || me.name !== user.name || !app.querySelector('#page, .tv')) { user = me; render(); return; }
    if (page === 'board') refreshBoard();
    else if (page === 'history') { const b = $('#h-body'); if (b) b.innerHTML = historyBodyHTML(); }
    else if (page === 'settings') renderPage();
    else if (page === 'tv') { app.innerHTML = tvHTML(); tvLayout(); updateClocks(Date.now()); }
    updateBadge(Date.now());
    // keep open modal in sync
    if (modalKind === 'alerts') openAlerts();
    else if (modalKind === 'detail') openDetail(modalId);
    else if (!selfAction && (modalKind === 'postpone' || modalKind === 'result') && modalId) {
      const r = S.find(modalId), need = modalKind === 'postpone' ? 'waiting' : 'inspecting';
      if (!r || r.status !== need) { closeModal(); toast('info', 'รายการนี้ถูกอัปเดตโดยผู้อื่นแล้ว'); }
    }
  });

  /* ================================================================ global actions */
  function doAccept(id) {
    const r = S.find(id); if (!r) return;
    if (r.status !== 'waiting') { toast('info', 'รายการนี้มีผู้ยอมรับแล้ว', r.inspector ? r.inspector.name : ''); return; }
    if (S.accept(id, user)) {
      toast('ok', 'ยอมรับงานตรวจแล้ว', r.jobNo + ' · ' + r.detail + ' — Inspector: ' + user.name, {
        label: 'เลิกทำ', fn: () => { if (S.undoAccept(id)) toast('info', 'ยกเลิกการยอมรับแล้ว', r.jobNo); }
      });
    }
  }

  async function doCancel(id) {
    const r = S.find(id); if (!r) return;
    const ok = await confirmBox({ title: 'ยกเลิกรายการตรวจ?', message: 'ยกเลิก <b class="mono">' + esc(r.jobNo) + '</b> · ' + esc(r.detail) + ' ออกจากบอร์ด รายการจะถูกบันทึกในประวัติว่า “ยกเลิก”', ok: 'ยกเลิกรายการ', danger: true });
    if (ok && S.cancel(id, user)) toast('ok', 'ยกเลิกรายการแล้ว', r.jobNo + ' · ' + r.detail);
  }

  function toggleMenu(force) {
    const m = $('#user-menu'), b = $('[data-act="menu"]'); if (!m || !b) return;
    const open = force != null ? force : m.hidden;
    m.hidden = !open; b.setAttribute('aria-expanded', String(open));
    if (open) { const first = m.querySelector('button'); if (first) first.focus(); }
  }
  function closeMenu() { const m = $('#user-menu'); if (m && !m.hidden) toggleMenu(false); }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) { if (!e.target.closest('#user-menu')) closeMenu(); return; }
    const act = t.dataset.act, id = t.dataset.id;
    if (act !== 'menu') closeMenu();
    switch (act) {
      case 'open': openDetail(id); break;
      case 'accept': doAccept(id); break;
      case 'postpone': openPostpone(id, t.dataset.from || (modalKind === 'detail' ? 'detail' : null)); break;
      case 'result': openResult(id, t.dataset.from || (modalKind === 'detail' ? 'detail' : null)); break;
      case 'cancel': doCancel(id); break;
      case 'alerts': openAlerts(); break;
      case 'zoom': t.style.maxHeight = t.style.maxHeight ? '' : 'none'; break;
      case 'req-last': {
        const r = S.find(id); if (!r) break;
        const lastNm = (S.state.details.find((d) => d.id === 'last') || {}).name;
        prefill = { jobNo: r.jobNo, product: r.product, process: r.process, detail: lastNm, dateReceived: todayStr() };
        location.hash = '#/new'; break;
      }
      case 'menu': e.stopPropagation(); toggleMenu(); break;
      case 'logout': logout(); break;
      case 'tv': location.hash = '#/tv'; break;
      case 'fullscreen':
        try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (err) { /* unsupported */ }
        break;
      case 'sound':
        prefs.sound = !prefs.sound; safeSet(PREF_KEY, prefs);
        t.setAttribute('aria-pressed', String(prefs.sound));
        t.setAttribute('aria-label', prefs.sound ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน');
        t.innerHTML = ic(prefs.sound ? 'volume' : 'volume-x');
        toast('info', prefs.sound ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน');
        if (prefs.sound) { unlockAudio(); beep('soon'); }
        break;
      case 'notify':
        if ('Notification' in window) {
          const p = await Notification.requestPermission();
          toast(p === 'granted' ? 'ok' : 'warn', p === 'granted' ? 'เปิดแจ้งเตือนบนเครื่องแล้ว' : 'ไม่ได้รับอนุญาตให้แจ้งเตือน', p === 'granted' ? 'จะแจ้งเตือนแม้เปิดหน้าอื่นอยู่' : 'เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์');
          if (modalKind === 'alerts') openAlerts();
        }
        break;
      case 'export': exportCSV(); break;
      case 'del-emp': {
        const emp = S.state.employees.find((x) => x.id === id); if (!emp) break;
        if (await confirmBox({ title: 'ลบพนักงาน?', message: 'ลบ <b>' + esc(emp.name) + '</b> (' + esc(emp.id) + ') ออกจากระบบ', ok: 'ลบ', danger: true })) {
          const msg = S.removeEmployee(id); msg ? toast('err', 'ลบไม่ได้', msg) : toast('ok', 'ลบพนักงานแล้ว', emp.name);
        }
        break;
      }
      case 'del-proc':
        if (await confirmBox({ title: 'ลบ Process?', message: 'ลบ <b>' + esc(id) + '</b> ออกจากรายการ (ไม่กระทบข้อมูลที่บันทึกไปแล้ว)', ok: 'ลบ', danger: true })) { S.removeProcess(id); toast('ok', 'ลบ Process แล้ว', id); }
        break;
      case 'del-det': {
        const d = S.state.details.find((x) => x.id === id); if (!d) break;
        if (await confirmBox({ title: 'ลบ Process Detail?', message: 'ลบ <b>' + esc(d.name) + '</b> ออกจากรายการ (ไม่กระทบข้อมูลที่บันทึกไปแล้ว)', ok: 'ลบ', danger: true })) {
          const msg = S.removeDetail(id); msg ? toast('err', 'ลบไม่ได้', msg) : toast('ok', 'ลบ Process Detail แล้ว', d.name);
        }
        break;
      }
      case 'retry':
        app.innerHTML = loadingHTML(false);
        S.retry().then(() => { user = S.me() || user; render(); }).catch((err) => { if (err.code !== 'auth') app.innerHTML = loadingHTML(true); });
        break;
      case 'skip': e.preventDefault(); { const p = $('#page'); if (p) p.focus(); } break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      if (page === 'tv' && !dlg.open) location.hash = '#/board';
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-act="open"]')) {
      e.preventDefault(); openDetail(e.target.dataset.id);
    }
  });

  window.addEventListener('hashchange', () => {
    const prev = page; readRoute();
    if (prev === page) return;
    if (dlg.open) closeModal();
    tvPage = 0; tvTick = 0;
    render();
    window.scrollTo(0, 0);
    const p = $('#page'); if (p) p.focus({ preventScroll: true });
  });
  let rz; window.addEventListener('resize', () => { if (page !== 'tv') return; clearTimeout(rz); rz = setTimeout(tvLayout, 150); });

  /* ================================================================ boot */
  // this URL previously hosted another app with a service worker — remove it
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  }
  readRoute();
  boot();
  setTimeout(function loop() { tick(); setTimeout(loop, 1000 - (Date.now() % 1000) + 5); }, 1000 - (Date.now() % 1000));
})();
