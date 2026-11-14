/* ==========================================================================
   JuraganKos OS — ekspor.js  (Unduh Excel .xlsx & PDF, pustaka dimuat saat dibutuhkan)
   Pustaka dibundel lokal di /vendor (SheetJS mini, jsPDF, jsPDF-AutoTable)
   ========================================================================== */
(function (w) {
  'use strict';
  const muatan = {};
  function muat(src) {
    if (!muatan[src]) muatan[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete muatan[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); });
    return muatan[src];
  }
  const nilai = (c, r) => (c.v ? c.v(r) : r[c.k]);
  const Ekspor = {
    /** sheets: [{nama, cols:[{k,label,v?,w?}], rows}] */
    async xlsx(namaFile, sheets) {
      await muat('vendor/xlsx.mini.min.js?v=0.18.5');
      const wb = XLSX.utils.book_new();
      sheets.forEach((s) => {
        const aoa = [s.cols.map((c) => c.label)].concat(s.rows.map((r) => s.cols.map((c) => { const v = nilai(c, r); return v === undefined || v === null ? '' : v; })));
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = s.cols.map((c) => ({ wch: c.w || Math.max(10, String(c.label).length + 2) }));
        XLSX.utils.book_append_sheet(wb, ws, String(s.nama).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
      });
      XLSX.writeFile(wb, namaFile + '.xlsx');
    },
    /** o: {judul, sub, cols:[{k,label,v?,r?}], rows, ringkas?:[[label,nilai]]} */
    async pdf(namaFile, o) {
      await muat('vendor/jspdf.umd.min.js?v=2.5.2');
      await muat('vendor/jspdf.plugin.autotable.min.js?v=3.8.4');
      const { jsPDF } = w.jspdf;
      const doc = new jsPDF({ orientation: o.cols.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const usaha = (w.App && App.S.set && App.S.set.NAMA_USAHA) || 'JuraganKos OS';
      doc.setFillColor(17, 17, 17); doc.rect(0, 0, W, 54, 'F');
      doc.setFillColor(216, 242, 61); doc.roundedRect(30, 15, doc.getTextWidth(usaha) * 1.25 + 24, 24, 8, 8, 'F');
      doc.setTextColor(17, 17, 17); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(usaha, 42, 31);
      doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Dicetak ' + new Date().toLocaleString('id-ID'), W - 30, 31, { align: 'right' });
      doc.setTextColor(17, 17, 17); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(o.judul || 'Laporan', 30, 84);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(104, 104, 115); if (o.sub) doc.text(o.sub, 30, 100);
      let y = 114;
      if (o.ringkas && o.ringkas.length) {
        doc.setTextColor(17, 17, 17); doc.setFontSize(10);
        o.ringkas.forEach((r, i) => { const x = 30 + (i % 4) * ((W - 60) / 4); if (i && i % 4 === 0) y += 34; doc.setFont('helvetica', 'normal'); doc.setTextColor(104, 104, 115); doc.text(String(r[0]), x, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17); doc.text(String(r[1]), x, y + 14); });
        y += 30;
      }
      doc.autoTable({
        startY: y, head: [o.cols.map((c) => c.label)], body: o.rows.map((r) => o.cols.map((c) => { const v = nilai(c, r); return v === undefined || v === null ? '' : String(v); })),
        styles: { fontSize: 8, cellPadding: 5, lineColor: [230, 227, 240], lineWidth: 0.5 }, headStyles: { fillColor: [17, 17, 17], textColor: [216, 242, 61], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 246, 251] }, columnStyles: o.cols.reduce((m, c, i) => { if (c.r) m[i] = { halign: 'right' }; return m; }, {}), margin: { left: 30, right: 30 },
        didDrawPage: () => { const h = doc.internal.pageSize.getHeight(); doc.setFontSize(8); doc.setTextColor(150); doc.text('JuraganKos OS · halaman ' + doc.internal.getNumberOfPages(), W - 30, h - 16, { align: 'right' }); }
      });
      doc.save(namaFile + '.pdf');
    }
  };
  w.Ekspor = Ekspor;
})(window);
