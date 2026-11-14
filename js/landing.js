/* ==========================================================================
   JuraganKos OS — landing.js
   Etalase publik: data real-time dari GAS (GET publik.data, di-cache Google),
   tampil instan dari localStorage (stale-while-revalidate).
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, rp, icon, LS, API, toast, modal, hpValid, waLink, tglJam } = JK;
  const KEY = 'jk_pub_v1';
  let D = LS.get(KEY, null), skema = 'bulanan', kelas = '';

  $('#thn').textContent = new Date().getFullYear();
  API.warm('pub');
  $$('[data-warm]').forEach((a) => a.addEventListener('pointerenter', () => API.warm(a.dataset.warm), { once: true }));
  if (!sessionStorage.getItem('jk_visit')) { try { sessionStorage.setItem('jk_visit', '1'); } catch (e) { } API.beacon('publik.klik', { jenis: 'kunjungan' }); }

  // ---------- Tombol WhatsApp pintar ----------
  function nomorWA() { return D && D.set && D.set.NO_WA_ADMIN; }
  function pesanWA(jenis, tipe) {
    const t = (D && D.set && D.set.PESAN_WA_TEMPLATE) || 'Halo, saya tertarik dengan kamar tipe {tipe}, apakah masih tersedia?';
    if (jenis === 'survei') return 'Halo, saya ingin menjadwalkan survei kamar' + (tipe ? ' tipe ' + tipe : '') + '. Kapan saya bisa datang?';
    return tipe ? t.replace('{tipe}', tipe) : 'Halo, saya ingin bertanya tentang ketersediaan kamar di ' + ((D && D.set && D.set.NAMA_USAHA) || 'kos ini') + '.';
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-wa]');
    if (!a) return;
    e.preventDefault();
    const no = nomorWA();
    if (!no) { toast('Nomor WhatsApp admin belum diatur pengelola.', 'err'); return; }
    API.beacon('publik.klik', { jenis: a.dataset.tipe ? 'klik_wa_tipe' : 'klik_wa' });
    window.open(waLink(no, pesanWA(a.dataset.wa, a.dataset.tipe)), '_blank', 'noopener');
  });

  // ---------- Render ----------
  function render() {
    if (!D) return;
    const s = D.set || {}, r = D.ringkas || {}, p = (D.properti || [])[0] || {};
    document.title = (s.NAMA_USAHA || 'JuraganKos') + ' — Kos Nyaman, Ketersediaan Kamar Real-Time';
    $$('[data-bind="usaha"]').forEach((el) => (el.textContent = s.NAMA_USAHA || 'JuraganKos'));
    const tg = String(s.TAGLINE || 'Kos Nyaman & Modern, Tinggal Masuk.'), i = tg.lastIndexOf(',');
    $('#hero-judul').innerHTML = i > 0 ? esc(tg.slice(0, i + 1)) + '<br><mark>' + esc(tg.slice(i + 1).trim()) + '</mark>' : '<mark>' + esc(tg) + '</mark>';
    $('#hero-desk').textContent = s.DESKRIPSI_SINGKAT || '';
    $('#mock-nama').textContent = p.nama || s.NAMA_USAHA || 'JuraganKos';
    $('#mock-kota').textContent = p.kota || p.alamat || '';
    $('#mock-okup').textContent = (r.okupansi || 0) + '%';
    $('#mock-total').textContent = (r.total || 0) + ' kamar';
    $('#mock-kosong').textContent = r.kosong ? r.kosong + ' kamar kosong hari ini!' : 'Kamar penuh — daftar tunggu dibuka';
    $('#av-kosong').textContent = (r.kosong || 0) + ' Kamar';
    $('#av-terisi').textContent = (r.terisi || 0) + ' Kamar';
    $('#av-renov').textContent = (r.renovasi || 0) + ' Kamar';
    $('#av-okup-t').textContent = 'Terhuni (' + (r.okupansi || 0) + '% okupansi)';
    $('#av-okup').style.width = (r.okupansi || 0) + '%';
    const daftar = [];
    (D.tipe || []).forEach((t) => (t.stok.noKosong || []).forEach((n) => daftar.push(n)));
    $('#av-kosong-list').innerHTML = daftar.slice(0, 8).map((n) => '<span class="chip" style="background:#fff;border:1.5px solid #111">' + esc(n) + '</span>').join('') + (daftar.length > 8 ? '<span class="chip">+' + (daftar.length - 8) + '</span>' : '');
    $('#updated').textContent = 'Terakhir diperbarui: ' + tglJam(D.diperbarui);
    // filter kelas
    const kls = Array.from(new Set((D.tipe || []).map((t) => t.kelas)));
    $('#seg-kelas').innerHTML = '<button type="button" data-kelas=""' + (kelas === '' ? ' class="on" aria-pressed="true"' : '') + '>Semua tipe</button>' +
      kls.map((k) => '<button type="button" data-kelas="' + esc(k) + '"' + (kelas === k ? ' class="on" aria-pressed="true"' : '') + '>' + esc(k) + '</button>').join('');
    renderTipe();
    renderFasilitas(s.FASILITAS_UMUM);
    // lokasi
    const maps = String(p.maps || s.KOORDINAT_MAPS || '').replace(/\s/g, '');
    $('#lok-alamat').textContent = p.alamat || s.ALAMAT || '—';
    $('#lok-jam').textContent = s.JAM_OPERASIONAL || '—';
    if (p.deskripsi) $('#lok-desk').textContent = p.deskripsi;
    $('#map-lbl').textContent = '📍 ' + (p.nama || s.NAMA_USAHA || 'Lokasi');
    if (maps) {
      const src = 'https://maps.google.com/maps?q=' + encodeURIComponent(maps) + '&z=16&output=embed';
      if ($('#map').getAttribute('src') !== src) $('#map').setAttribute('src', src);
      $('#lok-maps').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(maps);
    }
    $('#foot-wa').textContent = s.NO_WA_ADMIN ? 'WA: ' + s.NO_WA_ADMIN : 'WhatsApp admin';
    $('#foot-jam').textContent = 'Operasional: ' + (s.JAM_OPERASIONAL || '-');
    $('#foot-alamat').textContent = p.alamat || s.ALAMAT || 'Lihat lokasi';
  }

  function hargaTipe(t) {
    const h = { harian: [t.harian, '/malam'], bulanan: [t.bulanan, '/bulan'], tahunan: [t.tahunan, '/tahun'] }[skema];
    return h[0] ? '<b>' + rp(h[0]) + '</b> <span class="small muted">' + h[1] + '</span>' : '<b class="small">Tidak tersedia ' + skema + '</b>';
  }
  function renderTipe() {
    const list = (D.tipe || []).filter((t) => !kelas || t.kelas === kelas);
    if (!list.length) { $('#tipe-grid').innerHTML = '<div class="empty card" style="grid-column:1/-1"><img src="assets/3d/bed.webp" alt=""><b>Belum ada tipe kamar</b>Pengelola belum menambahkan tipe kamar.</div>'; return; }
    // "Paling populer" = okupansi tertinggi di antara tipe yang MASIH punya kamar kosong
    const rasio = (t) => t.stok.terisi / (t.stok.total || 1), ada = list.filter((t) => t.stok.kosong > 0);
    const terlaris = (ada.length ? ada : list).slice().sort((a, b) => rasio(b) - rasio(a))[0];
    $('#tipe-grid').innerHTML = list.map((t) => {
      const pop = list.length > 2 && t === terlaris;
      const foto = t.foto && t.foto.length ? t.foto : [];
      const slides = foto.length ? foto.map((u, i) => '<img class="ph" src="' + esc(u) + '" alt="Foto ' + esc(t.nama) + ' ' + (i + 1) + '" loading="lazy" referrerpolicy="no-referrer">').join('')
        : '<div class="noph"><img src="assets/3d/' + (t.kelas === 'VIP' ? 'couch' : t.kelas === 'Eksklusif' ? 'hotel' : 'bed') + '.webp" alt=""></div>';
      const fas = String(t.fasilitas || '').split(/[,;•\n]+/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
      const tersedia = t.stok.kosong > 0;
      return '<article class="tipe' + (pop ? ' pop' : '') + '">' + (pop ? '<div class="ribbon">⭐ PILIHAN PALING POPULER</div>' : '') +
        '<div class="slider" data-n="' + Math.max(1, foto.length) + '" data-i="0"><div class="track">' + slides + '</div>' +
        (foto.length > 1 ? '<button class="nav p" type="button" aria-label="Foto sebelumnya">' + icon('left', 'sm') + '</button><button class="nav n" type="button" aria-label="Foto berikutnya">' + icon('right', 'sm') + '</button><div class="dots">' + foto.map((_, i) => '<i class="' + (i ? '' : 'on') + '"></i>').join('') + '</div><span class="cnt">1/' + foto.length + '</span>' : '') +
        '<span class="cap">' + esc(t.kelas) + (t.ukuran ? ' · ' + esc(t.ukuran) : '') + '</span></div>' +
        '<div class="body"><div class="row between"><span class="badge ' + (tersedia ? 'lime' : 'orange') + '">' + (tersedia ? 'Tersedia ' + t.stok.kosong + ' kamar' : 'Penuh · waiting list') + '</span><img src="assets/3d/' + (tersedia ? 'key' : 'hourglass') + '.webp" alt="" class="i3d" style="width:30px;height:30px"></div>' +
        '<h3 class="h-md">' + esc(t.nama) + '</h3><div class="small muted">' + [t.lantai, t.ukuran ? 'Ukuran ' + t.ukuran : '', t.stok.total + ' kamar'].filter(Boolean).map(esc).join(' • ') + '</div>' +
        '<div class="price">' + hargaTipe(t) + '</div>' +
        (fas.length ? '<ul>' + fas.map((f) => '<li>' + icon('check', 'sm') + esc(f) + '</li>').join('') + '</ul>' : '') +
        (t.deskripsi ? '<p class="small muted">' + esc(t.deskripsi) + '</p>' : '') +
        '<a class="btn ' + (pop ? 'lime' : '') + ' block" style="margin-top:auto" href="#" data-wa="tipe" data-tipe="' + esc(t.nama) + '">' + (tersedia ? 'Booking ' + esc(t.nama) + ' via WA' : 'Masuk daftar tunggu') + '</a></div></article>';
    }).join('');
  }
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('.slider .nav');
    if (!nav) return;
    const sl = nav.closest('.slider'), n = Number(sl.dataset.n), i = (Number(sl.dataset.i) + (nav.classList.contains('n') ? 1 : -1) + n) % n;
    sl.dataset.i = i; sl.querySelector('.track').style.transform = 'translateX(' + (-100 * i) + '%)';
    sl.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    const c = sl.querySelector('.cnt'); if (c) c.textContent = (i + 1) + '/' + n;
  });
  $('#seg-harga').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; skema = b.dataset.skema; $$('#seg-harga button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); if (D) renderTipe(); });
  $('#seg-kelas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; kelas = b.dataset.kelas; render(); });

  const FAS = [
    [/wifi|internet/i, 'wifi', 'Internet stabil untuk kuliah, kerja remote, dan streaming tanpa putus.', 'lime'],
    [/cctv|akses|keamanan|smart/i, 'cctv', 'Pintu akses pintar dan CCTV 24 jam di area bersama.', 'violet'],
    [/dapur|masak/i, 'cooking', 'Dapur bersama lengkap dengan kompor, kulkas, dan peralatan.', 'orange'],
    [/parkir|motor|mobil/i, 'car', 'Area parkir teduh dan tertata untuk motor & mobil.', 'lime'],
    [/laundry|cuci|housekeeping/i, 'basket', 'Layanan laundry dan kebersihan rutin area bersama.', 'violet'],
    [/rooftop|co-?working|lounge|ruang/i, 'laptop', 'Ruang santai & kerja bersama yang nyaman.', 'orange'],
    [/ac|dingin/i, 'snow', 'Kamar sejuk ber-AC.', 'violet'], [/air|panas|water/i, 'bath', 'Air bersih & water heater.', 'lime']
  ];
  function renderFasilitas(str) {
    const list = String(str || '').split('|').map((x) => x.trim()).filter(Boolean);
    $('#feat-grid').innerHTML = list.map((f, i) => {
      const m = FAS.find((x) => x[0].test(f)) || [null, 'sparkles', 'Fasilitas pendukung kenyamanan penghuni.', ['lime', 'violet', 'orange'][i % 3]];
      return '<div class="feat"><div class="tile3d ' + m[3] + '"><img src="assets/3d/' + m[1] + '.webp" alt=""></div><div><h3>' + esc(f) + '</h3><p>' + esc(m[2]) + '</p></div></div>';
    }).join('');
  }

  // ---------- Prospek: "Minta dihubungi" (survei digital) ----------
  $('#btn-prospek').addEventListener('click', () => {
    const opsi = (D && D.tipe || []).map((t) => '<option value="' + esc(t.id) + '">' + esc(t.nama) + '</option>').join('');
    const m = modal({ title: 'Minta Dihubungi Admin', body:
      '<p class="small muted mb">Isi data singkat, admin akan menghubungi Anda via WhatsApp untuk jadwal survei.</p><form id="f-prs" class="grid-f">' +
      '<div class="fld full"><label for="p-nama">Nama</label><input class="inp" id="p-nama" required maxlength="80" autocomplete="name"></div>' +
      '<div class="fld"><label for="p-wa">No. WhatsApp</label><input class="inp" id="p-wa" required inputmode="tel" placeholder="0812xxxxxxx" autocomplete="tel"></div>' +
      '<div class="fld"><label for="p-tipe">Tipe kamar</label><select class="inp" id="p-tipe"><option value="">Belum tahu</option>' + opsi + '</select></div>' +
      '<div class="fld"><label for="p-tgl">Rencana masuk</label><input class="inp" type="date" id="p-tgl"></div>' +
      '<div class="fld"><label for="p-email">Email (opsional)</label><input class="inp" type="email" id="p-email" autocomplete="email"></div>' +
      '<div class="fld full"><label for="p-pesan">Pesan</label><textarea class="inp" id="p-pesan" maxlength="500" placeholder="Contoh: ingin survei Sabtu sore"></textarea></div></form>',
      footer: '<button class="btn ghost" data-x>Batal</button><button class="btn lime" id="p-kirim">Kirim</button>' });
    m.$('#p-kirim').onclick = async (e) => {
      const d = { nama: m.$('#p-nama').value.trim(), wa: m.$('#p-wa').value, tipe: m.$('#p-tipe').value, rencana: m.$('#p-tgl').value, email: m.$('#p-email').value.trim(), pesan: m.$('#p-pesan').value.trim() };
      if (d.nama.length < 2) return toast('Nama wajib diisi.', 'err');
      if (!hpValid(d.wa)) return toast('Nomor WhatsApp tidak valid.', 'err');
      JK.tombolMuat(e.currentTarget, true, 'Mengirim…');
      const r = await API.call('publik.prospek', d);
      JK.tombolMuat(e.currentTarget, false);
      if (r.success) { m.close(); toast(r.message); } else toast(r.message, 'err');
    };
  });

  // ---------- Muat data: tampil dari cache dulu, lalu segarkan ----------
  render();
  (async function muat() {
    if (!API.ok) { $('#updated').textContent = '⚠ GAS_URL belum diisi di js/config.js'; return; }
    const r = await API.get('publik.data');
    if (r.success) { D = r.data; LS.set(KEY, D); render(); }
    else if (!D) $('#updated').textContent = 'Gagal memuat data. Muat ulang halaman.';
  })();
  // Segarkan ketersediaan saat tab kembali aktif (≥ 2 menit)
  let terakhir = Date.now();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || Date.now() - terakhir < 120000) return;
    terakhir = Date.now();
    const r = await API.get('publik.data'); if (r.success) { D = r.data; LS.set(KEY, D); render(); }
  });
})();
