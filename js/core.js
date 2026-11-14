/* ==========================================================================
   JuraganKos OS — core.js (dipakai landing, portal, verifikasi)
   Klien REST API ke Google Apps Script + helper UI + PWA
   ========================================================================== */
(function (w) {
  'use strict';
  const CFG = w.APP_CONFIG || {};
  const GAS_URL = CFG.GAS_URL || '';
  const KONFIG_OK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]{20,}\/exec$/.test(GAS_URL) && !/GANTI|XXXX/.test(GAS_URL);

  // ---------------- Utilitas ----------------
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = (n) => { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); };
  const rpK = (n) => { n = Number(n) || 0; const a = Math.abs(n); return (n < 0 ? '-' : '') + (a >= 1e9 ? (a / 1e9).toFixed(1).replace('.0', '') + 'M' : a >= 1e6 ? (a / 1e6).toFixed(1).replace('.0', '') + 'jt' : a >= 1e3 ? Math.round(a / 1e3) + 'rb' : a); };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const pad = (n) => String(n).padStart(2, '0');
  const hariIni = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const tgl = (s, pendek) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + (pendek ? BLS : BLN)[Number(m[2]) - 1] + ' ' + m[1] : (s || '-'); };
  const tglJam = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? Number(m[3]) + ' ' + BLS[Number(m[2]) - 1] + ' ' + m[1] + ', ' + m[4] + '.' + m[5] : tgl(s, 1); };
  const periodeNama = (p, pendek) => { const m = String(p || '').match(/^(\d{4})-(\d{2})/); return m ? (pendek ? BLS : BLN)[Number(m[2]) - 1] + ' ' + m[1] : (p || '-'); };
  const tambahBulan = (p, n) => { const [y, m] = p.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const selisihHari = (a, b) => { const x = new Date(String(a).slice(0, 10) + 'T00:00:00'), y = new Date(String(b).slice(0, 10) + 'T00:00:00'); return Math.round((x - y) / 864e5); };
  const tambahHari = (s, n) => { const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const hp08 = (v) => { let s = String(v || '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (!s) return ''; if (s.startsWith('62')) s = '0' + s.slice(2); else if (s.startsWith('8')) s = '0' + s; return s; };
  const hp62 = (v) => { const s = hp08(v); return s ? '62' + s.slice(1) : ''; };
  const hpValid = (v) => /^08\d{8,12}$/.test(hp08(v));
  const emailValid = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim());
  const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments, s = this; t = setTimeout(() => fn.apply(s, a), ms); }; };
  const hash = (s) => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const sapaan = () => { const j = new Date().getHours(); return j < 11 ? 'Selamat Pagi' : j < 15 ? 'Selamat Siang' : j < 18 ? 'Selamat Sore' : 'Selamat Malam'; };
  const waLink = (nomor, teks) => 'https://wa.me/' + hp62(nomor) + (teks ? '?text=' + encodeURIComponent(teks) : '');

  // ---------------- Penyimpanan lokal aman ----------------
  const LS = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  // ---------------- Ikon (garis, gaya feather — MIT) ----------------
  const IC = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    receipt: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    right: '<polyline points="9 18 15 12 9 6"/>', left: '<polyline points="15 18 9 12 15 6"/>', down: '<polyline points="6 9 12 15 18 9"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    wa: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    phoneapp: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'
  };
  const icon = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || IC.info) + '</svg>';
  const img3d = (n, cls, alt) => '<img src="assets/3d/' + n + '.webp" alt="' + esc(alt || '') + '" class="' + (cls || 'i3d') + '" loading="lazy" decoding="async">';

  // ---------------- Pengukur (Perf.table() di console) ----------------
  const Perf = { log: [],
    add(o) { this.log.push(o); if (this.log.length > 200) this.log.shift(); },
    table() { console.table(this.log.slice(-40)); },
    summary() { const m = {}; this.log.forEach((x) => { const a = m[x.aksi] || (m[x.aksi] = { n: 0, total: 0, server: 0 }); a.n++; a.total += x.total; a.server += x.server || 0; });
      console.table(Object.keys(m).map((k) => ({ aksi: k, n: m[k].n, rataTotal: Math.round(m[k].total / m[k].n), rataServer: Math.round(m[k].server / m[k].n) }))); }
  };

  // ---------------- API ----------------
  const BACA = /^(boot|batch|publik\.data|auth\.config|auth\.me|berkas\.lihat|kuitansi\.unduh|kuitansi\.verify|rahasia\.status|sistem\.status|log\.list|notif\.config|notif\.queue|wa\.audience|wa\.blastList|wa\.device|crm\.data|crm\.detail|migrasi\.pindai)$/;
  const API = {
    token: '', onAuthFail: null, onSync: null, _inflight: {}, _epoch: 0,
    ok: KONFIG_OK, url: GAS_URL,
    async raw(action, data, opts) {
      opts = opts || {};
      if (!KONFIG_OK) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Web App Apps Script.', code: 'CONFIG' };
      const t0 = performance.now(), ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), opts.timeout || 45000);
      let res;
      try {
        const r = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', signal: ctrl.signal,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },            // WAJIB text/plain → tanpa preflight CORS
          body: JSON.stringify({ action, token: API.token || undefined, data: data || {} }) });
        res = await r.json();
      } catch (e) {
        res = { success: false, message: e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : (navigator.onLine ? 'Gagal terhubung ke server.' : 'Anda sedang offline.'), code: 'NET' };
      } finally { clearTimeout(to); }
      Perf.add({ aksi: action, total: Math.round(performance.now() - t0), server: res.ms || 0, cache: res.data && res.data.tables ? Object.values(res.data.tables).filter((t) => t.same).length : '' });
      if (res.code === 'AUTH' && API.onAuthFail && action !== 'auth.logout') API.onAuthFail(res.message);
      if (res.sync && API.onSync) API.onSync(res.sync);
      if (res.nq) Drain.jadwal();
      return res;
    },
    /** Baca: permintaan identik yang sedang berjalan ditumpangi (dedupe). Tulis: menaikkan epoch. */
    call(action, data, opts) {
      if (!BACA.test(action)) { API._epoch++; return API.raw(action, data, opts); }
      const k = API._epoch + '|' + action + '|' + JSON.stringify(data || {});
      if (API._inflight[k]) return API._inflight[k];
      const p = API.raw(action, data, opts);
      API._inflight[k] = p;
      p.finally(() => delete API._inflight[k]);
      return p;
    },
    /** GET publik (bisa di-cache CDN Google, tanpa token) */
    async get(action, params) {
      if (!KONFIG_OK) return { success: false, message: 'Konfigurasi GAS_URL belum diisi.', code: 'CONFIG' };
      const t0 = performance.now();
      try {
        const q = new URLSearchParams(Object.assign({ action }, params || {})).toString();
        const r = await fetch(GAS_URL + '?' + q, { redirect: 'follow' });
        const j = await r.json();
        Perf.add({ aksi: action, total: Math.round(performance.now() - t0), server: j.ms || 0 });
        return j;
      } catch (e) { return { success: false, message: 'Gagal terhubung ke server.', code: 'NET' }; }
    },
    /** Kirim tanpa menunggu (statistik klik) */
    beacon(action, data) {
      if (!KONFIG_OK) return;
      const body = JSON.stringify({ action, data: data || {} });
      try { if (navigator.sendBeacon && navigator.sendBeacon(GAS_URL, new Blob([body], { type: 'text/plain' }))) return; } catch (e) { }
      fetch(GAS_URL, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body }).catch(() => { });
    },
    /** Memanaskan server (GAS cold start) — maks 1×/4 menit per lingkup */
    warm(scope) {
      if (!KONFIG_OK) return;
      const k = 'warm_' + scope, last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 240000) return;
      try { sessionStorage.setItem(k, String(Date.now())); } catch (e) { }
      fetch(GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(() => { });
    }
  };
  // Antrean notifikasi: panggil "drain" sesudah aksi yang memicu WA/email/kuitansi
  const Drain = { t: null, n: 0,
    jadwal() { clearTimeout(this.t); this.t = setTimeout(() => this.jalan(), 500); },
    async jalan() { const r = await API.raw('drain', {}); if (r.success && r.data && r.data.left && this.n++ < 3) this.jadwal(); else this.n = 0; }
  };

  // ---------------- UI: toast, modal, drawer ----------------
  let toastBox;
  function toast(msg, type, opt) {
    opt = opt || {};
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('role', 'status'); toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = '<span class="ti">' + icon(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check') + '</span><span class="tx">' + esc(msg) + '</span>' + (opt.aksi ? '<button type="button">' + esc(opt.aksi.label) + '</button>' : '');
    if (opt.aksi) el.querySelector('button').onclick = () => { el.remove(); opt.aksi.fn(); };
    toastBox.appendChild(el);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, opt.ms || (type === 'err' ? 6000 : 3200));
    return el;
  }
  const stack = [];
  function modal(o) {
    const ovl = document.createElement('div');
    ovl.className = 'ovl' + (o.side ? ' side' : '');
    ovl.innerHTML = o.side
      ? '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '"><div class="modal-h"><h3 class="h-md">' + (o.titleHtml || esc(o.title || '')) + '</h3><button class="btn ghost sm icon" data-x aria-label="Tutup">' + icon('x') + '</button></div><div class="modal-b" style="flex:1">' + (o.body || '') + '</div>' + (o.footer ? '<div class="modal-f">' + o.footer + '</div>' : '') + '</aside>'
      : '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '"><div class="modal-h"><h3 class="h-md">' + (o.titleHtml || esc(o.title || '')) + '</h3><button class="btn ghost sm icon" data-x aria-label="Tutup">' + icon('x') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' + (o.footer ? '<div class="modal-f">' + o.footer + '</div>' : '') + '</div>';
    const prevFocus = document.activeElement;
    const close = (val) => { if (!ovl.isConnected) return; ovl.remove(); stack.splice(stack.indexOf(m), 1); document.body.style.overflow = stack.length ? 'hidden' : ''; if (o.onClose) o.onClose(val); try { prevFocus && prevFocus.focus(); } catch (e) { } };
    const m = { el: ovl, close, body: ovl.querySelector('.modal-b'), $: (s) => ovl.querySelector(s), $$: (s) => Array.from(ovl.querySelectorAll(s)) };
    ovl.addEventListener('click', (e) => { if (e.target === ovl || e.target.closest('[data-x]')) close(); });
    document.body.appendChild(ovl); stack.push(m); document.body.style.overflow = 'hidden';
    const f = ovl.querySelector('[autofocus], .modal-b input:not([type=hidden]):not([type=checkbox]), .modal-b select, .modal-b textarea');
    setTimeout(() => (f || ovl.querySelector('[data-x]')).focus(), 30);
    if (o.onOpen) o.onOpen(m);
    return m;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
  function konfirmasi(pesan, opt) {
    opt = opt || {};
    return new Promise((res) => {
      const m = modal({ title: opt.judul || 'Konfirmasi', size: 'sm', body: '<p>' + pesan + '</p>' + (opt.input ? '<div class="fld mt"><label for="kf-in">' + esc(opt.input) + '</label>' + (opt.multiline ? '<textarea class="inp" id="kf-in"></textarea>' : '<input class="inp" id="kf-in" value="' + esc(opt.nilai || '') + '">') + '</div>' : ''),
        footer: '<button class="btn ghost" data-x>Batal</button><button class="btn ' + (opt.bahaya ? 'danger' : '') + '" data-ok>' + esc(opt.ok || 'Ya, lanjutkan') + '</button>',
        onClose: (v) => res(v === undefined ? (opt.input ? null : false) : v) });
      m.$('[data-ok]').onclick = () => { const v = opt.input ? m.$('#kf-in').value.trim() : true; if (opt.input && opt.wajib && !v) { m.$('#kf-in').focus(); return; } m.close(v); };
    });
  }
  function tombolMuat(btn, on, teks) {
    if (!btn) return;
    if (on) { btn._html = btn.innerHTML; btn.classList.add('loading'); btn.innerHTML = '<span class="spin"></span>' + esc(teks || 'Memproses…'); }
    else { btn.classList.remove('loading'); if (btn._html) btn.innerHTML = btn._html; }
  }

  // ---------------- Berkas: validasi + kompres foto di sisi klien ----------------
  async function bacaBerkas(file, opt) {
    opt = opt || {};
    const BOLEH = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!file) throw new Error('Pilih berkas terlebih dahulu.');
    if (BOLEH.indexOf(file.type) === -1) throw new Error('Format harus JPG, PNG, WEBP, atau PDF.');
    if (file.type === 'application/pdf') {
      if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 5 MB.');
      return { data: await keBase64(file), mime: file.type, nama: file.name, ukuran: file.size };
    }
    const maxW = opt.maxW || 1600, q = opt.q || 0.82;
    const bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak bisa dibaca.')); i.src = URL.createObjectURL(file); });
    const sk = Math.min(1, maxW / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sk); c.height = Math.round(bmp.height * sk);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    URL.revokeObjectURL(bmp.src);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
    const akhir = blob && blob.size < file.size ? blob : file;
    if (akhir.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB.');
    return { data: await keBase64(akhir), mime: akhir.type || 'image/jpeg', nama: file.name.replace(/\.\w+$/, '') + '.jpg', ukuran: akhir.size, pratinjau: URL.createObjectURL(akhir) };
  }
  function keBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); }); }
  function unduhBase64(b64, mime, nama) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function salin(teks) { try { await navigator.clipboard.writeText(teks); toast('Disalin.'); } catch (e) { toast('Gagal menyalin.', 'err'); } }

  // ---------------- PWA ----------------
  const PWA = { evt: null, listeners: [],
    bisa() { return !!this.evt; },
    ios() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone; },
    terpasang() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; },
    async pasang() {
      if (this.evt) { this.evt.prompt(); const r = await this.evt.userChoice; this.evt = null; this.emit(); if (r.outcome === 'accepted') toast('Aplikasi dipasang 🎉'); return; }
      if (this.ios()) modal({ title: 'Pasang di iPhone/iPad', size: 'sm', body: '<ol style="padding-left:18px;line-height:1.9"><li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di Safari.</li><li>Pilih <b>Tambahkan ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>.</li></ol>' });
      else modal({ title: 'Pasang aplikasi', size: 'sm', body: '<p>Buka menu browser (⋮) lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</p>' });
    },
    on(fn) { this.listeners.push(fn); }, emit() { this.listeners.forEach((f) => f()); }
  };
  w.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); PWA.evt = e; PWA.emit(); });
  w.addEventListener('appinstalled', () => { PWA.evt = null; PWA.emit(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    w.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
  }

  w.JK = { CFG, $, $$, esc, rp, rpK, BLN, BLS, pad, hariIni, tgl, tglJam, periodeNama, tambahBulan, selisihHari, tambahHari, hp08, hp62, hpValid, emailValid, inisial, debounce,
    hash, sapaan, waLink, LS, IC, icon, img3d, Perf, API, Drain, toast, modal, konfirmasi, tombolMuat, bacaBerkas, unduhBase64, salin, PWA };
  w.Perf = Perf;
})(window);
