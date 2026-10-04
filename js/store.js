/* =========================================================================
 * Wesco QA Monitor — Data layer
 * -------------------------------------------------------------------------
 * ข้อมูลกลางอยู่ที่ Cloudflare Worker + D1 (ดู worker/) ทุกเครื่องเห็นข้อมูลเดียวกัน
 *  - ดึงการเปลี่ยนแปลงทุก 8 วินาที (30 วินาทีเมื่อแท็บไม่ได้เปิดดูอยู่)
 *  - การกดปุ่มอัปเดตหน้าจอทันที (optimistic) แล้วส่งไปเซิร์ฟเวอร์
 *    ถ้าเซิร์ฟเวอร์ปฏิเสธ (เช่น มีคนยอมรับงานไปก่อน) จะโหลดข้อมูลใหม่และแจ้งเตือน
 * ========================================================================= */
(function () {
  'use strict';

  const API = String((window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '').replace(/\/+$/, '');
  const SESSION_KEY = 'wesco.qa.session';
  const MIN = 60 * 1000;
  const POLL_VISIBLE = 8000;
  const POLL_HIDDEN = 30000;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const nowISO = () => new Date().toISOString();

  let state = { settings: { leadMin: 30, maxInspectMin: 30 }, employees: [], processes: [], details: [], requests: [] };
  let meta = { version: 0, epoch: 0, serverTime: 0 };
  let session = null;          // { token, user }
  let ready = false;
  let online = true;
  let pending = 0;             // actions waiting for the server
  let writes = 0;              // bumps on every action → stale polls are discarded
  let inflight = null;
  let timer = null;
  const listeners = new Set();

  function emit(type, payload) { listeners.forEach((fn) => fn(type, payload)); }
  function setOnline(v) { if (online !== v) { online = v; emit('net', v); } }

  try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { session = null; }
  function saveSession() {
    try { session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

  async function api(path, opts) {
    opts = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    if (session && session.token) headers.Authorization = 'Bearer ' + session.token;
    let res;
    try {
      res = await fetch(API + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
    } catch (e) {
      setOnline(false);
      throw new ApiError('network', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
    }
    setOnline(true);
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (res.status === 401 && path !== '/api/login') { emit('auth'); throw new ApiError('auth', 'กรุณาเข้าสู่ระบบใหม่'); }
    if (!res.ok || !data || data.ok === false) throw new ApiError((data && data.code) || 'http', (data && data.error) || 'เซิร์ฟเวอร์ตอบกลับผิดพลาด (' + res.status + ')');
    return data;
  }

  /* ---------- sync ---------- */
  function sync(full) {
    if (!session) return Promise.resolve();
    if (inflight) return inflight;
    const q = full || !meta.version ? '?full=1' : '?v=' + meta.version + '&epoch=' + meta.epoch + '&since=' + meta.serverTime;
    const w = writes;
    inflight = api('/api/sync' + q).then((d) => {
      // a write started after this poll → its own re-sync will bring the fresh data
      if (d.unchanged || pending > 0 || w !== writes) return;
      if (d.full) state.requests = d.requests;
      else {
        const map = new Map(state.requests.map((r) => [r.id, r]));
        d.requests.forEach((r) => map.set(r.id, r));
        state.requests = Array.from(map.values());
      }
      state.settings = d.settings; state.employees = d.employees; state.processes = d.processes; state.details = d.details;
      meta = { version: d.version, epoch: d.epoch, serverTime: d.serverTime };
      ready = true;
      emit('change');
    }).finally(() => { inflight = null; });
    return inflight;
  }

  function schedule() {
    clearTimeout(timer);
    if (!session) return;
    timer = setTimeout(() => { sync(false).catch(() => {}).then(schedule); },
      document.visibilityState === 'visible' ? POLL_VISIBLE : POLL_HIDDEN);
  }
  document.addEventListener('visibilitychange', () => {
    if (session && document.visibilityState === 'visible') { sync(false).catch(() => {}); schedule(); }
  });
  window.addEventListener('online', () => { if (session) sync(false).catch(() => {}); });

  /** send an action; local state was already updated optimistically */
  function send(type, payload) {
    pending++; writes++;
    const resync = (full) => (inflight || Promise.resolve()).catch(() => {}).then(() => sync(full)).catch(() => {});
    return api('/api/action', { method: 'POST', body: Object.assign({ type }, payload) })
      .then(() => { pending--; return resync(false); })
      .catch((e) => {
        pending = Math.max(0, pending - 1);
        if (e.code !== 'auth') emit('error', e.message);
        return resync(true); // roll back to server truth
      });
  }

  /* ---------- derived helpers ---------- */
  const isFirst = (name) => { const d = state.details.find((x) => x.id === 'first'); return !!d && d.name === name; };
  const isLast = (name) => { const d = state.details.find((x) => x.id === 'last'); return !!d && d.name === name; };

  /** สถานะที่ใช้แสดงผล (คำนวณตามเวลาปัจจุบัน) */
  function phase(r, now) {
    now = now || Date.now();
    if (r.status === 'inspecting') {
      const el = now - new Date(r.acceptedAt).getTime();
      return el > state.settings.maxInspectMin * MIN ? 'overtime' : 'inspecting';
    }
    if (r.status !== 'waiting') return r.status;
    const diff = new Date(r.planAt).getTime() - now;
    if (diff <= 0) return 'due';
    if (diff <= state.settings.leadMin * MIN) return 'soon';
    return 'scheduled';
  }

  /** Job ที่ผ่าน 1st piece แล้วแต่ยังไม่มี Last piece → ยังปิด Job ไม่ได้ */
  function jobsAwaitingLast() {
    const byJob = {};
    state.requests.forEach((r) => { if (r.status !== 'cancelled') (byJob[r.jobNo] = byJob[r.jobNo] || []).push(r); });
    const out = [];
    Object.keys(byJob).forEach((job) => {
      const list = byJob[job];
      const firstOk = list.find((r) => isFirst(r.detail) && r.result === 'OK');
      const hasLast = list.some((r) => isLast(r.detail));
      if (firstOk && !hasLast) out.push(firstOk);
    });
    return out.sort((a, b) => new Date(a.resultAt) - new Date(b.resultAt));
  }

  function jobState(jobNo) {
    const list = state.requests.filter((r) => r.jobNo === jobNo && r.status !== 'cancelled');
    const firstOk = list.some((r) => isFirst(r.detail) && r.result === 'OK');
    const lastOk = list.some((r) => isLast(r.detail) && r.result === 'OK');
    const pend = list.some((r) => r.status === 'waiting' || r.status === 'inspecting');
    if (firstOk && !lastOk) return 'awaitingLast';
    if (pend) return 'open';
    return list.length ? 'closed' : 'new';
  }

  const find = (id) => state.requests.find((r) => r.id === id);
  const who = (u) => ({ id: u.id, name: u.name });

  const Store = {
    MIN,
    get state() { return state; },
    get ready() { return ready; },
    get online() { return online; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    phase, jobsAwaitingLast, jobState, isFirst, isLast, find,

    /** URL ของรูป: data URL (ยังไม่ซิงค์) หรือ id ที่เก็บบนเซิร์ฟเวอร์ */
    photoSrc(v) { return !v ? '' : /^data:/.test(v) ? v : API + '/api/photo/' + encodeURIComponent(v); },

    /* ---------- session ---------- */
    session() { return session; },
    /** ข้อมูลผู้ใช้ปัจจุบันจากรายชื่อล่าสุดบนเซิร์ฟเวอร์ (สิทธิ์อาจถูกเปลี่ยนโดย Admin) */
    me() {
      if (!session) return null;
      const e = state.employees.find((x) => x.id === session.user.id);
      return e ? { id: e.id, name: e.name, role: e.role } : null;
    },
    async login(id) {
      const d = await api('/api/login', { method: 'POST', body: { id: String(id).trim() } });
      session = { token: d.token, user: d.user }; saveSession();
      ready = false; meta = { version: 0, epoch: 0, serverTime: 0 };
      await sync(true);
      schedule();
      return d.user;
    },
    async resume() {
      if (!session) return null;
      schedule();
      await sync(true);
      return Store.me();
    },
    retry() { return sync(true); },
    logout() {
      session = null; saveSession(); clearTimeout(timer);
      ready = false; meta = { version: 0, epoch: 0, serverTime: 0 };
      state = { settings: state.settings, employees: [], processes: [], details: [], requests: [] };
    },

    /* ---------- inspection actions ---------- */
    createRequest(data, user) {
      const r = {
        id: uid(), jobNo: data.jobNo.trim().toUpperCase(), product: data.product.trim(), process: data.process,
        detail: data.detail, dateReceived: data.dateReceived, planAt: data.planAt, remark: (data.remark || '').trim(),
        photo: data.photo || '', round: 1, parentId: null, postpones: [], status: 'waiting',
        inspector: null, acceptedAt: null, result: null, resultAt: null, resultRemark: '', resultPhoto: '',
        requester: who(user), createdAt: nowISO()
      };
      state.requests.push(r);
      emit('change');
      send('create', { request: { id: r.id, jobNo: r.jobNo, product: r.product, process: r.process, detail: r.detail, dateReceived: r.dateReceived, planAt: r.planAt, remark: r.remark, photo: r.photo } });
      return r;
    },

    accept(id, user) {
      const r = find(id);
      if (!r || r.status !== 'waiting') return false;
      r.status = 'inspecting'; r.inspector = who(user); r.acceptedAt = nowISO();
      emit('change'); send('accept', { id });
      return true;
    },

    undoAccept(id) {
      const r = find(id);
      if (!r || r.status !== 'inspecting') return false;
      r.status = 'waiting'; r.inspector = null; r.acceptedAt = null;
      emit('change'); send('undoAccept', { id });
      return true;
    },

    postpone(id, toISO, reason, user) {
      const r = find(id);
      if (!r || r.status !== 'waiting') return false;
      r.postpones = (r.postpones || []).concat({ from: r.planAt, to: toISO, by: who(user), at: nowISO(), reason: (reason || '').trim() });
      r.planAt = toISO;
      emit('change'); send('postpone', { id, to: toISO, reason: (reason || '').trim() });
      return true;
    },

    /** ลงผลตรวจ: OK → จบรอบ, NG → สร้างรอบตรวจใหม่จนกว่าจะผ่าน */
    submitResult(id, res, user) {
      const r = find(id);
      if (!r || r.status !== 'inspecting') return null;
      r.status = 'done'; r.result = res.result; r.resultAt = nowISO();
      r.resultRemark = (res.remark || '').trim(); r.resultPhoto = res.photo || '';
      if (!r.inspector) r.inspector = who(user);
      let next = null;
      if (res.result === 'NG') {
        next = Object.assign({}, r, {
          id: uid(), round: r.round + 1, parentId: r.id, status: 'waiting', planAt: res.reinspectAt,
          postpones: [], inspector: null, acceptedAt: null, result: null, resultAt: null,
          resultRemark: '', resultPhoto: '', photo: '', remark: 'ตรวจซ้ำ (NG รอบที่ ' + r.round + '): ' + r.resultRemark,
          createdAt: nowISO()
        });
        state.requests.push(next);
      }
      emit('change');
      send('result', { id, result: res.result, remark: r.resultRemark, photo: res.photo || '', reinspectAt: res.reinspectAt || null, nextId: next ? next.id : null });
      return { request: r, next, awaitingLast: res.result === 'OK' && isFirst(r.detail) && jobState(r.jobNo) === 'awaitingLast' };
    },

    cancel(id, user) {
      const r = find(id);
      if (!r || r.status !== 'waiting') return false;
      r.status = 'cancelled'; r.cancelledBy = who(user); r.cancelledAt = nowISO();
      emit('change'); send('cancel', { id });
      return true;
    },

    /* ---------- settings (Admin) ---------- */
    addEmployee(e) {
      if (state.employees.some((x) => x.id.toUpperCase() === e.id.toUpperCase())) return 'มีรหัสพนักงานนี้อยู่แล้ว';
      state.employees.push({ id: e.id.toUpperCase(), name: e.name, role: e.role });
      emit('change'); send('addEmployee', { id: e.id.toUpperCase(), name: e.name, role: e.role });
      return null;
    },
    removeEmployee(id) {
      const e = state.employees.find((x) => x.id === id);
      if (e && e.role === 'admin' && state.employees.filter((x) => x.role === 'admin').length <= 1) return 'ต้องมี Admin อย่างน้อย 1 คน';
      state.employees = state.employees.filter((x) => x.id !== id);
      emit('change'); send('removeEmployee', { id });
      return null;
    },
    addProcess(name) {
      if (state.processes.some((p) => p.toLowerCase() === name.toLowerCase())) return 'มี Process นี้อยู่แล้ว';
      state.processes.push(name);
      emit('change'); send('addProcess', { name });
      return null;
    },
    removeProcess(name) {
      state.processes = state.processes.filter((p) => p !== name);
      emit('change'); send('removeProcess', { name });
    },
    addDetail(name) {
      if (state.details.some((d) => d.name.toLowerCase() === name.toLowerCase())) return 'มี Process Detail นี้อยู่แล้ว';
      const id = uid();
      state.details.push({ id, name });
      emit('change'); send('addDetail', { id, name });
      return null;
    },
    removeDetail(id) {
      const d = state.details.find((x) => x.id === id);
      if (!d || d.system) return 'รายการนี้ใช้ในกฎปิด Job จึงลบไม่ได้';
      state.details = state.details.filter((x) => x.id !== id);
      emit('change'); send('removeDetail', { id });
      return null;
    },
    updateSettings(patch) {
      Object.assign(state.settings, patch);
      emit('change'); send('updateSettings', state.settings);
    },
    clearRequests() {
      state.requests = [];
      emit('change'); send('clearRequests', {});
    }
  };

  window.Store = Store;
})();
