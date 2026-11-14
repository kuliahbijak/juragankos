/* ==========================================================================
   JuraganKos OS — v-staf.js  (Owner & Operator, bagian 1)
   Dashboard · Kamar · Penghuni · Tagihan · Keuangan · Komplain
   ========================================================================== */
(function (w) {
  'use strict';
  const { $, esc, rp, rpK, icon, img3d, toast, modal, konfirmasi, tombolMuat, inisial, tgl, tglJam, periodeNama, selisihHari, tambahBulan, hp08, hpValid, emailValid, waLink, BLS, API, bacaBerkas, unduhBase64 } = JK;
  const { S, D, aksi, ke } = App;
  const V = App.V;

  // ======================= UTIL BERSAMA =======================
  const U = V.util = {
    delegasi(el, acts) {
      el.onclick = (e) => { const a = e.target.closest('[data-act]'); if (a && el.contains(a) && acts[a.dataset.act]) { e.preventDefault(); acts[a.dataset.act](a.dataset, a, e); } };
      el.oninput = (e) => { const t = e.target; if (t.dataset.in && acts[t.dataset.in]) acts[t.dataset.in](t.value, t, e); };
      el.onchange = (e) => { const t = e.target; if (t.dataset.ch && acts[t.dataset.ch]) acts[t.dataset.ch](t.type === 'checkbox' ? t.checked : t.value, t, e); };
    },
    opsi(list, val, kosong) { return (kosong !== undefined ? '<option value="">' + esc(kosong) + '</option>' : '') + list.map((o) => { const v = typeof o === 'object' ? o[0] : o, l = typeof o === 'object' ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); },
    seg(nama, list, val) { return '<div class="seg" role="group">' + list.map((o) => { const v = typeof o === 'object' ? o[0] : o, l = typeof o === 'object' ? o[1] : o; return '<button type="button" data-act="' + nama + '" data-v="' + esc(v) + '" aria-pressed="' + (String(v) === String(val)) + '">' + l + '</button>'; }).join('') + '</div>'; },
    tabs(list, val) { return '<div class="tabs" role="tablist">' + list.map((t) => '<button type="button" role="tab" data-act="tab" data-v="' + t[0] + '" class="' + (t[0] === val ? 'on' : '') + '" aria-selected="' + (t[0] === val) + '">' + t[1] + (t[2] ? '<span class="cnt">' + t[2] + '</span>' : '') + '</button>').join('') + '</div>'; },
    cari(id, val, ph) { return '<label class="search"><span class="sr-only">Cari</span>' + icon('search', 'sm') + '<input class="inp" id="' + id + '" data-in="cari" value="' + esc(val || '') + '" placeholder="' + esc(ph || 'Cari…') + '" autocomplete="off"></label>'; },
    /** cols: [{k,label,v(r)→html,cls,sort}] */
    tabel(cols, rows, o) {
      o = o || {};
      if (!rows.length) return '<div class="tbl-wrap"><div class="empty">' + img3d(o.ilus || 'clipboard') + '<b>' + esc(o.kosong || 'Belum ada data') + '</b>' + esc(o.kosongSub || '') + '</div></div>';
      const per = o.per || 50, hal = Math.min(o.hal || 1, Math.ceil(rows.length / per)), irisan = rows.slice((hal - 1) * per, hal * per);
      return '<div class="tbl-wrap cards"><table class="tbl"><thead><tr>' + cols.map((c) => '<th class="' + (c.cls || '') + '">' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>' +
        irisan.map((r) => '<tr class="' + (r._pending ? 'pending' : '') + '">' + cols.map((c) => '<td class="' + (c.cls || '') + '" data-l="' + esc(c.label) + '">' + (c.v ? c.v(r) : esc(r[c.k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
        (rows.length > per ? '<div class="pager"><span>' + ((hal - 1) * per + 1) + '–' + Math.min(hal * per, rows.length) + ' dari ' + rows.length + '</span><span class="row"><button class="btn xs ghost" data-act="hal" data-v="' + (hal - 1) + '"' + (hal <= 1 ? ' disabled' : '') + '>' + icon('left', 'sm') + '</button><span class="num">' + hal + '/' + Math.ceil(rows.length / per) + '</span><button class="btn xs ghost" data-act="hal" data-v="' + (hal + 1) + '"' + (hal * per >= rows.length ? ' disabled' : '') + '>' + icon('right', 'sm') + '</button></span></div>' : '');
    },
    nilai(m, ids) { const o = {}; ids.forEach((id) => { const el = m.$('#' + id); if (el) o[id.replace(/^[a-z]{1,2}-/, '')] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); return o; },
    fld(id, label, input, cls, hint) { return '<div class="fld ' + (cls || '') + '"><label for="' + id + '">' + label + '</label>' + input + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>'; },
    inp(id, val, attr) { return '<input class="inp" id="' + id + '" value="' + esc(val == null ? '' : val) + '" ' + (attr || '') + '>'; },
    sel(id, opsiHtml, attr) { return '<select class="inp" id="' + id + '" ' + (attr || '') + '>' + opsiHtml + '</select>'; },
    ta(id, val, attr) { return '<textarea class="inp" id="' + id + '" ' + (attr || '') + '>' + esc(val || '') + '</textarea>'; },
    avatar(nama) { return '<span class="avatar">' + esc(inisial(nama)) + '</span>'; },
    cocok(q, ...teks) { q = String(q || '').toLowerCase().trim(); return !q || teks.some((t) => String(t || '').toLowerCase().indexOf(q) > -1); },
    page(judul, sub, kanan) { return '<div class="page-h"><div><h1 class="h-lg">' + judul + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (kanan ? '<div class="row wrap">' + kanan + '</div>' : '') + '</div>'; },
    /** Kotak unggah berkas dengan pratinjau; mengembalikan getter berkas terpilih */
    dropzone(m, id, ket) {
      const box = m.$('#' + id); let berkas = null;
      box.innerHTML = '<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden>' + icon('upload', 'lg') + '<div class="b mt-s">' + esc(ket || 'Ketuk untuk pilih foto/PDF') + '</div><div class="xs muted">JPG/PNG/PDF maks 5 MB · foto dikompres otomatis</div><div class="pv"></div>';
      const inp = box.querySelector('input');
      box.onclick = (e) => { if (e.target !== inp) inp.click(); };
      box.ondragover = (e) => { e.preventDefault(); box.classList.add('over'); }; box.ondragleave = () => box.classList.remove('over');
      box.ondrop = (e) => { e.preventDefault(); box.classList.remove('over'); if (e.dataTransfer.files[0]) pilih(e.dataTransfer.files[0]); };
      inp.onchange = () => inp.files[0] && pilih(inp.files[0]);
      async function pilih(f) {
        try { berkas = await bacaBerkas(f); box.querySelector('.pv').innerHTML = berkas.pratinjau ? '<img src="' + berkas.pratinjau + '" alt="Pratinjau">' : '<div class="chip mt-s">📄 ' + esc(f.name) + '</div>'; box.querySelector('.b').textContent = 'Berkas siap (' + Math.round(berkas.ukuran / 1024) + ' KB) — ketuk untuk ganti'; }
        catch (e) { berkas = null; toast(e.message, 'err'); }
      }
      return () => berkas && { data: berkas.data, mime: berkas.mime, nama: berkas.nama };
    },
    async lihatBerkas(id, judul) {
      const m = modal({ title: judul || 'Bukti', size: 'lg', body: '<div class="lightbox"><div class="sk" style="height:320px"></div></div>' });
      const r = await API.call('berkas.lihat', { id });
      if (!r.success) { m.body.innerHTML = '<div class="note bad">' + esc(r.message) + '</div>'; return; }
      m.body.innerHTML = /pdf/.test(r.data.mime) ? '<div class="empty">' + img3d('memo') + '<b>Berkas PDF</b><button class="btn mt" id="dl-pdf">' + icon('download') + ' Unduh PDF</button></div>' : '<div class="lightbox"><img src="data:' + r.data.mime + ';base64,' + r.data.data + '" alt="' + esc(judul || 'Bukti') + '"></div>';
      const b = m.$('#dl-pdf'); if (b) b.onclick = () => unduhBase64(r.data.data, r.data.mime, r.data.nama);
    },
    pesanTagihan(t) { const p = D.penghuni(t.ID_Penghuni); return 'Halo ' + (p.Nama || '') + ', pengingat tagihan *' + t.Jenis + ' ' + periodeNama(t.Periode) + '* sebesar *' + rp(t.Nominal) + '* jatuh tempo ' + tgl(t.Jatuh_Tempo) + '. Unggah bukti bayar di portal: ' + location.href.split('#')[0] + ' 🙏'; },
    ekspor(btnWrapAct) { return '<button class="btn sm" data-act="' + btnWrapAct + '" data-v="xlsx">' + icon('download', 'sm') + ' Unduh Excel</button><button class="btn sm" data-act="' + btnWrapAct + '" data-v="pdf">' + icon('download', 'sm') + ' Unduh PDF</button>'; }
  };
  const ilusKamar = (k) => '<div class="tile3d ' + D.tile(k.Status) + '">' + img3d(D.ilus(k)) + '</div>';
  function kartuKamar(k) {
    const t = D.tipe(k.ID_Tipe), p = k.ID_Penghuni_Aktif ? D.penghuni(k.ID_Penghuni_Aktif) : null;
    const fas = String(t.Fasilitas || '').split(/[,;•]+/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
    return '<button class="kcard' + (k._pending ? ' pending' : '') + '" data-act="kamar" data-id="' + esc(k.ID_Kamar) + '"><div>' + D.badgeKamar(k.Status) + '<h3>Kamar ' + esc(t.Kelas || '') + ' ' + esc(k.No_Kamar) + '</h3><div class="harga">' + esc(D.hargaKamar(k)) + '</div></div>' + ilusKamar(k) +
      (fas.length ? '<div class="chips">' + fas.map((f) => '<span class="chip">' + esc(f) + '</span>').join('') + '</div>' : '') +
      (p ? '<div class="who">' + icon('user', 'sm') + esc(p.Nama) + '</div>' : k.Status === 'Renovasi' && k.Catatan ? '<div class="who" style="color:#a1191e">' + icon('tool', 'sm') + esc(k.Catatan) + '</div>' : '') + '</button>';
  }

  // ======================= DASHBOARD =======================
  V.staf = V.staf || {};
  V.staf.dashboard = { judul: 'Dashboard', tabel: null, cta: { label: 'Tambah Kamar', fn: () => formKamar() },
    render(el, q, st) {
      const me = S.me, owner = D.owner(), kam = D.kamarList(), total = kam.length;
      const terisi = kam.filter((k) => k.Status === 'Terisi').length, kosong = kam.filter((k) => k.Status === 'Kosong').length;
      const okup = total ? Math.round(terisi * 100 / total) : 0, per = D.periode(), kas = D.arusKas(per), pt = D.perluTindakan();
      const tagAktif = S.rows('Tagihan');
      const jt = tagAktif.filter((t) => t.Status !== 'Lunas' && t.Status !== 'Menunggu Validasi' && t.Jatuh_Tempo && selisihHari(t.Jatuh_Tempo, D.hari()) <= 7).length;
      const tunggak = tagAktif.filter((t) => D.stTag(t) === 'Telat').reduce((s, t) => s + Number(t.Nominal || 0), 0);
      const komAktif = S.rows('Komplain').filter((k) => k.Status !== 'Selesai').length;
      const stats = owner
        ? [['yellow', 'moneybag', rpK(kas.masuk), 'Omzet ' + BLS[Number(per.slice(5)) - 1], 'keuangan'], ['lime', 'key', okup + '%', 'Okupansi', 'kamar'], ['orange', 'chart', rpK(kas.laba), 'Laba bersih', 'keuangan'], ['violet', 'hourglass', rpK(tunggak), 'Tunggakan', 'tagihan?status=Telat']]
        : [['yellow', 'bed', terisi, 'Kamar terisi', 'kamar?f=Terisi'], ['lime', 'key', kosong, 'Kamar kosong', 'kamar?f=Kosong'], ['orange', 'calendar', jt, 'Jatuh tempo ≤7 hr', 'tagihan'], ['violet', 'tools', komAktif, 'Komplain aktif', 'komplain']];
      const f = st.f || 'Semua', pilihan = kam.filter((k) => f === 'Semua' || k.Status === f).slice(0, 4);
      el.innerHTML =
        '<div class="greet"><div><h1>' + JK.sapaan() + ',<br>' + esc(String(me.nama || 'Juragan').split(' ')[0]) + '!</h1><div class="sub">Okupansi bulan ini <b>' + okup + '%</b> <span>• ' + terisi + ' dari ' + total + ' kamar terisi</span> <span style="color:#F28C28">' + icon('zap', 'sm') + '</span></div></div>' +
        '<div class="stats">' + stats.map((s) => '<button class="stat tint-' + s[0] + '" data-act="ke" data-v="' + s[4] + '"><span class="ic3">' + img3d(s[1]) + '</span><span><b>' + esc(s[2]) + '</b><span>' + esc(s[3]) + '</span></span></button>').join('') + '</div></div>' +
        (S.me.darurat ? '<div class="note warn mb">' + icon('alert') + '<div><b>Anda masuk dengan akses darurat.</b> Isi Google Client ID & ganti sandi darurat di <a href="#/pengaturan?tab=keamanan">Pengaturan → Keamanan</a>.</div></div>' : '') +
        '<div class="dash"><div><div class="sec-lbl">Tugas prioritas hari ini</div>' + prioritas(pt) +
        '<div class="row between wrap mt-l mb"><h2 class="h-md">Status Kamar Pilihan</h2>' + U.seg('f', ['Semua', 'Kosong', 'Terisi', 'Renovasi'], f) + '</div>' +
        (pilihan.length ? '<div class="kgrid">' + pilihan.map(kartuKamar).join('') + '</div>' : '<div class="card empty">' + img3d('door') + '<b>Belum ada kamar ' + (f === 'Semua' ? '' : f.toLowerCase()) + '</b><button class="btn sm mt" data-act="tambahKamar">' + icon('plus', 'sm') + ' Tambah kamar</button></div>') +
        '<a class="seeall" href="#/kamar">Lihat Semua ' + total + ' Kamar ↗</a></div>' +
        '<div class="side-col">' + kartuStreak() + banner(pt) + '</div></div>';
      U.delegasi(el, {
        f: (d) => { st.f = d.v; App.render(); }, ke: (d) => ke(d.v.split('?')[0], Object.fromEntries(new URLSearchParams(d.v.split('?')[1] || ''))),
        kamar: (d) => detailKamar(d.id), tambahKamar: () => formKamar(), validasi: () => ke('tagihan', { tab: 'validasi' }), komplain: () => ke('komplain'),
        telat: () => ke('tagihan', { status: 'Telat' }), approval: () => ke('keuangan', { tab: 'persetujuan' }), prospek: () => ke('penghuni', { tab: 'prospek' }),
        generate: () => generateTagihan(), laporan: () => ke('laporan'), salinLink: () => JK.salin(location.href.split('app.html')[0] + 'index.html'),
        ingatkan: (d) => { const t = S.by('Tagihan', d.id); if (t) w.open(waLink(D.penghuni(t.ID_Penghuni).No_WA, U.pesanTagihan(t)), '_blank'); }
      });
    }
  };
  function prioritas(pt) {
    const per = D.periode(), tagBln = S.rows('Tagihan').filter((t) => t.Periode === per), lunas = tagBln.filter((t) => t.Status === 'Lunas').length;
    const pct = tagBln.length ? Math.round(lunas * 100 / tagBln.length) : 0;
    let badge, judul, tombol, act, ilus = 'key', blob = '', ekstra = '';
    const tunggu = S.rows('Pembayaran').filter((b) => b.Status_Validasi === 'Menunggu').sort((a, b) => String(a.Dibuat).localeCompare(String(b.Dibuat)));
    if (tunggu.length) {
      const b = tunggu[0], t = S.by('Tagihan', b.ID_Tagihan) || {}, p = D.penghuni(b.ID_Penghuni), k = D.kamar(t.ID_Kamar || p.ID_Kamar);
      badge = 'Tagihan perlu validasi' + (tunggu.length > 1 ? ' (' + tunggu.length + ')' : ''); judul = 'Validasi ' + (t.Jenis || 'Sewa') + ' Kamar ' + (k.No_Kamar || '-') + ' — ' + (p.Nama || '-'); tombol = 'Validasi Sekarang'; act = 'validasi'; ilus = 'moneybag';
    } else if (pt.komplain) {
      const k = S.rows('Komplain').filter((x) => x.Status === 'Baru').sort((a, b) => ['Darurat', 'Tinggi', 'Sedang', 'Rendah'].indexOf(a.Prioritas) - ['Darurat', 'Tinggi', 'Sedang', 'Rendah'].indexOf(b.Prioritas))[0];
      badge = 'Komplain baru · ' + k.Prioritas; judul = 'Tangani: ' + k.Judul + ' — Kamar ' + (D.kamar(k.ID_Kamar).No_Kamar || '-'); tombol = 'Tangani Sekarang'; act = 'komplain'; ilus = 'tools'; blob = ' violet';
    } else if (pt.telat) {
      const t = S.rows('Tagihan').filter((x) => D.stTag(x) === 'Telat')[0];
      badge = 'Tagihan telat'; judul = pt.telat + ' tagihan lewat jatuh tempo — kirim pengingat'; tombol = 'Lihat Tagihan Telat'; act = 'telat'; ilus = 'hourglass';
      ekstra = '<button class="roundbtn y" data-act="ingatkan" data-id="' + esc(t.ID_Tagihan) + '" title="Kirim pengingat WA ke ' + esc(D.penghuni(t.ID_Penghuni).Nama || '') + '" aria-label="Kirim pengingat WhatsApp">' + icon('bell', 'sm') + '</button>';
    } else if (pt.approval) { badge = 'Persetujuan owner'; judul = pt.approval + ' pengajuan pengeluaran menunggu keputusan'; tombol = 'Tinjau'; act = 'approval'; ilus = 'moneybag'; }
    else if (!S.rows('Tagihan').some((t) => t.Periode === per && t.Jenis === 'Sewa') && S.rows('Penghuni').some((p) => p.Status === 'Aktif')) { badge = 'Awal bulan'; judul = 'Buat tagihan sewa ' + periodeNama(per); tombol = 'Buat Tagihan'; act = 'generate'; ilus = 'receipt'; }
    else { badge = 'Semua beres'; judul = 'Tidak ada tugas mendesak. Mantap, Juragan! 🎉'; tombol = 'Lihat Laporan'; act = 'laporan'; ilus = 'party'; blob = ' violet'; }
    return '<div class="prio"><div class="blob' + blob + '">' + img3d(ilus) + '</div><div><span class="badge violet"><span class="dot"></span>' + esc(badge) + '</span><h2>' + esc(judul) + '</h2>' +
      '<div class="row small muted" style="align-items:flex-end"><span>' + lunas + ' dari ' + tagBln.length + ' tagihan bulan ini lunas</span><b class="num" style="color:#111">' + pct + '%</b></div><div class="prog mt-s" style="max-width:240px"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="acts"><div class="row">' + ekstra + '<button class="roundbtn" data-act="ke" data-v="tagihan" aria-label="Lihat semua tagihan">' + icon('more', 'sm') + '</button></div><button class="btn" data-act="' + act + '">' + esc(tombol) + '</button></div></div>';
  }
  function kartuStreak() {
    const bulan = D.bulanTerakhir(7);
    let ok = 0, n = 0, beruntun = 0, putus = false;
    const bul = bulan.map((p) => { const r = D.tepatWaktu(p); if (r) { ok += r.ok; n += r.n; } return { p, r }; });
    for (let i = bul.length - 1; i >= 0; i--) { const r = bul[i].r; if (!r) continue; if (r.lunas === r.n && !putus) beruntun++; else putus = true; }
    const pct = n ? Math.round(ok * 100 / n) : 0;
    const tipe = S.rows('Tipe_Kamar'), kam = D.kamarList();
    const per = D.periode(), tagBln = S.rows('Tagihan').filter((t) => t.Periode === per), totT = tagBln.reduce((s, t) => s + Number(t.Nominal || 0), 0), lunT = tagBln.filter((t) => t.Status === 'Lunas').reduce((s, t) => s + Number(t.Nominal || 0), 0);
    const kmp = S.rows('Komplain').filter((k) => String(k.Dibuat).slice(0, 7) === per), kmpS = kmp.filter((k) => k.Status === 'Selesai').length;
    const bar = (l, a, b, pctv) => '<div class="prog-row"><div class="t"><span>' + esc(l) + '</span><span>' + a + ' (' + pctv + '%)</span></div><div class="prog"><i style="width:' + pctv + '%"></i></div></div>';
    return '<div class="card float streak-card pad-lg"><div class="row between top"><div><h3>Streak Pembayaran Tepat Waktu</h3><p class="small muted mt-s">' + (beruntun ? beruntun + ' bulan berturut-turut nihil tunggakan' : 'Belum ada bulan tanpa tunggakan') + '</p></div><span class="badge lime" style="font-size:14px;padding:6px 12px">' + icon('zap', 'sm') + ' ' + pct + '%</span></div>' +
      '<div class="streak mt">' + bul.map((x) => { const r = x.r, cls = !r ? 'off' : r.lunas === r.n ? 'on' : r.lunas ? 'half' : 'off'; return '<div class="d" title="' + esc(periodeNama(x.p) + (r ? ': ' + r.lunas + '/' + r.n + ' lunas' : ': belum ada tagihan')) + '"><span class="o ' + cls + '">' + (r ? icon('zap') : '–') + '</span>' + BLS[Number(x.p.slice(5)) - 1] + '</div>'; }).join('') + '</div>' +
      '<div class="col mt-l" style="gap:16px">' + tipe.slice(0, 3).map((t) => { const ks = kam.filter((k) => k.ID_Tipe === t.ID_Tipe), is = ks.filter((k) => k.Status === 'Terisi').length; return ks.length ? bar('Tipe ' + t.Nama_Tipe + (t.Lantai ? ' (' + t.Lantai + ')' : ''), is + '/' + ks.length + ' kamar', 0, Math.round(is * 100 / ks.length)) : ''; }).join('') +
      bar('Tagihan lunas bulan ini', rpK(lunT) + ' / ' + rpK(totT), 0, totT ? Math.round(lunT * 100 / totT) : 0) +
      bar('Penyelesaian tiket komplain', kmpS + '/' + kmp.length + ' tuntas', 0, kmp.length ? Math.round(kmpS * 100 / kmp.length) : 100) + '</div>' +
      '<a class="seeall" style="text-align:left" href="#/laporan">Lihat rincian keuangan &amp; laporan ›</a></div>';
  }
  function banner(pt) {
    if (D.owner() && pt.approval) {
      const g = S.rows('Pengeluaran').filter((x) => x.Status_Approval === 'Menunggu'), tot = g.reduce((s, x) => s + Number(x.Nominal || 0), 0);
      return '<div class="banner"><span class="lbl"><i></i>Perhatian owner</span><h3>Ada ' + g.length + ' pengeluaran baru perlu persetujuan Owner!</h3><p>Total pengajuan ' + rp(tot) + '.</p><div class="chips mt-s">' + g.slice(0, 4).map((x) => '<span class="chip">' + icon('zap', 'sm') + esc(x.Kategori) + ' (' + rpK(x.Nominal) + ')</span>').join('') + '</div><button class="btn" data-act="approval">Tinjau Sekarang ' + icon('arrow', 'sm') + '</button></div>';
    }
    if (pt.prospek) return '<div class="banner"><span class="lbl"><i></i>Calon penghuni</span><h3>' + pt.prospek + ' calon penghuni minta dihubungi</h3><p>Dari formulir "Minta Dihubungi" di landing page. Segera follow-up via WhatsApp.</p><button class="btn" data-act="prospek">Hubungi Sekarang ' + icon('arrow', 'sm') + '</button></div>';
    return '<div class="banner"><span class="lbl"><i></i>Promosi</span><h3>Bagikan landing page untuk mengisi kamar kosong</h3><p>Ketersediaan kamar di landing page selalu sinkron otomatis dengan data di sini.</p><div class="row wrap"><a class="btn" href="index.html" target="_blank">Buka Landing ' + icon('ext', 'sm') + '</a><button class="btn ghost" data-act="salinLink">' + icon('copy', 'sm') + ' Salin link</button></div></div>';
  }

  // ======================= KAMAR =======================
  V.staf.kamar = { judul: 'Kamar', tabel: ['Kamar', 'Tipe_Kamar', 'Properti', 'Penghuni'], cta: { label: 'Tambah Kamar', fn: () => formKamar() },
    render(el, q, st) {
      const tab = q.tab || 'kamar', f = q.f || st.f || 'Semua';
      const kam = D.kamarList(), cnt = (s) => kam.filter((k) => s === 'Semua' || k.Status === s).length;
      let isi = '';
      if (tab === 'kamar') {
        const list = kam.filter((k) => (f === 'Semua' || k.Status === f) && (!st.tipe || k.ID_Tipe === st.tipe) && U.cocok(st.q, k.No_Kamar, D.tipe(k.ID_Tipe).Nama_Tipe, k.ID_Penghuni_Aktif && D.penghuni(k.ID_Penghuni_Aktif).Nama))
          .sort((a, b) => String(a.No_Kamar).localeCompare(String(b.No_Kamar), 'id', { numeric: true }));
        isi = '<div class="toolbar">' + U.seg('f', ['Semua', 'Kosong', 'Terisi', 'Renovasi'].map((s) => [s, s + ' <span class="cnt">' + cnt(s) + '</span>']), f) +
          '<select class="inp pill" style="width:auto" data-ch="tipe" aria-label="Filter tipe">' + U.opsi(S.rows('Tipe_Kamar').map((t) => [t.ID_Tipe, t.Nama_Tipe]), st.tipe, 'Semua tipe') + '</select>' + U.cari('q-kamar', st.q, 'Cari no. kamar / penghuni') + '</div>' +
          (list.length ? '<div class="kgrid wide">' + list.map(kartuKamar).join('') + '</div>' : '<div class="card empty">' + img3d('door') + '<b>Tidak ada kamar</b>' + (S.rows('Tipe_Kamar').length ? 'Tambah kamar baru atau ubah filter.' : 'Buat tipe kamar terlebih dahulu.') + '</div>');
      } else if (tab === 'tipe') {
        const tipe = S.rows('Tipe_Kamar').slice().sort((a, b) => (a.Urutan || 99) - (b.Urutan || 99));
        isi = '<div class="toolbar"><span class="muted small">Tipe kamar tampil di landing page (etalase & harga).</span><span class="sp"></span><button class="btn sm" data-act="tambahTipe">' + icon('plus', 'sm') + ' Tipe baru</button></div>' +
          (tipe.length ? '<div class="g3">' + tipe.map((t) => {
            const ks = S.rows('Kamar').filter((k) => k.ID_Tipe === t.ID_Tipe), fotos = String(t.Foto_URL || '').split(/[\n,|]+/).filter(Boolean);
            return '<div class="card float' + (t._pending ? ' pending' : '') + '"><div class="row between"><span class="badge ' + (t.Kelas === 'VIP' ? 'yellow' : t.Kelas === 'Eksklusif' ? 'orange' : 'violet') + '">' + esc(t.Kelas || 'Standar') + '</span>' + (t.Tampil === 'TIDAK' ? '<span class="badge mute">Disembunyikan</span>' : '') + '</div>' +
              '<h3 class="h-md mt-s">' + esc(t.Nama_Tipe) + '</h3><div class="small muted">' + [t.Lantai, t.Ukuran, ks.length + ' kamar · ' + ks.filter((k) => k.Status === 'Kosong').length + ' kosong'].filter(Boolean).map(esc).join(' • ') + '</div>' +
              '<div class="g3 mt" style="gap:8px">' + [['Harian', t.Harga_Harian], ['Bulanan', t.Harga_Bulanan], ['Tahunan', t.Harga_Tahunan]].map((h) => '<div><div class="lbl">' + h[0] + '</div><div class="num small">' + (h[1] ? rpK(h[1]) : '-') + '</div></div>').join('') + '</div>' +
              '<p class="small mt-s">' + esc(t.Fasilitas || '') + '</p><div class="row wrap mt-s" style="gap:6px">' + fotos.slice(0, 4).map((u) => '<span class="chip">📷</span>').join('') + '<span class="xs muted">' + fotos.length + ' foto</span></div>' +
              '<div class="row wrap mt"><button class="btn xs ghost" data-act="ubahTipe" data-id="' + esc(t.ID_Tipe) + '">' + icon('edit', 'sm') + ' Ubah</button><button class="btn xs ghost" data-act="fotoTipe" data-id="' + esc(t.ID_Tipe) + '">' + icon('image', 'sm') + ' Foto</button>' + (D.owner() ? '<button class="btn xs danger" data-act="hapusTipe" data-id="' + esc(t.ID_Tipe) + '">' + icon('trash', 'sm') + '</button>' : '') + '</div></div>';
          }).join('') + '</div>' : '<div class="card empty">' + img3d('bed') + '<b>Belum ada tipe kamar</b>Buat tipe (mis. Standar, VIP) beserta harga.</div>');
      } else {
        isi = '<div class="toolbar"><span class="muted small">Data properti/cabang (alamat, koordinat peta, WA admin).</span><span class="sp"></span>' + (D.owner() ? '<button class="btn sm" data-act="tambahProp">' + icon('plus', 'sm') + ' Cabang baru</button>' : '') + '</div><div class="g2">' +
          S.rows('Properti').map((p) => '<div class="card float"><div class="row"><div class="tile3d violet" style="width:56px;border:2px solid #111;border-radius:14px">' + img3d('building') + '</div><div class="grow"><h3 class="h-sm">' + esc(p.Nama) + '</h3><div class="small muted">' + esc(p.Alamat || '-') + '</div></div></div>' +
            '<div class="small mt">' + icon('pin', 'sm') + ' ' + esc(p.Koordinat_Maps || '-') + ' &nbsp; ' + icon('wa', 'sm') + ' ' + esc(p.No_WA_Admin || '-') + '</div>' + (D.owner() ? '<button class="btn xs ghost mt" data-act="ubahProp" data-id="' + esc(p.ID_Properti) + '">' + icon('edit', 'sm') + ' Ubah</button>' : '') + '</div>').join('') + '</div>';
      }
      el.innerHTML = U.page('Kamar & Properti', kam.length + ' kamar · ' + cnt('Kosong') + ' kosong · ' + cnt('Renovasi') + ' renovasi') + U.tabs([['kamar', 'Kamar'], ['tipe', 'Tipe Kamar'], ['properti', 'Properti']], tab) + isi;
      U.delegasi(el, {
        tab: (d) => ke('kamar', { tab: d.v }), f: (d) => { st.f = d.v; ke('kamar', { f: d.v }); }, tipe: (v) => { st.tipe = v; App.render(); }, cari: (v) => { st.q = v; App.render(); },
        kamar: (d) => detailKamar(d.id), tambahTipe: () => formTipe(), ubahTipe: (d) => formTipe(S.by('Tipe_Kamar', d.id)), fotoTipe: (d) => fotoTipe(d.id),
        hapusTipe: async (d) => { if (await konfirmasi('Hapus tipe ini? Hanya bisa bila tidak ada kamar yang memakainya.', { bahaya: true, ok: 'Hapus' })) aksi('tipe.hapus', { ID_Tipe: d.id }, { optimis: () => S.buang('Tipe_Kamar', d.id) }); },
        tambahProp: () => formProperti(), ubahProp: (d) => formProperti(S.by('Properti', d.id))
      });
    }
  };
  function detailKamar(id) {
    const k = S.by('Kamar', id); if (!k) return;
    const t = D.tipe(k.ID_Tipe), p = k.ID_Penghuni_Aktif ? D.penghuni(k.ID_Penghuni_Aktif) : null, tg = p ? D.tunggakan(p.ID_Penghuni) : null;
    const m = modal({ side: true, title: 'Kamar ' + k.No_Kamar, body:
      '<div class="row">' + '<div style="width:110px">' + ilusKamar(k) + '</div><div>' + D.badgeKamar(k.Status) + '<h3 class="h-md mt-s">' + esc(t.Nama_Tipe || '-') + '</h3><div class="small muted">' + esc(D.hargaKamar(k)) + (k.Lantai ? ' · Lantai ' + esc(k.Lantai) : '') + '</div></div></div>' +
      '<p class="small mt">' + esc(t.Fasilitas || '') + '</p>' + (k.Catatan ? '<div class="note mt">' + icon('info') + '<span>' + esc(k.Catatan) + '</span></div>' : '') +
      (p ? '<hr class="sep"><div class="lbl">Penghuni aktif</div><div class="list-item mt-s">' + U.avatar(p.Nama) + '<div class="grow"><div class="t">' + esc(p.Nama) + '</div><div class="s">Masuk ' + tgl(p.Tgl_Masuk) + (p.Tgl_Kontrak_Berakhir ? ' · s.d. ' + tgl(p.Tgl_Kontrak_Berakhir) : '') + '</div></div>' + (tg.n ? '<span class="badge bad">' + tg.n + ' tunggakan</span>' : '<span class="badge ok">Lancar</span>') + '</div>' : '') +
      '<hr class="sep"><div class="col">' +
      (p ? '<button class="btn block" data-a="penghuni">' + icon('user') + ' Detail penghuni</button>' + (p.No_WA ? '<a class="btn ghost block" target="_blank" href="' + waLink(p.No_WA, 'Halo ' + p.Nama + ',') + '">' + icon('wa') + ' Chat WhatsApp</a>' : '') + '<button class="btn ghost block" data-a="meter">' + icon('zap') + ' Catat meteran listrik</button>'
        : (k.Status === 'Kosong' ? '<button class="btn lime block" data-a="isi">' + icon('plus') + ' Isi penghuni baru</button><button class="btn ghost block" data-a="renov">' + icon('tool') + ' Tandai renovasi</button>' : '<button class="btn lime block" data-a="kosong">' + icon('check') + ' Selesai renovasi → Kosong</button>')) +
      '<button class="btn ghost block" data-a="ubah">' + icon('edit') + ' Ubah data kamar</button>' + (!p ? '<button class="btn danger block" data-a="hapus">' + icon('trash') + ' Hapus kamar</button>' : '') + '</div>' });
    m.el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const v = a.dataset.a;
      if (v === 'penghuni') { m.close(); detailPenghuni(p.ID_Penghuni); }
      if (v === 'meter') { m.close(); ke('tagihan', { tab: 'meteran' }); }
      if (v === 'isi') { m.close(); formPenghuni(null, { ID_Kamar: k.ID_Kamar }); }
      if (v === 'ubah') { m.close(); formKamar(k); }
      if (v === 'renov' || v === 'kosong') {
        const cat = v === 'renov' ? await konfirmasi('Tandai kamar ' + k.No_Kamar + ' sedang renovasi?', { input: 'Catatan (mis. pengecatan & pasang AC)' }) : true;
        if (cat === null || cat === false) return;
        m.close(); const st = v === 'renov' ? 'Renovasi' : 'Kosong';
        aksi('kamar.status', { ID_Kamar: k.ID_Kamar, Status: st, Catatan: v === 'renov' ? cat : '' }, { optimis: () => S.patch('Kamar', k.ID_Kamar, { Status: st, Catatan: v === 'renov' ? cat : '' }) });
      }
      if (v === 'hapus' && await konfirmasi('Hapus kamar ' + k.No_Kamar + '? Kamar yang pernah punya riwayat tidak bisa dihapus.', { bahaya: true, ok: 'Hapus' })) { m.close(); aksi('kamar.hapus', { ID_Kamar: k.ID_Kamar }, { optimis: () => S.buang('Kamar', k.ID_Kamar) }); }
    });
  }
  function formKamar(k) {
    const tipe = S.rows('Tipe_Kamar');
    if (!tipe.length) { toast('Buat tipe kamar terlebih dahulu.', 'info'); formTipe(); return; }
    const m = modal({ title: k ? 'Ubah Kamar ' + k.No_Kamar : 'Tambah Kamar', body: '<div class="grid-f">' +
      U.fld('f-No_Kamar', 'Nomor kamar', U.inp('f-No_Kamar', k && k.No_Kamar, 'required maxlength="20" placeholder="A01"')) +
      U.fld('f-ID_Tipe', 'Tipe kamar', U.sel('f-ID_Tipe', U.opsi(tipe.map((t) => [t.ID_Tipe, t.Nama_Tipe + ' (' + rpK(t.Harga_Bulanan) + '/bln)']), k ? k.ID_Tipe : tipe[0].ID_Tipe))) +
      U.fld('f-Lantai', 'Lantai', U.inp('f-Lantai', k && k.Lantai, 'maxlength="10"')) +
      (k ? '' : U.fld('f-Status', 'Status awal', U.sel('f-Status', U.opsi(['Kosong', 'Renovasi'], 'Kosong')))) +
      U.fld('f-Catatan', 'Catatan', U.ta('f-Catatan', k && k.Catatan, 'maxlength="300"'), 'full') + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-No_Kamar', 'f-ID_Tipe', 'f-Lantai', 'f-Status', 'f-Catatan']);
      if (!d.No_Kamar) return toast('Nomor kamar wajib diisi.', 'err');
      if (k) d.ID_Kamar = k.ID_Kamar;
      m.close();
      const t = S.by('Tipe_Kamar', d.ID_Tipe) || {};
      aksi('kamar.simpan', d, { optimis: () => k ? S.patch('Kamar', k.ID_Kamar, { No_Kamar: d.No_Kamar, ID_Tipe: d.ID_Tipe, Lantai: d.Lantai, Catatan: d.Catatan }) : S.sisip('Kamar', { No_Kamar: d.No_Kamar, ID_Tipe: d.ID_Tipe, ID_Properti: t.ID_Properti, Status: d.Status || 'Kosong', Lantai: d.Lantai, Catatan: d.Catatan }), buka: () => formKamar(k) });
    };
  }
  function formTipe(t) {
    const props = S.rows('Properti');
    const m = modal({ title: t ? 'Ubah Tipe ' + t.Nama_Tipe : 'Tipe Kamar Baru', size: 'lg', body: '<div class="grid-f">' +
      U.fld('f-Nama_Tipe', 'Nama tipe', U.inp('f-Nama_Tipe', t && t.Nama_Tipe, 'maxlength="60" placeholder="Standar Cozy"')) +
      U.fld('f-Kelas', 'Kelas (label)', U.sel('f-Kelas', U.opsi(['Standar', 'VIP', 'Eksklusif'], t ? t.Kelas : 'Standar'))) +
      U.fld('f-Harga_Bulanan', 'Harga bulanan (Rp)', U.inp('f-Harga_Bulanan', t && t.Harga_Bulanan, 'inputmode="numeric"')) +
      U.fld('f-Harga_Harian', 'Harga harian (Rp)', U.inp('f-Harga_Harian', t && t.Harga_Harian, 'inputmode="numeric"')) +
      U.fld('f-Harga_Tahunan', 'Harga tahunan (Rp)', U.inp('f-Harga_Tahunan', t && t.Harga_Tahunan, 'inputmode="numeric"')) +
      U.fld('f-ID_Properti', 'Properti', U.sel('f-ID_Properti', U.opsi(props.map((p) => [p.ID_Properti, p.Nama]), t ? t.ID_Properti : (props[0] || {}).ID_Properti))) +
      U.fld('f-Ukuran', 'Ukuran', U.inp('f-Ukuran', t && t.Ukuran, 'placeholder="3x3.5 m"')) + U.fld('f-Lantai', 'Lantai', U.inp('f-Lantai', t && t.Lantai, 'placeholder="Lantai 1"')) +
      U.fld('f-Fasilitas', 'Fasilitas (pisahkan koma)', U.ta('f-Fasilitas', t && t.Fasilitas, 'placeholder="AC, WiFi, Kamar mandi dalam"'), 'full') +
      U.fld('f-Deskripsi', 'Deskripsi singkat', U.ta('f-Deskripsi', t && t.Deskripsi), 'full') +
      U.fld('f-Urutan', 'Urutan tampil', U.inp('f-Urutan', t ? t.Urutan : 99, 'inputmode="numeric"')) +
      U.fld('f-Tampil', 'Tampil di landing', U.sel('f-Tampil', U.opsi([['YA', 'Ya'], ['TIDAK', 'Sembunyikan']], t ? t.Tampil || 'YA' : 'YA'))) + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-Nama_Tipe', 'f-Kelas', 'f-Harga_Bulanan', 'f-Harga_Harian', 'f-Harga_Tahunan', 'f-ID_Properti', 'f-Ukuran', 'f-Lantai', 'f-Fasilitas', 'f-Deskripsi', 'f-Urutan', 'f-Tampil']);
      ['Harga_Bulanan', 'Harga_Harian', 'Harga_Tahunan', 'Urutan'].forEach((x) => { d[x] = Number(String(d[x]).replace(/\D/g, '')) || 0; });
      if (!d.Nama_Tipe) return toast('Nama tipe wajib diisi.', 'err');
      if (!d.Harga_Bulanan && !d.Harga_Harian && !d.Harga_Tahunan) return toast('Isi minimal satu harga.', 'err');
      if (t) d.ID_Tipe = t.ID_Tipe;
      m.close();
      aksi('tipe.simpan', d, { optimis: () => t ? S.patch('Tipe_Kamar', t.ID_Tipe, d) : S.sisip('Tipe_Kamar', d), buka: () => formTipe(t) });
    };
  }
  function fotoTipe(id) {
    const t = S.by('Tipe_Kamar', id); if (!t) return;
    const fotos = String(t.Foto_URL || '').split(/[\n,|]+/).map((x) => x.trim()).filter(Boolean);
    const m = modal({ title: 'Foto ' + t.Nama_Tipe, body: '<p class="small muted mb">Foto tampil di slider landing page (maks 8). Foto disimpan di Drive dan dibagikan "siapa saja dengan link" agar bisa tampil publik.</p>' +
      (fotos.length ? '<div class="col mb">' + fotos.map((u, i) => '<div class="list-item"><span class="chip">#' + (i + 1) + '</span><span class="grow ellipsis xs">' + esc(u) + '</span><button class="btn xs danger" data-hapus="' + esc(u) + '">' + icon('trash', 'sm') + '</button></div>').join('') + '</div>' : '') +
      '<div class="drop" id="dz"></div>', footer: '<button class="btn ghost" data-x>Tutup</button><button class="btn" id="up">' + icon('upload', 'sm') + ' Unggah foto</button>' });
    const ambil = U.dropzone(m, 'dz', 'Pilih foto kamar (landscape lebih bagus)');
    m.$('#up').onclick = async (e) => { const b = ambil(); if (!b) return toast('Pilih foto dulu.', 'err'); const r = await aksi('tipe.foto', { ID_Tipe: id, berkas: b }, { btn: e.currentTarget, teksMuat: 'Mengunggah…', timeout: 90000 }); if (r.success) { m.close(); fotoTipe(id); } };
    m.el.addEventListener('click', async (e) => { const h = e.target.closest('[data-hapus]'); if (h && await konfirmasi('Hapus foto ini dari etalase?', { bahaya: true })) { const r = await aksi('tipe.foto', { ID_Tipe: id, hapusUrl: h.dataset.hapus }); if (r.success) { m.close(); fotoTipe(id); } } });
  }
  function formProperti(p) {
    const m = modal({ title: p ? 'Ubah Properti' : 'Cabang Baru', body: '<div class="grid-f">' +
      U.fld('f-Nama', 'Nama properti', U.inp('f-Nama', p && p.Nama), 'full') + U.fld('f-Alamat', 'Alamat', U.ta('f-Alamat', p && p.Alamat), 'full') +
      U.fld('f-Kota', 'Kota', U.inp('f-Kota', p && p.Kota)) + U.fld('f-No_WA_Admin', 'WA admin cabang', U.inp('f-No_WA_Admin', p && p.No_WA_Admin, 'inputmode="tel" placeholder="0812…"')) +
      U.fld('f-Koordinat_Maps', 'Koordinat peta (lat,lng)', U.inp('f-Koordinat_Maps', p && p.Koordinat_Maps, 'placeholder="-7.7956,110.3695"'), 'full', 'Google Maps → klik kanan lokasi → salin angka koordinat.') +
      U.fld('f-Deskripsi', 'Deskripsi lokasi (tampil di landing)', U.ta('f-Deskripsi', p && p.Deskripsi), 'full') + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-Nama', 'f-Alamat', 'f-Kota', 'f-No_WA_Admin', 'f-Koordinat_Maps', 'f-Deskripsi']);
      if (!d.Nama) return toast('Nama wajib diisi.', 'err');
      if (d.No_WA_Admin && !hpValid(d.No_WA_Admin)) return toast('Nomor WA tidak valid.', 'err');
      if (p) d.ID_Properti = p.ID_Properti;
      m.close(); aksi('properti.simpan', d, { optimis: () => p ? S.patch('Properti', p.ID_Properti, d) : S.sisip('Properti', d), buka: () => formProperti(p) });
    };
  }

  // ======================= PENGHUNI =======================
  V.staf.penghuni = { judul: 'Penghuni', tabel: ['Penghuni', 'Kamar', 'Tagihan', 'Prospek', 'Tipe_Kamar'], cta: { label: 'Tambah Penghuni', fn: () => formPenghuni() },
    render(el, q, st) {
      const tab = q.tab || 'aktif', hari = D.hari();
      const aktif = S.rows('Penghuni').filter((p) => p.Status === 'Aktif'), keluar = S.rows('Penghuni').filter((p) => p.Status !== 'Aktif'), prs = S.rows('Prospek');
      let isi;
      if (tab === 'prospek') {
        const list = prs.filter((p) => (!st.sp || p.Status === st.sp) && U.cocok(st.q, p.Nama, p.No_WA, p.Email)).sort((a, b) => String(b.Dibuat).localeCompare(String(a.Dibuat)));
        isi = '<div class="toolbar">' + U.seg('sp', [['', 'Semua'], 'Baru', 'Dihubungi', 'Survei', 'Jadi Penghuni', 'Batal'], st.sp || '') + U.cari('q-prs', st.q, 'Cari nama/WA') + '<span class="sp"></span><button class="btn sm" data-act="tambahPrs">' + icon('plus', 'sm') + ' Prospek</button></div>' +
          U.tabel([{ label: 'Calon penghuni', v: (p) => '<div class="row">' + U.avatar(p.Nama) + '<div><b>' + esc(p.Nama) + '</b><div class="xs muted">' + esc(p.Sumber || '') + ' · ' + tglJam(p.Dibuat) + '</div></div></div>' },
            { label: 'WhatsApp', v: (p) => p.No_WA ? '<a href="' + waLink(p.No_WA, 'Halo ' + p.Nama + ', terima kasih sudah menghubungi ' + (S.set.NAMA_USAHA || '') + '.') + '" target="_blank" class="b">' + esc(p.No_WA) + '</a>' : '-' },
            { label: 'Minat', v: (p) => esc(D.tipe(p.ID_Tipe).Nama_Tipe || '-') + (p.Rencana_Masuk ? '<div class="xs muted">masuk ' + tgl(p.Rencana_Masuk) + '</div>' : '') },
            { label: 'Pesan', v: (p) => '<span class="small">' + esc(String(p.Pesan || '').slice(0, 80)) + '</span>' },
            { label: 'Status', v: (p) => '<select class="inp" style="min-height:34px;padding:4px 10px;width:auto" data-ch="stPrs" data-id="' + esc(p.ID_Prospek) + '">' + U.opsi(['Baru', 'Dihubungi', 'Survei', 'Jadi Penghuni', 'Batal'], p.Status) + '</select>' },
            { label: '', cls: 'act', v: (p) => '<button class="btn xs" data-act="jadikan" data-id="' + esc(p.ID_Prospek) + '">Jadikan penghuni</button> <button class="btn xs ghost icon" data-act="ubahPrs" data-id="' + esc(p.ID_Prospek) + '" aria-label="Ubah">' + icon('edit', 'sm') + '</button>' }],
          list, { hal: st.hal, kosong: 'Belum ada calon penghuni', kosongSub: 'Prospek masuk dari formulir landing page.', ilus: 'envelope' });
      } else {
        const sumber = tab === 'riwayat' ? keluar : aktif;
        const list = sumber.filter((p) => U.cocok(st.q, p.Nama, p.Email_Google, p.No_WA, D.kamar(p.ID_Kamar).No_Kamar)).sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
        isi = '<div class="toolbar">' + U.cari('q-pen', st.q, 'Cari nama, email, WA, kamar') + '<span class="sp"></span>' + U.ekspor('ekspor') + '</div>' +
          U.tabel([{ label: 'Penghuni', v: (p) => '<button class="row linkbtn" style="text-decoration:none;text-align:left" data-act="detail" data-id="' + esc(p.ID_Penghuni) + '">' + U.avatar(p.Nama) + '<span><b>' + esc(p.Nama) + '</b><span class="xs muted" style="display:block">' + esc(p.Email_Google || 'tanpa email portal') + '</span></span></button>' },
            { label: 'Kamar', v: (p) => '<b>' + esc(D.kamar(p.ID_Kamar).No_Kamar || '-') + '</b><div class="xs muted">' + esc(D.tipe(D.kamar(p.ID_Kamar).ID_Tipe).Nama_Tipe || '') + '</div>' },
            { label: 'WhatsApp', v: (p) => p.No_WA ? '<a href="' + waLink(p.No_WA, 'Halo ' + p.Nama + ',') + '" target="_blank">' + esc(p.No_WA) + '</a>' + (p.StatusWA ? ' <span class="wa-badge ' + (p.StatusWA === 'Terdaftar' ? 'ya' : 'tidak') + '">' + (p.StatusWA === 'Terdaftar' ? '✓ WA' : '✕') + '</span>' : '') : '-' },
            { label: 'Masuk', cls: 'nw', v: (p) => tgl(p.Tgl_Masuk, 1) },
            { label: 'Kontrak', v: (p) => { if (!p.Tgl_Kontrak_Berakhir) return '-'; const s = selisihHari(p.Tgl_Kontrak_Berakhir, hari); return tgl(p.Tgl_Kontrak_Berakhir, 1) + (tab === 'aktif' ? '<div class="xs ' + (s < 30 ? '' : 'muted') + '" style="' + (s < 30 ? 'color:#a1191e;font-weight:700' : '') + '">' + (s < 0 ? 'lewat ' + -s + ' hari' : s + ' hari lagi') + '</div>' : ''); } },
            { label: 'Tagihan', v: (p) => { const t = D.tunggakan(p.ID_Penghuni); return t.n ? '<span class="badge ' + (t.telat ? 'bad' : 'yellow') + '">' + t.n + ' · ' + rpK(t.total) + '</span>' : '<span class="badge ok">Lancar</span>'; } },
            { label: '', cls: 'act', v: (p) => '<button class="btn xs ghost" data-act="detail" data-id="' + esc(p.ID_Penghuni) + '">Detail</button>' }],
          list, { hal: st.hal, kosong: tab === 'riwayat' ? 'Belum ada riwayat' : 'Belum ada penghuni aktif', kosongSub: 'Tambah penghuni dari tombol di kanan atas.', ilus: 'people' });
      }
      el.innerHTML = U.page('Penghuni', aktif.length + ' aktif · ' + prs.filter((p) => p.Status === 'Baru').length + ' prospek baru') + U.tabs([['aktif', 'Aktif', aktif.length], ['riwayat', 'Riwayat'], ['prospek', 'Calon Penghuni', prs.filter((p) => p.Status === 'Baru').length]], tab) + isi;
      U.delegasi(el, {
        tab: (d) => { st.hal = 1; ke('penghuni', { tab: d.v }); }, cari: (v) => { st.q = v; st.hal = 1; App.render(); }, hal: (d) => { st.hal = Number(d.v); App.render(); }, sp: (d) => { st.sp = d.v; App.render(); },
        detail: (d) => detailPenghuni(d.id), tambahPrs: () => formProspek(), ubahPrs: (d) => formProspek(S.by('Prospek', d.id)),
        stPrs: (v, t) => aksi('prospek.simpan', Object.assign({}, S.by('Prospek', t.dataset.id), { Status: v }), { optimis: () => S.patch('Prospek', t.dataset.id, { Status: v }), diam: true }),
        jadikan: (d) => { const p = S.by('Prospek', d.id); formPenghuni(null, { Nama: p.Nama, No_WA: p.No_WA, Email_Google: p.Email, _prospek: p }); },
        ekspor: (d) => eksporPenghuni(d.v, tab === 'riwayat' ? keluar : aktif)
      });
    }
  };
  function eksporPenghuni(jenis, list) {
    const cols = [{ k: 'ID_Penghuni', label: 'ID' }, { k: 'Nama', label: 'Nama', w: 24 }, { label: 'Kamar', v: (p) => D.kamar(p.ID_Kamar).No_Kamar }, { k: 'No_WA', label: 'WhatsApp' }, { k: 'Email_Google', label: 'Email', w: 26 },
      { k: 'Tgl_Masuk', label: 'Masuk' }, { k: 'Tgl_Kontrak_Berakhir', label: 'Kontrak s.d.' }, { label: 'Tunggakan', v: (p) => D.tunggakan(p.ID_Penghuni).total, r: 1 }];
    if (jenis === 'xlsx') Ekspor.xlsx('Penghuni_' + D.hari(), [{ nama: 'Penghuni', cols, rows: list }]);
    else Ekspor.pdf('Penghuni_' + D.hari(), { judul: 'Daftar Penghuni', sub: list.length + ' penghuni · ' + tgl(D.hari()), cols: cols.map((c) => c.label === 'Tunggakan' ? Object.assign({}, c, { v: (p) => rp(D.tunggakan(p.ID_Penghuni).total) }) : c), rows: list });
  }
  function detailPenghuni(id) {
    const p = S.by('Penghuni', id); if (!p) return;
    const k = D.kamar(p.ID_Kamar), tags = D.tagihanPenghuni(id).sort((a, b) => String(b.Periode).localeCompare(String(a.Periode))), tg = D.tunggakan(id);
    const m = modal({ side: true, title: p.Nama, body:
      '<div class="row">' + '<span class="avatar" style="width:56px;height:56px;font-size:18px;background:var(--lime)">' + esc(inisial(p.Nama)) + '</span><div><span class="badge ' + (p.Status === 'Aktif' ? 'ok' : 'mute') + '">' + esc(p.Status) + '</span><div class="b mt-s">Kamar ' + esc(k.No_Kamar || '-') + ' · ' + esc(D.tipe(k.ID_Tipe).Nama_Tipe || '') + '</div><div class="small muted">' + esc(p.Skema_Sewa || 'Bulanan') + ' · ' + rp(p.Harga_Sewa) + ' · tagih tgl ' + (p.Tgl_Tagih || S.set.TGL_JATUH_TEMPO || 5) + '</div></div></div>' +
      '<div class="g2 mt" style="gap:10px"><div class="kpi"><span class="lbl">Masuk</span><span class="v" style="font-size:16px">' + tgl(p.Tgl_Masuk) + '</span></div><div class="kpi"><span class="lbl">Kontrak s.d.</span><span class="v" style="font-size:16px">' + tgl(p.Tgl_Kontrak_Berakhir) + '</span></div><div class="kpi"><span class="lbl">WhatsApp</span><span class="v" style="font-size:16px">' + esc(p.No_WA || '-') + '</span></div><div class="kpi ' + (tg.n ? '' : 'on') + '"><span class="lbl">Tunggakan</span><span class="v" style="font-size:16px">' + rp(tg.total) + '</span></div></div>' +
      '<div class="small mt">' + icon('mail', 'sm') + ' ' + esc(p.Email_Google || 'Belum ada email — penghuni belum bisa login portal') + '</div>' + (p.Kontak_Darurat ? '<div class="small mt-s">' + icon('phone', 'sm') + ' Darurat: ' + esc(p.Kontak_Darurat) + '</div>' : '') + (p.Catatan ? '<div class="note mt">' + esc(p.Catatan) + '</div>' : '') +
      '<div class="row wrap mt">' + (p.Status === 'Aktif' ? '<button class="btn sm" data-a="ubah">' + icon('edit', 'sm') + ' Ubah / pindah kamar</button><button class="btn sm ghost" data-a="tagih">' + icon('plus', 'sm') + ' Tagihan</button>' : '') +
      (p.No_WA ? '<a class="btn sm ghost" target="_blank" href="' + waLink(p.No_WA, 'Halo ' + p.Nama + ',') + '">' + icon('wa', 'sm') + ' Chat</a>' : '') + (p.Status === 'Aktif' ? '<button class="btn sm danger" data-a="out">' + icon('logout', 'sm') + ' Check-out</button>' : '') + '</div>' +
      '<hr class="sep"><div class="lbl mb">Riwayat tagihan</div>' + (tags.length ? tags.slice(0, 18).map((t) => '<div class="list-item"><div class="grow"><div class="t">' + esc(t.Jenis) + ' ' + periodeNama(t.Periode) + '</div><div class="s">' + rp(t.Nominal) + ' · jatuh tempo ' + tgl(t.Jatuh_Tempo, 1) + '</div></div>' + D.badgeTag(D.stTag(t)) + '</div>').join('') : '<p class="small muted">Belum ada tagihan.</p>') });
    m.el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      m.close();
      if (a.dataset.a === 'ubah') formPenghuni(p);
      if (a.dataset.a === 'tagih') formTagihan(null, { ID_Penghuni: p.ID_Penghuni });
      if (a.dataset.a === 'out') formCheckout(p);
    });
  }
  function formPenghuni(p, pre) {
    pre = pre || {};
    const kam = S.rows('Kamar').filter((k) => (k.Status === 'Kosong' && !k.ID_Penghuni_Aktif) || (p && k.ID_Kamar === p.ID_Kamar));
    if (!kam.length) { toast('Tidak ada kamar kosong. Kosongkan/tambah kamar dulu.', 'err'); return; }
    const v = Object.assign({ Tgl_Masuk: D.hari(), Skema_Sewa: 'Bulanan', Tgl_Tagih: S.set.TGL_JATUH_TEMPO || 5 }, p || {}, pre);
    const m = modal({ title: p ? 'Ubah Penghuni' : 'Penghuni Baru', size: 'lg', body: '<div class="grid-f">' +
      U.fld('f-Nama', 'Nama lengkap', U.inp('f-Nama', v.Nama, 'maxlength="80" autocomplete="off"')) +
      U.fld('f-ID_Kamar', 'Kamar', U.sel('f-ID_Kamar', U.opsi(kam.map((k) => [k.ID_Kamar, k.No_Kamar + ' — ' + (D.tipe(k.ID_Tipe).Nama_Tipe || '') + (p && k.ID_Kamar === p.ID_Kamar ? ' (saat ini)' : '')]), v.ID_Kamar || kam[0].ID_Kamar))) +
      U.fld('f-Email_Google', 'Email Google (untuk login portal)', U.inp('f-Email_Google', v.Email_Google, 'type="email" autocomplete="off" placeholder="nama@gmail.com"'), '', 'Penghuni masuk portal dengan akun Google ini.') +
      U.fld('f-No_WA', 'No. WhatsApp', U.inp('f-No_WA', v.No_WA, 'inputmode="tel" placeholder="0812…"'), '', 'Untuk pengingat tagihan & kuitansi.') +
      U.fld('f-Tgl_Masuk', 'Tanggal masuk', U.inp('f-Tgl_Masuk', v.Tgl_Masuk, 'type="date"')) + U.fld('f-Tgl_Kontrak_Berakhir', 'Kontrak berakhir', U.inp('f-Tgl_Kontrak_Berakhir', v.Tgl_Kontrak_Berakhir, 'type="date"')) +
      U.fld('f-Skema_Sewa', 'Skema sewa', U.sel('f-Skema_Sewa', U.opsi(['Bulanan', 'Harian', 'Tahunan'], v.Skema_Sewa))) +
      U.fld('f-Harga_Sewa', 'Harga sewa (Rp)', U.inp('f-Harga_Sewa', v.Harga_Sewa || '', 'inputmode="numeric"'), '', 'Kosongkan = ikut harga tipe kamar.') +
      U.fld('f-Tgl_Tagih', 'Tanggal jatuh tempo bulanan', U.inp('f-Tgl_Tagih', v.Tgl_Tagih, 'type="number" min="1" max="28"')) +
      U.fld('f-Kontak_Darurat', 'Kontak darurat', U.inp('f-Kontak_Darurat', v.Kontak_Darurat, 'placeholder="Nama – 08…"')) +
      U.fld('f-Catatan', 'Catatan internal', U.ta('f-Catatan', v.Catatan), 'full') +
      (p ? '' : '<label class="check full"><input type="checkbox" id="f-buatTagihanPertama" checked> Buat tagihan sewa pertama otomatis</label>') + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    const isiHarga = () => { const k = S.by('Kamar', m.$('#f-ID_Kamar').value), t = D.tipe(k && k.ID_Tipe), sk = m.$('#f-Skema_Sewa').value; m.$('#f-Harga_Sewa').placeholder = rp(sk === 'Harian' ? t.Harga_Harian : sk === 'Tahunan' ? t.Harga_Tahunan : t.Harga_Bulanan); };
    m.$('#f-ID_Kamar').onchange = isiHarga; m.$('#f-Skema_Sewa').onchange = isiHarga; isiHarga();
    m.$('#f-Tgl_Masuk').onchange = () => { if (!m.$('#f-Tgl_Kontrak_Berakhir').value) { const d = new Date(m.$('#f-Tgl_Masuk').value); d.setFullYear(d.getFullYear() + 1); m.$('#f-Tgl_Kontrak_Berakhir').value = d.toISOString().slice(0, 10); } };
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-Nama', 'f-ID_Kamar', 'f-Email_Google', 'f-No_WA', 'f-Tgl_Masuk', 'f-Tgl_Kontrak_Berakhir', 'f-Skema_Sewa', 'f-Harga_Sewa', 'f-Tgl_Tagih', 'f-Kontak_Darurat', 'f-Catatan', 'f-buatTagihanPertama']);
      if (d.Nama.length < 2) return toast('Nama wajib diisi.', 'err');
      if (d.Email_Google && !emailValid(d.Email_Google)) return toast('Format email tidak valid.', 'err');
      if (d.No_WA && !hpValid(d.No_WA)) return toast('Nomor WhatsApp tidak valid.', 'err');
      if (!d.Tgl_Masuk) return toast('Tanggal masuk wajib diisi.', 'err');
      d.Harga_Sewa = Number(String(d.Harga_Sewa).replace(/\D/g, '')) || 0; d.No_WA = hp08(d.No_WA);
      if (p) d.ID_Penghuni = p.ID_Penghuni;
      m.close();
      aksi('penghuni.simpan', d, {
        optimis: () => {
          if (p) { const u1 = S.patch('Penghuni', p.ID_Penghuni, d), u2 = p.ID_Kamar !== d.ID_Kamar ? S.patch('Kamar', p.ID_Kamar, { Status: 'Kosong', ID_Penghuni_Aktif: '' }) : () => { }, u3 = S.patch('Kamar', d.ID_Kamar, { Status: 'Terisi', ID_Penghuni_Aktif: p.ID_Penghuni }); return () => { u3(); u2(); u1(); }; }
          const tmp = 'tmp-' + Date.now(), u1 = S.sisip('Penghuni', Object.assign({}, d, { ID_Penghuni: tmp, Status: 'Aktif' })), u2 = S.patch('Kamar', d.ID_Kamar, { Status: 'Terisi', ID_Penghuni_Aktif: tmp });
          return () => { u2(); u1(); };
        },
        sukses: () => { if (pre._prospek) aksi('prospek.simpan', Object.assign({}, pre._prospek, { Status: 'Jadi Penghuni' }), { diam: true }); },
        buka: () => formPenghuni(p, d)
      });
    };
  }
  function formCheckout(p) {
    const tg = D.tunggakan(p.ID_Penghuni);
    const m = modal({ title: 'Check-out ' + p.Nama, size: 'sm', body: (tg.n ? '<div class="note warn mb">' + icon('alert') + '<span>Masih ada <b>' + tg.n + ' tagihan</b> belum lunas (' + rp(tg.total) + ').</span></div>' : '') +
      '<div class="col">' + U.fld('f-tanggal', 'Tanggal keluar', U.inp('f-tanggal', D.hari(), 'type="date"')) + U.fld('f-catatan', 'Catatan', U.ta('f-catatan', '', 'placeholder="Kondisi kamar, deposit, dll."')) +
      '<label class="check"><input type="checkbox" id="f-renovasi"> Tandai kamar perlu renovasi/perapian</label></div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn danger" id="ok">Check-out</button>' });
    m.$('#ok').onclick = () => {
      const d = U.nilai(m, ['f-tanggal', 'f-catatan', 'f-renovasi']); d.ID_Penghuni = p.ID_Penghuni; m.close();
      aksi('penghuni.checkout', d, { optimis: () => { const a = S.patch('Penghuni', p.ID_Penghuni, { Status: 'Keluar' }), b = S.patch('Kamar', p.ID_Kamar, { Status: d.renovasi ? 'Renovasi' : 'Kosong', ID_Penghuni_Aktif: '' }); return () => { b(); a(); }; } });
    };
  }
  function formProspek(p) {
    const m = modal({ title: p ? 'Ubah Prospek' : 'Prospek Baru', body: '<div class="grid-f">' + U.fld('f-Nama', 'Nama', U.inp('f-Nama', p && p.Nama)) + U.fld('f-No_WA', 'WhatsApp', U.inp('f-No_WA', p && p.No_WA, 'inputmode="tel"')) +
      U.fld('f-Email', 'Email', U.inp('f-Email', p && p.Email, 'type="email"')) + U.fld('f-ID_Tipe', 'Minat tipe', U.sel('f-ID_Tipe', U.opsi(S.rows('Tipe_Kamar').map((t) => [t.ID_Tipe, t.Nama_Tipe]), p && p.ID_Tipe, '-'))) +
      U.fld('f-Rencana_Masuk', 'Rencana masuk', U.inp('f-Rencana_Masuk', p && p.Rencana_Masuk, 'type="date"')) + U.fld('f-Status', 'Status', U.sel('f-Status', U.opsi(['Baru', 'Dihubungi', 'Survei', 'Jadi Penghuni', 'Batal'], p ? p.Status : 'Baru'))) +
      U.fld('f-Pesan', 'Pesan', U.ta('f-Pesan', p && p.Pesan), 'full') + U.fld('f-Catatan', 'Catatan follow-up', U.ta('f-Catatan', p && p.Catatan), 'full') + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-Nama', 'f-No_WA', 'f-Email', 'f-ID_Tipe', 'f-Rencana_Masuk', 'f-Status', 'f-Pesan', 'f-Catatan']);
      if (d.Nama.length < 2) return toast('Nama wajib diisi.', 'err'); if (d.No_WA && !hpValid(d.No_WA)) return toast('Nomor WA tidak valid.', 'err');
      if (p) d.ID_Prospek = p.ID_Prospek; m.close();
      aksi('prospek.simpan', d, { optimis: () => p ? S.patch('Prospek', p.ID_Prospek, d) : S.sisip('Prospek', Object.assign({ Sumber: 'Manual', Dibuat: JK.hariIni() }, d)), buka: () => formProspek(p) });
    };
  }

  // ======================= TAGIHAN =======================
  V.staf.tagihan = { judul: 'Tagihan', tabel: ['Tagihan', 'Pembayaran', 'Penghuni', 'Kamar', 'Meteran_Listrik'], cta: { label: 'Tagihan Baru', fn: () => formTagihan() },
    render(el, q, st) {
      const tab = q.tab || 'daftar', tunggu = S.rows('Pembayaran').filter((b) => b.Status_Validasi === 'Menunggu');
      if (q.status && st._qs !== q.status) { st.status = q.status; st._qs = q.status; st.per = ''; }
      let isi;
      if (tab === 'validasi') isi = viewValidasi(st, tunggu);
      else if (tab === 'meteran') isi = viewMeteran(st);
      else {
        const per = st.per === undefined ? D.periode() : st.per, status = st.status || '', semua = S.rows('Tagihan');
        const periodeList = Array.from(new Set(semua.map((t) => t.Periode).concat([D.periode()]))).sort().reverse();
        const list = semua.filter((t) => (!per || t.Periode === per) && (!status || D.stTag(t) === status) && (!st.jenis || t.Jenis === st.jenis) && U.cocok(st.q, D.penghuni(t.ID_Penghuni).Nama, D.kamar(t.ID_Kamar).No_Kamar, t.ID_Tagihan))
          .sort((a, b) => ({ Telat: 0, Belum: 1, 'Menunggu Validasi': 2, Lunas: 3 }[D.stTag(a)] - { Telat: 0, Belum: 1, 'Menunggu Validasi': 2, Lunas: 3 }[D.stTag(b)]) || String(a.Jatuh_Tempo).localeCompare(String(b.Jatuh_Tempo)));
        const jum = (f) => list.filter(f).reduce((s, t) => s + Number(t.Nominal || 0), 0);
        isi = '<div class="g4 mb">' + [['Total', jum(() => true), ''], ['Lunas', jum((t) => t.Status === 'Lunas'), 'on'], ['Menunggu validasi', jum((t) => t.Status === 'Menunggu Validasi'), ''], ['Belum & telat', jum((t) => ['Belum', 'Telat'].indexOf(D.stTag(t)) > -1), '']].map((k) => '<div class="kpi ' + k[2] + '"><span class="lbl">' + k[0] + '</span><span class="v">' + rpK(k[1]) + '</span></div>').join('') + '</div>' +
          '<div class="toolbar"><select class="inp pill" style="width:auto" data-ch="per" aria-label="Periode">' + U.opsi(periodeList.map((p) => [p, periodeNama(p)]), per, 'Semua periode') + '</select>' +
          U.seg('status', [['', 'Semua'], 'Belum', 'Telat', ['Menunggu Validasi', 'Menunggu'], 'Lunas'], status) +
          '<select class="inp pill" style="width:auto" data-ch="jenis" aria-label="Jenis">' + U.opsi(['Sewa', 'Listrik', 'Lainnya'], st.jenis, 'Semua jenis') + '</select>' + U.cari('q-tag', st.q, 'Cari penghuni/kamar') +
          '<span class="sp"></span><button class="btn sm lime" data-act="generate">' + icon('zap', 'sm') + ' Buat tagihan bulanan</button></div>' +
          U.tabel([{ label: 'Penghuni', v: (t) => '<b>' + esc(D.penghuni(t.ID_Penghuni).Nama || '-') + '</b><div class="xs muted">Kamar ' + esc(D.kamar(t.ID_Kamar).No_Kamar || '-') + '</div>' },
            { label: 'Tagihan', v: (t) => esc(t.Jenis) + ' ' + periodeNama(t.Periode, 1) + (t.Keterangan ? '<div class="xs muted">' + esc(String(t.Keterangan).slice(0, 50)) + '</div>' : '') },
            { label: 'Nominal', cls: 'r nw', v: (t) => '<span class="num">' + rp(t.Nominal) + '</span>' }, { label: 'Jatuh tempo', cls: 'nw', v: (t) => tgl(t.Jatuh_Tempo, 1) },
            { label: 'Status', v: (t) => D.badgeTag(D.stTag(t)) },
            { label: '', cls: 'act', v: (t) => { const st2 = D.stTag(t); return (st2 === 'Belum' || st2 === 'Telat' ? '<button class="btn xs" data-act="catat" data-id="' + esc(t.ID_Tagihan) + '">Catat bayar</button> <button class="btn xs ghost icon" data-act="wa" data-id="' + esc(t.ID_Tagihan) + '" title="Pengingat WhatsApp" aria-label="Kirim pengingat WhatsApp">' + icon('wa', 'sm') + '</button> <button class="btn xs ghost icon" data-act="ubah" data-id="' + esc(t.ID_Tagihan) + '" aria-label="Ubah">' + icon('edit', 'sm') + '</button>' : st2 === 'Menunggu Validasi' ? '<button class="btn xs violet" data-act="keValidasi">Validasi</button>' : '<span class="xs muted">' + icon('check', 'sm') + ' selesai</span>'); } }],
          list, { hal: st.hal, kosong: 'Tidak ada tagihan', kosongSub: per ? 'Untuk ' + periodeNama(per) + '. Klik "Buat tagihan bulanan".' : '', ilus: 'receipt' }) +
          '<div class="row wrap mt">' + U.ekspor('ekspor') + '</div>';
        st._list = list;
      }
      el.innerHTML = U.page('Tagihan & Pembayaran', tunggu.length ? tunggu.length + ' bukti bayar menunggu validasi' : 'Semua bukti bayar sudah divalidasi') +
        U.tabs([['daftar', 'Daftar Tagihan'], ['validasi', 'Validasi Pembayaran', tunggu.length], ['meteran', 'Meteran Listrik']], tab) + isi;
      U.delegasi(el, {
        tab: (d) => ke('tagihan', { tab: d.v }), per: (v) => { st.per = v; st.hal = 1; App.render(); }, status: (d) => { st.status = d.v; st._qs = d.v; st.hal = 1; App.render(); }, jenis: (v) => { st.jenis = v; App.render(); },
        cari: (v) => { st.q = v; st.hal = 1; App.render(); }, hal: (d) => { st.hal = Number(d.v); App.render(); }, generate: () => generateTagihan(), keValidasi: () => ke('tagihan', { tab: 'validasi' }),
        catat: (d) => formCatatBayar(d.id), ubah: (d) => formTagihan(S.by('Tagihan', d.id)),
        wa: (d) => { const t = S.by('Tagihan', d.id), p = D.penghuni(t.ID_Penghuni); if (!p.No_WA) return toast('Penghuni belum punya nomor WA.', 'err'); w.open(waLink(p.No_WA, U.pesanTagihan(t)), '_blank'); },
        ekspor: (d) => eksporTagihan(d.v, st._list || []),
        // validasi
        lihat: (d) => U.lihatBerkas(d.id, 'Bukti bayar'), setuju: (d) => validasi([d.id], true), tolak: (d) => tolak([d.id]),
        pilih: (v, t) => { st.pilih = st.pilih || {}; st.pilih[t.dataset.id] = v; App.render(); }, pilihSemua: (v) => { st.pilih = {}; if (v) tunggu.forEach((b) => { st.pilih[b.ID_Bayar] = true; }); App.render(); },
        setujuPilih: () => { const ids = Object.keys(st.pilih || {}).filter((k) => st.pilih[k]); if (ids.length) validasi(ids, true); st.pilih = {}; },
        // meteran
        mper: (v) => { st.mper = v; App.render(); }, mtrSimpan: (d, b) => simpanMeter(d.id, b, st), autoTag: (v) => { st.noTag = !v; }
      });
    }
  };
  function viewValidasi(st, tunggu) {
    if (!tunggu.length) return '<div class="card empty">' + img3d('party') + '<b>Tidak ada bukti bayar yang menunggu</b>Bukti dari penghuni akan muncul di sini.</div>';
    const pilih = st.pilih || {}, nPilih = Object.keys(pilih).filter((k) => pilih[k]).length;
    return '<div class="toolbar"><label class="check"><input type="checkbox" data-ch="pilihSemua"' + (nPilih === tunggu.length ? ' checked' : '') + '> Pilih semua</label><span class="sp"></span>' + (nPilih ? '<button class="btn sm lime" data-act="setujuPilih">' + icon('check', 'sm') + ' Setujui ' + nPilih + ' terpilih</button>' : '') + '</div>' +
      tunggu.sort((a, b) => String(a.Dibuat).localeCompare(String(b.Dibuat))).map((b) => {
        const t = S.by('Tagihan', b.ID_Tagihan) || {}, p = D.penghuni(b.ID_Penghuni), ada = !!b.Bukti_URL;
        return '<div class="vcard"><button class="vthumb" data-act="' + (ada ? 'lihat' : '') + '" data-id="' + esc(b.Bukti_URL) + '" aria-label="Lihat bukti">' + (ada ? img3d('receipt', 'i3d') : img3d('coin')) + '</button>' +
          '<div><label class="check xs"><input type="checkbox" data-ch="pilih" data-id="' + esc(b.ID_Bayar) + '"' + (pilih[b.ID_Bayar] ? ' checked' : '') + '> ' + esc(b.ID_Bayar) + '</label><h3 class="h-sm mt-s">' + esc(p.Nama || '-') + ' · Kamar ' + esc(D.kamar(t.ID_Kamar).No_Kamar || '-') + '</h3>' +
          '<div class="small">' + esc(t.Jenis || '') + ' ' + periodeNama(t.Periode) + ' — <b class="num">' + rp(b.Nominal) + '</b></div><div class="xs muted">Dikirim ' + tglJam(b.Tgl_Bayar) + ' · ' + esc(b.Metode || '') + (ada ? ' · <button class="linkbtn xs" data-act="lihat" data-id="' + esc(b.Bukti_URL) + '">lihat bukti</button>' : '') + '</div></div>' +
          '<div class="row wrap"><button class="btn sm danger" data-act="tolak" data-id="' + esc(b.ID_Bayar) + '">Tolak</button><button class="btn sm lime" data-act="setuju" data-id="' + esc(b.ID_Bayar) + '">' + icon('check', 'sm') + ' Setujui</button></div></div>';
      }).join('');
  }
  function validasi(ids, setuju, alasan) {
    aksi('bayar.validasi', { ids, setuju, alasan }, { optimis: () => {
      const undo = [];
      ids.forEach((id) => { const b = S.by('Pembayaran', id); if (!b) return; undo.push(S.patch('Pembayaran', id, { Status_Validasi: setuju ? 'Disetujui' : 'Ditolak', Alasan_Tolak: alasan || '' })); undo.push(S.patch('Tagihan', b.ID_Tagihan, { Status: setuju ? 'Lunas' : 'Belum' })); });
      return () => undo.reverse().forEach((u) => u());
    } });
  }
  async function tolak(ids) {
    const alasan = await konfirmasi('Tolak bukti pembayaran ini? Penghuni akan diberi tahu.', { input: 'Alasan penolakan', wajib: true, bahaya: true, ok: 'Tolak', multiline: true });
    if (alasan) validasi(ids, false, alasan);
  }
  function viewMeteran(st) {
    const per = st.mper || D.periode(), tarif = Number(S.set.TARIF_LISTRIK || 1500), mtr = S.rows('Meteran_Listrik');
    const kam = D.kamarList().filter((k) => k.Status === 'Terisi' || mtr.some((m) => m.ID_Kamar === k.ID_Kamar)).sort((a, b) => String(a.No_Kamar).localeCompare(String(b.No_Kamar), 'id', { numeric: true }));
    const opsiPer = [0, -1, -2, -3].map((n) => tambahBulan(D.periode(), n));
    return '<div class="toolbar"><select class="inp pill" style="width:auto" data-ch="mper">' + U.opsi(opsiPer.map((p) => [p, periodeNama(p)]), per) + '</select><span class="chip">Tarif ' + rp(tarif) + '/kWh</span>' +
      '<label class="check small"><input type="checkbox" data-ch="autoTag"' + (st.noTag ? '' : ' checked') + '> Buat/perbarui tagihan listrik otomatis</label></div>' +
      U.tabel([{ label: 'Kamar', v: (k) => '<b>' + esc(k.No_Kamar) + '</b><div class="xs muted">' + esc(k.ID_Penghuni_Aktif ? D.penghuni(k.ID_Penghuni_Aktif).Nama : 'kosong') + '</div>' },
        { label: 'Meter lalu', v: (k) => { const l = mtr.filter((m) => m.ID_Kamar === k.ID_Kamar && m.Periode < per).sort((a, b) => b.Periode.localeCompare(a.Periode))[0]; return l ? '<span class="num">' + l.Meter_Akhir + '</span><div class="xs muted">' + periodeNama(l.Periode, 1) + '</div>' : '<span class="muted">-</span>'; } },
        { label: 'Awal', v: (k) => { const cur = mtr.find((m) => m.ID_Kamar === k.ID_Kamar && m.Periode === per), l = mtr.filter((m) => m.ID_Kamar === k.ID_Kamar && m.Periode < per).sort((a, b) => b.Periode.localeCompare(a.Periode))[0]; return '<input class="inp" style="min-height:36px;width:100px" inputmode="decimal" id="ma-' + esc(k.ID_Kamar) + '" value="' + (cur ? cur.Meter_Awal : l ? l.Meter_Akhir : '') + '" aria-label="Meter awal ' + esc(k.No_Kamar) + '">'; } },
        { label: 'Akhir', v: (k) => { const cur = mtr.find((m) => m.ID_Kamar === k.ID_Kamar && m.Periode === per); return '<input class="inp" style="min-height:36px;width:100px" inputmode="decimal" id="mk-' + esc(k.ID_Kamar) + '" value="' + (cur ? cur.Meter_Akhir : '') + '" aria-label="Meter akhir ' + esc(k.No_Kamar) + '">'; } },
        { label: 'Total', cls: 'r', v: (k) => { const cur = mtr.find((m) => m.ID_Kamar === k.ID_Kamar && m.Periode === per); return cur ? '<b class="num">' + rp(cur.Total) + '</b><div class="xs muted">' + cur.Pemakaian + ' kWh</div>' : '<span class="muted">-</span>'; } },
        { label: '', cls: 'act', v: (k) => '<button class="btn xs" data-act="mtrSimpan" data-id="' + esc(k.ID_Kamar) + '">Simpan</button>' }],
      kam, { kosong: 'Belum ada kamar terisi', ilus: 'bolt', per: 100 });
  }
  function simpanMeter(idKamar, btn, st) {
    const per = st.mper || D.periode(), a = Number(String($('#ma-' + idKamar).value).replace(',', '.')), b = Number(String($('#mk-' + idKamar).value).replace(',', '.'));
    if (!isFinite(a) || !isFinite(b) || $('#mk-' + idKamar).value === '') return toast('Isi meter awal & akhir.', 'err');
    if (b < a) return toast('Meter akhir tidak boleh lebih kecil dari awal.', 'err');
    aksi('meteran.simpan', { ID_Kamar: idKamar, Periode: per, Meter_Awal: a, Meter_Akhir: b, buatTagihan: !st.noTag }, { btn });
  }
  async function generateTagihan() {
    const per = D.periode();
    const pilih = await konfirmasi('Buat tagihan sewa bulanan untuk semua penghuni aktif. Penghuni yang sudah punya tagihan sewa di periode ini dilewati (tidak dobel).', { input: 'Periode (YYYY-MM)', nilai: per, ok: 'Buat tagihan', wajib: true });
    if (!pilih) return;
    if (!/^\d{4}-\d{2}$/.test(pilih)) return toast('Format periode YYYY-MM.', 'err');
    aksi('tagihan.generate', { periode: pilih }, { teksMuat: 'Membuat…' });
  }
  function formTagihan(t, pre) {
    pre = pre || {};
    const pen = S.rows('Penghuni').filter((p) => p.Status === 'Aktif'), v = Object.assign({ Periode: D.periode(), Jenis: 'Lainnya', Jatuh_Tempo: JK.tambahHari(D.hari(), 7) }, t || {}, pre);
    const m = modal({ title: t ? 'Ubah Tagihan' : 'Tagihan Baru', body: '<div class="grid-f">' +
      U.fld('f-ID_Penghuni', 'Penghuni', U.sel('f-ID_Penghuni', U.opsi(pen.map((p) => [p.ID_Penghuni, p.Nama + ' — ' + (D.kamar(p.ID_Kamar).No_Kamar || '')]), v.ID_Penghuni, 'Pilih penghuni'), t ? 'disabled' : ''), 'full') +
      U.fld('f-Jenis', 'Jenis', U.sel('f-Jenis', U.opsi(['Sewa', 'Listrik', 'Lainnya'], v.Jenis))) + U.fld('f-Periode', 'Periode', U.inp('f-Periode', v.Periode, 'type="month"')) +
      U.fld('f-Nominal', 'Nominal (Rp)', U.inp('f-Nominal', v.Nominal, 'inputmode="numeric"')) + U.fld('f-Jatuh_Tempo', 'Jatuh tempo', U.inp('f-Jatuh_Tempo', v.Jatuh_Tempo, 'type="date"')) +
      U.fld('f-Keterangan', 'Keterangan', U.inp('f-Keterangan', v.Keterangan, 'placeholder="Laundry, denda, deposit, dll."'), 'full') + '</div>' + (t ? '<button class="btn sm danger mt" id="hapus">' + icon('trash', 'sm') + ' Hapus tagihan</button>' : ''),
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-ID_Penghuni', 'f-Jenis', 'f-Periode', 'f-Nominal', 'f-Jatuh_Tempo', 'f-Keterangan']);
      d.Nominal = Number(String(d.Nominal).replace(/\D/g, '')) || 0;
      if (!d.ID_Penghuni) return toast('Pilih penghuni.', 'err'); if (d.Nominal <= 0) return toast('Nominal harus lebih dari 0.', 'err'); if (!d.Jatuh_Tempo) return toast('Isi jatuh tempo.', 'err');
      if (t) d.ID_Tagihan = t.ID_Tagihan;
      m.close();
      const p = D.penghuni(d.ID_Penghuni);
      aksi('tagihan.simpan', d, { optimis: () => t ? S.patch('Tagihan', t.ID_Tagihan, d) : S.sisip('Tagihan', Object.assign({ Status: 'Belum', ID_Kamar: p.ID_Kamar }, d)), buka: () => formTagihan(t, d) });
    };
    const h = m.$('#hapus');
    if (h) h.onclick = async () => { if (await konfirmasi('Hapus tagihan ini?', { bahaya: true, ok: 'Hapus' })) { m.close(); aksi('tagihan.hapus', { ID_Tagihan: t.ID_Tagihan }, { optimis: () => S.buang('Tagihan', t.ID_Tagihan) }); } };
  }
  function formCatatBayar(id) {
    const t = S.by('Tagihan', id), p = D.penghuni(t.ID_Penghuni);
    const m = modal({ title: 'Catat Pembayaran', body: '<div class="list-item">' + img3d('coin') + '<div class="grow"><div class="t">' + esc(p.Nama) + ' — ' + esc(t.Jenis) + ' ' + periodeNama(t.Periode) + '</div><div class="s">Kamar ' + esc(D.kamar(t.ID_Kamar).No_Kamar || '-') + '</div></div><b class="num">' + rp(t.Nominal) + '</b></div>' +
      '<div class="grid-f mt">' + U.fld('f-metode', 'Metode', U.sel('f-metode', U.opsi(['Tunai', 'Transfer', 'QRIS'], 'Tunai'))) + U.fld('f-tanggal', 'Tanggal bayar', U.inp('f-tanggal', D.hari(), 'type="date"')) + '</div>' +
      '<div class="lbl mt">Bukti (opsional)</div><div class="drop mt-s" id="dz"></div><p class="xs muted mt-s">Pembayaran langsung berstatus lunas & e-kuitansi dibuat otomatis.</p>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn lime" id="ok">' + icon('check', 'sm') + ' Catat lunas</button>' });
    const ambil = U.dropzone(m, 'dz');
    m.$('#ok').onclick = async (e) => {
      const d = U.nilai(m, ['f-metode', 'f-tanggal']);
      const r = await aksi('bayar.catat', { ids: [id], metode: d.metode, tanggal: d.tanggal, berkas: ambil() }, { btn: e.currentTarget, optimis: () => S.patch('Tagihan', id, { Status: 'Lunas' }), timeout: 90000 });
      if (r.success) m.close();
    };
  }
  function eksporTagihan(jenis, list) {
    const cols = [{ k: 'ID_Tagihan', label: 'ID' }, { label: 'Penghuni', v: (t) => D.penghuni(t.ID_Penghuni).Nama, w: 22 }, { label: 'Kamar', v: (t) => D.kamar(t.ID_Kamar).No_Kamar }, { k: 'Jenis', label: 'Jenis' },
      { label: 'Periode', v: (t) => periodeNama(t.Periode) }, { k: 'Nominal', label: 'Nominal', r: 1 }, { k: 'Jatuh_Tempo', label: 'Jatuh tempo' }, { label: 'Status', v: (t) => D.stTag(t) }];
    if (jenis === 'xlsx') Ekspor.xlsx('Tagihan_' + D.hari(), [{ nama: 'Tagihan', cols, rows: list }]);
    else Ekspor.pdf('Tagihan_' + D.hari(), { judul: 'Daftar Tagihan', sub: list.length + ' tagihan · total ' + rp(list.reduce((s, t) => s + Number(t.Nominal || 0), 0)), cols: cols.map((c) => c.k === 'Nominal' ? Object.assign({}, c, { v: (t) => rp(t.Nominal) }) : c), rows: list });
  }

  // ======================= KEUANGAN =======================
  V.staf.keuangan = { judul: 'Keuangan', tabel: ['Pengeluaran', 'Pembayaran'], cta: { label: 'Catat Pengeluaran', fn: () => formPengeluaran() },
    render(el, q, st) {
      const owner = D.owner(), tab = q.tab || (owner ? 'ringkasan' : 'pengeluaran');
      const menunggu = S.rows('Pengeluaran').filter((g) => g.Status_Approval === 'Menunggu');
      const tabs = owner ? [['ringkasan', 'Arus Kas'], ['pengeluaran', 'Pengeluaran'], ['persetujuan', 'Persetujuan', menunggu.length]] : [['pengeluaran', 'Pengajuan Saya']];
      let isi = '';
      if (tab === 'ringkasan' && owner) {
        const per = D.periode(), kas = D.arusKas(per), bln = D.bulanTerakhir(6), data = bln.map((p) => D.arusKas(p));
        isi = '<div class="g4 mb">' + [['Pemasukan ' + periodeNama(per, 1), rp(kas.masuk), 'tint-yellow'], ['Pengeluaran', rp(kas.keluar), 'tint-violet'], ['Laba bersih', rp(kas.laba), kas.laba >= 0 ? 'tint-lime' : ''], ['Margin', kas.masuk ? Math.round(kas.laba * 100 / kas.masuk) + '%' : '-', 'tint-orange']]
          .map((k) => '<div class="kpi ' + k[2] + '" style="box-shadow:var(--sh-sm)"><span class="lbl" style="color:#333">' + k[0] + '</span><span class="v">' + k[1] + '</span></div>').join('') + '</div>' +
          '<div class="g2"><div class="card"><div class="card-h"><h3 class="h-sm">Omzet vs pengeluaran — 6 bulan</h3></div><div class="chart" id="ch-kas"></div></div><div class="card"><div class="card-h"><h3 class="h-sm">Komposisi pengeluaran ' + periodeNama(per, 1) + '</h3></div><div id="ch-kat"></div></div></div>' +
          '<div class="card mt"><div class="card-h"><h3 class="h-sm">Tabel arus kas</h3><a class="btn xs ghost" href="#/laporan">Laporan lengkap ›</a></div>' +
          U.tabel([{ label: 'Bulan', v: (r) => periodeNama(r.p) }, { label: 'Pemasukan', cls: 'r', v: (r) => '<span class="num">' + rp(r.masuk) + '</span>' }, { label: 'Pengeluaran', cls: 'r', v: (r) => '<span class="num">' + rp(r.keluar) + '</span>' }, { label: 'Laba bersih', cls: 'r', v: (r) => '<b class="num" style="color:' + (r.laba < 0 ? '#a1191e' : '#111') + '">' + rp(r.laba) + '</b>' }],
            bln.map((p, i) => Object.assign({ p }, data[i])).reverse()) + '</div>';
        el.innerHTML = U.page('Keuangan', 'Arus kas dari pembayaran tervalidasi & pengeluaran disetujui') + U.tabs(tabs, tab) + isi;
        Chart.kolom($('#ch-kas'), { labels: bln.map((p) => periodeNama(p, 1).split(' ')[0]), series: [{ name: 'Omzet', color: '#7B5CFA', values: data.map((x) => x.masuk) }, { name: 'Pengeluaran', color: '#1A9E92', values: data.map((x) => x.keluar) }], fmt: rp, aria: 'Omzet dan pengeluaran 6 bulan' });
        const kat = {}; S.rows('Pengeluaran').filter((g) => g.Status_Approval === 'Disetujui' && String(g.Tanggal).slice(0, 7) === per).forEach((g) => { kat[g.Kategori] = (kat[g.Kategori] || 0) + Number(g.Nominal || 0); });
        Chart.hbar($('#ch-kat'), { items: Object.keys(kat).map((k) => ({ label: k, value: kat[k] })), fmt: rp, color: '#1A9E92' });
      } else if (tab === 'persetujuan' && owner) {
        isi = menunggu.length ? '<div class="toolbar"><span class="muted small">Pengeluaran operator di atas ambang ' + rp(S.set.AMBANG_APPROVAL) + ' perlu persetujuan.</span><span class="sp"></span><button class="btn sm lime" data-act="setujuSemua">' + icon('check', 'sm') + ' Setujui semua (' + menunggu.length + ')</button></div>' +
          menunggu.map((g) => '<div class="vcard"><button class="vthumb" data-act="' + (g.Bukti_URL ? 'bukti' : '') + '" data-id="' + esc(g.Bukti_URL) + '" aria-label="Bukti">' + img3d(g.Bukti_URL ? 'receipt' : 'moneybag') + '</button><div><span class="badge yellow">' + esc(g.Kategori) + '</span><h3 class="h-sm mt-s">' + rp(g.Nominal) + '</h3><div class="small">' + esc(g.Keterangan || '-') + '</div><div class="xs muted">' + tgl(g.Tanggal) + ' · oleh ' + esc(g.Diajukan_Oleh) + '</div></div>' +
            '<div class="row wrap"><button class="btn sm danger" data-act="tolakG" data-id="' + esc(g.ID) + '">Tolak</button><button class="btn sm lime" data-act="setujuG" data-id="' + esc(g.ID) + '">' + icon('check', 'sm') + ' Setujui</button></div></div>').join('')
          : '<div class="card empty">' + img3d('check') + '<b>Tidak ada pengajuan menunggu</b>Semua pengeluaran sudah diputuskan.</div>';
        el.innerHTML = U.page('Keuangan', menunggu.length + ' pengajuan menunggu persetujuan') + U.tabs(tabs, tab) + isi;
      } else {
        const bulan = st.bln === undefined ? D.periode() : st.bln, kats = String(S.set.KATEGORI_PENGELUARAN || 'Token,WiFi,Gaji,Perbaikan,Lain').split(',').map((x) => x.trim());
        const list = S.rows('Pengeluaran').filter((g) => (!bulan || String(g.Tanggal).slice(0, 7) === bulan) && (!st.kat || g.Kategori === st.kat) && (!st.sa || g.Status_Approval === st.sa) && U.cocok(st.q, g.Keterangan, g.Kategori)).sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal)));
        const bulanList = Array.from(new Set(S.rows('Pengeluaran').map((g) => String(g.Tanggal).slice(0, 7)).concat([D.periode()]))).sort().reverse();
        isi = (!owner ? '<div class="note mb">' + icon('info') + '<span>Pengeluaran di atas <b>' + rp(S.set.AMBANG_APPROVAL) + '</b> otomatis masuk antrean persetujuan Owner. Di bawah ambang langsung tercatat.</span></div>' : '') +
          '<div class="toolbar"><select class="inp pill" style="width:auto" data-ch="bln">' + U.opsi(bulanList.map((p) => [p, periodeNama(p)]), bulan, 'Semua bulan') + '</select><select class="inp pill" style="width:auto" data-ch="kat">' + U.opsi(kats, st.kat, 'Semua kategori') + '</select>' +
          U.seg('sa', [['', 'Semua'], 'Menunggu', 'Disetujui', 'Ditolak'], st.sa || '') + U.cari('q-pg', st.q, 'Cari keterangan') + '<span class="sp"></span><span class="chip">Total ' + rp(list.filter((g) => g.Status_Approval === 'Disetujui').reduce((s, g) => s + Number(g.Nominal || 0), 0)) + '</span></div>' +
          U.tabel([{ label: 'Tanggal', cls: 'nw', v: (g) => tgl(g.Tanggal, 1) }, { label: 'Kategori', v: (g) => '<span class="badge violet">' + esc(g.Kategori) + '</span>' }, { label: 'Keterangan', v: (g) => esc(g.Keterangan || '-') + (owner ? '<div class="xs muted">oleh ' + esc(g.Diajukan_Oleh || '-') + '</div>' : '') },
            { label: 'Nominal', cls: 'r nw', v: (g) => '<span class="num">' + rp(g.Nominal) + '</span>' }, { label: 'Status', v: (g) => '<span class="badge ' + ({ Disetujui: 'ok', Menunggu: 'yellow', Ditolak: 'bad' }[g.Status_Approval] || 'mute') + '">' + esc(g.Status_Approval) + '</span>' + (g.Catatan_Approval ? '<div class="xs muted">' + esc(g.Catatan_Approval) + '</div>' : '') },
            { label: '', cls: 'act', v: (g) => (g.Bukti_URL ? '<button class="btn xs ghost icon" data-act="bukti" data-id="' + esc(g.Bukti_URL) + '" aria-label="Bukti">' + icon('image', 'sm') + '</button> ' : '') + (owner || g.Status_Approval !== 'Disetujui' ? '<button class="btn xs ghost icon" data-act="ubahG" data-id="' + esc(g.ID) + '" aria-label="Ubah">' + icon('edit', 'sm') + '</button> <button class="btn xs danger icon" data-act="hapusG" data-id="' + esc(g.ID) + '" aria-label="Hapus">' + icon('trash', 'sm') + '</button>' : '') }],
          list, { hal: st.hal, kosong: 'Belum ada pengeluaran', ilus: 'moneybag' });
        el.innerHTML = U.page('Keuangan', owner ? 'Catatan pengeluaran operasional' : 'Pengajuan pengeluaran operasional') + U.tabs(tabs, tab) + isi;
      }
      U.delegasi(el, {
        tab: (d) => ke('keuangan', { tab: d.v }), bln: (v) => { st.bln = v; App.render(); }, kat: (v) => { st.kat = v; App.render(); }, sa: (d) => { st.sa = d.v; App.render(); }, cari: (v) => { st.q = v; App.render(); }, hal: (d) => { st.hal = Number(d.v); App.render(); },
        bukti: (d) => U.lihatBerkas(d.id, 'Bukti pengeluaran'), ubahG: (d) => formPengeluaran(S.by('Pengeluaran', d.id)),
        hapusG: async (d) => { if (await konfirmasi('Hapus pengeluaran ini?', { bahaya: true, ok: 'Hapus' })) aksi('pengeluaran.hapus', { ID: d.id }, { optimis: () => S.buang('Pengeluaran', d.id) }); },
        setujuG: (d) => putuskan([d.id], true), tolakG: async (d) => { const c = await konfirmasi('Tolak pengajuan ini?', { input: 'Catatan untuk operator', bahaya: true, ok: 'Tolak' }); if (c !== null && c !== false) putuskan([d.id], false, c); },
        setujuSemua: () => putuskan(menunggu.map((g) => g.ID), true)
      });
    }
  };
  function putuskan(ids, setuju, catatan) {
    aksi('pengeluaran.putuskan', { ids, setuju, catatan }, { optimis: () => { const u = ids.map((id) => S.patch('Pengeluaran', id, { Status_Approval: setuju ? 'Disetujui' : 'Ditolak' })); return () => u.forEach((f) => f()); } });
  }
  function formPengeluaran(g) {
    const kats = String(S.set.KATEGORI_PENGELUARAN || 'Token,WiFi,Gaji,Perbaikan,Lain').split(',').map((x) => x.trim());
    const m = modal({ title: g ? 'Ubah Pengeluaran' : 'Catat Pengeluaran', body: '<div class="grid-f">' +
      U.fld('f-Tanggal', 'Tanggal', U.inp('f-Tanggal', g ? g.Tanggal : D.hari(), 'type="date"')) + U.fld('f-Kategori', 'Kategori', U.sel('f-Kategori', U.opsi(kats, g ? g.Kategori : kats[0]))) +
      U.fld('f-Nominal', 'Nominal (Rp)', U.inp('f-Nominal', g && g.Nominal, 'inputmode="numeric"'), 'full', D.owner() ? '' : 'Di atas ' + rp(S.set.AMBANG_APPROVAL) + ' → butuh persetujuan Owner.') +
      U.fld('f-Keterangan', 'Keterangan', U.ta('f-Keterangan', g && g.Keterangan), 'full') + '</div><div class="lbl mt">Bukti/nota (opsional)</div><div class="drop mt-s" id="dz"></div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Simpan</button>' });
    const ambil = U.dropzone(m, 'dz', 'Foto nota/struk');
    m.$('#simpan').onclick = async (e) => {
      const d = U.nilai(m, ['f-Tanggal', 'f-Kategori', 'f-Nominal', 'f-Keterangan']); d.Nominal = Number(String(d.Nominal).replace(/\D/g, '')) || 0;
      if (d.Nominal <= 0) return toast('Nominal harus lebih dari 0.', 'err');
      if (g) d.ID = g.ID; d.berkas = ambil();
      if (d.berkas) { const r = await aksi('pengeluaran.simpan', d, { btn: e.currentTarget, timeout: 90000 }); if (r.success) m.close(); return; }
      m.close();
      const st = D.owner() ? 'Disetujui' : d.Nominal > Number(S.set.AMBANG_APPROVAL || 0) ? 'Menunggu' : 'Disetujui';
      aksi('pengeluaran.simpan', d, { optimis: () => g ? S.patch('Pengeluaran', g.ID, Object.assign({}, d, { Status_Approval: st })) : S.sisip('Pengeluaran', Object.assign({ Status_Approval: st, Diajukan_Oleh: S.me.email }, d)), buka: () => formPengeluaran(g) });
    };
  }

  // ======================= KOMPLAIN =======================
  V.staf.komplain = { judul: 'Komplain', tabel: ['Komplain', 'Penghuni', 'Kamar'], cta: { label: 'Buat Tiket', fn: () => formKomplainStaf() },
    render(el, q, st) {
      const all = S.rows('Komplain').filter((k) => (!st.pr || k.Prioritas === st.pr) && U.cocok(st.q, k.Judul, k.Deskripsi, D.penghuni(k.ID_Penghuni).Nama, D.kamar(k.ID_Kamar).No_Kamar));
      const urut = (a, b) => ['Darurat', 'Tinggi', 'Sedang', 'Rendah'].indexOf(a.Prioritas) - ['Darurat', 'Tinggi', 'Sedang', 'Rendah'].indexOf(b.Prioritas) || String(b.Dibuat).localeCompare(String(a.Dibuat));
      const lane = (s, c, ic) => { const l = all.filter((k) => k.Status === s).sort(urut); return '<div class="lane"><div class="lane-h"><span class="row" style="gap:8px">' + img3d(ic, 'i3d') + s + '</span><span class="badge ' + c + '">' + l.length + '</span></div>' +
        (l.length ? l.slice(0, s === 'Selesai' ? 20 : 100).map((k) => '<button class="tcard' + (k._pending ? ' pending' : '') + '" data-act="buka" data-id="' + esc(k.ID_Tiket) + '"><div class="row between">' + D.badgePrio(k.Prioritas) + '<span class="xs muted">' + tglJam(k.Dibuat) + '</span></div><div class="b mt-s">' + esc(k.Judul) + '</div><div class="xs muted">' + esc(D.penghuni(k.ID_Penghuni).Nama || '-') + ' · Kamar ' + esc(D.kamar(k.ID_Kamar).No_Kamar || '-') + (k.Foto_URL ? ' · 📷' : '') + '</div></button>').join('') : '<div class="empty small">Kosong</div>') + '</div>'; };
      const selesai = S.rows('Komplain').filter((k) => k.Status === 'Selesai' && k.Tgl_Selesai && k.Dibuat), rata = selesai.length ? Math.round(selesai.reduce((s, k) => s + (new Date(k.Tgl_Selesai.replace(' ', 'T')) - new Date(k.Dibuat.replace(' ', 'T'))) / 36e5, 0) / selesai.length) : 0;
      el.innerHTML = U.page('Komplain & Perbaikan', 'Rata-rata penyelesaian ' + (rata ? (rata < 48 ? rata + ' jam' : Math.round(rata / 24) + ' hari') : '-')) +
        '<div class="toolbar">' + U.seg('pr', [['', 'Semua'], 'Darurat', 'Tinggi', 'Sedang', 'Rendah'], st.pr || '') + U.cari('q-kmp', st.q, 'Cari judul/penghuni/kamar') + '</div>' +
        '<div class="board">' + lane('Baru', 'orange', 'bell') + lane('Diproses', 'violet', 'tools') + lane('Selesai', 'ok', 'check') + '</div>';
      U.delegasi(el, { pr: (d) => { st.pr = d.v; App.render(); }, cari: (v) => { st.q = v; App.render(); }, buka: (d) => detailKomplain(d.id) });
    }
  };
  function detailKomplain(id) {
    const k = S.by('Komplain', id); if (!k) return;
    const p = D.penghuni(k.ID_Penghuni);
    const m = modal({ side: true, title: k.ID_Tiket, body: '<div class="row between">' + D.badgePrio(k.Prioritas) + '<span class="badge ' + ({ Baru: 'orange', Diproses: 'violet', Selesai: 'ok' }[k.Status]) + '">' + esc(k.Status) + '</span></div>' +
      '<h3 class="h-md mt">' + esc(k.Judul) + '</h3><div class="small muted">' + esc(p.Nama || '-') + ' · Kamar ' + esc(D.kamar(k.ID_Kamar).No_Kamar || '-') + ' · ' + esc(k.Kategori || '') + ' · ' + tglJam(k.Dibuat) + '</div>' +
      '<p class="mt" style="white-space:pre-wrap">' + esc(k.Deskripsi || '') + '</p>' + (k.Foto_URL ? '<button class="btn sm ghost mt" data-a="foto">' + icon('image', 'sm') + ' Lihat foto</button>' : '') +
      (p.No_WA ? ' <a class="btn sm ghost mt" target="_blank" href="' + waLink(p.No_WA, 'Halo ' + p.Nama + ', terkait laporan "' + k.Judul + '": ') + '">' + icon('wa', 'sm') + ' Chat penghuni</a>' : '') +
      '<hr class="sep"><div class="lbl mb">Tindak lanjut</div>' + U.seg('stK', ['Baru', 'Diproses', 'Selesai'], k.Status) +
      '<div class="col mt">' + U.fld('f-Prioritas', 'Prioritas', U.sel('f-Prioritas', U.opsi(['Rendah', 'Sedang', 'Tinggi', 'Darurat'], k.Prioritas))) + U.fld('f-Catatan', 'Catatan tindak lanjut (terlihat penghuni)', U.ta('f-Catatan', k.Catatan_Tindak_Lanjut)) + '</div>' +
      (k.Ditangani_Oleh ? '<p class="xs muted mt-s">Terakhir ditangani ' + esc(k.Ditangani_Oleh) + ' · ' + tglJam(k.Tgl_Update) + '</p>' : ''),
      footer: '<button class="btn ghost" data-x>Tutup</button><button class="btn" id="simpan">Simpan</button>' });
    let status = k.Status;
    m.el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-act="stK"]'); if (s) { status = s.dataset.v; m.$$('[data-act="stK"]').forEach((b) => b.setAttribute('aria-pressed', b === s)); }
      if (e.target.closest('[data-a="foto"]')) U.lihatBerkas(k.Foto_URL, 'Foto komplain');
    });
    m.$('#simpan').onclick = () => {
      const d = { ID_Tiket: k.ID_Tiket, Status: status, Prioritas: m.$('#f-Prioritas').value, Catatan_Tindak_Lanjut: m.$('#f-Catatan').value.trim() };
      m.close(); aksi('komplain.update', d, { optimis: () => S.patch('Komplain', k.ID_Tiket, d) });
    };
  }
  function formKomplainStaf() {
    const pen = S.rows('Penghuni').filter((p) => p.Status === 'Aktif');
    const m = modal({ title: 'Buat Tiket Komplain', body: '<div class="grid-f">' + U.fld('f-ID_Penghuni', 'Penghuni (opsional)', U.sel('f-ID_Penghuni', U.opsi(pen.map((p) => [p.ID_Penghuni, p.Nama + ' — ' + (D.kamar(p.ID_Kamar).No_Kamar || '')]), '', 'Area umum / tanpa penghuni')), 'full') +
      U.fld('f-Judul', 'Judul', U.inp('f-Judul', '', 'maxlength="120"'), 'full') + U.fld('f-Kategori', 'Kategori', U.sel('f-Kategori', U.opsi(['Fasilitas', 'Listrik', 'Air', 'Kebersihan', 'Keamanan', 'Internet', 'Umum'], 'Fasilitas'))) +
      U.fld('f-Prioritas', 'Prioritas', U.sel('f-Prioritas', U.opsi(['Rendah', 'Sedang', 'Tinggi', 'Darurat'], 'Sedang'))) + U.fld('f-Deskripsi', 'Deskripsi', U.ta('f-Deskripsi', ''), 'full') + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="simpan">Buat tiket</button>' });
    m.$('#simpan').onclick = () => {
      const d = U.nilai(m, ['f-ID_Penghuni', 'f-Judul', 'f-Kategori', 'f-Prioritas', 'f-Deskripsi']); if (d.Judul.length < 3) return toast('Judul wajib diisi.', 'err');
      m.close(); aksi('komplain.buat', d, { optimis: () => S.sisip('Komplain', Object.assign({ Status: 'Baru', ID_Kamar: D.penghuni(d.ID_Penghuni).ID_Kamar || '', Dibuat: JK.hariIni() + ' 00:00:00' }, d)) });
    };
  }

  V.form = { penghuni: formPenghuni, kamar: formKamar, tagihan: formTagihan, pengeluaran: formPengeluaran, detailPenghuni, detailKamar };
})(window);
