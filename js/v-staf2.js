/* ==========================================================================
   JuraganKos OS — v-staf2.js  (Owner & Operator, bagian 2)
   Laporan · WhatsApp & Notifikasi · CRM Kontak · Pengaturan (keamanan, migrasi)
   ========================================================================== */
(function (w) {
  'use strict';
  const { $, esc, rp, rpK, icon, img3d, toast, modal, konfirmasi, tombolMuat, tgl, tglJam, periodeNama, tambahBulan, hp08, hpValid, emailValid, waLink, API, LS, inisial } = JK;
  const { S, D, aksi, ke } = App;
  const V = App.V, U = V.util;
  const WARNA_ST = { Lunas: '#1E8E5A', 'Menunggu Validasi': '#7B5CFA', Belum: '#D99A00', Telat: '#D64545' };

  // ======================= LAPORAN =======================
  V.staf.laporan = { judul: 'Laporan', tabel: ['Tagihan', 'Pembayaran', 'Pengeluaran', 'Kamar', 'Penghuni', 'Statistik'],
    render(el, q, st) {
      const owner = D.owner(), sampai = st.sampai || D.periode(), dari = st.dari || tambahBulan(sampai, -5);
      const bulan = []; for (let p = dari; p <= sampai && bulan.length < 24; p = tambahBulan(p, 1)) bulan.push(p);
      const tipeF = st.tipe || '', kamarOk = (id) => !tipeF || D.kamar(id).ID_Tipe === tipeF;
      const tag = S.rows('Tagihan').filter((t) => t.Periode >= dari && t.Periode <= sampai && kamarOk(t.ID_Kamar) && (!st.status || D.stTag(t) === st.status) && U.cocok(st.q, D.penghuni(t.ID_Penghuni).Nama, D.kamar(t.ID_Kamar).No_Kamar));
      const byr = S.rows('Pembayaran').filter((b) => b.Status_Validasi === 'Disetujui' && String(b.Tgl_Bayar).slice(0, 7) >= dari && String(b.Tgl_Bayar).slice(0, 7) <= sampai && U.cocok(st.q, D.penghuni(b.ID_Penghuni).Nama, b.No_Kuitansi));
      const pgl = S.rows('Pengeluaran').filter((g) => g.Status_Approval === 'Disetujui' && String(g.Tanggal).slice(0, 7) >= dari && String(g.Tanggal).slice(0, 7) <= sampai && U.cocok(st.q, g.Keterangan, g.Kategori));
      const kas = bulan.map((p) => D.arusKas(p)), okp = bulan.map((p) => D.okupansi(p).pct);
      const tabs = [['tagihan', 'Tagihan'], ['bayar', 'Pembayaran'], ['okupansi', 'Okupansi per Tipe']].concat(owner ? [['pengeluaran', 'Pengeluaran'], ['labarugi', 'Laba-Rugi'], ['promosi', 'Klik WhatsApp']] : []);
      const tab = tabs.some((t) => t[0] === q.tab) ? q.tab : 'tagihan';
      const opsiBln = []; for (let i = 0; i < 24; i++) opsiBln.push(tambahBulan(D.periode(), -i));
      const totMasuk = kas.reduce((s, x) => s + x.masuk, 0), totKeluar = kas.reduce((s, x) => s + x.keluar, 0);
      el.innerHTML = U.page('Laporan', periodeNama(dari) + ' – ' + periodeNama(sampai) + (owner ? '' : ' · laporan keuangan penuh hanya untuk Owner')) +
        '<div class="toolbar"><label class="row small b">Dari <select class="inp pill" style="width:auto" data-ch="dari">' + U.opsi(opsiBln.map((p) => [p, periodeNama(p)]), dari) + '</select></label>' +
        '<label class="row small b">s.d. <select class="inp pill" style="width:auto" data-ch="sampai">' + U.opsi(opsiBln.map((p) => [p, periodeNama(p)]), sampai) + '</select></label>' +
        '<select class="inp pill" style="width:auto" data-ch="tipe" aria-label="Tipe kamar">' + U.opsi(S.rows('Tipe_Kamar').map((t) => [t.ID_Tipe, t.Nama_Tipe]), tipeF, 'Semua tipe kamar') + '</select>' +
        '<select class="inp pill" style="width:auto" data-ch="status" aria-label="Status tagihan">' + U.opsi(['Belum', 'Telat', 'Menunggu Validasi', 'Lunas'], st.status, 'Semua status') + '</select>' + U.cari('q-lap', st.q, 'Cari nama/kamar/kuitansi') + '</div>' +
        (owner ? '<div class="g4 mb">' + [['Total omzet', rp(totMasuk), 'tint-yellow'], ['Total pengeluaran', rp(totKeluar), 'tint-violet'], ['Laba bersih', rp(totMasuk - totKeluar), 'tint-lime'], ['Rata-rata okupansi', Math.round(okp.reduce((s, x) => s + x, 0) / (okp.length || 1)) + '%', 'tint-orange']].map((k) => '<div class="kpi ' + k[2] + '" style="box-shadow:var(--sh-sm)"><span class="lbl" style="color:#333">' + k[0] + '</span><span class="v">' + k[1] + '</span></div>').join('') + '</div>' : '') +
        '<div class="g2">' + (owner ? '<div class="card"><h3 class="h-sm mb">Omzet vs pengeluaran per bulan</h3><div class="chart" id="c1"></div></div>' : '') +
        '<div class="card"><h3 class="h-sm mb">Tren okupansi (%)</h3><div class="chart" id="c2"></div></div>' +
        (owner ? '<div class="card"><h3 class="h-sm mb">Komposisi pengeluaran per kategori</h3><div id="c3"></div></div>' : '') +
        '<div class="card"><h3 class="h-sm mb">Status tagihan per bulan</h3><div class="chart" id="c4"></div></div></div>' +
        '<div class="card mt-l"><div class="card-h"><div style="flex:1;min-width:0">' + U.tabs(tabs, tab).replace('class="tabs"', 'class="tabs" style="margin:0"') + '</div><div class="row wrap">' + U.ekspor('ekspor') + '</div></div><div id="tbl"></div></div>';
      const lbl = bulan.map((p) => periodeNama(p, 1).replace(' 20', " '"));
      if (owner) Chart.kolom($('#c1'), { labels: lbl, series: [{ name: 'Omzet', color: '#7B5CFA', values: kas.map((x) => x.masuk) }, { name: 'Pengeluaran', color: '#1A9E92', values: kas.map((x) => x.keluar) }], fmt: rp });
      Chart.garis($('#c2'), { labels: lbl, values: okp, color: '#7B5CFA', max: 100, nama: 'Okupansi', fmt: (v) => v + '%', fmtAxis: (v) => v + '%' });
      if (owner) { const kat = {}; pgl.forEach((g) => { kat[g.Kategori] = (kat[g.Kategori] || 0) + Number(g.Nominal || 0); }); Chart.hbar($('#c3'), { items: Object.keys(kat).map((k) => ({ label: k, value: kat[k] })), fmt: rp, color: '#1A9E92' }); }
      const tagSemua = S.rows('Tagihan').filter((t) => t.Periode >= dari && t.Periode <= sampai && kamarOk(t.ID_Kamar));
      Chart.tumpuk($('#c4'), { labels: lbl, fmt: (v) => v + ' tagihan', fmtAxis: (v) => String(Math.round(v)), segs: ['Lunas', 'Menunggu Validasi', 'Belum', 'Telat'].map((s) => ({ name: s === 'Menunggu Validasi' ? 'Menunggu' : s, color: WARNA_ST[s], values: bulan.map((p) => tagSemua.filter((t) => t.Periode === p && D.stTag(t) === s).length) })) });
      const def = definisiTabel(tab, { tag, byr, pgl, bulan, kas, okp, tipeF });
      $('#tbl').innerHTML = U.tabel(def.cols.map((c) => Object.assign({}, c, { cls: c.r ? 'r nw' : '', v: c.h || (c.v ? (r) => esc(c.v(r)) : null) })), def.rows, { hal: st.hal, kosong: 'Tidak ada data pada filter ini', ilus: 'barchart' }) + (def.total ? '<div class="row between mt b"><span>Total</span><span class="num">' + def.total + '</span></div>' : '');
      st._def = def; st._judul = tabs.find((t) => t[0] === tab)[1];
      U.delegasi(el, {
        dari: (v) => { st.dari = v; if ((st.sampai || D.periode()) < v) st.sampai = v; st.hal = 1; App.render(); }, sampai: (v) => { st.sampai = v; if ((st.dari || tambahBulan(v, -5)) > v) st.dari = v; st.hal = 1; App.render(); },
        tipe: (v) => { st.tipe = v; App.render(); }, status: (v) => { st.status = v; App.render(); }, cari: (v) => { st.q = v; st.hal = 1; App.render(); }, hal: (d) => { st.hal = Number(d.v); App.render(); },
        tab: (d) => { st.hal = 1; ke('laporan', { tab: d.v }); },
        ekspor: async (d, b) => {
          const def2 = st._def, nama = 'Laporan_' + st._judul.replace(/\W+/g, '_') + '_' + dari + '_' + sampai;
          tombolMuat(b, true, 'Menyiapkan…');
          try {
            if (d.v === 'xlsx') await Ekspor.xlsx(nama, [{ nama: st._judul, cols: def2.cols.map((c) => ({ label: c.label, v: c.x || c.v, w: c.w })), rows: def2.rows }]);
            else await Ekspor.pdf(nama, { judul: 'Laporan ' + st._judul, sub: periodeNama(dari) + ' – ' + periodeNama(sampai) + (tipeF ? ' · ' + D.tipe(tipeF).Nama_Tipe : ''), cols: def2.cols.map((c) => ({ label: c.label, v: c.v, r: c.r })), rows: def2.rows, ringkas: def2.ringkas });
            toast('Berkas diunduh.');
          } catch (e) { toast(e.message, 'err'); }
          tombolMuat(b, false);
        }
      });
    }
  };
  function definisiTabel(tab, x) {
    const n = (v) => Number(v || 0);
    if (tab === 'bayar') return { rows: x.byr.slice().sort((a, b) => String(b.Tgl_Bayar).localeCompare(String(a.Tgl_Bayar))), total: rp(x.byr.reduce((s, b) => s + n(b.Nominal), 0)),
      ringkas: [['Jumlah transaksi', x.byr.length], ['Total diterima', rp(x.byr.reduce((s, b) => s + n(b.Nominal), 0))]],
      cols: [{ label: 'No. kuitansi', v: (b) => b.No_Kuitansi, w: 18 }, { label: 'Tanggal', v: (b) => tgl(b.Tgl_Bayar, 1) }, { label: 'Penghuni', v: (b) => D.penghuni(b.ID_Penghuni).Nama, w: 22 },
        { label: 'Tagihan', v: (b) => { const t = S.by('Tagihan', b.ID_Tagihan) || {}; return (t.Jenis || '') + ' ' + periodeNama(t.Periode, 1); } }, { label: 'Metode', v: (b) => b.Metode },
        { label: 'Nominal', v: (b) => rp(b.Nominal), x: (b) => n(b.Nominal), r: 1, h: (b) => '<span class="num">' + rp(b.Nominal) + '</span>' }] };
    if (tab === 'okupansi') {
      const rows = S.rows('Tipe_Kamar').filter((t) => !x.tipeF || t.ID_Tipe === x.tipeF).map((t) => { const ks = D.kamarList().filter((k) => k.ID_Tipe === t.ID_Tipe); return { t, total: ks.length, terisi: ks.filter((k) => k.Status === 'Terisi').length, kosong: ks.filter((k) => k.Status === 'Kosong').length, renov: ks.filter((k) => k.Status === 'Renovasi').length }; });
      return { rows, ringkas: [['Total kamar', rows.reduce((s, r) => s + r.total, 0)], ['Terisi', rows.reduce((s, r) => s + r.terisi, 0)]],
        cols: [{ label: 'Tipe kamar', v: (r) => r.t.Nama_Tipe, w: 22 }, { label: 'Total', v: (r) => r.total, r: 1 }, { label: 'Terisi', v: (r) => r.terisi, r: 1 }, { label: 'Kosong', v: (r) => r.kosong, r: 1 }, { label: 'Renovasi', v: (r) => r.renov, r: 1 },
          { label: 'Okupansi', v: (r) => (r.total ? Math.round(r.terisi * 100 / r.total) : 0) + '%', r: 1, h: (r) => { const p = r.total ? Math.round(r.terisi * 100 / r.total) : 0; return '<div class="row" style="min-width:140px"><div class="prog" style="flex:1;height:10px"><i style="width:' + p + '%"></i></div><b class="num">' + p + '%</b></div>'; } },
          { label: 'Harga bulanan', v: (r) => rp(r.t.Harga_Bulanan), x: (r) => n(r.t.Harga_Bulanan), r: 1 }] };
    }
    if (tab === 'pengeluaran') return { rows: x.pgl.slice().sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal))), total: rp(x.pgl.reduce((s, g) => s + n(g.Nominal), 0)), ringkas: [['Total pengeluaran', rp(x.pgl.reduce((s, g) => s + n(g.Nominal), 0))]],
      cols: [{ label: 'Tanggal', v: (g) => tgl(g.Tanggal, 1) }, { label: 'Kategori', v: (g) => g.Kategori }, { label: 'Keterangan', v: (g) => g.Keterangan, w: 30 }, { label: 'Disetujui', v: (g) => g.Disetujui_Oleh },
        { label: 'Nominal', v: (g) => rp(g.Nominal), x: (g) => n(g.Nominal), r: 1, h: (g) => '<span class="num">' + rp(g.Nominal) + '</span>' }] };
    if (tab === 'labarugi') {
      const rows = x.bulan.map((p, i) => ({ p, masuk: x.kas[i].masuk, keluar: x.kas[i].keluar, laba: x.kas[i].laba, okp: x.okp[i] }));
      const tm = rows.reduce((s, r) => s + r.masuk, 0), tk = rows.reduce((s, r) => s + r.keluar, 0);
      return { rows, total: rp(tm - tk), ringkas: [['Pendapatan', rp(tm)], ['Beban', rp(tk)], ['Laba bersih', rp(tm - tk)], ['Margin', tm ? Math.round((tm - tk) * 100 / tm) + '%' : '-']],
        cols: [{ label: 'Bulan', v: (r) => periodeNama(r.p) }, { label: 'Pendapatan sewa', v: (r) => rp(r.masuk), x: (r) => r.masuk, r: 1 }, { label: 'Beban operasional', v: (r) => rp(r.keluar), x: (r) => r.keluar, r: 1 },
          { label: 'Laba bersih', v: (r) => rp(r.laba), x: (r) => r.laba, r: 1, h: (r) => '<b class="num" style="color:' + (r.laba < 0 ? '#a1191e' : '#111') + '">' + rp(r.laba) + '</b>' }, { label: 'Margin', v: (r) => r.masuk ? Math.round(r.laba * 100 / r.masuk) + '%' : '-', r: 1 }, { label: 'Okupansi', v: (r) => r.okp + '%', r: 1 }] };
    }
    if (tab === 'promosi') {
      const m = {}; S.rows('Statistik').filter((s) => String(s.Tanggal).slice(0, 7) >= x.bulan[0] && String(s.Tanggal).slice(0, 7) <= x.bulan[x.bulan.length - 1]).forEach((s) => { const r = m[s.Tanggal] || (m[s.Tanggal] = { tgl: s.Tanggal, kunjungan: 0, klik: 0 }); if (s.Kunci === 'kunjungan') r.kunjungan += n(s.Nilai); else if (/^klik_wa/.test(s.Kunci)) r.klik += n(s.Nilai); });
      const rows = Object.values(m).sort((a, b) => b.tgl.localeCompare(a.tgl)), k = rows.reduce((s, r) => s + r.klik, 0), v = rows.reduce((s, r) => s + r.kunjungan, 0);
      return { rows, total: k + ' klik WA dari ' + v + ' kunjungan', ringkas: [['Kunjungan landing', v], ['Klik WhatsApp', k], ['Rasio klik', v ? Math.round(k * 100 / v) + '%' : '-']],
        cols: [{ label: 'Tanggal', v: (r) => tgl(r.tgl, 1) }, { label: 'Kunjungan', v: (r) => r.kunjungan, r: 1 }, { label: 'Klik WhatsApp', v: (r) => r.klik, r: 1 }, { label: 'Rasio', v: (r) => r.kunjungan ? Math.round(r.klik * 100 / r.kunjungan) + '%' : '-', r: 1 }] };
    }
    const rows = x.tag.slice().sort((a, b) => String(b.Periode).localeCompare(String(a.Periode)) || String(D.penghuni(a.ID_Penghuni).Nama).localeCompare(String(D.penghuni(b.ID_Penghuni).Nama)));
    const sum = (f) => rows.filter(f).reduce((s, t) => s + n(t.Nominal), 0);
    return { rows, total: rp(sum(() => true)), ringkas: [['Total tagihan', rp(sum(() => true))], ['Lunas', rp(sum((t) => t.Status === 'Lunas'))], ['Belum/telat', rp(sum((t) => ['Belum', 'Telat'].indexOf(D.stTag(t)) > -1))], ['Jumlah', rows.length]],
      cols: [{ label: 'Periode', v: (t) => periodeNama(t.Periode, 1) }, { label: 'Penghuni', v: (t) => D.penghuni(t.ID_Penghuni).Nama, w: 22 }, { label: 'Kamar', v: (t) => D.kamar(t.ID_Kamar).No_Kamar }, { label: 'Tipe', v: (t) => D.tipe(D.kamar(t.ID_Kamar).ID_Tipe).Nama_Tipe },
        { label: 'Jenis', v: (t) => t.Jenis }, { label: 'Jatuh tempo', v: (t) => tgl(t.Jatuh_Tempo, 1) }, { label: 'Status', v: (t) => D.stTag(t), h: (t) => D.badgeTag(D.stTag(t)) },
        { label: 'Nominal', v: (t) => rp(t.Nominal), x: (t) => n(t.Nominal), r: 1, h: (t) => '<span class="num">' + rp(t.Nominal) + '</span>' }] };
  }

  // ======================= WHATSAPP & NOTIFIKASI =======================
  V.staf.wa = { judul: 'WhatsApp & Notifikasi', tabel: [],
    render(el, q, st) {
      const owner = D.owner(), tab = q.tab || 'blast';
      const tabs = [['blast', '📣 Blast WhatsApp'], ['antrean', '📬 Antrean & Riwayat']].concat(owner ? [['konfig', '⚙️ Konfigurasi']] : []);
      el.innerHTML = U.page('WhatsApp & Notifikasi', 'Gateway Fonnte · notifikasi otomatis lewat antrean, kirim per batch anti-banned') + U.tabs(tabs, tab) + '<div id="wa-isi"><div class="sk" style="height:300px"></div></div>';
      U.delegasi(el, { tab: (d) => ke('wa', { tab: d.v }) });
      const isi = $('#wa-isi');
      if (tab === 'antrean') return tabAntrean(isi, st);
      if (tab === 'konfig' && owner) return tabKonfig(isi, st);
      return tabBlast(isi, st);
    }
  };
  async function tabBlast(el, st) {
    st.b = st.b || { sumber: 'penghuni', batch: Number(S.set.WA_BATCH_DEFAULT) || 20, jeda: S.set.WA_JEDA_DETIK || '5', pesan: 'Halo {nama} 👋\n\n', judul: '', hanyaWA: false, pilih: {} };
    const b = st.b;
    const gambar = () => {
      const aktif = S.srv.waAktif, rows = b.rows || [], valid = rows.filter((r) => r.valid && !r.ganda && !r.optOut && (!b.hanyaWA || r.statusWA === 'Terdaftar'));
      const dipilih = valid.filter((r) => b.pilih[r.hp] !== false), jedaRata = String(b.jeda).split('-').map(Number).reduce((s, x, i, a) => s + x / a.length, 0) || 5;
      const nBatch = Math.ceil(dipilih.length / b.batch), menit = Math.ceil(nBatch * Math.max(60, b.batch * jedaRata) / 60);
      const contoh = (rows.find((r) => r.valid) || { nama: 'Budi', vars: { kamar: 'A01', tunggakan: 'Rp 1.500.000' } });
      const pv = String(b.pesan).replace(/\{(\w+)\}/g, (m, k) => k === 'nama' ? contoh.nama || 'Bapak/Ibu' : k === 'usaha' ? S.set.NAMA_USAHA || '' : k === 'link' ? location.href.split('#')[0] : (contoh.vars && contoh.vars[k]) || m);
      const berjalan = (b.blasts || []).filter((x) => x.Status === 'Berjalan');
      el.innerHTML = (!aktif ? '<div class="note warn mb">' + icon('alert') + '<span>WhatsApp belum aktif. ' + (D.owner() ? 'Isi token Fonnte & nyalakan saklar di tab <a href="#/wa?tab=konfig">Konfigurasi</a>.' : 'Minta Owner mengaktifkan di menu WhatsApp → Konfigurasi.') + '</span></div>' : '') +
        berjalan.map((x) => '<div class="card float mb" style="background:var(--violet-t)"><div class="row between wrap"><div><span class="badge violet">Berjalan</span><h3 class="h-sm mt-s">' + esc(x.Judul) + '</h3><div class="small">' + x.Terkirim + ' terkirim · ' + x.Gagal + ' gagal · ' + x.sisa + ' sisa · batch ' + x.UkuranBatch + ' · jeda ' + esc(x.JedaDetik) + ' dtk</div></div>' +
          '<div class="row wrap"><label class="switch small"><input type="checkbox" data-ch="auto" data-id="' + esc(x.BlastID) + '"' + (b.auto === x.BlastID ? ' checked' : '') + '><span class="tr"></span>Otomatis' + (b.auto === x.BlastID && b.hitung ? ' (' + b.hitung + 's)' : '') + '</label><button class="btn sm" data-act="batchLagi" data-id="' + esc(x.BlastID) + '">▶ Kirim batch berikutnya</button><button class="btn sm danger" data-act="stop" data-id="' + esc(x.BlastID) + '">⏹ Hentikan</button></div></div>' +
          '<div class="prog mt"><i style="width:' + x.persen + '%"></i></div><p class="xs muted mt-s">Server tetap mengirim 1 batch/menit walau halaman ini ditutup.</p></div>').join('') +
        '<div class="g2" style="align-items:start"><div class="card"><h3 class="h-sm mb">1. Pilih sasaran</h3><div class="grid-f">' +
        U.fld('b-sumber', 'Sumber', U.sel('b-sumber', U.opsi([['penghuni', 'Semua penghuni aktif'], ['tunggakan', 'Penghuni dengan tunggakan'], ['crm', 'CRM kontak (semua segmen)'], ['manual', 'Tempel manual']], b.sumber), 'data-ch="sumber"')) +
        (b.sumber === 'crm' ? U.fld('b-segmen', 'Segmen', U.sel('b-segmen', U.opsi(['Penghuni', 'Calon Penghuni', 'Staf', 'Lainnya'], b.segmen, 'Semua'), 'data-ch="segmen"')) : '<div></div>') +
        (b.sumber === 'manual' ? U.fld('b-teks', 'Nomor (satu per baris: 0812…|Nama)', U.ta('b-teks', b.teks, 'data-in="teks" placeholder="081234567890|Budi"'), 'full') : '') + '</div>' +
        '<div class="row wrap mt"><button class="btn sm" data-act="muat">' + icon('users', 'sm') + ' Muat penerima</button><button class="btn sm ghost" data-act="deteksi"' + (rows.length ? '' : ' disabled') + '>' + icon('phoneapp', 'sm') + ' Deteksi nomor WA</button></div>' +
        (b.ring ? '<div class="chips mt">' + [['Total', b.ring.total], ['Valid', b.ring.valid], ['Tidak valid', b.ring.tidakValid], ['Ganda', b.ring.ganda], ['Terdaftar WA', b.ring.terdaftarWA], ['Bukan WA', b.ring.tidakTerdaftarWA], ['Opt-out', b.ring.optOut]].map((c) => '<span class="chip">' + c[0] + ' <b>' + c[1] + '</b></span>').join('') + '</div>' +
          '<label class="check small mt"><input type="checkbox" data-ch="hanyaWA"' + (b.hanyaWA ? ' checked' : '') + '> Kirim hanya ke nomor terdeteksi WhatsApp</label>' : '') +
        (rows.length ? '<div class="tbl-wrap mt" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th></th><th>Nama</th><th>Nomor</th><th>WA</th></tr></thead><tbody>' + rows.slice(0, 300).map((r) => {
          const ok = r.valid && !r.ganda && !r.optOut; return '<tr style="' + (ok ? '' : 'opacity:.45') + '"><td><input type="checkbox" data-ch="pilih" data-hp="' + esc(r.hp) + '"' + (ok && b.pilih[r.hp] !== false ? ' checked' : '') + (ok ? '' : ' disabled') + ' aria-label="Pilih ' + esc(r.nama) + '"></td><td>' + esc(r.nama || '-') + (r.optOut ? ' <span class="badge mute">opt-out</span>' : '') + '</td><td class="mono">' + esc(r.hp || '-') + '</td><td>' +
            (r.statusWA === 'Terdaftar' ? '<span class="wa-badge ya">✓ WA</span>' : r.statusWA === 'Tidak Terdaftar' ? '<span class="wa-badge tidak">✕ bukan WA</span>' : '<span class="wa-badge belum">? belum dicek</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (rows.length > 300 ? '<p class="xs muted mt-s">Menampilkan 300 dari ' + rows.length + '.</p>' : '') : '') + '</div>' +
        '<div class="card"><h3 class="h-sm mb">2. Tulis pesan</h3>' + U.fld('b-judul', 'Judul internal', U.inp('b-judul', b.judul, 'data-in="judul" placeholder="Info kamar kosong November"')) +
        '<div class="row wrap mt" style="gap:6px">' + ['nama', 'kamar', 'tunggakan', 'usaha', 'link'].map((v) => '<button class="btn xs ghost" data-act="var" data-v="{' + v + '}">{' + v + '}</button>').join('') + '</div>' +
        '<textarea class="inp mt-s" id="b-pesan" data-in="pesan" rows="6" aria-label="Isi pesan">' + esc(b.pesan) + '</textarea>' +
        '<div class="lbl mt">Pratinjau</div><div class="wa-preview mt-s" id="pv">' + esc(pv) + '</div>' +
        '<h3 class="h-sm mt-l mb">3. Ukuran batch & jeda</h3><div class="row wrap">' + U.seg('batch', [10, 20, 50], b.batch) + '<label class="row small b">Jeda <input class="inp" style="width:80px;min-height:38px" data-in="jeda" value="' + esc(b.jeda) + '" aria-label="Jeda detik"> dtk</label></div>' +
        '<p class="small mt">' + dipilih.length + ' penerima → ' + nBatch + ' batch · ±' + menit + ' menit</p>' +
        '<button class="btn lime block mt" data-act="mulai"' + (dipilih.length && aktif ? '' : ' disabled') + '>🚀 Mulai blast (' + dipilih.length + ' nomor)</button>' +
        '<p class="xs muted mt-s">Tips anti-banned: mulai batch 10, jeda acak ≥5 detik (mis. 5-10), pakai nomor yang sudah "hangat", hindari link yang sama ke ratusan orang dalam 1 jam.</p></div></div>' +
        '<div class="card mt-l"><h3 class="h-sm mb">Riwayat blast</h3>' + U.tabel([{ label: 'Judul', v: (x) => '<b>' + esc(x.Judul) + '</b><div class="xs muted">' + tglJam(x.Tanggal) + ' · ' + esc(x.DibuatOleh) + '</div>' },
          { label: 'Batch·jeda', v: (x) => x.UkuranBatch + ' · ' + esc(x.JedaDetik) + 's' }, { label: 'Progres', v: (x) => '<div class="row" style="min-width:150px"><div class="prog" style="flex:1;height:10px"><i style="width:' + x.persen + '%"></i></div><span class="xs">' + x.Terkirim + '/' + x.Total + '</span></div>' },
          { label: 'Status', v: (x) => '<span class="badge ' + ({ Berjalan: 'violet', Selesai: 'ok', Dihentikan: 'mute' }[x.Status] || 'mute') + '">' + esc(x.Status) + '</span>' }], b.blasts || [], { kosong: 'Belum ada blast', ilus: 'megaphone', per: 20 }) + '</div>';
    };
    const perbaruiPv = () => { const pv = $('#pv'); if (pv) { const c = (b.rows || []).find((r) => r.valid) || { nama: 'Budi', vars: { kamar: 'A01', tunggakan: 'Rp 1.500.000' } }; pv.textContent = String(b.pesan).replace(/\{(\w+)\}/g, (m, k) => k === 'nama' ? c.nama || 'Bapak/Ibu' : k === 'usaha' ? S.set.NAMA_USAHA || '' : k === 'link' ? location.href.split('#')[0] : (c.vars && c.vars[k]) || m); } };
    const muatBlast = async () => { const r = await API.call('wa.blastList', {}); if (r.success) { b.blasts = r.data; if (el.isConnected) gambar(); } };
    U.delegasi(el, {
      sumber: (v) => { b.sumber = v; b.rows = null; b.ring = null; gambar(); }, segmen: (v) => { b.segmen = v; }, teks: (v) => { b.teks = v; },
      judul: (v) => { b.judul = v; }, pesan: (v) => { b.pesan = v; perbaruiPv(); }, jeda: (v) => { b.jeda = v; },
      batch: (d) => { b.batch = Number(d.v); gambar(); }, hanyaWA: (v) => { b.hanyaWA = v; gambar(); }, pilih: (v, t) => { b.pilih[t.dataset.hp] = v; gambar(); },
      var: (d) => { const ta = $('#b-pesan'), s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + d.v + ta.value.slice(s); b.pesan = ta.value; ta.focus(); perbaruiPv(); },
      muat: async (d, btn) => { tombolMuat(btn, true, 'Memuat…'); const r = await API.call('wa.audience', { sumber: b.sumber, segmen: b.segmen, teks: b.teks }); tombolMuat(btn, false); if (!r.success) return toast(r.message, 'err'); b.rows = r.data.rows; b.ring = r.data.ringkas; b.pilih = {}; gambar(); },
      deteksi: async (d, btn) => {
        const nomor = Array.from(new Set((b.rows || []).filter((r) => r.valid).map((r) => r.hp))); if (!nomor.length) return;
        for (let i = 0; i < nomor.length; i += 50) {
          tombolMuat(btn, true, 'Mengecek ' + Math.min(i + 50, nomor.length) + '/' + nomor.length);
          const r = await API.call('wa.validate', { nomor: nomor.slice(i, i + 50) });
          if (!r.success) { tombolMuat(btn, false); return toast(r.message, 'err'); }
          (b.rows || []).forEach((x) => { const s = r.data.peta[x.hp]; if (s) x.statusWA = s; });
        }
        tombolMuat(btn, false); toast('Deteksi nomor WA selesai.'); gambar();
      },
      mulai: async (d, btn) => {
        const list = (b.rows || []).filter((r) => r.valid && !r.ganda && !r.optOut && (!b.hanyaWA || r.statusWA === 'Terdaftar') && b.pilih[r.hp] !== false);
        if (!(await konfirmasi('Kirim blast ke <b>' + list.length + ' nomor</b> dalam batch ' + b.batch + ' dengan jeda ' + esc(b.jeda) + ' detik?', { ok: 'Mulai blast' }))) return;
        const r = await aksi('wa.blastCreate', { judul: b.judul, pesan: b.pesan, ukuranBatch: b.batch, jeda: b.jeda, sasaran: b.sumber, penerima: list.map((x) => ({ id: x.id, nama: x.nama, hp: x.hp, vars: x.vars })) }, { btn });
        if (r.success) { await API.call('wa.blastProcess', { blastId: r.data.blastId }); muatBlast(); }
      },
      batchLagi: async (d, btn) => { tombolMuat(btn, true, 'Mengirim…'); const r = await API.call('wa.blastProcess', { blastId: d.id }); tombolMuat(btn, false); if (r.success) { toast('Batch terkirim: ' + r.data.Terkirim + '/' + r.data.Total); muatBlast(); } else toast(r.message, 'err'); },
      stop: async (d) => { if (await konfirmasi('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { bahaya: true, ok: 'Hentikan' })) { b.auto = null; await aksi('wa.blastStop', { blastId: d.id }); muatBlast(); } },
      auto: (v, t) => {
        clearInterval(b.timer); b.auto = v ? t.dataset.id : null; b.hitung = 0;
        if (!v) return gambar();
        const x = (b.blasts || []).find((y) => y.BlastID === t.dataset.id), jr = String(x.JedaDetik).split('-').map(Number).reduce((s, q, i, a) => s + q / a.length, 0) || 5, dtk = Math.max(30, Math.round(x.UkuranBatch * jr));
        b.hitung = dtk;
        b.timer = setInterval(async () => {
          if (!el.isConnected || !b.auto) return clearInterval(b.timer);
          b.hitung--; const lab = el.querySelector('[data-ch="auto"][data-id="' + b.auto + '"]'); if (lab) lab.parentElement.lastChild.textContent = 'Otomatis (' + b.hitung + 's)';
          if (b.hitung <= 0) { b.hitung = dtk; const r = await API.call('wa.blastProcess', { blastId: b.auto }); if (r.success && r.data.Status !== 'Berjalan') { b.auto = null; clearInterval(b.timer); toast('Blast selesai 🎉'); } muatBlast(); }
        }, 1000);
        gambar();
      }
    });
    gambar(); muatBlast();
  }
  async function tabAntrean(el, st) {
    st.a = st.a || { status: '', kanal: '' };
    const a = st.a;
    const muat = async () => { const r = await API.call('notif.queue', { status: a.status, kanal: a.kanal }); if (r.success) { a.data = r.data; if (el.isConnected) gambar(); } else el.innerHTML = '<div class="note bad">' + esc(r.message) + '</div>'; };
    const gambar = () => {
      const d = a.data || { rows: [], ringkas: {} }, rg = d.ringkas;
      el.innerHTML = '<div class="g4 mb">' + [['Menunggu', (rg.Antri || 0) + (rg.Proses || 0), ''], ['Terkirim', rg.Terkirim || 0, 'on'], ['Gagal', rg.Gagal || 0, ''], ['Dibatalkan', rg.Batal || 0, '']].map((k) => '<div class="kpi ' + k[2] + '"><span class="lbl">' + k[0] + '</span><span class="v">' + k[1] + '</span></div>').join('') + '</div>' +
        '<div class="toolbar">' + U.seg('st', [['', 'Semua'], 'Antri', 'Terkirim', 'Gagal', 'Batal'], a.status) + U.seg('kn', [['', 'Semua kanal'], ['WA', 'WhatsApp'], ['EMAIL', 'Email']], a.kanal) + '<span class="sp"></span><button class="btn sm" data-act="proses">' + icon('send', 'sm') + ' Proses sekarang</button>' + (D.owner() && rg.Gagal ? '<button class="btn sm ghost" data-act="ulang">' + icon('refresh', 'sm') + ' Ulangi yang gagal</button>' : '') + '<button class="btn sm ghost icon" data-act="segar" aria-label="Segarkan">' + icon('refresh', 'sm') + '</button></div>' +
        U.tabel([{ label: 'Waktu', cls: 'nw', v: (r) => tglJam(r.DikirimPada || r.DibuatPada) }, { label: 'Kanal', v: (r) => '<span class="badge ' + (r.Kanal === 'WA' ? 'lime' : 'violet') + '">' + esc(r.Kanal) + '</span>' },
          { label: 'Tujuan', v: (r) => '<span class="mono">' + esc(r.Tujuan) + '</span><div class="xs muted">' + esc(r.NamaPenerima || '') + '</div>' }, { label: 'Event', v: (r) => '<span class="xs b">' + esc(r.Event) + '</span>' },
          { label: 'Pesan', v: (r) => '<span class="small">' + esc(r.Pesan) + '</span>' }, { label: 'Status', v: (r) => '<span class="badge ' + ({ Terkirim: 'ok', Antri: 'yellow', Proses: 'violet', Gagal: 'bad', Batal: 'mute' }[r.Status] || 'mute') + '">' + esc(r.Status) + '</span>' + (r.Respon ? '<div class="xs muted">' + esc(r.Respon) + '</div>' : '') }],
          d.rows, { kosong: 'Antrean kosong', kosongSub: 'Notifikasi otomatis & blast akan tercatat di sini.', ilus: 'envelope' });
    };
    U.delegasi(el, {
      st: (d) => { a.status = d.v; muat(); }, kn: (d) => { a.kanal = d.v; muat(); }, segar: () => muat(),
      proses: async (d, b) => { tombolMuat(b, true, 'Memproses…'); const r = await API.call('notif.processNow', {}); tombolMuat(b, false); if (r.success) toast('Terkirim: ' + r.data.wa + ' WA, ' + r.data.email + ' email' + (r.data.gagal ? ', ' + r.data.gagal + ' gagal' : '')); else toast(r.message, 'err'); muat(); },
      ulang: async () => { await aksi('notif.retry', {}); muat(); }
    });
    if (a.data) gambar(); muat();
  }
  async function tabKonfig(el, st) {
    const r = await API.call('notif.config', {});
    if (!r.success) { el.innerHTML = '<div class="note bad">' + esc(r.message) + '</div>'; return; }
    const c = r.data, mtx = JSON.parse(JSON.stringify(c.matriks));
    const gambar = () => {
      el.innerHTML = '<div class="g2" style="align-items:start"><div class="card"><div class="row between"><h3 class="h-sm">' + img3d('phone', 'i3d') + ' WhatsApp (Fonnte)</h3><label class="switch"><input type="checkbox" id="k-wa"' + (c.waAktif ? ' checked' : '') + '><span class="tr"></span>' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</label></div>' +
        '<div class="col mt">' + U.fld('k-token', 'Token Fonnte', '<input class="inp" id="k-token" type="password" autocomplete="off" placeholder="' + esc(c.tokenAda ? c.token + ' (tersimpan)' : 'Tempel token dari fonnte.com → Device') + '">', '', 'Disimpan di Script Properties (tidak di Sheets). Kosongkan = tidak diubah.') +
        '<div class="row wrap"><button class="btn sm ghost" data-act="device">' + icon('phoneapp', 'sm') + ' Cek perangkat</button><input class="inp" style="max-width:170px;min-height:36px" id="k-tes" placeholder="08… tujuan tes" inputmode="tel"><button class="btn sm ghost" data-act="tesWa">Kirim tes WA</button></div><div id="k-dev" class="small"></div>' +
        '<div class="grid-f">' + U.fld('k-batch', 'Batch blast bawaan', U.sel('k-batch', U.opsi([10, 20, 50], c.batchDefault))) + U.fld('k-jeda', 'Jeda (detik)', U.inp('k-jeda', c.jeda, 'placeholder="5 atau 3-8"')) + '</div>' +
        '<label class="switch small"><input type="checkbox" id="k-det"' + (c.deteksiOtomatis ? ' checked' : '') + '><span class="tr"></span>Deteksi otomatis nomor kontak baru terdaftar WA</label></div></div>' +
        '<div class="card"><div class="row between"><h3 class="h-sm">' + img3d('envelope', 'i3d') + ' Email (Gmail)</h3><label class="switch"><input type="checkbox" id="k-em"' + (c.emailAktif ? ' checked' : '') + '><span class="tr"></span>' + (c.emailAktif ? 'AKTIF' : 'NONAKTIF') + '</label></div>' +
        '<div class="col mt"><div class="chip">Sisa kuota email hari ini: <b>' + c.kuotaEmail + '</b></div>' + U.fld('k-nama', 'Nama pengirim', U.inp('k-nama', c.namaPengirim)) +
        '<div class="row wrap"><input class="inp" style="max-width:220px;min-height:36px" id="k-tesem" placeholder="email tujuan tes" type="email"><button class="btn sm ghost" data-act="tesEm">Kirim tes email</button></div>' +
        '<div class="small">' + icon(c.triggerAktif ? 'check' : 'alert', 'sm') + ' Pekerja antrean (trigger 1 menit): <b>' + (c.triggerAktif ? 'aktif' : 'belum terpasang — jalankan pasangTrigger() di editor') + '</b></div>' +
        '<div class="small">' + icon('ext', 'sm') + ' URL portal untuk {link}: <span class="mono">' + esc(c.appUrl || '(terisi otomatis saat admin login)') + '</span></div></div></div></div>' +
        '<div class="card mt-l"><div class="card-h"><div><h3 class="h-sm">Matriks notifikasi otomatis</h3><p class="small muted">Pilih kejadian mana yang dikirim lewat WA dan/atau email. Saklar kanal mati = kolom nonaktif.</p></div></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th>Penerima</th><th class="c">WA</th><th class="c">Email</th><th></th></tr></thead><tbody>' +
        Object.keys(mtx).map((k) => { const m = mtx[k]; return '<tr><td><b>' + esc(m.label) + '</b><div class="xs muted mono">' + k + '</div></td><td class="small">' + esc({ penghuni: 'Penghuni', admin: 'Owner + operator', owner: 'Owner', operator: 'Operator' }[m.ke] || m.ke) + '</td>' +
          '<td class="c"><label class="switch"><input type="checkbox" data-mx="' + k + '" data-k="wa"' + (m.wa ? ' checked' : '') + (c.waAktif ? '' : ' disabled') + ' aria-label="WA ' + esc(m.label) + '"><span class="tr"></span></label></td>' +
          '<td class="c"><label class="switch"><input type="checkbox" data-mx="' + k + '" data-k="email"' + (m.email ? ' checked' : '') + (c.emailAktif ? '' : ' disabled') + ' aria-label="Email ' + esc(m.label) + '"><span class="tr"></span></label></td>' +
          '<td class="act"><button class="btn xs ghost" data-act="ubahTpl" data-v="' + k + '">' + icon('edit', 'sm') + ' Ubah</button></td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div class="row mt-l" style="justify-content:flex-end"><button class="btn lime" data-act="simpan">💾 Simpan konfigurasi</button></div>';
    };
    gambar();
    el.onchange = (e) => {
      const t = e.target;
      if (t.dataset.mx) mtx[t.dataset.mx][t.dataset.k] = t.checked;
      if (t.id === 'k-wa') { c.waAktif = t.checked; gambar(); } if (t.id === 'k-em') { c.emailAktif = t.checked; gambar(); }
    };
    el.onclick = async (e) => {
      const a = e.target.closest('[data-act]'); if (!a) return; const v = a.dataset.act;
      if (v === 'device') { tombolMuat(a, true, 'Mengecek…'); const r2 = await API.call('wa.device', {}); tombolMuat(a, false); $('#k-dev').innerHTML = r2.success ? '<div class="note ' + (r2.data.status === 'connect' ? 'ok' : 'warn') + '">Perangkat <b>' + esc(r2.data.device) + '</b> · status <b>' + esc(r2.data.status) + '</b> · paket ' + esc(r2.data.paket) + ' · kuota ' + esc(r2.data.kuota) + '</div>' : '<div class="note bad">' + esc(r2.message) + '</div>'; }
      if (v === 'tesWa') { const n = $('#k-tes').value; if (!hpValid(n)) return toast('Nomor tujuan tidak valid.', 'err'); tombolMuat(a, true, 'Mengirim…'); const r2 = await API.call('wa.test', { nomor: n }); tombolMuat(a, false); toast(r2.message, r2.success ? 'ok' : 'err'); }
      if (v === 'tesEm') { const n = $('#k-tesem').value; if (!emailValid(n)) return toast('Email tujuan tidak valid.', 'err'); tombolMuat(a, true, 'Mengirim…'); const r2 = await API.call('email.test', { email: n }); tombolMuat(a, false); toast(r2.message, r2.success ? 'ok' : 'err'); }
      if (v === 'ubahTpl') ubahTemplate(a.dataset.v, mtx);
      if (v === 'simpan') {
        const d = { waAktif: $('#k-wa').checked, emailAktif: $('#k-em').checked, batchDefault: Number($('#k-batch').value), jeda: $('#k-jeda').value.trim(), deteksiOtomatis: $('#k-det').checked, namaPengirim: $('#k-nama').value.trim(), matriks: mtx };
        const tok = $('#k-token').value.trim(); if (tok) d.token = tok;
        const r2 = await aksi('notif.configSave', d, { btn: a });
        if (r2.success) { $('#k-token').value = ''; S.srv.waAktif = r2.data.waAktif && r2.data.tokenAda; S.srv.emailAktif = r2.data.emailAktif; Object.assign(c, r2.data); gambar(); }
      }
    };
  }
  function ubahTemplate(k, mtx) {
    const m0 = mtx[k], vars = Array.from(new Set((m0.pesanDefault + m0.subjekDefault).match(/\{\w+\}/g) || []));
    const m = modal({ title: m0.label, size: 'lg', body: U.fld('t-subjek', 'Subjek email', U.inp('t-subjek', m0.subjek)) + '<div class="fld mt"><label for="t-pesan">Isi pesan (WA & email)</label><textarea class="inp" id="t-pesan" rows="8">' + esc(m0.pesan) + '</textarea><span class="hint">Variabel: ' + vars.map((x) => '<code>' + esc(x) + '</code>').join(' ') + ' · *teks* = tebal di WA</span></div>' +
      '<div class="lbl mt">Pratinjau</div><div class="wa-preview mt-s" id="t-pv"></div>', footer: '<button class="btn ghost" id="t-reset">↺ Kembalikan bawaan</button><button class="btn" id="t-ok">Pakai</button>' });
    const pv = () => { m.$('#t-pv').textContent = m.$('#t-pesan').value.replace(/\{(\w+)\}/g, (x, n) => ({ nama: 'Budi', usaha: S.set.NAMA_USAHA || 'Kos', periode: 'November 2026', nominal: 'Rp 1.500.000', jatuhTempo: '5 November 2026', jenis: 'Sewa', kamar: 'A01' }[n] || x)); };
    m.$('#t-pesan').oninput = pv; pv();
    m.$('#t-reset').onclick = () => { m.$('#t-pesan').value = m0.pesanDefault; m.$('#t-subjek').value = m0.subjekDefault; pv(); };
    m.$('#t-ok').onclick = () => { m0.pesan = m.$('#t-pesan').value; m0.subjek = m.$('#t-subjek').value; m.close(); toast('Template diperbarui — klik "Simpan konfigurasi".', 'info'); };
  }

  // ======================= CRM KONTAK =======================
  V.staf.crm = { judul: 'CRM Kontak', tabel: [],
    render(el, q, st) {
      const key = 'jk_crm_' + Math.abs(JK.hash(S.me.email));
      if (!st.crm) st.crm = LS.get(key, null);
      st.pilih = st.pilih || {};
      const gambar = () => {
        const all = st.crm ? st.crm.rows.filter((k) => String(k.Tag).indexOf('merged→') === -1) : [];
        const dupKey = {}; all.forEach((k) => { [hp08(k.NoWA), String(k.Email || '').toLowerCase()].filter(Boolean).forEach((x) => { dupKey[x] = (dupKey[x] || 0) + 1; }); });
        const isDup = (k) => (k.NoWA && dupKey[hp08(k.NoWA)] > 1) || (k.Email && dupKey[String(k.Email).toLowerCase()] > 1);
        const kpi = { total: all.length, wa: all.filter((k) => k.StatusWA === 'Terdaftar').length, email: all.filter((k) => k.EmailValid === 'YA').length, belum: all.filter((k) => hpValid(k.NoWA) && !k.StatusWA).length, opt: all.filter((k) => k.OptOut === 'YA').length, dup: all.filter(isDup).length };
        const seg = {}; all.forEach((k) => { seg[k.Segmen] = (seg[k.Segmen] || 0) + 1; });
        const tags = Array.from(new Set(all.flatMap((k) => String(k.Tag || '').split(',').map((x) => x.trim()).filter(Boolean))));
        const fk = st.fk || '', list = all.filter((k) => (!st.seg || k.Segmen === st.seg) && (!st.tag || String(k.Tag).split(',').map((x) => x.trim()).indexOf(st.tag) > -1) &&
          (!fk || (fk === 'wa' && k.StatusWA === 'Terdaftar') || (fk === 'email' && k.EmailValid === 'YA') || (fk === 'belum' && hpValid(k.NoWA) && !k.StatusWA) || (fk === 'opt' && k.OptOut === 'YA') || (fk === 'dup' && isDup(k))) && U.cocok(st.q, k.Nama, k.Email, k.NoWA))
          .sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
        const nPilih = Object.keys(st.pilih).filter((x) => st.pilih[x]).length;
        el.innerHTML = U.page('CRM Kontak', 'Nama · Email · WhatsApp dari penghuni, calon penghuni, staf & kontak manual' + (st.syncAt ? ' · sinkron ' + tglJam(new Date(st.syncAt).toISOString().replace('T', ' ')) : ''),
          '<button class="btn sm" data-act="sync">' + icon('refresh', 'sm') + ' Sinkron sekarang</button><button class="btn sm ghost" data-act="impor">' + icon('upload', 'sm') + ' Import CSV</button><button class="btn sm ghost" data-act="baru">' + icon('plus', 'sm') + ' Kontak</button>') +
          (!st.crm ? '<div class="sk" style="height:300px"></div>' :
            '<div class="stats mb" style="grid-template-columns:repeat(6,minmax(0,1fr))">' + [['', 'Total kontak', kpi.total, 'violet'], ['wa', 'WA terverifikasi', kpi.wa, 'lime'], ['email', 'Email valid', kpi.email, 'yellow'], ['belum', 'Belum dicek WA', kpi.belum, 'orange'], ['opt', 'Opt-out', kpi.opt, 'violet'], ['dup', 'Duplikat', kpi.dup, 'orange']]
              .map((k) => '<button class="stat tint-' + k[3] + '" data-act="fk" data-v="' + k[0] + '" style="' + (fk === k[0] ? 'outline:3px solid #111' : '') + '"><span><b>' + k[2] + '</b><span>' + k[1] + '</span></span></button>').join('') + '</div>' +
            '<div class="chips mb"><button class="chip" data-act="seg" data-v="" style="border:1.5px solid #111;' + (!st.seg ? 'background:#111;color:#fff' : '') + '">Semua ' + all.length + '</button>' + Object.keys(seg).map((s) => '<button class="chip" data-act="seg" data-v="' + esc(s) + '" style="border:1.5px solid #111;' + (st.seg === s ? 'background:#111;color:#fff' : '') + '">' + esc(s) + ' ' + seg[s] + '</button>').join('') + '</div>' +
            '<div class="toolbar">' + U.cari('q-crm', st.q, 'Cari nama, email, nomor') + (tags.length ? '<select class="inp pill" style="width:auto" data-ch="tag">' + U.opsi(tags, st.tag, 'Semua tag') + '</select>' : '') + '<span class="sp"></span>' +
            (nPilih ? '<span class="chip">' + nPilih + ' dipilih</span><button class="btn xs" data-act="bulk" data-v="deteksiWA">📱 Deteksi WA</button><button class="btn xs" data-act="bulk" data-v="tag">🏷 Tag</button><button class="btn xs" data-act="blastPilih">📣 Blast</button><button class="btn xs ghost" data-act="bulk" data-v="optout">⛔ Opt-out</button><button class="btn xs ghost" data-act="bulk" data-v="optin">Opt-in</button>' : '') +
            (D.owner() ? '<button class="btn xs ghost" data-act="ekspor">' + icon('download', 'sm') + ' Ekspor</button>' : '') + '</div>' +
            U.tabel([{ label: '', v: (k) => '<input type="checkbox" data-ch="pilih" data-id="' + esc(k.KontakID) + '"' + (st.pilih[k.KontakID] ? ' checked' : '') + ' aria-label="Pilih ' + esc(k.Nama) + '">' },
              { label: 'Kontak', v: (k) => '<button class="row linkbtn" style="text-decoration:none;text-align:left" data-act="detail" data-id="' + esc(k.KontakID) + '">' + U.avatar(k.Nama) + '<span><b>' + esc(k.Nama) + '</b><span class="xs muted" style="display:block">' + esc(k.Segmen) + (isDup(k) ? ' · <span style="color:#a1191e">duplikat</span>' : '') + '</span></span></button>' },
              { label: 'Email', v: (k) => k.Email ? esc(k.Email) + (k.EmailValid === 'YA' ? ' ✓' : ' ⚠') : '<span class="muted">-</span>' },
              { label: 'WhatsApp', v: (k) => k.NoWA ? '<a class="mono" href="' + waLink(k.NoWA) + '" target="_blank">' + esc(k.NoWA) + '</a> ' + (k.StatusWA === 'Terdaftar' ? '<span class="wa-badge ya">✓</span>' : k.StatusWA === 'Tidak Terdaftar' ? '<span class="wa-badge tidak">✕</span>' : '<span class="wa-badge belum">?</span>') : '<span class="muted">-</span>' },
              { label: 'Tag', v: (k) => (k.OptOut === 'YA' ? '<span class="badge mute">opt-out</span> ' : '') + String(k.Tag || '').split(',').filter(Boolean).map((t) => '<span class="chip">' + esc(t.trim()) + '</span>').join(' ') },
              { label: 'Dihubungi', v: (k) => k.TerakhirDihubungi ? tgl(k.TerakhirDihubungi, 1) + '<div class="xs muted">' + (k.JumlahPesan || 0) + ' pesan</div>' : '<span class="muted">-</span>' }],
            list, { hal: st.hal, kosong: 'Belum ada kontak', kosongSub: 'Klik "Sinkron sekarang" untuk menarik kontak dari data penghuni & prospek.', ilus: 'phone' }));
        st._list = list;
      };
      const muat = async (paksa) => {
        const r = await API.call('crm.data', { have: !paksa && st.crm ? st.crm.v : '' });
        if (!r.success) return toast(r.message, 'err');
        st.syncAt = r.data.syncTerakhir;
        if (!r.data.tabel.same) { const t = r.data.tabel; st.crm = { v: t.v, rows: t.r.map((x) => { const o = {}; t.c.forEach((c, i) => { o[c] = x[i]; }); return o; }) }; LS.set(key, st.crm); }
        if (el.isConnected && el.dataset.v === 'crm') gambar();
      };
      U.delegasi(el, {
        cari: (v) => { st.q = v; st.hal = 1; gambar(); }, hal: (d) => { st.hal = Number(d.v); gambar(); }, seg: (d) => { st.seg = d.v; st.hal = 1; gambar(); }, tag: (v) => { st.tag = v; gambar(); }, fk: (d) => { st.fk = st.fk === d.v ? '' : d.v; st.hal = 1; gambar(); },
        pilih: (v, t) => { st.pilih[t.dataset.id] = v; gambar(); },
        sync: async (d, b) => { tombolMuat(b, true, 'Sinkron…'); const r = await API.call('crm.sync', {}); tombolMuat(b, false); toast(r.message, r.success ? 'ok' : 'err'); muat(true); },
        detail: (d) => detailKontak(d.id, st, muat), baru: () => formKontak(null, muat), impor: () => imporKontak(muat),
        bulk: async (d, b) => {
          const ids = Object.keys(st.pilih).filter((x) => st.pilih[x]); let nilai = '';
          if (d.v === 'tag') { nilai = await konfirmasi('Beri tag pada ' + ids.length + ' kontak.', { input: 'Nama tag', wajib: true }); if (!nilai) return; }
          tombolMuat(b, true, '…'); const r = await API.call('crm.bulk', { ids, aksi: d.v, nilai }); tombolMuat(b, false);
          toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { st.pilih = {}; muat(true); }
        },
        blastPilih: () => { const ids = Object.keys(st.pilih).filter((x) => st.pilih[x]), rows = st.crm.rows.filter((k) => ids.indexOf(k.KontakID) > -1);
          const vs = App.viewState.wa || (App.viewState.wa = {}); vs.b = Object.assign(vs.b || { batch: 20, jeda: '5', pesan: 'Halo {nama} 👋\n\n', judul: '', pilih: {} }, { sumber: 'manual', teks: rows.filter((k) => k.NoWA).map((k) => k.NoWA + '|' + k.Nama).join('\n'), rows: null, ring: null });
          ke('wa', { tab: 'blast' }); toast('Nomor terpilih dimasukkan ke Blast (sumber manual). Klik "Muat penerima".', 'info'); },
        ekspor: async () => { const ids = Object.keys(st.pilih).filter((x) => st.pilih[x]); const r = await API.call('crm.ekspor', ids.length ? { ids } : {}); if (!r.success) return toast(r.message, 'err');
          await Ekspor.xlsx('CRM_Kontak_' + D.hari(), [{ nama: 'Kontak', cols: Object.keys(r.data[0] || { Nama: 1 }).map((k) => ({ k, label: k, w: 18 })), rows: r.data }]); toast('Ekspor selesai (tercatat di log aktivitas).'); }
      });
      gambar(); muat(false);
    }
  };
  async function detailKontak(id, st, muat) {
    const k = st.crm.rows.find((x) => x.KontakID === id); if (!k) return;
    const m = modal({ side: true, title: k.Nama, body: '<div class="row">' + '<span class="avatar" style="width:52px;height:52px;background:var(--lime)">' + esc(inisial(k.Nama)) + '</span><div><span class="badge violet">' + esc(k.Segmen) + '</span><div class="small muted mt-s">' + esc(k.Sumber) + ' · ' + esc(k.RefID) + '</div></div></div>' +
      '<div class="row wrap mt">' + (k.NoWA ? '<a class="btn sm" target="_blank" href="' + waLink(k.NoWA, 'Halo ' + k.Nama + ',') + '">' + icon('wa', 'sm') + ' WhatsApp</a><button class="btn sm ghost" data-a="salin">' + icon('copy', 'sm') + ' ' + esc(k.NoWA) + '</button>' : '') + (k.Email ? '<a class="btn sm ghost" href="mailto:' + esc(k.Email) + '">' + icon('mail', 'sm') + ' Email</a>' : '') + '</div>' +
      '<div class="col mt">' + U.fld('c-tag', 'Tag (pisah koma)', U.inp('c-tag', k.Tag)) + U.fld('c-cat', 'Catatan', U.ta('c-cat', k.Catatan)) + '<label class="switch small"><input type="checkbox" id="c-opt"' + (k.OptOut === 'YA' ? ' checked' : '') + '><span class="tr"></span>Opt-out (tidak menerima blast)</label><button class="btn sm" data-a="simpan">Simpan</button></div>' +
      '<hr class="sep"><div class="lbl mb">Catat interaksi</div><div class="row wrap"><select class="inp" id="c-kanal" style="width:auto">' + U.opsi(['Telepon', 'WA Manual', 'Kunjungan', 'Email', 'Catatan'], 'WA Manual') + '</select><input class="inp grow" id="c-ring" placeholder="Ringkasan…"><button class="btn sm" data-a="catat">Catat</button></div>' +
      '<hr class="sep"><div class="lbl mb">Timeline</div><div id="c-tl"><div class="sk" style="height:80px"></div></div>' });
    const r = await API.call('crm.detail', { kontakId: id });
    const tl = m.$('#c-tl'); if (tl) tl.innerHTML = r.success && r.data.timeline.length ? '<div class="timeline">' + r.data.timeline.map((x) => '<div class="it"><i></i><div><b>' + esc(x.kanal) + '</b> · <span class="xs muted">' + tglJam(x.tanggal) + (x.status ? ' · ' + esc(x.status) : '') + '</span><div class="small">' + esc(x.ringkasan) + '</div></div></div>').join('') + '</div>' : '<p class="small muted">Belum ada interaksi.</p>';
    m.el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'salin') JK.salin(k.NoWA);
      if (a.dataset.a === 'simpan') { const r2 = await aksi('crm.simpan', { KontakID: id, Tag: m.$('#c-tag').value, Catatan: m.$('#c-cat').value, OptOut: m.$('#c-opt').checked ? 'YA' : 'TIDAK' }, { btn: a }); if (r2.success) { m.close(); muat(true); } }
      if (a.dataset.a === 'catat') { const v = m.$('#c-ring').value.trim(); if (!v) return toast('Isi ringkasan.', 'err'); const r2 = await aksi('crm.interaksi', { kontakId: id, kanal: m.$('#c-kanal').value, ringkasan: v }, { btn: a }); if (r2.success) { m.close(); detailKontak(id, st, muat); } }
    });
  }
  function formKontak(k, muat) {
    const m = modal({ title: 'Kontak Manual', body: '<div class="grid-f">' + U.fld('c-Nama', 'Nama', U.inp('c-Nama', '')) + U.fld('c-NoWA', 'WhatsApp', U.inp('c-NoWA', '', 'inputmode="tel"')) + U.fld('c-Email', 'Email', U.inp('c-Email', '', 'type="email"')) +
      U.fld('c-Segmen', 'Segmen', U.inp('c-Segmen', 'Lainnya', 'list="segl"') + '<datalist id="segl"><option>Calon Penghuni</option><option>Mitra</option><option>Alumni</option><option>Lainnya</option></datalist>') + U.fld('c-Tag', 'Tag', U.inp('c-Tag', ''), 'full') + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="ok">Simpan</button>' });
    m.$('#ok').onclick = async (e) => { const d = U.nilai(m, ['c-Nama', 'c-NoWA', 'c-Email', 'c-Segmen', 'c-Tag']); if (!d.Nama) return toast('Nama wajib.', 'err'); if (d.NoWA && !hpValid(d.NoWA)) return toast('Nomor WA tidak valid.', 'err'); const r = await aksi('crm.simpan', d, { btn: e.currentTarget }); if (r.success) { m.close(); muat(true); } };
  }
  function imporKontak(muat) {
    const m = modal({ title: 'Import Kontak (CSV)', body: '<p class="small">Kolom: <code>nama, email, wa, segmen, tag</code>. Pemisah koma atau titik koma. Nomor/email yang sudah ada dilewati.</p><button class="btn xs ghost mt-s" id="tpl">' + icon('download', 'sm') + ' Unduh template</button><input type="file" accept=".csv,text/csv" class="inp mt" id="f-csv"><div id="pv" class="small mt"></div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="ok" disabled>Import</button>' });
    let rows = [];
    m.$('#tpl').onclick = () => unduhTeks('template_kontak.csv', 'nama,email,wa,segmen,tag\nBudi,budi@gmail.com,081234567890,Calon Penghuni,survei');
    m.$('#f-csv').onchange = async () => { rows = parseCsv(await m.$('#f-csv').files[0].text()); m.$('#pv').textContent = rows.length + ' baris terbaca.'; m.$('#ok').disabled = !rows.length; };
    m.$('#ok').onclick = async (e) => { const r = await aksi('crm.impor', { rows }, { btn: e.currentTarget }); if (r.success) { m.close(); muat(true); } };
  }
  function parseCsv(teks) {
    teks = teks.replace(/^﻿/, '');
    const baris1 = teks.split(/\r?\n/)[0] || '', sep = (baris1.match(/;/g) || []).length > (baris1.match(/,/g) || []).length ? ';' : ',';
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < teks.length; i++) {
      const ch = teks[i];
      if (q) { if (ch === '"' && teks[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && teks[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    const h = (out.shift() || []).map((x) => x.trim());
    return out.filter((r) => r.some((x) => String(x).trim())).map((r) => { const o = {}; h.forEach((k, i) => { o[k] = (r[i] || '').trim(); }); return o; });
  }
  function unduhTeks(nama, isi) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + isi], { type: 'text/csv' })); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }

  // ======================= PENGATURAN =======================
  V.staf.pengaturan = { judul: 'Pengaturan', tabel: ['Pengguna'],
    render(el, q, st) {
      const owner = D.owner();
      const tabs = owner ? [['umum', 'Umum & Landing'], ['operasional', 'Operasional'], ['pengguna', 'Pengguna'], ['keamanan', 'Keamanan'], ['data', 'Data & Migrasi'], ['akun', 'Akun & Aplikasi']] : [['akun', 'Akun & Aplikasi']];
      const tab = tabs.some((t) => t[0] === q.tab) ? q.tab : tabs[0][0];
      el.innerHTML = U.page('Pengaturan', owner ? 'Konfigurasi usaha, pengguna, keamanan, dan data' : 'Akun Anda') + U.tabs(tabs, tab) + '<div id="set-isi"></div>';
      U.delegasi(el, { tab: (d) => ke('pengaturan', { tab: d.v }) });
      const isi = $('#set-isi');
      ({ umum: setUmum, operasional: setOperasional, pengguna: setPengguna, keamanan: setKeamanan, data: setData, akun: setAkun })[tab](isi, st);
    }
  };
  function formSetting(el, judul, defs) {
    const s = S.set;
    el.innerHTML = '<div class="card"><h3 class="h-sm mb">' + judul + '</h3><div class="grid-f">' + defs.map((d) => {
      const v = d.k === 'FASILITAS_UMUM' ? String(s[d.k] || '').split('|').join('\n') : s[d.k];
      const inp = d.t === 'ta' ? U.ta('s-' + d.k, v, 'rows="' + (d.rows || 3) + '"') : d.t === 'yn' ? U.sel('s-' + d.k, U.opsi([['YA', 'Ya'], ['TIDAK', 'Tidak']], v || 'TIDAK')) : U.inp('s-' + d.k, v, d.attr || '');
      return U.fld('s-' + d.k, d.l, inp, d.full ? 'full' : '', d.h);
    }).join('') + '</div><div class="row mt" style="justify-content:flex-end"><button class="btn" id="s-simpan">Simpan</button></div></div>';
    $('#s-simpan').onclick = async (e) => {
      const nilai = {}; defs.forEach((d) => { let v = $('#s-' + d.k).value.trim(); if (d.k === 'FASILITAS_UMUM') v = v.split(/\n+/).map((x) => x.trim()).filter(Boolean).join('|'); nilai[d.k] = v; });
      if (nilai.NO_WA_ADMIN && !hpValid(nilai.NO_WA_ADMIN)) return toast('Nomor WA admin tidak valid.', 'err');
      const r = await aksi('pengaturan.simpan', { nilai }, { btn: e.currentTarget });
      if (r.success && r.data && r.data.set) Object.assign(S.set, r.data.set);
    };
  }
  function setUmum(el) {
    formSetting(el, 'Identitas usaha & landing page', [
      { k: 'NAMA_USAHA', l: 'Nama usaha' }, { k: 'NO_WA_ADMIN', l: 'WhatsApp admin (tombol CTA landing)', attr: 'inputmode="tel" placeholder="0812…"' },
      { k: 'TAGLINE', l: 'Judul utama landing', full: 1, h: 'Bagian setelah koma terakhir disorot lime. Contoh: Kos Nyaman & Modern, Tinggal Masuk.' }, { k: 'DESKRIPSI_SINGKAT', l: 'Subjudul landing', t: 'ta', full: 1 },
      { k: 'EMAIL_ADMIN', l: 'Email admin' }, { k: 'JAM_OPERASIONAL', l: 'Jam layanan' }, { k: 'ALAMAT', l: 'Alamat (cadangan bila properti kosong)', t: 'ta', full: 1 },
      { k: 'KOORDINAT_MAPS', l: 'Koordinat peta (lat,lng)', h: 'Dipakai bila properti tidak punya koordinat.' }, { k: 'PESAN_WA_TEMPLATE', l: 'Pesan otomatis tombol WA', h: '{tipe} = nama tipe kamar yang dipilih.' },
      { k: 'FASILITAS_UMUM', l: 'Fasilitas bersama (satu per baris)', t: 'ta', rows: 6, full: 1 }]);
  }
  function setOperasional(el) {
    formSetting(el, 'Tagihan, listrik & keuangan', [
      { k: 'TARIF_LISTRIK', l: 'Tarif listrik per kWh (Rp)', attr: 'inputmode="numeric"' }, { k: 'AMBANG_APPROVAL', l: 'Ambang persetujuan pengeluaran (Rp)', attr: 'inputmode="numeric"', h: 'Pengeluaran operator di atas nilai ini butuh persetujuan Owner.' },
      { k: 'TGL_JATUH_TEMPO', l: 'Tanggal jatuh tempo bawaan (1-28)', attr: 'type="number" min="1" max="28"' }, { k: 'REMINDER_HARI', l: 'Pengingat H-n (pisah koma)', h: 'Contoh 3,0 = H-3 dan hari H.' },
      { k: 'AUTO_TAGIHAN', l: 'Buat tagihan sewa otomatis', t: 'yn' }, { k: 'AUTO_TAGIHAN_TGL', l: 'Tanggal buat otomatis (1-28)', attr: 'type="number" min="1" max="28"' },
      { k: 'REKENING_BAYAR', l: 'Instruksi pembayaran (tampil di portal penghuni)', t: 'ta', full: 1, h: 'Contoh: Transfer BCA 123… a.n. …, atau QRIS di resepsionis.' },
      { k: 'KATEGORI_PENGELUARAN', l: 'Kategori pengeluaran (pisah koma)', full: 1 }, { k: 'KUITANSI_CATATAN', l: 'Catatan kaki e-kuitansi', t: 'ta', full: 1 }]);
  }
  function setPengguna(el, st) {
    const list = S.rows('Pengguna').filter((u) => st.semua || u.Peran !== 'Penghuni').sort((a, b) => ['Owner', 'Operator', 'Penghuni'].indexOf(a.Peran) - ['Owner', 'Operator', 'Penghuni'].indexOf(b.Peran));
    el.innerHTML = '<div class="toolbar"><label class="check small"><input type="checkbox" id="u-semua"' + (st.semua ? ' checked' : '') + '> Tampilkan akun penghuni</label><span class="sp"></span><button class="btn sm" id="u-baru">' + icon('plus', 'sm') + ' Owner/Operator</button></div>' +
      '<div class="note mb">' + icon('info') + '<span>Pengguna login dengan akun Google sesuai email di bawah. Akun penghuni dibuat otomatis dari data penghuni.</span></div>' +
      U.tabel([{ label: 'Pengguna', v: (u) => '<div class="row">' + U.avatar(u.Nama || u.Email) + '<div><b>' + esc(u.Nama || '-') + '</b><div class="xs muted">' + esc(u.Email) + '</div></div></div>' },
        { label: 'Peran', v: (u) => '<span class="badge ' + ({ Owner: 'yellow', Operator: 'violet', Penghuni: 'lime' }[u.Peran] || 'mute') + '">' + esc(u.Peran) + '</span>' }, { label: 'WhatsApp', v: (u) => esc(u.No_WA || '-') },
        { label: 'Status', v: (u) => u.Aktif === 'YA' ? '<span class="badge ok">Aktif</span>' : '<span class="badge mute">Nonaktif</span>' }, { label: 'Login terakhir', v: (u) => u.Login_Terakhir ? tglJam(u.Login_Terakhir) : '-' },
        { label: '', cls: 'act', v: (u) => u.Peran !== 'Penghuni' ? '<button class="btn xs ghost" data-u="' + esc(u.Email) + '">' + icon('edit', 'sm') + ' Ubah</button>' : '' }], list, { kosong: 'Belum ada pengguna' });
    $('#u-semua').onchange = (e) => { st.semua = e.target.checked; App.render(); };
    $('#u-baru').onclick = () => formPengguna();
    el.onclick = (e) => { const b = e.target.closest('[data-u]'); if (b) formPengguna(S.by('Pengguna', b.dataset.u)); };
  }
  function formPengguna(u) {
    const m = modal({ title: u ? 'Ubah Pengguna' : 'Tambah Owner/Operator', body: '<div class="grid-f">' + U.fld('u-Email', 'Email Google', U.inp('u-Email', u && u.Email, 'type="email"' + (u ? ' readonly' : '')), 'full') +
      U.fld('u-Nama', 'Nama', U.inp('u-Nama', u && u.Nama)) + U.fld('u-No_WA', 'WhatsApp (notifikasi admin)', U.inp('u-No_WA', u && u.No_WA, 'inputmode="tel"')) +
      U.fld('u-Peran', 'Peran', U.sel('u-Peran', U.opsi(['Operator', 'Owner'], u ? u.Peran : 'Operator'))) + U.fld('u-Aktif', 'Status', U.sel('u-Aktif', U.opsi([['YA', 'Aktif'], ['TIDAK', 'Nonaktif (cabut akses)']], u ? u.Aktif : 'YA'))) + '</div>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn" id="ok">Simpan</button>' });
    m.$('#ok').onclick = () => {
      const d = U.nilai(m, ['u-Email', 'u-Nama', 'u-No_WA', 'u-Peran', 'u-Aktif']);
      if (!emailValid(d.Email)) return toast('Email tidak valid.', 'err'); if (d.No_WA && !hpValid(d.No_WA)) return toast('Nomor WA tidak valid.', 'err');
      d.Email = d.Email.toLowerCase(); m.close();
      aksi('pengguna.simpan', d, { optimis: () => u ? S.patch('Pengguna', u.Email, d) : S.sisip('Pengguna', d), buka: () => formPengguna(u) });
    };
  }
  async function setKeamanan(el) {
    el.innerHTML = '<div class="sk" style="height:200px"></div>';
    const r = await API.call('rahasia.status', {});
    if (!r.success) { el.innerHTML = '<div class="note bad">' + esc(r.message) + '</div>'; return; }
    const s = r.data;
    el.innerHTML = '<div class="g2" style="align-items:start"><div class="card"><h3 class="h-sm">' + img3d('lock', 'i3d') + ' Login Google (OAuth Client ID)</h3>' +
      '<p class="small muted mt-s">Buat di Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web). Tambahkan <b>Authorized JavaScript origins</b>: <code>' + esc(location.origin) + '</code></p>' +
      '<div class="fld mt"><label for="k-cid">Client ID</label><input class="inp" id="k-cid" type="password" autocomplete="off" placeholder="' + esc(s.GOOGLE_CLIENT_ID.ada ? s.GOOGLE_CLIENT_ID.samar + ' (tersimpan)' : '…apps.googleusercontent.com') + '"></div>' +
      '<div class="row mt"><span class="badge ' + (s.GOOGLE_CLIENT_ID.ada ? 'ok' : 'bad') + '">' + (s.GOOGLE_CLIENT_ID.ada ? 'Terpasang' : 'Belum diisi') + '</span><span class="sp grow"></span><button class="btn sm" id="k-cid-ok">Simpan</button></div></div>' +
      '<div class="card"><h3 class="h-sm">' + img3d('shield', 'i3d') + ' Akses darurat</h3><p class="small muted mt-s">Pintu cadangan Owner (halaman <code>app.html#darurat</code>). Pengguna: <b>' + esc(s.darurat.user || '-') + '</b>' + (s.darurat.terkunci ? ' · <span style="color:#a1191e">terkunci sementara</span>' : '') + '</p>' +
      '<div class="fld mt"><label for="k-pw">Sandi baru (min. 12 karakter, huruf + angka)</label><input class="inp" id="k-pw" type="password" autocomplete="new-password"></div><button class="btn sm mt" id="k-pw-ok">Ganti sandi darurat</button>' +
      '<p class="xs muted mt-s">Lupa sandi? Jalankan <code>resetAksesDarurat()</code> di editor Apps Script.</p></div></div>' +
      '<div class="card mt"><h3 class="h-sm">Sesi</h3><p class="small muted mt-s">Keluarkan akun Anda dari semua HP/laptop (mis. HP hilang).</p><button class="btn sm danger mt" id="k-out">Keluar dari semua perangkat</button></div>' +
      '<div class="note mt">' + icon('shield') + '<span>Token Fonnte, secret sesi, hash sandi & ID database disimpan di <b>Script Properties</b> — tidak pernah di Sheets atau kode frontend, dan hanya ditampilkan tersamar.</span></div>';
    $('#k-cid-ok').onclick = async (e) => { const v = $('#k-cid').value.trim(); if (!/\.apps\.googleusercontent\.com$/.test(v)) return toast('Client ID harus berakhiran .apps.googleusercontent.com', 'err'); const r2 = await aksi('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: v }, { btn: e.currentTarget }); if (r2.success) { LS.del('jk_authcfg'); setKeamanan(el); } };
    $('#k-pw-ok').onclick = async (e) => { const v = $('#k-pw').value; if (v.length < 12 || !/\d/.test(v) || !/[a-z]/i.test(v)) return toast('Sandi minimal 12 karakter dengan huruf & angka.', 'err'); const r2 = await aksi('darurat.rotasi', { sandiBaru: v }, { btn: e.currentTarget }); if (r2.success) $('#k-pw').value = ''; };
    $('#k-out').onclick = async () => { if (await konfirmasi('Semua sesi Anda di perangkat lain berakhir. Lanjutkan?', { bahaya: true })) App.keluar(true); };
  }
  async function setData(el, st) {
    const SH = ['Properti', 'Tipe_Kamar', 'Kamar', 'Penghuni', 'Pengguna', 'Tagihan', 'Pembayaran', 'Meteran_Listrik', 'Pengeluaran', 'Komplain', 'Prospek', 'Pengaturan', 'Log_Aktivitas'];
    st.mg = st.mg || { sheets: SH.filter((x) => x !== 'Log_Aktivitas') };
    el.innerHTML = '<div class="g2" style="align-items:start"><div class="card" id="sys"><h3 class="h-sm">' + img3d('barchart', 'i3d') + ' Status sistem</h3><div class="sk mt" style="height:140px"></div></div>' +
      '<div class="card"><h3 class="h-sm">' + img3d('tools', 'i3d') + ' Pemeliharaan</h3><p class="small muted mt-s">Periksa struktur database: menambah sheet/kolom yang hilang tanpa menghapus data.</p><div class="row wrap mt"><button class="btn sm" id="d-fix">Periksa & perbaiki struktur</button><button class="btn sm ghost" id="d-fresh">' + icon('refresh', 'sm') + ' Segarkan cache</button></div></div></div>' +
      '<div class="card mt"><h3 class="h-sm">' + img3d('building', 'i3d') + ' Impor dari spreadsheet lama (migrasi)</h3><p class="small muted mt-s">Spreadsheet lama hanya <b>dibaca</b>. Kolom dicocokkan berdasarkan nama header (mendukung "Nama Penghuni", "No HP", "Kamar", dll.). Aman diulang — data yang sudah ada dilewati; jalankan sekali lagi tepat sebelum pindah (delta sync).</p>' +
      '<div class="fld mt"><label for="m-src">URL / ID spreadsheet lama</label><input class="inp" id="m-src" value="' + esc(st.mg.src || '') + '" placeholder="https://docs.google.com/spreadsheets/d/…"></div>' +
      '<div class="chips mt">' + SH.map((s) => '<label class="chip" style="border:1.5px solid #111;cursor:pointer"><input type="checkbox" data-sh="' + s + '"' + (st.mg.sheets.indexOf(s) > -1 ? ' checked' : '') + '> ' + s + '</label>').join('') + '</div>' +
      '<label class="check small mt"><input type="checkbox" id="m-timpa"' + (st.mg.timpa ? ' checked' : '') + '> Timpa data yang sudah ada (hati-hati)</label>' +
      '<div class="row wrap mt"><button class="btn sm ghost" id="m-pindai">' + icon('search', 'sm') + ' Pindai (dry-run)</button><button class="btn sm" id="m-jalan">' + icon('upload', 'sm') + ' Jalankan impor</button></div><div id="m-hasil" class="mt"></div></div>' +
      '<div class="card mt"><h3 class="h-sm">' + img3d('clipboard', 'i3d') + ' Impor CSV</h3><p class="small muted mt-s">Untuk data dari Excel/Google Form. Unduh template, isi, simpan sebagai CSV.</p>' +
      '<div class="row wrap mt"><select class="inp" id="c-tabel" style="width:auto">' + U.opsi([['Tipe_Kamar', 'Tipe kamar'], ['Kamar', 'Kamar'], ['Penghuni', 'Penghuni'], ['Prospek', 'Calon penghuni']], 'Kamar') + '</select><button class="btn sm ghost" id="c-tpl">' + icon('download', 'sm') + ' Template</button><input type="file" accept=".csv,text/csv" class="inp" id="c-file" style="max-width:280px"></div>' +
      '<div class="row wrap mt"><button class="btn sm ghost" id="c-pindai" disabled>Pindai</button><button class="btn sm" id="c-jalan" disabled>Impor</button></div><div id="c-hasil" class="mt"></div></div>' +
      '<div class="card mt"><div class="card-h"><h3 class="h-sm">' + img3d('memo', 'i3d') + ' Log aktivitas</h3><button class="btn xs ghost" id="l-muat">Muat 300 terakhir</button></div><div id="l-isi" class="small muted">Klik untuk memuat.</div></div>';
    API.call('sistem.status', {}).then((r) => {
      const box = $('#sys'); if (!box) return;
      if (!r.success) { box.innerHTML += '<div class="note bad">' + esc(r.message) + '</div>'; return; }
      const s = r.data;
      box.innerHTML = '<h3 class="h-sm">' + img3d('barchart', 'i3d') + ' Status sistem</h3><div class="col mt small" style="gap:6px">' +
        [['Versi app', s.versi + ' · skema ' + s.skemaDb + '/' + s.skemaKode], ['Trigger', s.trigger.join(', ') || '⚠ belum ada'], ['Keep-warm', s.keepWarm], ['Antrean notifikasi', s.antrean ? 'ada' : 'kosong'], ['Antrean kuitansi', s.kuitansiAntre ? 'ada' : 'kosong'], ['Kuota email tersisa', s.kuotaEmail], ['Script Properties', s.propsKB + ' KB / 500 KB'], ['Warm terakhir', s.warm ? s.warm.at + ' (' + s.warm.ms + ' ms)' : '-']]
          .map((x) => '<div class="row between"><span class="muted">' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>').join('') + '</div>' +
        '<div class="chips mt">' + Object.keys(s.jumlah).filter((k) => s.jumlah[k] > 0).map((k) => '<span class="chip">' + k + ' ' + s.jumlah[k] + '</span>').join('') + '</div>' +
        '<div class="row wrap mt"><a class="btn xs ghost" target="_blank" href="' + esc(s.spreadsheetUrl) + '">Buka Spreadsheet ↗</a><a class="btn xs ghost" target="_blank" href="' + esc(s.folderUrl) + '">Folder Drive ↗</a></div>';
    });
    $('#d-fix').onclick = (e) => aksi('sistem.perbaikiStruktur', {}, { btn: e.currentTarget });
    $('#d-fresh').onclick = async (e) => { tombolMuat(e.currentTarget, true); await App.sinkron({ fresh: true }); tombolMuat(e.currentTarget, false); toast('Cache server & data lokal disegarkan.'); };
    const ambilMg = () => { st.mg.src = $('#m-src').value.trim(); st.mg.timpa = $('#m-timpa').checked; st.mg.sheets = Array.from(el.querySelectorAll('[data-sh]:checked')).map((x) => x.dataset.sh); return { sumber: st.mg.src, sheets: st.mg.sheets, timpa: st.mg.timpa }; };
    const lapor = (box, r) => {
      if (!r.success) { box.innerHTML = '<div class="note bad">' + esc(r.message) + '</div>'; return; }
      const rep = r.data.report.source !== undefined ? { [$('#c-tabel').value]: r.data.report } : r.data.report;
      box.innerHTML = '<div class="note ' + (r.data.dryRun ? '' : 'ok') + ' mb">' + icon(r.data.dryRun ? 'search' : 'check') + '<span>' + (r.data.dryRun ? '<b>Hasil pindai</b> — belum ada yang ditulis.' : '<b>Impor selesai.</b>') + (r.data.source ? ' Sumber: ' + esc(r.data.source.name) : '') + '</span></div>' +
        U.tabel([{ label: 'Data', k: 'n' }, { label: 'Di sumber', cls: 'r', k: 'source' }, { label: 'Ditambah', cls: 'r', k: 'inserted' }, { label: 'Diperbarui', cls: 'r', k: 'updated' }, { label: 'Dilewati', cls: 'r', k: 'skipped' }],
          Object.keys(rep).map((k) => Object.assign({ n: k + (rep[k].catatan ? ' (' + rep[k].catatan + ')' : '') }, rep[k])), { per: 50 }) +
        (r.data.warnings && r.data.warnings.length ? '<div class="note warn mt">' + icon('alert') + '<div><b>Peringatan</b><ul style="margin:6px 0 0;padding-left:18px">' + r.data.warnings.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div></div>' : '');
    };
    $('#m-pindai').onclick = async (e) => { const d = ambilMg(); if (!d.sumber) return toast('Isi URL spreadsheet lama.', 'err'); tombolMuat(e.currentTarget, true, 'Memindai…'); const r = await API.call('migrasi.pindai', d, { timeout: 300000 }); tombolMuat(e.currentTarget, false); lapor($('#m-hasil'), r); };
    $('#m-jalan').onclick = async (e) => { const d = ambilMg(); if (!d.sumber) return toast('Isi URL spreadsheet lama.', 'err'); if (!(await konfirmasi('Jalankan impor ' + d.sheets.length + ' sheet' + (d.timpa ? ' <b>dengan menimpa data yang ada</b>' : '') + '? Disarankan Pindai dulu.', { ok: 'Jalankan impor', bahaya: d.timpa }))) return;
      const r = await aksi('migrasi.jalankan', d, { btn: e.currentTarget, teksMuat: 'Mengimpor…', timeout: 360000 }); lapor($('#m-hasil'), r); if (r.success) App.sinkron({ fresh: true }); };
    const TPL = { Tipe_Kamar: 'Nama_Tipe,Kelas,Harga_Harian,Harga_Bulanan,Harga_Tahunan,Fasilitas,Ukuran,Lantai\nStandar Cozy,Standar,80000,1500000,16500000,"AC, WiFi, Kamar mandi dalam",3x3.5 m,Lantai 1',
      Kamar: 'No_Kamar,Nama_Tipe,Lantai,Status,Catatan\nA01,Standar Cozy,1,Kosong,', Penghuni: 'Nama,Email_Google,No_WA,No_Kamar,Tgl_Masuk,Tgl_Kontrak_Berakhir,Skema_Sewa,Harga_Sewa,Tgl_Tagih\nBudi Santoso,budi@gmail.com,081234567890,A01,2026-01-05,2027-01-05,Bulanan,1500000,5',
      Prospek: 'Nama,No_WA,Email,Pesan\nSiti,081298765432,siti@gmail.com,Ingin survei' };
    let csv = [];
    $('#c-tpl').onclick = () => { const t = $('#c-tabel').value; unduhTeks('template_' + t + '.csv', TPL[t]); };
    $('#c-file').onchange = async () => { csv = parseCsv(await $('#c-file').files[0].text()); $('#c-hasil').innerHTML = '<p class="small">' + csv.length + ' baris terbaca.</p>'; $('#c-pindai').disabled = $('#c-jalan').disabled = !csv.length; };
    $('#c-pindai').onclick = async (e) => { tombolMuat(e.currentTarget, true); const r = await API.call('impor.csv', { tabel: $('#c-tabel').value, rows: csv, dryRun: true }); tombolMuat(e.currentTarget, false); lapor($('#c-hasil'), r); };
    $('#c-jalan').onclick = async (e) => { const r = await aksi('impor.csv', { tabel: $('#c-tabel').value, rows: csv, dryRun: false }, { btn: e.currentTarget, timeout: 300000 }); lapor($('#c-hasil'), r); };
    $('#l-muat').onclick = async (e) => { tombolMuat(e.currentTarget, true); const r = await API.call('log.list', { limit: 300 }); tombolMuat(e.currentTarget, false); if (!r.success) return toast(r.message, 'err');
      $('#l-isi').innerHTML = U.tabel([{ label: 'Waktu', cls: 'nw', v: (l) => tglJam(l.Waktu) }, { label: 'Pengguna', k: 'Email' }, { label: 'Aksi', v: (l) => '<b>' + esc(l.Aksi) + '</b>' }, { label: 'Detail', v: (l) => '<span class="xs">' + esc(String(l.Detail).slice(0, 140)) + '</span>' }], r.data, { per: 100 }); };
  }
  function setAkun(el) {
    const me = S.me;
    el.innerHTML = '<div class="g2"><div class="card"><div class="row"><span class="avatar" style="width:56px;height:56px;background:var(--lime)">' + esc(inisial(me.nama)) + '</span><div><b>' + esc(me.nama) + '</b><div class="small muted">' + esc(me.email) + '</div><span class="badge violet mt-s">' + esc(me.role) + '</span></div></div>' +
      '<div class="col mt"><button class="btn ghost block" id="a-keluar">' + icon('logout') + ' Keluar</button><button class="btn danger block" id="a-semua">Keluar dari semua perangkat</button></div></div>' +
      '<div class="card tint-violet"><h3 class="h-sm">' + img3d('phone', 'i3d') + ' Pasang aplikasi</h3><p class="small mt-s">Pasang JuraganKos OS di layar utama HP atau desktop — terbuka seperti aplikasi, lebih cepat, tanpa membuka browser.</p>' +
      (JK.PWA.terpasang() ? '<span class="badge ok mt">✓ Sudah terpasang</span>' : '<button class="btn mt" id="a-pasang">' + icon('download', 'sm') + ' Pasang sekarang</button>') + '</div></div>';
    $('#a-keluar').onclick = () => App.keluar(false);
    $('#a-semua').onclick = async () => { if (await konfirmasi('Keluar dari semua perangkat?', { bahaya: true })) App.keluar(true); };
    const p = $('#a-pasang'); if (p) p.onclick = () => JK.PWA.pasang();
  }
  V.util.parseCsv = parseCsv;
})(window);
