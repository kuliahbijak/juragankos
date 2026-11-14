/* ==========================================================================
   JuraganKos OS — v-penghuni.js  (Portal Penghuni, mobile-first)
   Beranda · Tagihan & unggah bukti · E-kuitansi · Komplain · Profil
   ========================================================================== */
(function (w) {
  'use strict';
  const { $, esc, rp, rpK, icon, img3d, toast, modal, konfirmasi, tombolMuat, tgl, tglJam, periodeNama, selisihHari, waLink, API, unduhBase64, BLS, inisial } = JK;
  const { S, D, aksi, ke } = App;
  const V = App.V, U = V.util;
  const saya = () => S.rows('Penghuni')[0] || {};
  const belumLunas = () => S.rows('Tagihan').filter((t) => t.Status === 'Belum' || t.Status === 'Telat').sort((a, b) => String(a.Jatuh_Tempo).localeCompare(String(b.Jatuh_Tempo)));
  const waAdmin = () => S.set.NO_WA_ADMIN || ((S.rows('Properti')[0] || {}).No_WA_Admin);

  V.penghuni = {
    beranda: { judul: 'Beranda', render(el) {
      const p = saya(), k = S.rows('Kamar')[0] || {}, t = D.tipe(k.ID_Tipe), hari = D.hari();
      const tag = belumLunas(), next = tag[0], tunggu = S.rows('Tagihan').filter((x) => x.Status === 'Menunggu Validasi');
      const kw = S.rows('Pembayaran').filter((b) => b.Status_Validasi === 'Disetujui'), kmp = S.rows('Komplain').filter((x) => x.Status !== 'Selesai');
      const total = tag.reduce((s, x) => s + Number(x.Nominal || 0), 0);
      // kontrak
      let kontrak = '';
      if (p.Tgl_Masuk && p.Tgl_Kontrak_Berakhir) {
        const tot = Math.max(1, selisihHari(p.Tgl_Kontrak_Berakhir, p.Tgl_Masuk)), jalan = Math.min(tot, Math.max(0, selisihHari(hari, p.Tgl_Masuk))), sisa = selisihHari(p.Tgl_Kontrak_Berakhir, hari);
        kontrak = '<div class="prog-row mt"><div class="t"><span>Masa kontrak</span><span>' + (sisa >= 0 ? sisa + ' hari lagi' : 'berakhir') + '</span></div><div class="prog ' + (sisa < 30 ? '' : 'violet') + '"><i style="width:' + Math.round(jalan * 100 / tot) + '%"></i></div><div class="xs muted">' + tgl(p.Tgl_Masuk, 1) + ' → ' + tgl(p.Tgl_Kontrak_Berakhir, 1) + '</div></div>';
      }
      // streak
      const bul = D.bulanTerakhir(7).map((pr) => ({ pr, r: D.tepatWaktu(pr, p.ID_Penghuni) }));
      let streak = 0; for (let i = bul.length - 1; i >= 0; i--) { const r = bul[i].r; if (!r) continue; if (r.ok === r.n) streak++; else break; }
      const telat = next && next.Jatuh_Tempo < hari, sisaH = next ? selisihHari(next.Jatuh_Tempo, hari) : 0;
      el.innerHTML =
        '<div class="greet"><div><h1>' + JK.sapaan() + ',<br>' + esc(String(p.Nama || S.me.nama).split(' ')[0]) + '!</h1><div class="sub">Kamar <b>' + esc(k.No_Kamar || '-') + '</b> · ' + esc(t.Nama_Tipe || '') + '</div></div>' +
        '<div class="stats">' + [['yellow', 'receipt', tag.length, 'Tagihan aktif', 'tagihan'], ['orange', 'hourglass', rpK(total), 'Total belum bayar', 'tagihan'], ['lime', 'check', kw.length, 'E-kuitansi', 'tagihan?tab=riwayat'], ['violet', 'tools', kmp.length, 'Komplain aktif', 'komplain']]
          .map((s) => '<button class="stat tint-' + s[0] + '" data-act="ke" data-v="' + s[4] + '"><span class="ic3">' + img3d(s[1]) + '</span><span><b>' + esc(s[2]) + '</b><span>' + s[3] + '</span></span></button>').join('') + '</div></div>' +
        '<div class="ph-hero"><div class="bill"><div class="deco blob">' + img3d(next ? (telat ? 'hourglass' : 'moneybag') : 'party') + '</div>' +
        (next ? '<div class="lbl">Tagihan berikutnya</div><div>' + D.badgeTag(D.stTag(next)) + '</div><div class="amt">' + rp(next.Nominal) + '</div><div class="b">' + esc(next.Jenis) + ' ' + periodeNama(next.Periode) + '</div>' +
          '<div class="small" style="color:' + (telat ? '#a1191e' : 'var(--ink-2)') + ';font-weight:700">' + icon('calendar', 'sm') + ' Jatuh tempo ' + tgl(next.Jatuh_Tempo) + ' · ' + (telat ? 'terlambat ' + -sisaH + ' hari' : sisaH === 0 ? 'hari ini' : sisaH + ' hari lagi') + '</div>' +
          (tag.length > 1 ? '<div class="xs muted">+' + (tag.length - 1) + ' tagihan lain · total ' + rp(total) + '</div>' : '') +
          '<div class="row wrap"><button class="btn lime" data-act="bayar" data-id="' + esc(next.ID_Tagihan) + '">' + icon('upload', 'sm') + ' Bayar & unggah bukti</button><button class="btn ghost" data-act="ke" data-v="tagihan">Lihat semua</button></div>'
          : '<div class="lbl">Tagihan</div><div class="amt">Lunas 🎉</div><p class="small muted">Tidak ada tagihan yang perlu dibayar.' + (tunggu.length ? ' ' + tunggu.length + ' pembayaran sedang divalidasi.' : '') + '</p>') +
        (tunggu.length && next ? '<div class="note mt-s">' + icon('clock') + '<span>' + tunggu.length + ' pembayaran sedang menunggu validasi pengelola.</span></div>' : '') + '</div>' +
        '<div class="card float"><div class="row"><div class="tile3d ' + D.tile('Terisi') + '" style="width:70px;border:2px solid #111;border-radius:16px">' + img3d(t.Kelas === 'VIP' ? 'tv' : 'bed') + '</div><div><span class="badge violet">' + esc(t.Kelas || 'Kamar') + '</span><h3 class="h-md mt-s">Kamar ' + esc(k.No_Kamar || '-') + '</h3><div class="small muted">' + esc(t.Nama_Tipe || '') + '</div></div></div>' +
        '<p class="small mt">' + esc(t.Fasilitas || '') + '</p>' + kontrak + '</div></div>' +
        '<div class="g2 mt-l"><div class="card float streak-card"><div class="row between top"><div><h3>Streak Bayar Tepat Waktu</h3><p class="small muted mt-s">' + (streak ? streak + ' bulan berturut-turut tepat waktu 🔥' : 'Bayar sebelum jatuh tempo untuk memulai streak!') + '</p></div><span class="badge lime" style="font-size:14px">' + icon('zap', 'sm') + ' ' + streak + '</span></div>' +
        '<div class="streak mt">' + bul.map((x) => { const r = x.r, c = !r ? 'off' : r.ok === r.n ? 'on' : r.lunas === r.n ? 'half' : 'off'; return '<div class="d" title="' + esc(periodeNama(x.pr) + (r ? (r.ok === r.n ? ': tepat waktu' : r.lunas === r.n ? ': lunas (terlambat)' : ': belum lunas') : ': -')) + '"><span class="o ' + c + '">' + (r ? icon('zap') : '–') + '</span>' + BLS[Number(x.pr.slice(5)) - 1] + '</div>'; }).join('') + '</div></div>' +
        '<div class="banner"><span class="lbl"><i></i>Butuh bantuan?</span><h3>Ada kerusakan atau pertanyaan?</h3><p>Laporkan lewat tiket komplain agar tercatat & terpantau, atau chat pengelola.</p><div class="row wrap"><button class="btn" data-act="lapor">' + icon('tool', 'sm') + ' Lapor kerusakan</button>' +
        (waAdmin() ? '<a class="btn ghost" target="_blank" href="' + waLink(waAdmin(), 'Halo admin, saya ' + (p.Nama || '') + ' kamar ' + (k.No_Kamar || '') + '.') + '">' + icon('wa', 'sm') + ' Chat admin</a>' : '') + '</div></div></div>' +
        (!JK.PWA.terpasang() ? '<div class="portal-cta mt-l row between wrap" style="display:flex;gap:12px;padding:18px;border:2px solid #111;border-radius:22px;background:#fff"><div class="row">' + img3d('phone') + '<div><b>Pasang JuraganKos di HP</b><div class="small muted">Buka tagihan & kuitansi seperti aplikasi.</div></div></div><button class="btn sm" data-act="pasang">Pasang</button></div>' : '');
      U.delegasi(el, { ke: (d) => ke(d.v.split('?')[0], Object.fromEntries(new URLSearchParams(d.v.split('?')[1] || ''))), bayar: (d) => modalBayar([d.id]), lapor: () => ke('komplain', { baru: 1 }), pasang: () => JK.PWA.pasang() });
    } },

    tagihan: { judul: 'Tagihan', render(el, q, st) {
      const tab = q.tab || 'aktif', tag = belumLunas(), pilih = st.pilih || (st.pilih = {});
      const tunggu = S.rows('Tagihan').filter((t) => t.Status === 'Menunggu Validasi');
      const byr = S.rows('Pembayaran').slice().sort((a, b) => String(b.Dibuat || b.Tgl_Bayar).localeCompare(String(a.Dibuat || a.Tgl_Bayar)));
      tag.forEach((t) => { if (pilih[t.ID_Tagihan] === undefined) pilih[t.ID_Tagihan] = t === tag[0]; });
      const ids = tag.filter((t) => pilih[t.ID_Tagihan]).map((t) => t.ID_Tagihan), total = tag.filter((t) => pilih[t.ID_Tagihan]).reduce((s, t) => s + Number(t.Nominal || 0), 0);
      let isi;
      if (tab === 'riwayat') {
        isi = byr.length ? byr.map((b) => { const t = S.by('Tagihan', b.ID_Tagihan) || {};
          return '<div class="list-item">' + img3d(b.Status_Validasi === 'Disetujui' ? 'receipt' : b.Status_Validasi === 'Ditolak' ? 'clipboard' : 'hourglass', 'i3d') + '<div class="grow"><div class="t">' + esc(t.Jenis || '') + ' ' + periodeNama(t.Periode) + ' · <span class="num">' + rp(b.Nominal) + '</span></div><div class="s">' + tglJam(b.Tgl_Bayar) + (b.No_Kuitansi ? ' · ' + esc(b.No_Kuitansi) : '') + '</div>' +
            (b.Status_Validasi === 'Ditolak' ? '<div class="small" style="color:#a1191e">Ditolak: ' + esc(b.Alasan_Tolak || '-') + '</div>' : '') + '</div>' +
            (b.Status_Validasi === 'Disetujui' ? '<button class="btn xs" data-act="kw" data-id="' + esc(b.ID_Bayar) + '">' + icon('download', 'sm') + ' Kuitansi</button>' : D.badgeBayar(b.Status_Validasi)) + '</div>'; }).join('')
          : '<div class="card empty">' + img3d('receipt') + '<b>Belum ada riwayat pembayaran</b></div>';
      } else {
        isi = '<div class="note mb">' + icon('card') + '<div><b>Cara bayar</b><div class="small" style="white-space:pre-wrap">' + esc(S.set.REKENING_BAYAR || 'Hubungi pengelola untuk info rekening.') + '</div></div></div>' +
          (tag.length ? '<div class="lbl mb">Pilih tagihan yang dibayar</div>' + tag.map((t) => '<label class="list-item' + (pilih[t.ID_Tagihan] ? ' sel' : '') + '" style="cursor:pointer"><input type="checkbox" data-ch="pilih" data-id="' + esc(t.ID_Tagihan) + '"' + (pilih[t.ID_Tagihan] ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:#111"><div class="grow"><div class="t">' + esc(t.Jenis) + ' ' + periodeNama(t.Periode) + '</div><div class="s">Jatuh tempo ' + tgl(t.Jatuh_Tempo) + (t.Keterangan ? ' · ' + esc(t.Keterangan) : '') + '</div></div><div style="text-align:right"><b class="num">' + rp(t.Nominal) + '</b><div>' + D.badgeTag(D.stTag(t)) + '</div></div></label>').join('') +
            '<div class="card float mt row between wrap"><div><div class="lbl">Total dipilih</div><div class="num" style="font-size:24px">' + rp(total) + '</div></div><button class="btn lime" data-act="unggah"' + (ids.length ? '' : ' disabled') + '>' + icon('upload', 'sm') + ' Unggah bukti (' + ids.length + ')</button></div>'
            : '<div class="card empty">' + img3d('party') + '<b>Tidak ada tagihan yang perlu dibayar</b>Terima kasih sudah membayar tepat waktu!</div>') +
          (tunggu.length ? '<div class="lbl mt-l mb">Menunggu validasi</div>' + tunggu.map((t) => '<div class="list-item">' + img3d('hourglass', 'i3d') + '<div class="grow"><div class="t">' + esc(t.Jenis) + ' ' + periodeNama(t.Periode) + '</div><div class="s">Bukti sudah dikirim, pengelola sedang memeriksa.</div></div><b class="num">' + rp(t.Nominal) + '</b></div>').join('') : '');
      }
      el.innerHTML = U.page('Tagihan Saya', tag.length ? tag.length + ' tagihan belum dibayar' : 'Semua tagihan beres 👍') + U.tabs([['aktif', 'Tagihan', tag.length], ['riwayat', 'Riwayat & Kuitansi']], tab) + isi;
      U.delegasi(el, { tab: (d) => ke('tagihan', { tab: d.v }), pilih: (v, t) => { pilih[t.dataset.id] = v; App.render(); }, unggah: () => modalBayar(ids), kw: (d, b) => unduhKuitansi(d.id, b) });
    } },

    komplain: { judul: 'Komplain', render(el, q, st) {
      const list = S.rows('Komplain').slice().sort((a, b) => String(b.Dibuat).localeCompare(String(a.Dibuat)));
      el.innerHTML = U.page('Komplain & Perbaikan', 'Laporkan kerusakan, pantau tindak lanjutnya', '<button class="btn lime" data-act="baru">' + icon('plus', 'sm') + ' Buat laporan</button>') +
        (list.length ? list.map((k) => '<div class="card mb' + (k._pending ? ' pending' : '') + '"><div class="row between wrap">' + D.badgePrio(k.Prioritas) + '<span class="badge ' + ({ Baru: 'orange', Diproses: 'violet', Selesai: 'ok' }[k.Status]) + '">' + esc(k.Status) + '</span></div>' +
          '<h3 class="h-sm mt-s">' + esc(k.Judul) + '</h3><div class="xs muted">' + esc(k.ID_Tiket) + ' · ' + tglJam(k.Dibuat) + '</div><p class="small mt-s">' + esc(k.Deskripsi || '') + '</p>' +
          '<div class="timeline mt"><div class="it"><i></i><div class="small"><b>Laporan dibuat</b> · ' + tglJam(k.Dibuat) + '</div></div>' + (k.Status !== 'Baru' ? '<div class="it"><i style="background:var(--violet)"></i><div class="small"><b>Diproses pengelola</b>' + (k.Tgl_Update ? ' · ' + tglJam(k.Tgl_Update) : '') + (k.Catatan_Tindak_Lanjut ? '<div>' + esc(k.Catatan_Tindak_Lanjut) + '</div>' : '') + '</div></div>' : '') +
          (k.Status === 'Selesai' ? '<div class="it"><i style="background:var(--teal)"></i><div class="small"><b>Selesai</b> · ' + tglJam(k.Tgl_Selesai) + '</div></div>' : '') + '</div></div>').join('')
          : '<div class="card empty">' + img3d('tools') + '<b>Belum ada laporan</b>Ada yang rusak? Laporkan di sini.</div>');
      U.delegasi(el, { baru: () => formKomplain() });
      if (q.baru && !st._dibuka) { st._dibuka = 1; setTimeout(formKomplain, 50); }
    } },

    profil: { judul: 'Profil', render(el) {
      const p = saya(), k = S.rows('Kamar')[0] || {}, t = D.tipe(k.ID_Tipe), pr = S.rows('Properti').find((x) => x.ID_Properti === k.ID_Properti) || S.rows('Properti')[0] || {};
      const baris = (l, v) => '<div class="row between" style="padding:10px 0;border-bottom:1.5px solid var(--hair)"><span class="muted small">' + l + '</span><b class="small" style="text-align:right">' + esc(v || '-') + '</b></div>';
      el.innerHTML = U.page('Profil Saya') + '<div class="g2"><div class="card float"><div class="row"><span class="avatar" style="width:60px;height:60px;font-size:20px;background:var(--lime)">' + (S.me.foto ? '<img src="' + esc(S.me.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(inisial(p.Nama))) + '</span><div><h3 class="h-md">' + esc(p.Nama) + '</h3><div class="small muted">' + esc(S.me.email) + '</div></div></div><div class="mt">' +
        baris('WhatsApp', p.No_WA) + baris('Kamar', (k.No_Kamar || '-') + ' · ' + (t.Nama_Tipe || '')) + baris('Skema sewa', (p.Skema_Sewa || 'Bulanan') + ' · ' + rp(p.Harga_Sewa)) + baris('Tanggal masuk', tgl(p.Tgl_Masuk)) + baris('Kontrak s.d.', tgl(p.Tgl_Kontrak_Berakhir)) + baris('Kontak darurat', p.Kontak_Darurat) +
        '</div><p class="xs muted mt">Data salah? Hubungi pengelola untuk memperbarui.</p></div>' +
        '<div class="col"><div class="card"><h3 class="h-sm">' + img3d('building', 'i3d') + ' ' + esc(pr.Nama || S.set.NAMA_USAHA || 'Kos') + '</h3><p class="small muted mt-s">' + esc(pr.Alamat || S.set.ALAMAT || '') + '</p><p class="small mt-s">' + icon('clock', 'sm') + ' ' + esc(S.set.JAM_OPERASIONAL || '-') + '</p>' +
        (waAdmin() ? '<a class="btn sm mt" target="_blank" href="' + waLink(waAdmin(), 'Halo admin, saya ' + (p.Nama || '') + ' kamar ' + (k.No_Kamar || '') + '.') + '">' + icon('wa', 'sm') + ' Chat pengelola</a>' : '') + '</div>' +
        '<div class="card tint-violet"><h3 class="h-sm">Aplikasi & akun</h3><div class="col mt">' + (JK.PWA.terpasang() ? '<span class="badge ok">✓ Aplikasi terpasang</span>' : '<button class="btn block" data-act="pasang">' + icon('download', 'sm') + ' Pasang di HP</button>') +
        '<button class="btn ghost block" data-act="keluar">' + icon('logout', 'sm') + ' Keluar</button><button class="btn danger block" data-act="semua">Keluar dari semua perangkat</button></div></div></div></div>';
      U.delegasi(el, { pasang: () => JK.PWA.pasang(), keluar: () => App.keluar(false), semua: async () => { if (await konfirmasi('Keluar dari semua perangkat?', { bahaya: true })) App.keluar(true); } });
    } }
  };

  function modalBayar(ids) {
    const list = ids.map((id) => S.by('Tagihan', id)).filter(Boolean);
    if (!list.length) return toast('Pilih tagihan terlebih dahulu.', 'err');
    const total = list.reduce((s, t) => s + Number(t.Nominal || 0), 0);
    const m = modal({ title: 'Unggah Bukti Bayar', body: list.map((t) => '<div class="row between small" style="padding:6px 0;border-bottom:1.5px dashed var(--hair)"><span>' + esc(t.Jenis) + ' ' + periodeNama(t.Periode) + '</span><b class="num">' + rp(t.Nominal) + '</b></div>').join('') +
      '<div class="row between mt-s"><b>Total</b><b class="num" style="font-size:20px">' + rp(total) + '</b></div>' +
      '<div class="note mt">' + icon('card') + '<span class="small" style="white-space:pre-wrap">' + esc(S.set.REKENING_BAYAR || '') + '</span></div>' +
      '<div class="fld mt"><label for="b-metode">Metode</label><select class="inp" id="b-metode">' + U.opsi(['Transfer', 'QRIS', 'E-Wallet', 'Tunai'], 'Transfer') + '</select></div>' +
      '<div class="lbl mt">Foto/screenshot bukti transfer</div><div class="drop mt-s" id="dz"></div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn lime" id="kirim">' + icon('send', 'sm') + ' Kirim bukti</button>' });
    const ambil = U.dropzone(m, 'dz', 'Ketuk untuk pilih foto bukti');
    m.$('#kirim').onclick = async (e) => {
      const berkas = ambil(); if (!berkas) return toast('Pilih foto/PDF bukti bayar.', 'err');
      const r = await aksi('bayar.unggah', { ids, berkas, metode: m.$('#b-metode').value }, { btn: e.currentTarget, teksMuat: 'Mengunggah…', timeout: 90000,
        optimis: () => { const u = ids.map((id) => S.patch('Tagihan', id, { Status: 'Menunggu Validasi' })); return () => u.forEach((f) => f()); } });
      if (r.success) { m.close(); const vs = App.viewState.tagihan; if (vs) vs.pilih = {}; }
    };
  }
  async function unduhKuitansi(id, btn) {
    tombolMuat(btn, true, 'Menyiapkan…');
    const r = await API.call('kuitansi.unduh', { ID_Bayar: id }, { timeout: 90000 });
    tombolMuat(btn, false);
    if (!r.success) return toast(r.message, 'err');
    unduhBase64(r.data.data, r.data.mime, r.data.nama); toast('Kuitansi diunduh.');
  }
  function formKomplain() {
    const m = modal({ title: 'Lapor Kerusakan / Komplain', body: '<div class="grid-f">' + U.fld('k-Judul', 'Judul singkat', U.inp('k-Judul', '', 'maxlength="120" placeholder="AC tidak dingin"'), 'full') +
      U.fld('k-Kategori', 'Kategori', U.sel('k-Kategori', U.opsi(['Fasilitas', 'Listrik', 'Air', 'Kebersihan', 'Keamanan', 'Internet', 'Umum'], 'Fasilitas'))) +
      U.fld('k-Prioritas', 'Tingkat urgensi', U.sel('k-Prioritas', U.opsi([['Rendah', 'Rendah — bisa menunggu'], ['Sedang', 'Sedang'], ['Tinggi', 'Tinggi — mengganggu'], ['Darurat', 'Darurat — bahaya/kebocoran']], 'Sedang'))) +
      U.fld('k-Deskripsi', 'Ceritakan masalahnya', U.ta('k-Deskripsi', '', 'maxlength="1500" placeholder="Sejak kapan, di bagian mana, dll."'), 'full') + '</div><div class="lbl mt">Foto (opsional)</div><div class="drop mt-s" id="dz"></div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn lime" id="kirim">Kirim laporan</button>' });
    const ambil = U.dropzone(m, 'dz', 'Foto kerusakan');
    m.$('#kirim').onclick = async (e) => {
      const d = U.nilai(m, ['k-Judul', 'k-Kategori', 'k-Prioritas', 'k-Deskripsi']); d.berkas = ambil();
      if (d.Judul.length < 3) return toast('Isi judul laporan.', 'err');
      const r = await aksi('komplain.buat', d, { btn: e.currentTarget, teksMuat: 'Mengirim…', timeout: 90000 });
      if (r.success) m.close();
    };
  }
})(window);
