import React, { useState, useMemo } from 'react';
import { Download, Printer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { formatRupiah, getNamaBulan, downloadCSV } from '../lib/utils';
import { kopSuratHtml } from '../components/KopSurat';
import type { User } from '../types';

interface Props { currentUser: User; }

const TAHUN_LIST = Array.from({ length: 31 }, (_, i) => 2020 + i); // 2020–2050

export default function LaporanPage({ currentUser }: Props) {
  const [tab, setTab] = useState<'harian' | 'tunggakan' | 'siswa' | 'rekap' | 'pos'>('harian');
  const today = new Date().toISOString().split('T')[0];
  // Harian: rentang tanggal
  const [hariDari, setHariDari] = useState(today);
  const [hariSampai, setHariSampai] = useState(today);
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().slice(0, 7));
  const [filterKelas, setFilterKelas] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const isWali = currentUser.role === 'wali';
  const { siswa: siswaList, tagihan: tagihanList, pembayaran: allPembayaran, pengeluaran: pengeluaranList, pemasukanLain: pemasukanLainList, jenisTagihan: jenisTagihanList, kelas: kelasList, pengeluaranKategori: kategoriList, settings } = useApp();
  const pembayaranList = allPembayaran.filter(p => !p.dibatalkan);

  const waliSiswaId = isWali ? (siswaList.find(s => s.id === currentUser.studentId)?.id || '') : '';
  const effectiveSiswaId = isWali ? waliSiswaId : selectedSiswaId;

  // ── Laporan Harian (rentang) ─────────────────────────────────────────────────
  const laporanHarian = useMemo(() => {
    const pembayaranRentang = allPembayaran.filter(p => p.tanggal >= hariDari && p.tanggal <= hariSampai);
    const pengeluaranRentang = pengeluaranList.filter(p => p.tanggal >= hariDari && p.tanggal <= hariSampai);
    const pemasukanRentang = pemasukanLainList.filter(p => p.tanggal >= hariDari && p.tanggal <= hariSampai);
    const totalPemasukan = pembayaranRentang.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0)
      + pemasukanRentang.reduce((s, p) => s + p.jumlah, 0);
    const totalPengeluaran = pengeluaranRentang.reduce((s, p) => s + p.jumlah, 0);
    return {
      pembayaranRentang,
      pengeluaranRentang,
      pemasukanRentang,
      totalPemasukan,
      totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran,
    };
  }, [hariDari, hariSampai, allPembayaran, pengeluaranList, pemasukanLainList]);

  // ── Laporan Tunggakan ────────────────────────────────────────────────────────
  const laporanTunggakan = useMemo(() => {
    const result: {
      siswa: typeof siswaList[0];
      kelas: string;
      totalTagihan: number;
      totalBayar: number;
      tunggakan: number;
      items: { jenis: string; periode: string; sisa: number }[];
    }[] = [];
    siswaList
      .filter(s => !filterKelas || s.kelasId === filterKelas)
      .forEach(s => {
        const tagihan = tagihanList.filter(t => t.siswaId === s.id);
        let totalTagihan = 0, totalBayar = 0;
        const items: { jenis: string; periode: string; sisa: number }[] = [];
        tagihan.forEach(t => {
          const dibayar = pembayaranList.filter(p => p.tagihanId === t.id).reduce((sum, p) => sum + p.jumlah, 0);
          const total = t.nominal - t.diskon;
          const sisa = total - dibayar;
          totalTagihan += total;
          totalBayar += dibayar;
          if (sisa > 0) {
            const jenis = jenisTagihanList.find(j => j.id === t.jenisTagihanId);
            items.push({ jenis: jenis?.nama || '-', periode: t.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : `${t.tahun}`, sisa });
          }
        });
        const tunggakan = totalTagihan - totalBayar;
        if (tunggakan > 0) {
          const kelas = kelasList.find(k => k.id === s.kelasId);
          result.push({ siswa: s, kelas: kelas?.nama || '-', totalTagihan, totalBayar, tunggakan, items });
        }
      });
    return result.sort((a, b) => b.tunggakan - a.tunggakan);
  }, [siswaList, tagihanList, pembayaranList, jenisTagihanList, kelasList, filterKelas]);

  // ── Laporan Per Siswa ────────────────────────────────────────────────────────
  const laporanSiswa = useMemo(() => {
    if (!effectiveSiswaId) return null;
    const siswa = siswaList.find(s => s.id === effectiveSiswaId);
    if (!siswa) return null;
    const kelas = kelasList.find(k => k.id === siswa.kelasId);
    const tagihan = tagihanList.filter(t => t.siswaId === effectiveSiswaId);
    const riwayat = pembayaranList.filter(p => p.siswaId === effectiveSiswaId).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const canceledRiwayat = allPembayaran.filter(p => p.siswaId === effectiveSiswaId && p.dibatalkan);
    const items = tagihan.map(t => {
      const dibayar = pembayaranList.filter(p => p.tagihanId === t.id).reduce((s, p) => s + p.jumlah, 0);
      const total = t.nominal - t.diskon;
      const jenis = jenisTagihanList.find(j => j.id === t.jenisTagihanId);
      return { ...t, dibayar, total, sisa: total - dibayar, jenis };
    }).sort((a, b) => (a.tahun - b.tahun) || ((a.bulan || 0) - (b.bulan || 0)));
    const totalTagihan = items.reduce((s, i) => s + i.total, 0);
    const totalBayar = items.reduce((s, i) => s + i.dibayar, 0);
    return { siswa, kelas, items, riwayat, canceledRiwayat, totalTagihan, totalBayar, tunggakan: totalTagihan - totalBayar };
  }, [effectiveSiswaId, siswaList, tagihanList, pembayaranList, allPembayaran, jenisTagihanList, kelasList]);

  // ── Rekap Bulanan ────────────────────────────────────────────────────────────
  const rekapBulanan = useMemo(() => {
    const bulan = parseInt(filterBulan.split('-')[1]);
    const tahun = parseInt(filterBulan.split('-')[0]);
    const pembayaranBulan = pembayaranList.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
    });
    const pengeluaranBulan = pengeluaranList.filter(p => p.tanggal.startsWith(filterBulan));
    const pemasukanBulan = pemasukanLainList.filter(p => p.tanggal.startsWith(filterBulan));
    const totalPemasukan = pembayaranBulan.reduce((s, p) => s + p.jumlah, 0) + pemasukanBulan.reduce((s, p) => s + p.jumlah, 0);
    const totalPengeluaran = pengeluaranBulan.reduce((s, p) => s + p.jumlah, 0);
    const perJenis = jenisTagihanList.map(j => {
      const tagihanJenis = tagihanList.filter(t => t.jenisTagihanId === j.id && t.tahun === tahun && (j.periode === 'sekali' || t.bulan === bulan));
      const totalTagihan = tagihanJenis.reduce((s, t) => s + (t.nominal - t.diskon), 0);
      const totalBayar = tagihanJenis.reduce((s, t) => {
        return s + pembayaranList.filter(p => p.tagihanId === t.id).reduce((ss, p) => ss + p.jumlah, 0);
      }, 0);
      return { jenis: j, totalTagihan, totalBayar };
    }).filter(x => x.totalTagihan > 0);
    return { pembayaranBulan, pengeluaranBulan, pemasukanBulan, totalPemasukan, totalPengeluaran, saldo: totalPemasukan - totalPengeluaran, perJenis };
  }, [filterBulan, pembayaranList, pengeluaranList, pemasukanLainList, tagihanList, jenisTagihanList]);

  // ── Print helper ─────────────────────────────────────────────────────────────
  const printWithKop = (contentHtml: string, title: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
        th { background: #f0f0f0; font-size: 11px; }
        .no-border td, .no-border th { border: none; }
        .text-right { text-align: right; }
        .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #999; }
        .summary-box { background: #f9f9f9; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; display: inline-block; }
      </style>
      </head><body>
      ${kopSuratHtml(settings)}
      ${contentHtml}
      <div class="footer">Copyright &copy; 2026 RUMAHIMI &mdash; Sistem Administrasi Keuangan Digital</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const formatTglRange = () => {
    if (hariDari === hariSampai) return new Date(hariDari).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${new Date(hariDari).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} s/d ${new Date(hariSampai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  };

  const handlePrintHarian = () => {
    const { pembayaranRentang, pengeluaranRentang, pemasukanRentang, totalPemasukan, totalPengeluaran, saldo } = laporanHarian;
    const content = `
      <h3 style="text-align:center;margin:0 0 4px;">LAPORAN KEUANGAN HARIAN</h3>
      <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#555;">${formatTglRange()}</p>
      <table class="no-border" style="margin-bottom:12px;">
        <tr>
          <td><div class="summary-box">Pemasukan: <strong style="color:#16a34a;">${formatRupiah(totalPemasukan)}</strong></div></td>
          <td><div class="summary-box">Pengeluaran: <strong style="color:#dc2626;">${formatRupiah(totalPengeluaran)}</strong></div></td>
          <td><div class="summary-box">Saldo: <strong style="color:${saldo >= 0 ? '#2563eb' : '#dc2626'};">${formatRupiah(saldo)}</strong></div></td>
        </tr>
      </table>
      <p style="font-weight:bold;margin:12px 0 4px;">Pembayaran Siswa</p>
      <table>
        <thead><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th class="text-right">Jumlah</th><th>Metode</th><th>Status</th></tr></thead>
        <tbody>
          ${pembayaranRentang.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;">Tidak ada pembayaran</td></tr>' :
            pembayaranRentang.map(p => {
              const siswa = siswaList.find(s => s.id === p.siswaId);
              const tagihan = tagihanList.find(t => t.id === p.tagihanId);
              const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
              return `<tr style="${p.dibatalkan ? 'opacity:0.5;' : ''}">
                <td>${new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                <td>${siswa?.nama || '-'}</td>
                <td>${jenis?.kode || '-'}</td>
                <td class="text-right" style="color:#16a34a;">${formatRupiah(p.jumlah)}</td>
                <td>${p.metodeBayar}</td>
                <td>${p.dibatalkan ? 'Dibatalkan' : 'Valid'}</td>
              </tr>`;
            }).join('')}
          <tr style="font-weight:bold;background:#f0f0f0;">
            <td colspan="3">Total Pembayaran Valid</td>
            <td class="text-right" style="color:#16a34a;">${formatRupiah(pembayaranRentang.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0))}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      ${pemasukanRentang.length > 0 ? `
        <p style="font-weight:bold;margin:12px 0 4px;">Pemasukan Lain</p>
        <table>
          <thead><tr><th>Tanggal</th><th>Sumber</th><th class="text-right">Jumlah</th><th>Keterangan</th></tr></thead>
          <tbody>
            ${pemasukanRentang.map(p => `<tr><td>${new Date(p.tanggal).toLocaleDateString('id-ID')}</td><td>${p.sumber}</td><td class="text-right" style="color:#16a34a;">${formatRupiah(p.jumlah)}</td><td>${p.keterangan}</td></tr>`).join('')}
          </tbody>
        </table>
      ` : ''}
      <p style="font-weight:bold;margin:12px 0 4px;">Pengeluaran</p>
      <table>
        <thead><tr><th>Tanggal</th><th>Kategori</th><th class="text-right">Jumlah</th><th>Keterangan</th></tr></thead>
        <tbody>
          ${pengeluaranRentang.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;">Tidak ada pengeluaran</td></tr>' :
            pengeluaranRentang.map(p => `<tr><td>${new Date(p.tanggal).toLocaleDateString('id-ID')}</td><td>${kategoriList.find(k => k.id === p.kategoriId)?.nama || '-'}</td><td class="text-right" style="color:#dc2626;">${formatRupiah(p.jumlah)}</td><td>${p.keterangan}</td></tr>`).join('')}
          ${pengeluaranRentang.length > 0 ? `<tr style="font-weight:bold;background:#f0f0f0;"><td colspan="2">Total Pengeluaran</td><td class="text-right" style="color:#dc2626;">${formatRupiah(totalPengeluaran)}</td><td></td></tr>` : ''}
        </tbody>
      </table>
    `;
    printWithKop(content, `Laporan Harian ${formatTglRange()}`);
  };

  const handlePrintTunggakan = () => {
    const content = `
      <h3 style="text-align:center;margin:0 0 4px;">LAPORAN TUNGGAKAN SISWA</h3>
      <p style="text-align:center;margin:0 0 4px;font-size:11px;color:#555;">${filterKelas ? `Kelas: ${kelasList.find(k => k.id === filterKelas)?.nama}` : 'Semua Kelas'}</p>
      <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#dc2626;">Total Tunggakan: ${formatRupiah(laporanTunggakan.reduce((s, r) => s + r.tunggakan, 0))} — ${laporanTunggakan.length} siswa</p>
      <table>
        <thead><tr><th>No</th><th>Siswa</th><th>Kelas</th><th class="text-right">Total Tagihan</th><th class="text-right">Sudah Bayar</th><th class="text-right">Tunggakan</th></tr></thead>
        <tbody>
          ${laporanTunggakan.length === 0 ? '<tr><td colspan="6" style="text-align:center;">Tidak ada tunggakan</td></tr>' :
            laporanTunggakan.map((r, i) => `<tr>
              <td>${i + 1}</td>
              <td>${r.siswa.nama}<br/><small style="color:#999;">${r.siswa.nis}</small></td>
              <td>${r.kelas}</td>
              <td class="text-right">${formatRupiah(r.totalTagihan)}</td>
              <td class="text-right" style="color:#16a34a;">${formatRupiah(r.totalBayar)}</td>
              <td class="text-right" style="color:#dc2626;font-weight:bold;">${formatRupiah(r.tunggakan)}</td>
            </tr>`).join('')}
          <tr style="font-weight:bold;background:#f0f0f0;">
            <td colspan="5" class="text-right">Total Tunggakan</td>
            <td class="text-right" style="color:#dc2626;">${formatRupiah(laporanTunggakan.reduce((s, r) => s + r.tunggakan, 0))}</td>
          </tr>
        </tbody>
      </table>
    `;
    printWithKop(content, 'Laporan Tunggakan');
  };

  const handlePrintSiswa = () => {
    if (!laporanSiswa) return;
    const { siswa, kelas, items, riwayat, canceledRiwayat, totalTagihan, totalBayar, tunggakan } = laporanSiswa;
    const content = `
      <h3 style="text-align:center;margin:0 0 4px;">LAPORAN TAGIHAN & PEMBAYARAN SISWA</h3>
      <table class="no-border" style="margin-bottom:12px;font-size:12px;">
        <tr><td style="width:120px;color:#555;">Nama Siswa</td><td>: <strong>${siswa.nama}</strong></td></tr>
        <tr><td style="color:#555;">NIS</td><td>: ${siswa.nis}</td></tr>
        <tr><td style="color:#555;">Kelas</td><td>: ${kelas?.nama || '-'}</td></tr>
        <tr><td style="color:#555;">Status</td><td>: ${siswa.status}</td></tr>
      </table>
      <table class="no-border" style="margin-bottom:12px;">
        <tr>
          <td><div class="summary-box">Total Tagihan: <strong>${formatRupiah(totalTagihan)}</strong></div></td>
          <td><div class="summary-box">Sudah Bayar: <strong style="color:#16a34a;">${formatRupiah(totalBayar)}</strong></div></td>
          <td><div class="summary-box">Tunggakan: <strong style="color:#dc2626;">${formatRupiah(tunggakan)}</strong></div></td>
        </tr>
      </table>
      <p style="font-weight:bold;margin:12px 0 4px;">Detail Tagihan</p>
      <table>
        <thead><tr><th>Jenis</th><th>Periode</th><th class="text-right">Total</th><th class="text-right">Dibayar</th><th class="text-right">Sisa</th><th>Status</th></tr></thead>
        <tbody>
          ${items.map(item => `<tr>
            <td>${item.jenis?.nama || '-'}</td>
            <td>${item.bulan ? `${getNamaBulan(item.bulan)} ${item.tahun}` : item.tahun}</td>
            <td class="text-right">${formatRupiah(item.total)}</td>
            <td class="text-right" style="color:#16a34a;">${formatRupiah(item.dibayar)}</td>
            <td class="text-right" style="color:${item.sisa > 0 ? '#dc2626' : '#16a34a'};">${formatRupiah(item.sisa)}</td>
            <td>${item.sisa === 0 ? 'Lunas' : item.dibayar > 0 ? 'Cicilan' : 'Belum'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="font-weight:bold;margin:16px 0 4px;">Riwayat Pembayaran</p>
      <table>
        <thead><tr><th>Tanggal</th><th>Jenis</th><th class="text-right">Jumlah</th><th>Metode</th><th>Status</th></tr></thead>
        <tbody>
          ${[...riwayat, ...canceledRiwayat].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map(p => {
            const t = tagihanList.find(x => x.id === p.tagihanId);
            const jenis = jenisTagihanList.find(j => j.id === t?.jenisTagihanId);
            return `<tr style="${p.dibatalkan ? 'opacity:0.5;' : ''}">
              <td>${new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
              <td>${jenis?.kode || '-'} ${t?.bulan ? getNamaBulan(t.bulan) : ''} ${t?.tahun || ''}</td>
              <td class="text-right" style="color:#16a34a;">${formatRupiah(p.jumlah)}</td>
              <td>${p.metodeBayar}</td>
              <td>${p.dibatalkan ? 'Dibatalkan' : 'Valid'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
    printWithKop(content, `Laporan ${siswa.nama}`);
  };

  const handlePrintRekap = () => {
    const { pembayaranBulan, pengeluaranBulan, pemasukanBulan, totalPemasukan, totalPengeluaran, saldo, perJenis } = rekapBulanan;
    const [tahun, bulan] = filterBulan.split('-');
    const content = `
      <h3 style="text-align:center;margin:0 0 4px;">REKAP KEUANGAN BULANAN</h3>
      <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#555;">${getNamaBulan(parseInt(bulan))} ${tahun}</p>
      <table class="no-border" style="margin-bottom:12px;">
        <tr>
          <td><div class="summary-box">Pemasukan: <strong style="color:#16a34a;">${formatRupiah(totalPemasukan)}</strong></div></td>
          <td><div class="summary-box">Pengeluaran: <strong style="color:#dc2626;">${formatRupiah(totalPengeluaran)}</strong></div></td>
          <td><div class="summary-box">Saldo: <strong style="color:${saldo >= 0 ? '#2563eb' : '#dc2626'};">${formatRupiah(saldo)}</strong></div></td>
        </tr>
      </table>
      <p style="font-weight:bold;margin:12px 0 4px;">Realisasi per Jenis Tagihan</p>
      <table>
        <thead><tr><th>Jenis Tagihan</th><th class="text-right">Total Tagihan</th><th class="text-right">Terkumpul</th><th class="text-right">Sisa</th><th class="text-right">%</th></tr></thead>
        <tbody>
          ${perJenis.map(({ jenis, totalTagihan, totalBayar }) => `<tr>
            <td>${jenis.nama}</td>
            <td class="text-right">${formatRupiah(totalTagihan)}</td>
            <td class="text-right" style="color:#16a34a;">${formatRupiah(totalBayar)}</td>
            <td class="text-right" style="color:#dc2626;">${formatRupiah(totalTagihan - totalBayar)}</td>
            <td class="text-right">${totalTagihan > 0 ? Math.round((totalBayar / totalTagihan) * 100) : 0}%</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
    printWithKop(content, `Rekap ${getNamaBulan(parseInt(bulan))} ${tahun}`);
  };

  // ── Laporan Pos Anggaran ─────────────────────────────────────────────────────
  const [posFilterTahun, setPosFilterTahun] = useState(new Date().getFullYear());
  const [posFilterBulan, setPosFilterBulan] = useState<number | ''>('');

  const laporanPos = useMemo(() => {
    // Semua pengeluaran dalam filter
    const pengeluaranFiltered = pengeluaranList.filter(p => {
      const d = new Date(p.tanggal);
      const matchTahun = d.getFullYear() === posFilterTahun;
      const matchBulan = posFilterBulan === '' || d.getMonth() + 1 === posFilterBulan;
      return matchTahun && matchBulan;
    });

    // Semua pembayaran dalam filter
    const pembayaranFiltered = pembayaranList.filter(p => {
      const d = new Date(p.tanggal);
      const matchTahun = d.getFullYear() === posFilterTahun;
      const matchBulan = posFilterBulan === '' || d.getMonth() + 1 === posFilterBulan;
      return matchTahun && matchBulan;
    });

    // Per jenis tagihan (pos anggaran)
    const posData = jenisTagihanList.map(jenis => {
      // Pemasukan: total pembayaran dari tagihan jenis ini
      const tagihanJenis = tagihanList.filter(t => t.jenisTagihanId === jenis.id);
      const tagihanIds = new Set(tagihanJenis.map(t => t.id));
      const pemasukan = pembayaranFiltered
        .filter(p => tagihanIds.has(p.tagihanId))
        .reduce((s, p) => s + p.jumlah, 0);

      // Pengeluaran: kategori yang dikaitkan ke jenis ini
      const kategoriIds = new Set(
        kategoriList.filter(k => (k.posAnggaranIds || []).includes(jenis.id)).map(k => k.id)
      );
      const pengeluaran = pengeluaranFiltered
        .filter(p => kategoriIds.has(p.kategoriId))
        .reduce((s, p) => s + p.jumlah, 0);

      // Detail pengeluaran per kategori
      const detailPengeluaran = kategoriList
        .filter(k => (k.posAnggaranIds || []).includes(jenis.id))
        .map(k => {
          const total = pengeluaranFiltered
            .filter(p => p.kategoriId === k.id)
            .reduce((s, p) => s + p.jumlah, 0);
          return { kategori: k, total };
        })
        .filter(d => d.total > 0);

      return {
        jenis,
        pemasukan,
        pengeluaran,
        saldo: pemasukan - pengeluaran,
        detailPengeluaran,
      };
    });

    // Pos "Umum" — pengeluaran tanpa pos anggaran
    const kategoriUmumIds = new Set(
      kategoriList.filter(k => !(k.posAnggaranIds || []).length).map(k => k.id)
    );
    const pengeluaranUmum = pengeluaranFiltered
      .filter(p => kategoriUmumIds.has(p.kategoriId))
      .reduce((s, p) => s + p.jumlah, 0);

    const detailUmum = kategoriList
      .filter(k => !(k.posAnggaranIds || []).length)
      .map(k => ({
        kategori: k,
        total: pengeluaranFiltered.filter(p => p.kategoriId === k.id).reduce((s, p) => s + p.jumlah, 0),
      }))
      .filter(d => d.total > 0);

    return { posData, pengeluaranUmum, detailUmum };
  }, [posFilterTahun, posFilterBulan, jenisTagihanList, tagihanList, pembayaranList, pengeluaranList, kategoriList]);

  const handlePrintPos = () => {
    const periodeLabel = posFilterBulan !== ''
      ? `${getNamaBulan(posFilterBulan as number)} ${posFilterTahun}`
      : `Tahun ${posFilterTahun}`;

    const rowsHtml = laporanPos.posData.map(p => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;">${p.jenis.kode}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;">${p.jenis.nama}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatRupiah(p.pemasukan)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#dc2626;">${formatRupiah(p.pengeluaran)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:${p.saldo >= 0 ? '#2563eb' : '#dc2626'};">${formatRupiah(p.saldo)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;color:#555;">${p.detailPengeluaran.map(d => `${d.kategori.nama}: ${formatRupiah(d.total)}`).join(', ') || '-'}</td>
      </tr>
    `).join('');

    const content = `
      <h3 style="text-align:center;margin:0 0 4px;font-size:15px;">LAPORAN POS ANGGARAN</h3>
      <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#555;">Periode: ${periodeLabel}</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
        <thead>
          <tr style="background:#1a2744;color:white;">
            <th style="padding:6px 8px;border:1px solid #1a2744;">Kode</th>
            <th style="padding:6px 8px;border:1px solid #1a2744;">Pos Anggaran</th>
            <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Pemasukan</th>
            <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Pengeluaran</th>
            <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Saldo</th>
            <th style="padding:6px 8px;border:1px solid #1a2744;">Rincian Pengeluaran</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        ${laporanPos.pengeluaranUmum > 0 ? `
        <tbody>
          <tr style="background:#fafafa;">
            <td style="padding:6px 8px;border:1px solid #ddd;" colspan="2"><em>Pengeluaran Umum (tidak dikaitkan)</em></td>
            <td style="padding:6px 8px;border:1px solid #ddd;"></td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#dc2626;">${formatRupiah(laporanPos.pengeluaranUmum)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#dc2626;">${formatRupiah(-laporanPos.pengeluaranUmum)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;color:#555;">${laporanPos.detailUmum.map(d => `${d.kategori.nama}: ${formatRupiah(d.total)}`).join(', ')}</td>
          </tr>
        </tbody>
        ` : ''}
      </table>
    `;
    printWithKop(content, `Laporan Pos Anggaran ${periodeLabel}`);
  };

  const tabs = isWali
    ? [{ id: 'siswa', label: 'Riwayat Saya' }]
    : [
        { id: 'harian', label: 'Laporan Harian' },
        { id: 'tunggakan', label: 'Tunggakan Siswa' },
        { id: 'siswa', label: 'Per Siswa' },
        { id: 'rekap', label: 'Rekap Bulanan' },
        { id: 'pos', label: 'Pos Anggaran' },
      ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Laporan Keuangan</h2>
          <p className="text-sm text-gray-500">{settings.namaSekolah}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Laporan Harian */}
      {tab === 'harian' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Dari:</label>
              <input type="date" value={hariDari} onChange={e => setHariDari(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Sampai:</label>
              <input type="date" value={hariSampai} onChange={e => setHariSampai(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <button onClick={handlePrintHarian} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Printer size={14} /> Cetak / PDF
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Pemasukan', value: laporanHarian.totalPemasukan, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Pengeluaran', value: laporanHarian.totalPengeluaran, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Saldo Bersih', value: laporanHarian.saldo, color: laporanHarian.saldo >= 0 ? 'text-blue-600' : 'text-red-600', bg: 'bg-blue-50' },
            ].map((c, i) => (
              <div key={i} className={`${c.bg} rounded-xl p-4`}>
                <div className="text-xs text-gray-600 mb-1">{c.label}</div>
                <div className={`text-xl font-bold ${c.color}`}>{formatRupiah(c.value)}</div>
              </div>
            ))}
          </div>

          {/* Pembayaran */}
          <div className="bg-white rounded-xl border">
            <div className="px-4 py-3 border-b font-semibold text-sm">Pembayaran Siswa</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tanggal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Siswa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Jenis</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Jumlah</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Metode</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {laporanHarian.pembayaranRentang.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Tidak ada pembayaran pada rentang ini</td></tr>
                  ) : (
                    laporanHarian.pembayaranRentang.map(p => {
                      const siswa = siswaList.find(s => s.id === p.siswaId);
                      const tagihan = tagihanList.find(t => t.id === p.tagihanId);
                      const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
                      return (
                        <tr key={p.id} className={p.dibatalkan ? 'opacity-50' : ''}>
                          <td className="px-4 py-2">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-2">{siswa?.nama || '-'}</td>
                          <td className="px-4 py-2">{jenis?.kode}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">{formatRupiah(p.jumlah)}</td>
                          <td className="px-4 py-2">{p.metodeBayar}</td>
                          <td className="px-4 py-2">
                            {p.dibatalkan
                              ? <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Dibatalkan</span>
                              : <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Valid</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {laporanHarian.pembayaranRentang.length > 0 && (
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="px-4 py-2">Total Pembayaran Valid</td>
                      <td className="px-4 py-2 text-right text-green-600">
                        {formatRupiah(laporanHarian.pembayaranRentang.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pemasukan Lain */}
          {laporanHarian.pemasukanRentang.length > 0 && (
            <div className="bg-white rounded-xl border">
              <div className="px-4 py-3 border-b font-semibold text-sm">Pemasukan Lain</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium">Tanggal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Sumber</th>
                    <th className="px-4 py-2 text-right text-xs font-medium">Jumlah</th>
                    <th className="px-4 py-2 text-left text-xs font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {laporanHarian.pemasukanRentang.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-2">{p.sumber}</td>
                      <td className="px-4 py-2 text-right text-green-600 font-semibold">{formatRupiah(p.jumlah)}</td>
                      <td className="px-4 py-2 text-gray-600">{p.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pengeluaran */}
          <div className="bg-white rounded-xl border">
            <div className="px-4 py-3 border-b font-semibold text-sm">Pengeluaran</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium">Tanggal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Kategori</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">Jumlah</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {laporanHarian.pengeluaranRentang.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Tidak ada pengeluaran</td></tr>
                ) : (
                  laporanHarian.pengeluaranRentang.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-2">{kategoriList.find(k => k.id === p.kategoriId)?.nama || '-'}</td>
                      <td className="px-4 py-2 text-right text-red-600 font-semibold">{formatRupiah(p.jumlah)}</td>
                      <td className="px-4 py-2 text-gray-600">{p.keterangan}</td>
                    </tr>
                  ))
                )}
                {laporanHarian.pengeluaranRentang.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="px-4 py-2">Total Pengeluaran</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatRupiah(laporanHarian.totalPengeluaran)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Laporan Tunggakan */}
      {tab === 'tunggakan' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <button onClick={handlePrintTunggakan} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Printer size={14} /> Cetak
            </button>
            <button onClick={() => downloadCSV('tunggakan.csv',
              ['Siswa', 'Kelas', 'Total Tagihan', 'Sudah Bayar', 'Tunggakan'],
              laporanTunggakan.map(r => [r.siswa.nama, r.kelas, r.totalTagihan, r.totalBayar, r.tunggakan])
            )} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-red-50">
              <div className="font-semibold text-red-800">Total Tunggakan: {formatRupiah(laporanTunggakan.reduce((s, r) => s + r.tunggakan, 0))}</div>
              <div className="text-sm text-red-600">{laporanTunggakan.length} siswa memiliki tunggakan</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Siswa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kelas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Tagihan</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Sudah Bayar</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tunggakan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {laporanTunggakan.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Tidak ada tunggakan 🎉</td></tr>
                  ) : (
                    laporanTunggakan.map(r => (
                      <tr key={r.siswa.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{r.siswa.nama}</div>
                          <div className="text-xs text-gray-400">{r.siswa.nis}</div>
                        </td>
                        <td className="px-4 py-2.5">{r.kelas}</td>
                        <td className="px-4 py-2.5 text-right">{formatRupiah(r.totalTagihan)}</td>
                        <td className="px-4 py-2.5 text-right text-green-600">{formatRupiah(r.totalBayar)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatRupiah(r.tunggakan)}</td>
                        <td className="px-4 py-2.5">
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {r.items.slice(0, 3).map((item, i) => (
                              <div key={i}>{item.jenis} ({item.periode}): {formatRupiah(item.sisa)}</div>
                            ))}
                            {r.items.length > 3 && <div>+{r.items.length - 3} lainnya</div>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Laporan Per Siswa */}
      {tab === 'siswa' && (
        <div className="space-y-4">
          {!isWali && (
            <select value={selectedSiswaId} onChange={e => setSelectedSiswaId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-64">
              <option value="">Pilih Siswa</option>
              {siswaList.map(s => {
                const kelas = kelasList.find(k => k.id === s.kelasId);
                return <option key={s.id} value={s.id}>{s.nama} ({kelas?.nama || '-'}) — {s.nis}</option>;
              })}
            </select>
          )}

          {laporanSiswa ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{laporanSiswa.siswa.nama}</h3>
                    <p className="text-sm text-gray-600">NIS: {laporanSiswa.siswa.nis} • Kelas: {laporanSiswa.kelas?.nama} • {laporanSiswa.siswa.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handlePrintSiswa} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Printer size={14} /> Cetak
                    </button>
                    <button onClick={() => downloadCSV(`tagihan-${laporanSiswa.siswa.nama}.csv`,
                      ['Jenis', 'Periode', 'Total', 'Dibayar', 'Sisa', 'Status'],
                      laporanSiswa.items.map(i => [
                        i.jenis?.nama || '-',
                        i.bulan ? `${getNamaBulan(i.bulan)} ${i.tahun}` : i.tahun,
                        i.total, i.dibayar, i.sisa,
                        i.sisa === 0 ? 'Lunas' : i.dibayar > 0 ? 'Cicilan' : 'Belum'
                      ])
                    )} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <Download size={14} /> Export
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Total Tagihan</div>
                    <div className="font-bold">{formatRupiah(laporanSiswa.totalTagihan)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Sudah Dibayar</div>
                    <div className="font-bold text-green-600">{formatRupiah(laporanSiswa.totalBayar)}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Tunggakan</div>
                    <div className="font-bold text-red-600">{formatRupiah(laporanSiswa.tunggakan)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm">Detail Tagihan</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium">Jenis</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Periode</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Total</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Dibayar</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Sisa</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {laporanSiswa.items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.jenis?.kode}</span>
                            <span className="ml-1 text-gray-700">{item.jenis?.nama}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{item.bulan ? `${getNamaBulan(item.bulan)} ${item.tahun}` : item.tahun}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(item.total)}</td>
                          <td className="px-4 py-2 text-right text-green-600">{formatRupiah(item.dibayar)}</td>
                          <td className="px-4 py-2 text-right text-red-500">{formatRupiah(item.sisa)}</td>
                          <td className="px-4 py-2">
                            {item.sisa === 0 && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Lunas</span>}
                            {item.sisa > 0 && item.dibayar > 0 && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">Cicilan</span>}
                            {item.sisa > 0 && item.dibayar === 0 && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Belum</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm">Riwayat Pembayaran</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium">Tanggal</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Jenis</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Jumlah</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Metode</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...laporanSiswa.riwayat, ...laporanSiswa.canceledRiwayat]
                        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                        .map(p => {
                          const t = tagihanList.find(x => x.id === p.tagihanId);
                          const jenis = jenisTagihanList.find(j => j.id === t?.jenisTagihanId);
                          return (
                            <tr key={p.id} className={`hover:bg-gray-50 ${p.dibatalkan ? 'opacity-60' : ''}`}>
                              <td className="px-4 py-2">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-2 text-gray-600">{jenis?.kode} • {t?.bulan ? getNamaBulan(t.bulan) : ''} {t?.tahun}</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-600">{formatRupiah(p.jumlah)}</td>
                              <td className="px-4 py-2">{p.metodeBayar}</td>
                              <td className="px-4 py-2">
                                {p.dibatalkan
                                  ? <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Dibatalkan</span>
                                  : <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Valid</span>}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              {isWali ? 'Data tidak ditemukan' : 'Pilih siswa untuk melihat laporan'}
            </div>
          )}
        </div>
      )}

      {/* Rekap Bulanan */}
      {tab === 'rekap' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={handlePrintRekap} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Printer size={14} /> Cetak
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Pemasukan', value: rekapBulanan.totalPemasukan, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Pengeluaran', value: rekapBulanan.totalPengeluaran, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Saldo Bersih', value: rekapBulanan.saldo, color: rekapBulanan.saldo >= 0 ? 'text-blue-600' : 'text-red-600', bg: 'bg-blue-50' },
            ].map((c, i) => (
              <div key={i} className={`${c.bg} rounded-xl p-4`}>
                <div className="text-xs text-gray-600 mb-1">{c.label}</div>
                <div className={`text-xl font-bold ${c.color}`}>{formatRupiah(c.value)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Realisasi per Jenis Tagihan</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium">Jenis Tagihan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">Total Tagihan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">Terkumpul</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">Sisa</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rekapBulanan.perJenis.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Tidak ada data tagihan bulan ini</td></tr>
                ) : (
                  rekapBulanan.perJenis.map(({ jenis, totalTagihan, totalBayar }) => (
                    <tr key={jenis.id}>
                      <td className="px-4 py-2">{jenis.nama}</td>
                      <td className="px-4 py-2 text-right">{formatRupiah(totalTagihan)}</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatRupiah(totalBayar)}</td>
                      <td className="px-4 py-2 text-right text-red-500">{formatRupiah(totalTagihan - totalBayar)}</td>
                      <td className="px-4 py-2 text-right">{totalTagihan > 0 ? Math.round((totalBayar / totalTagihan) * 100) : 0}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pos Anggaran */}
      {tab === 'pos' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Tahun:</label>
              <select value={posFilterTahun} onChange={e => setPosFilterTahun(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {TAHUN_LIST.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Bulan:</label>
              <select value={posFilterBulan} onChange={e => setPosFilterBulan(e.target.value === '' ? '' : parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Semua Bulan</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(b => (
                  <option key={b} value={b}>{getNamaBulan(b)}</option>
                ))}
              </select>
            </div>
            <button onClick={handlePrintPos} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Printer size={14} /> Cetak
            </button>
            <button onClick={() => downloadCSV('pos-anggaran.csv',
              ['Kode', 'Pos Anggaran', 'Pemasukan', 'Pengeluaran', 'Saldo'],
              laporanPos.posData.map(p => [p.jenis.kode, p.jenis.nama, p.pemasukan, p.pengeluaran, p.saldo])
            )} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
            <strong>Laporan Pos Anggaran</strong> — menampilkan pemasukan dari setiap jenis tagihan dibandingkan dengan pengeluaran yang dikaitkan ke pos tersebut.
            Atur keterkaitan di menu <strong>Pengeluaran → Kategori & Pos Anggaran</strong>.
          </div>

          {/* Cards per pos */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {laporanPos.posData.map(p => (
              <div key={p.jenis.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                  <div>
                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-2">{p.jenis.kode}</span>
                    <span className="font-semibold text-sm text-gray-800">{p.jenis.nama}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    p.saldo > 0 ? 'bg-green-100 text-green-700' :
                    p.saldo < 0 ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.saldo > 0 ? '▲ Surplus' : p.saldo < 0 ? '▼ Defisit' : '= Impas'}
                  </span>
                </div>

                {/* Angka */}
                <div className="grid grid-cols-3 divide-x">
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><TrendingUp size={11} className="text-green-500" /> Pemasukan</div>
                    <div className="font-bold text-green-600 text-sm">{formatRupiah(p.pemasukan)}</div>
                  </div>
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><TrendingDown size={11} className="text-red-500" /> Pengeluaran</div>
                    <div className="font-bold text-red-600 text-sm">{formatRupiah(p.pengeluaran)}</div>
                  </div>
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Minus size={11} className="text-blue-500" /> Saldo</div>
                    <div className={`font-bold text-sm ${p.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatRupiah(Math.abs(p.saldo))}</div>
                  </div>
                </div>

                {/* Progress bar */}
                {p.pemasukan > 0 && (
                  <div className="px-4 pb-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.pengeluaran <= p.pemasukan ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, (p.pengeluaran / p.pemasukan) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {p.pemasukan > 0 ? Math.round((p.pengeluaran / p.pemasukan) * 100) : 0}% terpakai
                    </div>
                  </div>
                )}

                {/* Rincian pengeluaran */}
                {p.detailPengeluaran.length > 0 && (
                  <div className="border-t px-4 py-2 bg-gray-50">
                    <div className="text-xs font-medium text-gray-500 mb-1.5">Rincian Pengeluaran:</div>
                    <div className="space-y-1">
                      {p.detailPengeluaran.map(d => (
                        <div key={d.kategori.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{d.kategori.nama}</span>
                          <span className="font-medium text-red-600">{formatRupiah(d.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {p.pemasukan === 0 && p.pengeluaran === 0 && (
                  <div className="px-4 py-2 text-xs text-gray-400 text-center border-t">Tidak ada transaksi pada periode ini</div>
                )}
              </div>
            ))}
          </div>

          {/* Pengeluaran Umum */}
          {laporanPos.pengeluaranUmum > 0 && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-700">Pengeluaran Umum <span className="text-xs text-gray-400 font-normal">(tidak dikaitkan ke pos anggaran)</span></span>
                <span className="font-bold text-red-600">{formatRupiah(laporanPos.pengeluaranUmum)}</span>
              </div>
              {laporanPos.detailUmum.length > 0 && (
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {laporanPos.detailUmum.map(d => (
                    <div key={d.kategori.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-xs text-gray-500">{d.kategori.nama}</div>
                      <div className="font-semibold text-sm text-red-600">{formatRupiah(d.total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ringkasan total */}
          {(() => {
            const totalPemasukan = laporanPos.posData.reduce((s, p) => s + p.pemasukan, 0);
            const totalPengeluaran = laporanPos.posData.reduce((s, p) => s + p.pengeluaran, 0) + laporanPos.pengeluaranUmum;
            const totalSaldo = totalPemasukan - totalPengeluaran;
            return (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Keseluruhan</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Total Pemasukan</div>
                    <div className="font-bold text-green-600 text-lg">{formatRupiah(totalPemasukan)}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Total Pengeluaran</div>
                    <div className="font-bold text-red-600 text-lg">{formatRupiah(totalPengeluaran)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${totalSaldo >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                    <div className="text-xs text-gray-500">Saldo Bersih</div>
                    <div className={`font-bold text-lg ${totalSaldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {totalSaldo >= 0 ? '+' : '-'}{formatRupiah(Math.abs(totalSaldo))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
