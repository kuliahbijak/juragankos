/* ==========================================================================
   JuraganKos OS — app.js  (inti portal SPA)
   Store lokal + delta sync · Auth (Google / darurat) · Router · Shell per peran
   Sinkron latar adaptif · Aksi optimistik (UI langsung berubah, server menyusul)
   ========================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, rp, icon, img3d, LS, API, toast, modal, konfirmasi, tombolMuat, inisial, hariIni, sapaan, debounce, hash, PWA } = JK;
  const OW = 'Owner', OP = 'Operator', PH = 'Penghuni';

  // ======================= STORE =======================
  const KEYS = { Properti: 'ID_Properti', Tipe_Kamar: 'ID_Tipe', Kamar: 'ID_Kamar', Penghuni: 'ID_Penghuni', Tagihan: 'ID_Tagihan', Pembayaran: 'ID_Bayar',
    Meteran_Listrik: 'ID', Pengeluaran: 'ID', Komplain: 'ID_Tiket', Pengguna: 'Email', Prospek: 'ID_Prospek', Statistik: null };
  const S = {
    me: null, set: {}, srv: {}, t: {}, _idx: {}, siap: false,
    rows(n) { return (this.t[n] && this.t[n].rows) || []; },
    by(n, id) {
      if (!id) return null;
      if (!this._idx[n]) { const m = {}, k = KEYS[n]; this.rows(n).forEach((r) => { m[r[k]] = r; }); this._idx[n] = m; }
      return this._idx[n][id] || null;
    },
    versi() { const o = {}; Object.keys(this.t).forEach((n) => { if (this.t[n].v) o[n] = this.t[n].v; }); return o; },
    /** Gabungkan tabel dari server; kembalikan daftar nama tabel yang berubah. */
    merge(tables) {
      const ubah = [];
      Object.keys(tables || {}).forEach((n) => {
        const t = tables[n];
        if (t.same) return;
        const rows = t.r.map((r) => { const o = {}; t.c.forEach((c, i) => { o[c] = r[i]; }); return o; });
        this.t[n] = { v: t.v, rows }; delete this._idx[n]; ubah.push(n);
      });
      if (ubah.length) this.simpan();
      return ubah;
    },
    kunci() { return 'jk_store_' + Math.abs(hash((this.me && this.me.email) || 'x')); },
    simpan: debounce(function () { if (S.me) LS.set(S.kunci(), { me: S.me, set: S.set, srv: S.srv, t: S.t, at: Date.now() }); }, 500),
    pulihkan() { const d = LS.get(this.kunci(), null); if (d && d.t) { this.t = d.t; this.set = d.set || {}; this.srv = d.srv || {}; this._idx = {}; return true; } return false; },
    // ---- Mutasi optimistik (mengembalikan fungsi batal) ----
    patch(n, id, ubah) {
      const r = this.by(n, id); if (!r) return () => { };
      const lama = {}; Object.keys(ubah).forEach((k) => { lama[k] = r[k]; r[k] = ubah[k]; });
      return () => { Object.keys(lama).forEach((k) => { r[k] = lama[k]; }); };
    },
    sisip(n, obj) {
      if (!this.t[n]) this.t[n] = { v: '', rows: [] };
      const k = KEYS[n], o = Object.assign({ _pending: true }, obj); if (k && !o[k]) o[k] = 'tmp-' + Date.now();
      this.t[n].rows.push(o); delete this._idx[n];
      return () => { const a = this.t[n].rows, i = a.indexOf(o); if (i > -1) a.splice(i, 1); delete this._idx[n]; };
    },
    buang(n, id) {
      const a = this.rows(n), k = KEYS[n], i = a.findIndex((r) => r[k] === id); if (i < 0) return () => { };
      const [o] = a.splice(i, 1); delete this._idx[n];
      return () => { a.splice(i, 0, o); delete this._idx[n]; };
    }
  };

  // ======================= DERIVASI DATA =======================
  const D = {
    hari: () => S.srv.today || hariIni(),
    periode: () => D.hari().slice(0, 7),
    staf: () => S.me && S.me.role !== PH,
    owner: () => S.me && S.me.role === OW,
    prop: '',                                   // filter cabang ('' = semua)
    kamarList() { return S.rows('Kamar').filter((k) => !D.prop || k.ID_Properti === D.prop); },
    tipe: (id) => S.by('Tipe_Kamar', id) || {},
    kamar: (id) => S.by('Kamar', id) || {},
    penghuni: (id) => S.by('Penghuni', id) || {},
    namaKamar(k) { if (!k || !k.ID_Kamar) return '-'; const t = D.tipe(k.ID_Tipe); return (t.Kelas || 'Kamar') + ' ' + k.No_Kamar; },
    hargaKamar(k) { const t = D.tipe(k.ID_Tipe); return t.Harga_Bulanan ? rp(t.Harga_Bulanan) + ' / bln' : t.Harga_Harian ? rp(t.Harga_Harian) + ' / hari' : '-'; },
    stTag(t) { return t.Status === 'Belum' && t.Jatuh_Tempo && t.Jatuh_Tempo < D.hari() ? 'Telat' : t.Status; },
    badgeTag(st) { const m = { Lunas: 'ok', 'Menunggu Validasi': 'violet', Belum: 'yellow', Telat: 'bad' }; return '<span class="badge ' + (m[st] || 'mute') + '">' + (st === 'Lunas' ? '✓ ' : st === 'Telat' ? '! ' : '') + esc(st) + '</span>'; },
    badgeKamar(st) { const m = { Kosong: 'lime', Terisi: 'violet', Renovasi: 'orange' }; return '<span class="badge ' + (m[st] || 'mute') + '">' + esc(st) + '</span>'; },
    badgeBayar(st) { const m = { Disetujui: 'ok', Menunggu: 'violet', Ditolak: 'bad' }; return '<span class="badge ' + (m[st] || 'mute') + '">' + esc(st) + '</span>'; },
    badgePrio(p) { const m = { Rendah: 'mute', Sedang: 'yellow', Tinggi: 'orange', Darurat: 'bad' }; return '<span class="badge ' + (m[p] || 'mute') + '">' + esc(p) + '</span>'; },
    tile(st) { return st === 'Kosong' ? 'lime' : st === 'Renovasi' ? 'orange' : 'violet'; },
    ilus(k) { if (k.Status === 'Renovasi') return 'tools'; const t = D.tipe(k.ID_Tipe); return k.Status === 'Kosong' ? (t.Kelas === 'VIP' ? 'couch' : 'key') : (t.Kelas === 'VIP' ? 'tv' : t.Kelas === 'Eksklusif' ? 'hotel' : 'bed'); },
    tagihanPenghuni(pid) { return S.rows('Tagihan').filter((t) => t.ID_Penghuni === pid); },
    tunggakan(pid) { const l = D.tagihanPenghuni(pid).filter((t) => t.Status !== 'Lunas' && t.Status !== 'Menunggu Validasi'); return { n: l.length, total: l.reduce((s, t) => s + Number(t.Nominal || 0), 0), telat: l.filter((t) => D.stTag(t) === 'Telat').length }; },
    bayarTagihan(id) { return S.rows('Pembayaran').filter((b) => b.ID_Tagihan === id).sort((a, b) => String(b.Dibuat).localeCompare(String(a.Dibuat))); },
    /** Arus kas per bulan: pemasukan = pembayaran disetujui (tgl bayar), pengeluaran = disetujui (tanggal). */
    arusKas(per) {
      const masuk = S.rows('Pembayaran').filter((b) => b.Status_Validasi === 'Disetujui' && String(b.Tgl_Bayar).slice(0, 7) === per).reduce((s, b) => s + Number(b.Nominal || 0), 0);
      const keluar = S.rows('Pengeluaran').filter((g) => g.Status_Approval === 'Disetujui' && String(g.Tanggal).slice(0, 7) === per).reduce((s, g) => s + Number(g.Nominal || 0), 0);
      return { masuk, keluar, laba: masuk - keluar };
    },
    /** Okupansi per bulan dari riwayat penghuni (akhir bulan). */
    okupansi(per) {
      const total = D.kamarList().length; if (!total) return { pct: 0, terisi: 0, total: 0 };
      if (per === D.periode()) { const t = D.kamarList().filter((k) => k.Status === 'Terisi').length; return { pct: Math.round(t * 100 / total), terisi: t, total }; }
      const akhir = per + '-31', awal = per + '-01', ids = new Set(D.kamarList().map((k) => k.ID_Kamar));
      const isi = new Set(S.rows('Penghuni').filter((p) => ids.has(p.ID_Kamar) && p.Tgl_Masuk && p.Tgl_Masuk <= akhir && (p.Status === 'Aktif' || (p.Tgl_Kontrak_Berakhir && p.Tgl_Kontrak_Berakhir >= awal))).map((p) => p.ID_Kamar));
      return { pct: Math.round(isi.size * 100 / total), terisi: isi.size, total };
    },
    /** Rasio tagihan sewa bulan itu yang lunas tepat waktu. pid → khusus penghuni. */
    tepatWaktu(per, pid) {
      const tag = S.rows('Tagihan').filter((t) => t.Periode === per && t.Jenis === 'Sewa' && (!pid || t.ID_Penghuni === pid));
      if (!tag.length) return null;
      let ok = 0;
      tag.forEach((t) => { const b = D.bayarTagihan(t.ID_Tagihan).find((x) => x.Status_Validasi === 'Disetujui'); if (t.Status === 'Lunas' && b && String(b.Tgl_Bayar).slice(0, 10) <= t.Jatuh_Tempo) ok++; });
      return { ok, n: tag.length, rasio: ok / tag.length, lunas: tag.filter((t) => t.Status === 'Lunas').length };
    },
    bulanTerakhir(n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(JK.tambahBulan(D.periode(), -i)); return out; },
    perluTindakan() {
      const v = S.rows('Pembayaran').filter((b) => b.Status_Validasi === 'Menunggu').length;
      const kb = S.rows('Komplain').filter((k) => k.Status === 'Baru').length;
      const g = D.owner() ? S.rows('Pengeluaran').filter((x) => x.Status_Approval === 'Menunggu').length : 0;
      const pr = S.rows('Prospek').filter((x) => x.Status === 'Baru').length;
      const tl = S.rows('Tagihan').filter((t) => D.stTag(t) === 'Telat').length;
      return { validasi: v, komplain: kb, approval: g, prospek: pr, telat: tl, total: v + kb + g + pr };
    }
  };

  // ======================= SESI =======================
  const SESI_KEY = 'jk_sesi';
  function simpanSesi(token, me) { LS.set(SESI_KEY, { token, me }); API.token = token; S.me = me; }
  async function keluar(semua) {
    if (semua) await API.call('auth.logoutAll', {}); else API.call('auth.logout', {});
    LS.del(SESI_KEY); LS.del(S.kunci()); API.token = ''; S.me = null; S.t = {}; S._idx = {};
    try { if (w.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { }
    location.hash = ''; tampilLogin();
  }
  API.onAuthFail = (pesan) => { LS.del(SESI_KEY); API.token = ''; S.me = null; tampilLogin(pesan || 'Sesi berakhir. Silakan masuk kembali.'); };
  API.onSync = (sync) => { const u = S.merge(sync); if (u.length) App.segarkan(u); };

  // ======================= ROUTER & VIEWS =======================
  const V = w.V = w.V || {};                 // diisi v-staf.js / v-penghuni.js
  const NAV = {
    staf: [
      { r: 'dashboard', l: 'Dashboard', i: 'grid' }, { r: 'kamar', l: 'Kamar', i: 'key' }, { r: 'penghuni', l: 'Penghuni', i: 'users' },
      { r: 'tagihan', l: 'Tagihan', i: 'card', cnt: () => D.perluTindakan().validasi }, { r: 'keuangan', l: 'Keuangan', i: 'trend', cnt: () => D.perluTindakan().approval },
      { r: 'komplain', l: 'Komplain', i: 'chat', dot: () => D.perluTindakan().komplain }, { r: 'laporan', l: 'Laporan', i: 'receipt' },
      { grp: 'Komunikasi' }, { r: 'wa', l: 'WhatsApp & Notif', i: 'wa' }, { r: 'crm', l: 'CRM Kontak', i: 'phoneapp' },
      { grp: 'Sistem' }, { r: 'pengaturan', l: 'Pengaturan', i: 'sliders' }
    ],
    penghuni: [{ r: 'beranda', l: 'Beranda', i: 'home' }, { r: 'tagihan', l: 'Tagihan', i: 'card' }, { r: 'komplain', l: 'Komplain', i: 'chat' }, { r: 'profil', l: 'Profil', i: 'user' }]
  };
  const BNAV_STAF = ['dashboard', 'kamar', 'tagihan', 'komplain'];
  function rute() {
    const h = location.hash.replace(/^#\/?/, ''), [p, q] = h.split('?');
    const params = {}; new URLSearchParams(q || '').forEach((v, k) => { params[k] = v; });
    const def = S.me && S.me.role === PH ? 'beranda' : 'dashboard';
    const daftar = S.me && S.me.role === PH ? V.penghuni : V.staf;
    return { nama: daftar && daftar[p] ? p : def, params };
  }
  function ke(nama, params) { const q = params ? '?' + new URLSearchParams(params).toString() : ''; const h = '#/' + nama + q; if (location.hash !== h) location.hash = h; else render(); }

  // ======================= SHELL =======================
  let uiDibangun = false;
  function navHtml(items) {
    const r = rute().nama;
    return items.map((n) => {
      if (n.grp) return '<div class="grp">' + esc(n.grp) + '</div>';
      const c = n.cnt ? n.cnt() : 0, d = n.dot ? n.dot() : 0;
      return '<a href="#/' + n.r + '" class="' + (r === n.r ? 'on' : '') + '"' + (r === n.r ? ' aria-current="page"' : '') + '><span class="ico">' + icon(n.i) + '</span>' + esc(n.l) +
        (c ? '<span class="cnt">' + c + '</span>' : d ? '<span class="dot" title="' + d + ' baru"></span>' : '') + '</a>';
    }).join('');
  }
  function bangunShell() {
    const me = S.me, staf = me.role !== PH, props = S.rows('Properti');
    const av = me.foto ? '<img src="' + esc(me.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(inisial(me.nama));
    if (staf) {
      $('#root').innerHTML =
        '<div class="frame"><aside class="side"><a class="brand" href="#/dashboard"><img src="assets/icons/logo.svg" alt=""><span><b>JuraganKos <em style="color:var(--violet);font-style:normal">OS</em></b><small>' + (me.role === OW ? 'OWNER PORTAL' : 'OPERATOR PORTAL') + '</small></span></a>' +
        '<nav class="nav" id="nav" aria-label="Menu utama"></nav>' +
        '<button class="me-card" id="me-btn"><span class="avatar">' + av + '</span><span class="grow"><b class="ellipsis" style="display:block">' + esc(me.nama || me.email) + '</b><small class="ellipsis">' + esc(me.email) + '</small></span>' + icon('down', 'sm') + '</button></aside>' +
        '<div class="main"><header class="topbar"><a class="brand only-m" href="#/dashboard"><img src="assets/icons/logo.svg" alt="JuraganKos OS"></a>' +
        (props.length > 1 ? '<select class="pill" id="sel-prop" aria-label="Pilih cabang"><option value="">Semua Cabang Aktif</option>' + props.map((p) => '<option value="' + esc(p.ID_Properti) + '">' + esc(p.Nama) + '</option>').join('') + '</select>'
          : '<span class="pill"><i></i>' + esc((props[0] && props[0].Nama) || 'Properti') + '</span>') +
        '<span class="sp"></span><button class="iconbtn" id="bell" aria-label="Perlu tindakan">' + icon('bell') + '<span class="b hide" id="bell-n"></span></button>' +
        '<button class="btn lime sm" id="cta"></button><button class="iconbtn only-m" id="me-m" aria-label="Akun"><span class="avatar" style="width:32px;height:32px">' + av + '</span></button></header>' +
        '<main class="canvas" id="view" tabindex="-1"></main></div></div><nav class="bnav" id="bnav" aria-label="Menu"></nav>';
      const sel = $('#sel-prop'); if (sel) { sel.value = D.prop; sel.onchange = () => { D.prop = sel.value; render(); }; }
    } else {
      $('#root').innerHTML =
        '<div class="frame top"><header class="tophead"><a class="brand" href="#/beranda"><img src="assets/icons/logo.svg" alt=""><span><b>JuraganKos <em style="color:var(--violet);font-style:normal">OS</em></b></span></a>' +
        '<nav class="pillnav" id="nav" aria-label="Menu utama"></nav>' +
        '<button class="mepill" id="me-btn"><span class="avatar" style="width:34px;height:34px;background:var(--lime)">' + av + '</span><span><b style="font-size:13px">Hi, ' + esc(String(me.nama || '').split(' ')[0]) + '!</b><small>' + esc(me.email) + '</small></span></button></header>' +
        '<main class="canvas" id="view" tabindex="-1"></main></div><nav class="bnav" id="bnav" aria-label="Menu"></nav>';
    }
    $('#me-btn').onclick = menuAkun; const mm = $('#me-m'); if (mm) mm.onclick = menuAkun;
    const bell = $('#bell'); if (bell) bell.onclick = panelTindakan;
    uiDibangun = true;
    perbaruiNav();
  }
  function perbaruiNav() {
    if (!uiDibangun) return;
    const staf = S.me.role !== PH, r = rute().nama;
    $('#nav').innerHTML = staf ? navHtml(NAV.staf) : NAV.penghuni.map((n) => '<a href="#/' + n.r + '" class="' + (r === n.r ? 'on' : '') + '">' + esc(n.l) + '</a>').join('');
    const items = staf ? NAV.staf.filter((n) => BNAV_STAF.indexOf(n.r) > -1) : NAV.penghuni;
    $('#bnav').innerHTML = items.map((n) => { const c = n.cnt ? n.cnt() : n.dot ? n.dot() : 0; return '<a href="#/' + n.r + '" class="' + (r === n.r ? 'on' : '') + '">' + icon(n.i) + esc(n.l) + (c ? '<span class="cnt">' + c + '</span>' : '') + '</a>'; }).join('') +
      (staf ? '<button type="button" id="bn-more">' + icon('menu') + 'Lainnya</button>' : '');
    const more = $('#bn-more'); if (more) more.onclick = menuLainnya;
    if (staf) {
      const p = D.perluTindakan(), b = $('#bell-n');
      b.textContent = p.total; b.classList.toggle('hide', !p.total);
    }
  }
  function menuLainnya() {
    const m = modal({ title: 'Menu', size: 'sm', body: '<div class="col">' + NAV.staf.filter((n) => n.r && BNAV_STAF.indexOf(n.r) === -1).map((n) => '<a class="list-item" style="text-decoration:none;margin:0" href="#/' + n.r + '">' + icon(n.i) + '<span class="grow t">' + esc(n.l) + '</span>' + icon('right', 'sm') + '</a>').join('') + '</div>' });
    m.$$('a').forEach((a) => a.addEventListener('click', () => m.close()));
  }
  function menuAkun() {
    const me = S.me, staf = me.role !== PH;
    const m = modal({ title: 'Akun', size: 'sm', body:
      '<div class="row"><span class="avatar" style="width:52px;height:52px;background:var(--lime)">' + (me.foto ? '<img src="' + esc(me.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(inisial(me.nama))) + '</span><div><b>' + esc(me.nama) + '</b><div class="small muted">' + esc(me.email) + '</div><span class="badge violet mt-s">' + esc(me.role) + '</span></div></div>' +
      '<div class="col mt">' + (!PWA.terpasang() ? '<button class="btn lime block" data-a="pasang">' + icon('download') + ' Pasang Aplikasi di HP/Desktop</button>' : '') +
      (staf ? '<button class="btn ghost block" data-a="segar">' + icon('refresh') + ' Segarkan data dari Google Sheets</button>' : '') +
      '<button class="btn ghost block" data-a="keluar">' + icon('logout') + ' Keluar</button><button class="btn danger block" data-a="semua">Keluar dari semua perangkat</button></div>' +
      '<p class="xs muted mt">JuraganKos OS v' + esc(S.srv.versi || '1.0.0') + ' · Perf: ketik <code>Perf.summary()</code> di console.</p>' });
    m.el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'pasang') { m.close(); PWA.pasang(); }
      if (a.dataset.a === 'segar') { m.close(); await sinkron({ fresh: true }); toast('Data disegarkan dari Sheets.'); }
      if (a.dataset.a === 'keluar') { m.close(); keluar(false); }
      if (a.dataset.a === 'semua' && await konfirmasi('Semua sesi di HP/laptop lain akan berakhir. Lanjutkan?', { bahaya: true })) keluar(true);
    });
  }
  function panelTindakan() {
    const p = D.perluTindakan(), it = (n, ic, t, s, r) => n ? '<a class="list-item" style="text-decoration:none" href="#/' + r + '">' + img3d(ic) + '<span class="grow"><span class="t">' + t + '</span><span class="s" style="display:block">' + s + '</span></span><span class="badge lime">' + n + '</span></a>' : '';
    const isi = it(p.validasi, 'receipt', 'Validasi pembayaran', 'Bukti bayar menunggu dicek', 'tagihan?tab=validasi') + it(p.komplain, 'tools', 'Komplain baru', 'Tiket belum ditangani', 'komplain') +
      it(p.approval, 'moneybag', 'Persetujuan pengeluaran', 'Menunggu keputusan Owner', 'keuangan?tab=persetujuan') + it(p.prospek, 'envelope', 'Calon penghuni baru', 'Minta dihubungi dari landing page', 'penghuni?tab=prospek') +
      it(p.telat, 'hourglass', 'Tagihan telat', 'Lewat jatuh tempo', 'tagihan?status=Telat');
    const m = modal({ title: 'Perlu Tindakan', side: true, body: isi || '<div class="empty">' + img3d('party') + '<b>Semua beres!</b>Tidak ada yang perlu ditindaklanjuti.</div>' });
    m.$$('a').forEach((a) => a.addEventListener('click', () => m.close()));
  }

  // ======================= RENDER =======================
  const viewState = {};                         // state filter per halaman (bertahan saat pindah menu)
  let renderJadwal = 0;
  function render() {
    if (!S.me) return;
    if (!uiDibangun) bangunShell();
    const r = rute(), daftar = S.me.role === PH ? V.penghuni : V.staf, v = daftar[r.nama];
    const el = $('#view'), st = viewState[r.nama] || (viewState[r.nama] = {});
    const fokus = document.activeElement && el.contains(document.activeElement) && document.activeElement.id ? { id: document.activeElement.id, s: document.activeElement.selectionStart } : null;
    const scroll = w.scrollY, sama = el.dataset.v === r.nama;
    if (!S.siap && !Object.keys(S.t).length) { el.innerHTML = skeleton(); return; }
    try { v.render(el, r.params, st); } catch (e) { console.error(e); el.innerHTML = '<div class="note bad">' + icon('alert') + '<div><b>Terjadi kesalahan menampilkan halaman.</b><div class="small">' + esc(e.message) + '</div></div></div>'; }
    el.dataset.v = r.nama;
    if (!el.querySelector('.syncbar')) el.insertAdjacentHTML('afterbegin', '<span class="syncbar" id="syncbar"><i></i><span></span></span>');
    if (sama) { w.scrollTo(0, scroll); if (fokus) { const f = document.getElementById(fokus.id); if (f) { f.focus(); try { f.setSelectionRange(fokus.s, fokus.s); } catch (e) { } } } }
    else { w.scrollTo(0, 0); }
    const cta = $('#cta');
    if (cta) { if (v.cta) { cta.style.display = ''; cta.innerHTML = icon('plus', 'sm') + '<span class="cta-t">' + esc(v.cta.label) + '</span>'; cta.setAttribute('aria-label', v.cta.label); cta.onclick = v.cta.fn; } else cta.style.display = 'none'; }
    document.title = (v.judul || 'Portal') + ' — JuraganKos OS';
    perbaruiNav(); statusSync();
  }
  function segarkan(ubah) {
    // render ulang hanya bila tabel yang berubah dipakai halaman ini & pengguna tidak sedang mengetik
    const r = rute(), daftar = S.me && (S.me.role === PH ? V.penghuni : V.staf), v = daftar && daftar[r.nama];
    if (!v) return;
    const pakai = !v.tabel || !ubah || ubah.some((n) => v.tabel.indexOf(n) > -1);
    const ae = document.activeElement, mengetik = ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && $('#view').contains(ae) && ae.type !== 'checkbox';
    if (!pakai) { perbaruiNav(); return; }
    if (mengetik) { ae.addEventListener('blur', () => segarkan(ubah), { once: true }); return; }
    cancelAnimationFrame(renderJadwal); renderJadwal = requestAnimationFrame(render);
  }
  function skeleton() { return '<div class="sk" style="height:46px;width:45%"></div><div class="g4 mt">' + '<div class="sk" style="height:84px"></div>'.repeat(4) + '</div><div class="sk mt-l" style="height:240px"></div><div class="g2 mt"><div class="sk" style="height:170px"></div><div class="sk" style="height:170px"></div></div>'; }

  // ======================= SINKRON LATAR (adaptif) =======================
  const Aktivitas = { at: Date.now(), init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach((e) => w.addEventListener(e, () => { this.at = Date.now(); }, { passive: true })); }, idle() { return Date.now() - this.at > 120000; } };
  let syncJalan = false, syncTerakhir = 0, syncGagal = false, loopJalan = false;
  async function sinkron(opt) {
    if (!API.token || syncJalan) return;
    syncJalan = true; statusSync();
    const r = await API.call('boot', Object.assign({ have: (opt && opt.fresh) ? {} : S.versi() }, opt && opt.fresh ? { _fresh: true } : {}));
    syncJalan = false;
    if (r.success) {
      syncGagal = false; syncTerakhir = Date.now();
      S.me = Object.assign({}, S.me, r.data.me, { foto: S.me && S.me.foto }); S.set = r.data.set; S.srv = r.data.srv;
      LS.set(SESI_KEY, { token: API.token, me: S.me });
      const ubah = S.merge(r.data.tables); S.simpan();
      const pertama = !S.siap; S.siap = true;
      if (pertama || ubah.length) segarkan(pertama ? null : ubah); else statusSync();
    } else { syncGagal = true; statusSync(); if (r.code !== 'AUTH' && !S.siap && !Object.keys(S.t).length) $('#view').innerHTML = '<div class="note bad">' + icon('alert') + '<div><b>Gagal memuat data.</b><div class="small">' + esc(r.message) + '</div><button class="btn sm mt-s" onclick="App.sinkron()">Coba lagi</button></div></div>'; }
  }
  function statusSync() {
    const b = $('#syncbar'); if (!b) return;
    b.className = 'syncbar' + (syncJalan ? ' busy' : syncGagal ? ' off' : '');
    b.lastChild.textContent = syncJalan ? 'menyinkronkan…' : syncGagal ? 'offline — data tersimpan' : syncTerakhir ? 'tersinkron ' + new Date(syncTerakhir).toTimeString().slice(0, 5) : 'data lokal';
  }
  function loopSinkron() {
    if (loopJalan) return; loopJalan = true;
    setInterval(() => {
      if (!API.token || document.visibilityState !== 'visible') return;
      const jeda = Aktivitas.idle() ? 120000 : 25000;
      if (Date.now() - syncTerakhir >= jeda) sinkron();
    }, 5000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && API.token && Date.now() - syncTerakhir > 15000) sinkron(); });
    w.addEventListener('online', () => sinkron());
  }

  // ======================= AKSI (optimistik) =======================
  /**
   * aksi('kamar.status', data, { btn, optimis: () => undoFn, buka: () => bukaFormLagi(), diam })
   * - optimis(): ubah S (sisip/patch/buang) lalu UI dirender seketika
   * - sukses: server mengirim sync tabel terbaru → merge otomatis
   * - gagal: rollback + toast (dengan tombol "Buka lagi" bila ada)
   */
  async function aksi(action, data, o) {
    o = o || {};
    let undo = null;
    if (o.optimis) { undo = o.optimis(); if (undo) segarkan(); }
    if (o.btn) tombolMuat(o.btn, true, o.teksMuat);
    const r = await API.call(action, data, o.timeout ? { timeout: o.timeout } : undefined);
    if (o.btn) tombolMuat(o.btn, false);
    if (r.success) { if (!o.diam && r.message) toast(r.message); if (o.sukses) o.sukses(r); }
    else { if (undo) { undo(); segarkan(); } toast(r.message || 'Gagal menyimpan.', 'err', o.buka ? { aksi: { label: 'Buka lagi', fn: o.buka } } : null); if (o.gagal) o.gagal(r); }
    return r;
  }

  // ======================= LOGIN =======================
  function tampilLogin(pesan) {
    uiDibangun = false; S.siap = false;
    const darurat = location.hash === '#darurat';
    $('#root').innerHTML =
      '<div class="frame top"><header class="tophead"><a class="brand" href="index.html"><img src="assets/icons/logo.svg" alt=""><span><b>JuraganKos <em style="color:var(--violet);font-style:normal">OS</em></b></span></a><span class="grow"></span>' +
      '<a class="btn ghost sm" href="index.html">' + icon('back', 'sm') + ' Kembali ke Landing Page</a></header>' +
      '<main class="canvas"><div class="row wrap" style="padding-bottom:16px;border-bottom:2px solid var(--hair)"><span class="badge lime" style="padding:6px 16px;box-shadow:var(--sh-sm)">SSO Gateway</span><span class="muted">| Portal Autentikasi Google</span></div>' +
      '<div class="login-wrap"><div class="login-card">' +
      '<div class="login-ill">' + img3d('key', '', 'Kunci') + '<span class="lk">' + icon('lock', 'sm') + '</span></div>' +
      (darurat ? formDarurat() :
        '<h1 class="h-xl">Selamat Datang!</h1><p class="muted mt-s" style="font-size:15px">Masuk praktis dengan akun Google untuk mengakses hunian, keuangan, dan layanan kos.</p>' +
        '<div class="lbl mt-l" style="color:#111">Akses otomatis berdasarkan peran</div><div class="role-chips"><span class="tint-lime">' + icon('home', 'sm') + ' Penghuni</span><span class="tint-violet">' + icon('shield', 'sm') + ' Operator</span><span class="tint-yellow">' + icon('key', 'sm') + ' Owner Properti</span></div>' +
        (pesan ? '<div class="note warn mb" style="text-align:left">' + icon('info') + '<span>' + esc(pesan) + '</span></div>' : '') +
        '<div class="gbox" id="gbox"><span class="muted small">Memuat tombol Google…</span></div>' +
        '<p class="small muted mt">' + icon('shield', 'sm') + ' Login aman via Google — identitas diverifikasi di server, kata sandi tidak pernah kami simpan.</p>' +
        '<hr class="sep"><p class="small">Belum terdaftar? <a href="#" id="lg-wa" style="color:var(--violet-d);font-weight:800">Hubungi pengelola via WhatsApp ↗</a></p>') +
      '</div></div><div class="login-foot"><span>' + icon('db', 'sm') + ' Sistem aktif &amp; terhubung dengan database kos</span><span class="row"><button class="linkbtn" id="lg-pasang">Pasang aplikasi</button></span></div></main></div>';
    $('#lg-pasang').onclick = () => PWA.pasang();
    if (darurat) { pasangDarurat(); return; }
    API.warm('app');
    siapkanGoogle();
  }
  function formDarurat() {
    return '<h1 class="h-lg">Akses Darurat</h1><p class="muted small mt-s">Khusus Owner saat login Google belum dikonfigurasi. Kredensial ada di log setup Apps Script.</p>' +
      '<form id="f-dar" class="col mt" style="text-align:left" autocomplete="off"><div class="fld"><label for="d-u">Nama pengguna</label><input class="inp" id="d-u" autocomplete="username" required></div>' +
      '<div class="fld"><label for="d-p">Kata sandi</label><input class="inp" id="d-p" type="password" autocomplete="current-password" required></div><button class="btn block" id="d-btn">Masuk</button>' +
      '<a class="small muted" href="#" id="d-back" style="text-align:center">← Kembali ke login Google</a></form>';
  }
  function pasangDarurat() {
    $('#d-back').onclick = (e) => { e.preventDefault(); history.replaceState(null, '', location.pathname); tampilLogin(); };
    $('#f-dar').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#d-btn'); tombolMuat(btn, true, 'Memeriksa…');
      const r = await API.call('auth.darurat', { username: $('#d-u').value.trim(), password: $('#d-p').value });
      tombolMuat(btn, false);
      if (!r.success) return toast(r.message, 'err');
      $('#d-p').value = ''; history.replaceState(null, '', location.pathname + '#/pengaturan?tab=keamanan');
      masuk(r.data.token, r.data.me);
    };
  }
  async function siapkanGoogle() {
    let cfg = LS.get('jk_authcfg', null);
    const segar = API.call('auth.config', {}).then((r) => { if (r.success) { LS.set('jk_authcfg', r.data); return r.data; } if (r.code === 'CONFIG' || r.code === 'NET') { const g = $('#gbox'); if (g) g.innerHTML = '<span class="small" style="color:var(--danger)">' + esc(r.message) + '</span>'; } return null; });
    if (!cfg || !cfg.googleClientId) cfg = await segar;
    const wa = $('#lg-wa');
    if (wa) wa.onclick = (e) => { e.preventDefault(); const n = cfg && cfg.waAdmin; if (n) w.open(JK.waLink(n, 'Halo, saya ingin didaftarkan ke portal penghuni.'), '_blank'); else toast('Nomor WA admin belum diatur.', 'err'); };
    if (!cfg) return;
    if (!cfg.googleClientId) { $('#gbox').innerHTML = '<div class="small" style="text-align:left">' + icon('info', 'sm') + ' Login Google belum dikonfigurasi. <b>Owner:</b> buka <code>app.html#darurat</code>, masuk dengan kredensial dari log setup, lalu isi Google Client ID di Pengaturan → Keamanan.</div>'; return; }
    await muatGsi();
    try {
      google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: onKredensial, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup', itp_support: true });
      const box = $('#gbox'); box.innerHTML = '';
      google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width: Math.max(200, Math.min(340, box.clientWidth - 30)), locale: 'id' });
    } catch (e) { $('#gbox').innerHTML = '<span class="small" style="color:var(--danger)">Tombol Google gagal dimuat: ' + esc(e.message) + '</span>'; }
  }
  function muatGsi() {
    if (w.google && w.google.accounts && w.google.accounts.id) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = () => rej(new Error('Tidak bisa memuat Google Sign-In (periksa koneksi).')); document.head.appendChild(s); })
      .catch((e) => { const g = $('#gbox'); if (g) g.innerHTML = '<span class="small" style="color:var(--danger)">' + esc(e.message) + '</span>'; throw e; });
  }
  async function onKredensial(resp) {
    const box = $('#gbox'); if (box) box.innerHTML = '<span class="row small"><span class="spin" style="width:18px;height:18px;border:2px solid #111;border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span> Memverifikasi akun…</span>';
    const r = await API.call('auth.google', { credential: resp.credential, appUrl: location.href.split('#')[0] });
    if (!r.success) { toast(r.message, 'err'); tampilLogin(r.message); return; }
    try { const p = JSON.parse(atob(resp.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); r.data.me.foto = p.picture; } catch (e) { }
    masuk(r.data.token, r.data.me);
  }
  function masuk(token, me) {
    simpanSesi(token, me);
    const ada = S.pulihkan();
    S.siap = ada;
    uiDibangun = false; render();
    toast(sapaan() + ', ' + String(me.nama || '').split(' ')[0] + '! 👋');
    sinkron(); loopSinkron();
  }

  // ======================= MULAI =======================
  function mulai() {
    Aktivitas.init();
    w.addEventListener('hashchange', () => { if (location.hash === '#darurat') { if (!S.me) tampilLogin(); return; } if (S.me) render(); });
    if (!API.ok) { tampilLogin('Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Web App Apps Script.'); return; }
    const ses = LS.get(SESI_KEY, null);
    if (!ses || !ses.token || location.hash === '#darurat') { tampilLogin(); return; }
    API.token = ses.token; S.me = ses.me;
    S.siap = S.pulihkan();                     // tampil INSTAN dari data lokal
    render();
    sinkron();                                 // lalu segarkan dari server (hanya tabel yang berubah)
    loopSinkron();
    PWA.on(() => { if (S.me) perbaruiNav(); });
  }

  w.App = { S, D, V, mulai, render, segarkan, ke, aksi, sinkron, keluar, viewState, perbaruiNav, OW, OP, PH };
})(window);
