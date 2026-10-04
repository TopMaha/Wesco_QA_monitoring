/* =========================================================================
 * Wesco QA Monitor — API (Cloudflare Worker + D1)
 *
 *   POST /api/login          { id }                 → { token, user }
 *   GET  /api/sync           ?v=&epoch=&since=      → changes since last sync
 *   POST /api/action         { type, ...payload }   → { ok, version }
 *   GET  /api/photo/:id                             → image
 *
 * Data model: master data (employees, processes, details, settings) lives in
 * the `kv` table as JSON; each inspection round is one row in `requests`.
 * Every write bumps kv.version so clients can poll cheaply.
 * ========================================================================= */

const VERSION = '1.1.0';
const DAY = 86400000;
const HISTORY_DAYS = 31;       // clients receive active rows + last 31 days
const TOKEN_TTL = 60 * DAY;
const MAX_PHOTO = 1_800_000;   // data-URL length (~1.3 MB image)

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const bad = (msg) => new HttpError(400, 'bad_request', msg);
const forbidden = (msg) => new HttpError(403, 'forbidden', msg || 'ไม่มีสิทธิ์ทำรายการนี้');
const conflict = (msg) => new HttpError(409, 'conflict', msg);

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(req, env);
    } catch (e) {
      if (e instanceof HttpError) res = json({ ok: false, code: e.code, error: e.message }, e.status);
      else { console.error(e); res = json({ ok: false, code: 'server_error', error: 'เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่' }, 500); }
    }
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
  }
};

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = { 'Vary': 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

async function route(req, env) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '');
  if (p === '/api/health') return json({ ok: true, version: VERSION, time: Date.now() });
  if (p === '/api/login' && req.method === 'POST') return login(req, env);
  if (p === '/api/sync' && req.method === 'GET') return sync(req, env, url);
  if (p === '/api/action' && req.method === 'POST') return action(req, env);
  const m = p.match(/^\/api\/photo\/([A-Za-z0-9]{6,64})$/);
  if (m && req.method === 'GET') return photo(env, m[1]);
  throw new HttpError(404, 'not_found', 'Not found');
}

/* ------------------------------------------------------------------ token */
const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
async function hmacKey(env) {
  if (!env.TOKEN_SECRET) throw new HttpError(500, 'config', 'ยังไม่ได้ตั้งค่า TOKEN_SECRET');
  return crypto.subtle.importKey('raw', enc.encode(env.TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function makeToken(env, id) {
  const payload = b64u(enc.encode(JSON.stringify({ id, iat: Date.now() })));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload)));
  return payload + '.' + b64u(sig);
}
async function tokenId(req, env) {
  const h = req.headers.get('Authorization') || '';
  const [payload, sig] = (h.startsWith('Bearer ') ? h.slice(7) : '').split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64u(sig), enc.encode(payload));
    if (!ok) return null;
    const o = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    return Date.now() - o.iat > TOKEN_TTL ? null : o.id;
  } catch (e) { return null; }
}

/* ------------------------------------------------------------------ kv */
async function allKV(env) {
  const { results } = await env.DB.prepare('SELECT k, v FROM kv').all();
  const o = {};
  for (const r of results) o[r.k] = r.v;
  return {
    version: Number(o.version || 1),
    epoch: Number(o.epoch || 1),
    settings: JSON.parse(o.settings || '{"leadMin":30,"maxInspectMin":30}'),
    employees: JSON.parse(o.employees || '[]'),
    processes: JSON.parse(o.processes || '[]'),
    details: JSON.parse(o.details || '[]')
  };
}
const putKV = (env, k, v) => env.DB.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, typeof v === 'string' ? v : JSON.stringify(v));
const bump = (env) => env.DB.prepare("UPDATE kv SET v = CAST(v AS INTEGER) + 1 WHERE k = 'version'");
const findEmp = (kv, id) => kv.employees.find((e) => e.id.toUpperCase() === String(id || '').trim().toUpperCase());

async function authUser(req, env, kv) {
  const id = await tokenId(req, env);
  const e = id && findEmp(kv, id);
  if (!e) throw new HttpError(401, 'auth', 'กรุณาเข้าสู่ระบบใหม่');
  return { id: e.id, name: e.name, role: e.role };
}

/* ------------------------------------------------------------------ handlers */
async function login(req, env) {
  const body = await req.json().catch(() => ({}));
  const kv = await allKV(env);
  const e = findEmp(kv, body.id);
  if (!e) throw new HttpError(404, 'not_found', 'ไม่พบรหัสพนักงานนี้ในระบบ');
  return json({ ok: true, token: await makeToken(env, e.id), user: { id: e.id, name: e.name, role: e.role } });
}

async function sync(req, env, url) {
  const kv = await allKV(env);
  await authUser(req, env, kv);
  const now = Date.now();
  const v = Number(url.searchParams.get('v') || 0);
  const epoch = Number(url.searchParams.get('epoch') || 0);
  const since = Number(url.searchParams.get('since') || 0);
  if (v && v === kv.version && epoch === kv.epoch) return json({ ok: true, unchanged: true, version: kv.version });

  const full = url.searchParams.has('full') || epoch !== kv.epoch || !since;
  const q = full
    ? env.DB.prepare("SELECT data FROM requests WHERE status IN ('waiting','inspecting') OR updated_at >= ?").bind(now - HISTORY_DAYS * DAY)
    : env.DB.prepare('SELECT data FROM requests WHERE updated_at > ?').bind(since - 5000);
  const { results } = await q.all();
  return json({
    ok: true, full, version: kv.version, epoch: kv.epoch, serverTime: now,
    settings: kv.settings, employees: kv.employees, processes: kv.processes, details: kv.details,
    requests: results.map((r) => JSON.parse(r.data))
  });
}

async function photo(env, id) {
  const row = await env.DB.prepare('SELECT data FROM photos WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'not_found', 'ไม่พบรูป');
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/.exec(row.data);
  if (!m) throw new HttpError(500, 'bad_photo', 'รูปเสียหาย');
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
}

/* ------------------------------------------------------------------ actions */
const str = (v, max, label, required) => {
  const s = String(v == null ? '' : v).trim();
  if (required && !s) throw bad('กรุณาระบุ ' + label);
  if (s.length > max) throw bad(label + ' ยาวเกินไป');
  return s;
};
const isoTime = (v, label) => {
  const t = Date.parse(v);
  if (!Number.isFinite(t)) throw bad('เวลา ' + label + ' ไม่ถูกต้อง');
  return new Date(t).toISOString();
};
const validId = (v) => { if (!/^[A-Za-z0-9]{6,40}$/.test(String(v || ''))) throw bad('รหัสรายการไม่ถูกต้อง'); return String(v); };

async function savePhoto(env, dataUrl) {
  if (!dataUrl) return '';
  if (typeof dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) throw bad('ไฟล์รูปไม่ถูกต้อง');
  if (dataUrl.length > MAX_PHOTO) throw bad('รูปภาพใหญ่เกินไป');
  const id = 'p' + crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare('INSERT INTO photos (id, data, created_at) VALUES (?, ?, ?)').bind(id, dataUrl, Date.now()).run();
  return id;
}

async function getReq(env, id) {
  const row = await env.DB.prepare('SELECT data FROM requests WHERE id = ?').bind(validId(id)).first();
  if (!row) throw new HttpError(404, 'not_found', 'ไม่พบรายการนี้ (อาจถูกลบไปแล้ว)');
  return JSON.parse(row.data);
}

/** update a request only if it is still in `expect` status (prevents double-accept races) */
async function updateReq(env, r, expect, extra = []) {
  const res = await env.DB.prepare('UPDATE requests SET status = ?, job_no = ?, updated_at = ?, data = ? WHERE id = ? AND status = ?')
    .bind(r.status, r.jobNo, Date.now(), JSON.stringify(r), r.id, expect).run();
  if (!res.meta.changes) throw conflict('รายการนี้ถูกอัปเดตโดยผู้อื่นแล้ว กรุณาลองใหม่');
  await env.DB.batch([...extra, bump(env)]);
}
const insertReq = (env, r) => env.DB.prepare('INSERT INTO requests (id, status, job_no, updated_at, data) VALUES (?, ?, ?, ?, ?)')
  .bind(r.id, r.status, r.jobNo, Date.now(), JSON.stringify(r));

async function action(req, env) {
  const kv = await allKV(env);
  const user = await authUser(req, env, kv);
  const b = await req.json().catch(() => { throw bad('ข้อมูลไม่ถูกต้อง'); });
  const isQA = user.role === 'qa' || user.role === 'admin';
  const isAdmin = user.role === 'admin';
  const me = { id: user.id, name: user.name };
  const nowIso = new Date().toISOString();
  const done = async () => json({ ok: true, version: Number((await env.DB.prepare("SELECT v FROM kv WHERE k = 'version'").first()).v) });

  switch (b.type) {
    /* ---------- inspection flow ---------- */
    case 'create': {
      const p = b.request || {};
      const dateReceived = str(p.dateReceived, 10, 'Date Received', true);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateReceived)) throw bad('Date Received ไม่ถูกต้อง');
      const r = {
        id: validId(p.id), jobNo: str(p.jobNo, 40, 'Job No.', true).toUpperCase(), product: str(p.product, 120, 'Product', true),
        process: str(p.process, 60, 'Process', true), detail: str(p.detail, 60, 'Process Detail', true), dateReceived,
        planAt: isoTime(p.planAt, 'Plan to inspection'), remark: str(p.remark, 500, 'Remark'), photo: await savePhoto(env, p.photo),
        round: 1, parentId: null, postpones: [], status: 'waiting', inspector: null, acceptedAt: null,
        result: null, resultAt: null, resultRemark: '', resultPhoto: '', requester: me, createdAt: nowIso
      };
      await env.DB.batch([insertReq(env, r), bump(env)]);
      return done();
    }
    case 'accept': {
      if (!isQA) throw forbidden('เฉพาะ QA Inspector เท่านั้นที่ยอมรับงานตรวจได้');
      const r = await getReq(env, b.id);
      if (r.status !== 'waiting') throw conflict(r.inspector ? 'งานนี้ ' + r.inspector.name + ' ยอมรับไปแล้ว' : 'งานนี้ไม่ได้อยู่ในสถานะรอตรวจ');
      Object.assign(r, { status: 'inspecting', inspector: me, acceptedAt: nowIso });
      await updateReq(env, r, 'waiting');
      return done();
    }
    case 'undoAccept': {
      const r = await getReq(env, b.id);
      if (r.status !== 'inspecting') throw conflict('ยกเลิกไม่ได้ เพราะรายการนี้ไม่ได้อยู่ระหว่างตรวจ');
      if (!isAdmin && (!r.inspector || r.inspector.id !== user.id)) throw forbidden();
      Object.assign(r, { status: 'waiting', inspector: null, acceptedAt: null });
      await updateReq(env, r, 'inspecting');
      return done();
    }
    case 'postpone': {
      if (!isQA) throw forbidden('เฉพาะ QA Inspector เท่านั้นที่เลื่อนเวลาตรวจได้');
      const r = await getReq(env, b.id);
      if (r.status !== 'waiting') throw conflict('เลื่อนเวลาไม่ได้ เพราะรายการนี้ไม่ได้รอตรวจแล้ว');
      const to = isoTime(b.to, 'ที่เลื่อน');
      if (Date.parse(to) < Date.now() - 60000) throw bad('เวลาใหม่ต้องเป็นเวลาในอนาคต');
      r.postpones = (r.postpones || []).concat({ from: r.planAt, to, by: me, at: nowIso, reason: str(b.reason, 200, 'เหตุผล') });
      r.planAt = to;
      await updateReq(env, r, 'waiting');
      return done();
    }
    case 'result': {
      if (!isQA) throw forbidden('เฉพาะ QA Inspector เท่านั้นที่ลงผลตรวจได้');
      const r = await getReq(env, b.id);
      if (r.status !== 'inspecting') throw conflict('รายการนี้ไม่ได้อยู่ระหว่างตรวจ');
      if (b.result !== 'OK' && b.result !== 'NG') throw bad('ผลตรวจไม่ถูกต้อง');
      const remark = str(b.remark, 500, 'หมายเหตุ', b.result === 'NG');
      Object.assign(r, { status: 'done', result: b.result, resultAt: nowIso, resultRemark: remark, resultPhoto: await savePhoto(env, b.photo) });
      if (!r.inspector) r.inspector = me;
      const extra = [];
      if (b.result === 'NG') {
        const next = Object.assign({}, r, {
          id: validId(b.nextId), round: r.round + 1, parentId: r.id, status: 'waiting', planAt: isoTime(b.reinspectAt, 'นัดตรวจซ้ำ'),
          postpones: [], inspector: null, acceptedAt: null, result: null, resultAt: null, resultRemark: '', resultPhoto: '',
          photo: '', remark: 'ตรวจซ้ำ (NG รอบที่ ' + r.round + '): ' + remark, createdAt: nowIso
        });
        extra.push(insertReq(env, next));
      }
      await updateReq(env, r, 'inspecting', extra);
      return done();
    }
    case 'cancel': {
      const r = await getReq(env, b.id);
      if (r.status !== 'waiting') throw conflict('ยกเลิกได้เฉพาะรายการที่ยังรอตรวจ');
      if (!isAdmin && (!r.requester || r.requester.id !== user.id)) throw forbidden('ยกเลิกได้เฉพาะผู้แจ้งงานหรือ Admin');
      Object.assign(r, { status: 'cancelled', cancelledBy: me, cancelledAt: nowIso });
      await updateReq(env, r, 'waiting');
      return done();
    }

    /* ---------- settings (admin) ---------- */
    case 'addEmployee': {
      if (!isAdmin) throw forbidden();
      const id = str(b.id, 20, 'รหัสพนักงาน', true).toUpperCase();
      if (!/^[A-Z0-9-]{3,20}$/.test(id)) throw bad('รหัสพนักงานต้องเป็นตัวอักษร/ตัวเลข 3–20 ตัว');
      if (!['admin', 'qa', 'prod'].includes(b.role)) throw bad('สิทธิ์ไม่ถูกต้อง');
      if (findEmp(kv, id)) throw conflict('มีรหัสพนักงานนี้อยู่แล้ว');
      kv.employees.push({ id, name: str(b.name, 80, 'ชื่อ', true), role: b.role });
      await env.DB.batch([putKV(env, 'employees', kv.employees), bump(env)]);
      return done();
    }
    case 'removeEmployee': {
      if (!isAdmin) throw forbidden();
      const e = findEmp(kv, b.id);
      if (!e) throw new HttpError(404, 'not_found', 'ไม่พบพนักงาน');
      if (e.id === user.id) throw bad('ลบบัญชีของตัวเองไม่ได้');
      if (e.role === 'admin' && kv.employees.filter((x) => x.role === 'admin').length <= 1) throw bad('ต้องมี Admin อย่างน้อย 1 คน');
      await env.DB.batch([putKV(env, 'employees', kv.employees.filter((x) => x.id !== e.id)), bump(env)]);
      return done();
    }
    case 'addProcess': {
      if (!isAdmin) throw forbidden();
      const name = str(b.name, 60, 'ชื่อ Process', true);
      if (kv.processes.some((p) => p.toLowerCase() === name.toLowerCase())) throw conflict('มี Process นี้อยู่แล้ว');
      kv.processes.push(name);
      await env.DB.batch([putKV(env, 'processes', kv.processes), bump(env)]);
      return done();
    }
    case 'removeProcess': {
      if (!isAdmin) throw forbidden();
      await env.DB.batch([putKV(env, 'processes', kv.processes.filter((p) => p !== b.name)), bump(env)]);
      return done();
    }
    case 'addDetail': {
      if (!isAdmin) throw forbidden();
      const name = str(b.name, 60, 'ชื่อ Process Detail', true);
      if (kv.details.some((d) => d.name.toLowerCase() === name.toLowerCase())) throw conflict('มี Process Detail นี้อยู่แล้ว');
      kv.details.push({ id: validId(b.id), name });
      await env.DB.batch([putKV(env, 'details', kv.details), bump(env)]);
      return done();
    }
    case 'removeDetail': {
      if (!isAdmin) throw forbidden();
      const d = kv.details.find((x) => x.id === b.id);
      if (!d) throw new HttpError(404, 'not_found', 'ไม่พบรายการ');
      if (d.system) throw bad('รายการนี้ใช้ในกฎปิด Job จึงลบไม่ได้');
      await env.DB.batch([putKV(env, 'details', kv.details.filter((x) => x.id !== b.id)), bump(env)]);
      return done();
    }
    case 'updateSettings': {
      if (!isAdmin) throw forbidden();
      const lead = Number(b.leadMin), max = Number(b.maxInspectMin);
      if (!(lead >= 5 && lead <= 180) || !(max >= 5 && max <= 240)) throw bad('ค่าการแจ้งเตือนไม่ถูกต้อง');
      await env.DB.batch([putKV(env, 'settings', { leadMin: lead, maxInspectMin: max }), bump(env)]);
      return done();
    }
    default:
      throw bad('ไม่รู้จักคำสั่ง ' + String(b.type));
  }
}
