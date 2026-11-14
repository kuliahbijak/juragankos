/* ==========================================================================
   JuraganKos OS — charts.js  (grafik SVG ringan, tanpa pustaka)
   Spesifikasi: batang ≤24px ujung membulat 4px, garis 2px, titik r≥4 + cincin
   permukaan 2px, grid hairline 1px, legenda untuk ≥2 seri, tooltip hover.
   Teks memakai token teks (bukan warna seri).
   ========================================================================== */
(function (w) {
  'use strict';
  const { esc } = JK;
  const TXT = '#686873', GRID = '#E6E3F0', SURF = '#FFFFFF';
  const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const kompak = (v) => { const a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '') + 'M' : a >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + 'jt' : a >= 1e4 ? Math.round(v / 1e3) + 'rb' : String(Math.round(v)); };
  function tipEl(el) { let t = el.querySelector('.tip'); if (!t) { t = document.createElement('div'); t.className = 'tip'; t.setAttribute('role', 'status'); el.appendChild(t); } return t; }
  function legend(series) { return series.length > 1 ? '<div class="legend">' + series.map((s) => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : ''; }
  function barPath(x, yb, w, h) { if (h <= 0) return ''; const r = Math.min(4, w / 2, h), yt = yb - h; return 'M' + x + ',' + yb + 'V' + (yt + r) + 'Q' + x + ',' + yt + ' ' + (x + r) + ',' + yt + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + yt + ' ' + (x + w) + ',' + (yt + r) + 'V' + yb + 'Z'; }
  function sumbu(W, pl, pr, pt, ih, max, fmtAxis) {
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = pt + ih - ih * i / 4; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="' + GRID + '" stroke-width="1"/><text x="' + (pl - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="' + TXT + '">' + esc((fmtAxis || kompak)(v)) + '</text>'; }
    return g;
  }
  function pasangTip(el, svg, isiFn) {
    const t = tipEl(el);
    const hide = () => { t.classList.remove('on'); svg.querySelectorAll('[data-hl]').forEach((n) => n.setAttribute('opacity', '1')); const c = svg.querySelector('.xh'); if (c) c.setAttribute('opacity', '0'); };
    svg.addEventListener('pointermove', (e) => {
      const hit = e.target.closest('[data-i]'); if (!hit) return hide();
      const i = Number(hit.dataset.i), r = el.getBoundingClientRect(), info = isiFn(i, svg);
      t.innerHTML = info.html; t.style.left = Math.min(Math.max(70, (info.x !== undefined ? info.x * r.width / svg.viewBox.baseVal.width : e.clientX - r.left)), r.width - 70) + 'px';
      t.style.top = (info.y !== undefined ? info.y * r.height / svg.viewBox.baseVal.height : e.clientY - r.top) + 'px'; t.classList.add('on');
    });
    svg.addEventListener('pointerleave', hide);
  }

  /** Kolom berkelompok: labels[], series[{name,color,values[]}] */
  function kolom(el, o) {
    const W = Math.max(320, el.clientWidth || 640), H = o.tinggi || 240, pl = 46, pr = 8, pt = 16, pb = 30;
    const max = niceMax(Math.max(1, ...o.series.flatMap((s) => s.values)));
    const iw = W - pl - pr, ih = H - pt - pb, band = iw / o.labels.length, n = o.series.length;
    const bw = Math.max(6, Math.min(24, (band * 0.66 - (n - 1) * 2) / n)), grpW = bw * n + 2 * (n - 1);
    let g = sumbu(W, pl, pr, pt, ih, max, o.fmtAxis);
    o.labels.forEach((lb, i) => {
      const x0 = pl + i * band + (band - grpW) / 2;
      o.series.forEach((s, j) => { const v = s.values[i] || 0, h = Math.max(0, v / max * ih); g += '<path data-hl d="' + barPath(x0 + j * (bw + 2), pt + ih, bw, h) + '" fill="' + s.color + '"/>'; });
      g += '<text x="' + (pl + i * band + band / 2) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" fill="' + TXT + '">' + esc(lb) + '</text>';
      g += '<rect data-i="' + i + '" x="' + (pl + i * band) + '" y="' + pt + '" width="' + band + '" height="' + ih + '" fill="transparent"/>';
    });
    el.innerHTML = legend(o.series) + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik kolom') + '">' + g + '</svg>';
    const svg = el.querySelector('svg');
    pasangTip(el, svg, (i) => ({ x: pl + i * band + band / 2, y: pt + ih - Math.max(...o.series.map((s) => s.values[i] || 0)) / max * ih,
      html: '<b>' + esc(o.labels[i]) + '</b>' + o.series.map((s) => '<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + s.color + ';margin-right:6px"></span>' + esc(s.name) + ': <b>' + esc((o.fmt || kompak)(s.values[i] || 0)) + '</b></div>').join('') }));
  }

  /** Garis satu seri + area tipis + crosshair */
  function garis(el, o) {
    const W = Math.max(320, el.clientWidth || 640), H = o.tinggi || 220, pl = 46, pr = 14, pt = 16, pb = 30;
    const max = o.max || niceMax(Math.max(1, ...o.values)), iw = W - pl - pr, ih = H - pt - pb, n = o.values.length;
    const X = (i) => pl + (n > 1 ? iw * i / (n - 1) : iw / 2), Y = (v) => pt + ih - (v / max) * ih;
    let g = sumbu(W, pl, pr, pt, ih, max, o.fmtAxis);
    const pts = o.values.map((v, i) => X(i) + ',' + Y(v)).join(' ');
    g += '<polygon points="' + X(0) + ',' + (pt + ih) + ' ' + pts + ' ' + X(n - 1) + ',' + (pt + ih) + '" fill="' + o.color + '" opacity=".1"/>';
    g += '<polyline points="' + pts + '" fill="none" stroke="' + o.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    g += '<line class="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (pt + ih) + '" stroke="#111" stroke-width="1" opacity="0"/>';
    o.labels.forEach((lb, i) => { g += '<text x="' + X(i) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" fill="' + TXT + '">' + esc(lb) + '</text>'; });
    const li = n - 1;
    g += '<circle cx="' + X(li) + '" cy="' + Y(o.values[li]) + '" r="5" fill="' + o.color + '" stroke="' + SURF + '" stroke-width="2"/>';
    g += '<text x="' + X(li) + '" y="' + (Y(o.values[li]) - 12) + '" text-anchor="end" font-size="12" font-weight="700" fill="#111">' + esc((o.fmt || kompak)(o.values[li])) + '</text>';
    o.values.forEach((v, i) => { const w2 = n > 1 ? iw / (n - 1) : iw; g += '<rect data-i="' + i + '" x="' + (X(i) - w2 / 2) + '" y="' + pt + '" width="' + w2 + '" height="' + ih + '" fill="transparent"/>'; });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik garis') + '">' + g + '</svg>';
    const svg = el.querySelector('svg'), xh = svg.querySelector('.xh');
    pasangTip(el, svg, (i) => { xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.setAttribute('opacity', '.35'); return { x: X(i), y: Y(o.values[i]), html: '<b>' + esc(o.labels[i]) + '</b><div>' + esc(o.nama || '') + ' <b>' + esc((o.fmt || kompak)(o.values[i])) + '</b></div>' }; });
  }

  /** Kolom bertumpuk (mis. status tagihan per bulan) dengan celah permukaan 2px */
  function tumpuk(el, o) {
    const W = Math.max(320, el.clientWidth || 640), H = o.tinggi || 240, pl = 46, pr = 8, pt = 16, pb = 30;
    const tot = o.labels.map((_, i) => o.segs.reduce((s, x) => s + (x.values[i] || 0), 0));
    const max = niceMax(Math.max(1, ...tot)), iw = W - pl - pr, ih = H - pt - pb, band = iw / o.labels.length, bw = Math.min(24, band * 0.6);
    let g = sumbu(W, pl, pr, pt, ih, max, o.fmtAxis);
    o.labels.forEach((lb, i) => {
      let y = pt + ih; const x = pl + i * band + (band - bw) / 2, aktif = o.segs.filter((s) => s.values[i] > 0);
      aktif.forEach((s, j) => {
        const h = s.values[i] / max * ih, atas = j === aktif.length - 1, gap = j > 0 ? 2 : 0;
        g += atas ? '<path data-hl d="' + barPath(x, y - gap, bw, Math.max(0, h - gap)) + '" fill="' + s.color + '"/>' : '<rect data-hl x="' + x + '" y="' + (y - h) + '" width="' + bw + '" height="' + Math.max(0, h - gap) + '" fill="' + s.color + '"/>';
        y -= h;
      });
      g += '<text x="' + (pl + i * band + band / 2) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" fill="' + TXT + '">' + esc(lb) + '</text>';
      g += '<rect data-i="' + i + '" x="' + (pl + i * band) + '" y="' + pt + '" width="' + band + '" height="' + ih + '" fill="transparent"/>';
    });
    el.innerHTML = legend(o.segs) + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik bertumpuk') + '">' + g + '</svg>';
    const svg = el.querySelector('svg');
    pasangTip(el, svg, (i) => ({ x: pl + i * band + band / 2, y: pt + ih - tot[i] / max * ih,
      html: '<b>' + esc(o.labels[i]) + '</b>' + o.segs.map((s) => '<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + s.color + ';margin-right:6px"></span>' + esc(s.name) + ': <b>' + esc((o.fmt || kompak)(s.values[i] || 0)) + '</b></div>').join('') }));
  }

  /** Batang horizontal (HTML) — komposisi/peringkat; satu warna, label teks */
  function hbar(el, o) {
    const items = o.items.filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...items.map((x) => x.value)), total = items.reduce((s, x) => s + x.value, 0);
    el.innerHTML = items.length ? '<div class="hbar">' + items.map((x) => '<div class="prog-row"><div class="t"><span>' + esc(x.label) + '</span><span>' + esc((o.fmt || kompak)(x.value)) + ' · ' + Math.round(x.value * 100 / (total || 1)) + '%</span></div><div class="prog" style="height:12px;border-width:1.5px"><i style="width:' + (x.value * 100 / max) + '%;background-color:' + (o.color || '#7B5CFA') + '"></i></div></div>').join('') + '</div>'
      : '<div class="empty small">Belum ada data pada periode ini.</div>';
  }
  w.Chart = { kolom, garis, tumpuk, hbar, kompak };
})(window);
