import React, { useState, useMemo, useRef } from 'react';
import { Search, CreditCard, XCircle, Printer, CheckCircle, AlertCircle, Image, BookOpen, Clock, Download } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, formatRupiah, getNamaBulan, getTodayString } from '../lib/utils';
import { kopSuratHtml } from '../components/KopSurat';
import type { Pembayaran, MetodeBayar } from '../types';
import type { User } from '../types';

interface Props { currentUser: User; }

export default function PembayaranPage({ currentUser }: Props) {
  const { siswa: allSiswa, kelas: kelasList, jenisTagihan: jenisTagihanList, tagihan: tagihanList, pembayaran: pembayaranList, settings, insertPembayaran: dbInsertPembayaran, batalkanPembayaran: dbBatalkanPembayaran } = useApp();

  const isWali = currentUser.role === 'wali';

  // Untuk wali: hanya siswa yang terkait
  const siswaList = useMemo(() => {
    if (isWali) {
      const linked = allSiswa.find(s => s.id === currentUser.studentId);
      return linked ? [linked] : [];
    }
    return allSiswa;
  }, [isWali, currentUser.studentId, allSiswa]);

  // Untuk wali: auto-select siswa terkait
  const [selectedSiswaId, setSelectedSiswaId] = useState(() => {
    if (currentUser.role === 'wali' && currentUser.studentId) return currentUser.studentId;
    return '';
  });

  const [tab, setTab] = useState<'tagihan' | 'riwayat'>('tagihan');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [selectedTagihanId, setSelectedTagihanId] = useState('');
  const [bayarForm, setBayarForm] = useState({
    jumlah: '',
    metodeBayar: 'cash' as MetodeBayar,
    rekeningId: '',
    tanggal: getTodayString(),
    keterangan: '',
  });

  const [riwayatSearch, setRiwayatSearch] = useState('');
  const [riwayatDari, setRiwayatDari] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [riwayatSampai, setRiwayatSampai] = useState(getTodayString());
  const [batalModal, setBatalModal] = useState<string | null>(null);
  const [alasanBatal, setAlasanBatal] = useState('');
  const [kwitansiModal, setKwitansiModal] = useState<Pembayaran | null>(null);
  const kwitansiRef = useRef<HTMLDivElement>(null);

  const activePembayaran = pembayaranList.filter(p => !p.dibatalkan);
  const rekeningAktif = (settings.rekening || []).filter(r => r.aktif);

  const getTagihanInfo = (tagihanId: string) => {
    const t = tagihanList.find(x => x.id === tagihanId);
    if (!t) return null;
    const dibayar = activePembayaran.filter(p => p.tagihanId === tagihanId).reduce((s, p) => s + p.jumlah, 0);
    const total = t.nominal - t.diskon;
    return { ...t, dibayar, total, sisa: total - dibayar };
  };

  const filteredSiswa = useMemo(() => {
    if (!searchSiswa) return siswaList;
    return siswaList.filter(s =>
      s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) ||
      s.nis.includes(searchSiswa)
    );
  }, [siswaList, searchSiswa]);

  const selectedSiswa = allSiswa.find(s => s.id === selectedSiswaId);

  const siswaTagihan = useMemo(() => {
    if (!selectedSiswaId) return [];
    return tagihanList
      .filter(t => t.siswaId === selectedSiswaId)
      .map(t => {
        const dibayar = activePembayaran.filter(p => p.tagihanId === t.id).reduce((s, p) => s + p.jumlah, 0);
        const total = t.nominal - t.diskon;
        const sisa = total - dibayar;
        const jenis = jenisTagihanList.find(j => j.id === t.jenisTagihanId);
        return { ...t, dibayar, total, sisa, jenis };
      })
      .sort((a, b) => (a.tahun - b.tahun) || ((a.bulan || 0) - (b.bulan || 0)));
  }, [selectedSiswaId, tagihanList, activePembayaran, jenisTagihanList]);

  const selectedRekening = rekeningAktif.find(r => r.id === bayarForm.rekeningId);

  const handleBayar = async () => {
    const jumlah = parseInt(bayarForm.jumlah.replace(/[^0-9]/g, '')) || 0;
    if (!jumlah || jumlah <= 0) return alert('Jumlah bayar harus diisi!');
    const info = getTagihanInfo(selectedTagihanId);
    if (!info) return;
    if (jumlah > info.sisa) return alert(`Jumlah melebihi sisa tagihan (${formatRupiah(info.sisa)})!`);
    if (bayarForm.metodeBayar === 'transfer' && !bayarForm.rekeningId) return alert('Pilih rekening tujuan!');

    const rek = selectedRekening;
    const newPembayaran: Pembayaran = {
      id: generateId(),
      tagihanId: selectedTagihanId,
      siswaId: selectedSiswaId,
      jumlah,
      metodeBayar: bayarForm.metodeBayar,
      nomorRekening: rek?.nomorRekening,
      bankTujuan: rek?.namaBank,
      tanggal: bayarForm.tanggal,
      keterangan: bayarForm.keterangan,
      dibatalkan: false,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };

    await dbInsertPembayaran(newPembayaran);
    setShowBayarModal(false);
    setBayarForm({ jumlah: '', metodeBayar: 'cash', rekeningId: '', tanggal: getTodayString(), keterangan: '' });
    setKwitansiModal(newPembayaran);
  };

  const handleBatal = async () => {
    if (!batalModal) return;
    await dbBatalkanPembayaran(batalModal, alasanBatal);
    setBatalModal(null);
    setAlasanBatal('');
  };

  // Riwayat: untuk wali hanya siswa terkait, untuk admin semua (+ filter search)
  const riwayatFiltered = useMemo(() => {
    return pembayaranList.filter(p => {
      // Wali hanya bisa lihat transaksi siswa terkait
      if (isWali) {
        if (p.siswaId !== currentUser.studentId) return false;
      } else {
        const siswa = allSiswa.find(s => s.id === p.siswaId);
        if (riwayatSearch) {
          const match = siswa?.nama.toLowerCase().includes(riwayatSearch.toLowerCase()) || siswa?.nis.includes(riwayatSearch);
          if (!match) return false;
        }
      }
      const tgl = p.tanggal;
      const matchDari = !riwayatDari || tgl >= riwayatDari;
      const matchSampai = !riwayatSampai || tgl <= riwayatSampai;
      return matchDari && matchSampai;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [pembayaranList, riwayatSearch, riwayatDari, riwayatSampai, isWali, currentUser.studentId, allSiswa]);

  const kwitansiData = kwitansiModal ? (() => {
    const t = tagihanList.find(x => x.id === kwitansiModal.tagihanId);
    const siswa = allSiswa.find(s => s.id === kwitansiModal.siswaId);
    const jenis = jenisTagihanList.find(j => j.id === t?.jenisTagihanId);
    const kelas = kelasList.find(k => k.id === siswa?.kelasId);
    const dibayarSebelum = activePembayaran
      .filter(p => p.tagihanId === kwitansiModal.tagihanId && p.id !== kwitansiModal.id)
      .reduce((s, p) => s + p.jumlah, 0);
    const totalTagihan = t ? t.nominal - t.diskon : 0;
    const totalDibayar = dibayarSebelum + kwitansiModal.jumlah;
    const sisaTagihan = totalTagihan - totalDibayar;
    return { t, siswa, jenis, kelas, dibayarSebelum, totalTagihan, totalDibayar, sisaTagihan };
  })() : null;

  const buildKwitansiHtml = () => {
    if (!kwitansiModal || !kwitansiData) return '';
    const { t, siswa, jenis, kelas, dibayarSebelum, totalTagihan, totalDibayar, sisaTagihan } = kwitansiData;
    const rek = kwitansiModal.bankTujuan
      ? `Transfer ke ${kwitansiModal.bankTujuan} (${kwitansiModal.nomorRekening})`
      : 'Cash';
    return `
      ${kopSuratHtml(settings)}
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:bold;letter-spacing:2px;">KWITANSI PEMBAYARAN</div>
        <div style="font-size:11px;color:#666;">No: ${kwitansiModal.id.toUpperCase().slice(0, 16)}</div>
      </div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">
        <tbody>
          <tr><td style="padding:3px 0;width:140px;color:#555;">Nama Siswa</td><td style="padding:3px 0;">: <strong>${siswa?.nama || '-'}</strong></td></tr>
          <tr><td style="padding:3px 0;color:#555;">NIS</td><td style="padding:3px 0;">: ${siswa?.nis || '-'}</td></tr>
          <tr><td style="padding:3px 0;color:#555;">Kelas</td><td style="padding:3px 0;">: ${kelas?.nama || '-'}</td></tr>
          <tr><td style="padding:3px 0;color:#555;">Jenis Tagihan</td><td style="padding:3px 0;">: ${jenis?.nama || '-'}</td></tr>
          <tr><td style="padding:3px 0;color:#555;">Periode</td><td style="padding:3px 0;">: ${t?.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : t?.tahun || '-'}</td></tr>
          <tr><td colspan="2"><hr style="margin:6px 0;border:none;border-top:1px solid #ddd;"/></td></tr>
          <tr><td style="padding:3px 0;color:#555;">Total Tagihan</td><td style="padding:3px 0;">: ${formatRupiah(totalTagihan)}</td></tr>
          ${dibayarSebelum > 0 ? `<tr><td style="padding:3px 0;color:#555;">Sudah Dibayar</td><td style="padding:3px 0;">: ${formatRupiah(dibayarSebelum)}</td></tr>` : ''}
          <tr><td style="padding:3px 0;color:#555;">Jumlah Bayar Ini</td><td style="padding:3px 0;">: <strong style="color:#16a34a;font-size:14px;">${formatRupiah(kwitansiModal.jumlah)}</strong></td></tr>
          <tr><td style="padding:3px 0;color:#555;">Sisa Tagihan</td><td style="padding:3px 0;">: <strong style="color:${sisaTagihan > 0 ? '#dc2626' : '#16a34a'};">${formatRupiah(sisaTagihan)}</strong>${sisaTagihan === 0 ? ' ✓ LUNAS' : ''}</td></tr>
          <tr><td colspan="2"><hr style="margin:6px 0;border:none;border-top:1px solid #ddd;"/></td></tr>
          <tr><td style="padding:3px 0;color:#555;">Metode</td><td style="padding:3px 0;">: ${rek}</td></tr>
          <tr><td style="padding:3px 0;color:#555;">Tanggal</td><td style="padding:3px 0;">: ${new Date(kwitansiModal.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
          <tr><td style="padding:3px 0;color:#555;">Petugas</td><td style="padding:3px 0;">: ${kwitansiModal.createdBy}</td></tr>
          ${kwitansiModal.keterangan ? `<tr><td style="padding:3px 0;color:#555;">Keterangan</td><td style="padding:3px 0;">: ${kwitansiModal.keterangan}</td></tr>` : ''}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:24px;font-size:12px;">
        <div style="text-align:center;width:45%;">
          <div>Wali Murid</div>
          <div style="height:60px;position:relative;"></div>
          <div style="border-top:1px solid #333;padding-top:4px;">(${siswa?.namaOrtu || '________________'})</div>
        </div>
        <div style="text-align:center;width:45%;position:relative;">
          <div>Bendahara</div>
          <div style="height:60px;position:relative;">
            ${settings.stempelUrl ? `<img src="${settings.stempelUrl}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:55px;opacity:0.7;" />` : ''}
            ${settings.ttdUrl ? `<img src="${settings.ttdUrl}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:50px;" />` : ''}
          </div>
          <div style="border-top:1px solid #333;padding-top:4px;">(${settings.namaBendahara || '________________'})</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:10px;color:#999;">
        Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital
      </div>
    `;
  };

  const handlePrintKwitansi = () => {
    const html = buildKwitansiHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Kwitansi</title>
      <style>body{font-family:Arial,sans-serif;margin:24px;max-width:500px;}@media print{body{margin:12px;}}</style>
      </head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  // Convert external image URL to base64 for canvas rendering
  const toBase64 = (url: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d')!.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    });

  const handleDownloadKwitansiImage = async () => {
    if (!kwitansiRef.current) return;
    try {
      // Pre-convert all images to base64 to avoid CORS issues
      const imgs = kwitansiRef.current.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(async (img) => {
        if (img.src && !img.src.startsWith('data:')) {
          const b64 = await toBase64(img.src);
          if (b64) img.src = b64;
        }
      }));
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(kwitansiRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `kwitansi-${kwitansiModal?.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh gambar. Coba gunakan tombol Cetak / PDF.');
    }
  };

  // ── Wali view: langsung tampilkan tagihan & riwayat siswa terkait ─────────────
  if (isWali) {
    const waliSiswa = allSiswa.find(s => s.id === currentUser.studentId);
    const waliKelas = kelasList.find(k => k.id === waliSiswa?.kelasId);
    const waliTagihan = tagihanList
      .filter(t => t.siswaId === currentUser.studentId)
      .map(t => {
        const dibayar = activePembayaran.filter(p => p.tagihanId === t.id).reduce((s, p) => s + p.jumlah, 0);
        const total = t.nominal - t.diskon;
        const jenis = jenisTagihanList.find(j => j.id === t.jenisTagihanId);
        return { ...t, dibayar, total, sisa: total - dibayar, jenis };
      })
      .sort((a, b) => (a.tahun - b.tahun) || ((a.bulan || 0) - (b.bulan || 0)));

    // Include ALL pembayaran (termasuk dibatalkan) untuk riwayat
    const waliRiwayat = pembayaranList
      .filter(p => p.siswaId === currentUser.studentId && p.tanggal >= riwayatDari && p.tanggal <= riwayatSampai)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    // PDF semua transaksi (untuk tab Jadwal Tagihan)
    const handleDownloadSemuaTransaksi = () => {
      const semuaPembayaran = pembayaranList
        .filter(p => p.siswaId === currentUser.studentId)
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

      const rowsTagihanHtml = waliTagihan.map((t, i) => {
        const statusLabel = t.sisa === 0 ? 'Lunas' : t.dibayar > 0 ? 'Cicilan' : 'Belum Bayar';
        const statusColor = t.sisa === 0 ? '#16a34a' : t.dibayar > 0 ? '#d97706' : '#dc2626';
        return `<tr>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${t.jenis?.nama || '-'}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${t.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : `Tahun ${t.tahun}`}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;">${formatRupiah(t.total)}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatRupiah(t.dibayar)}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:${t.sisa > 0 ? '#dc2626' : '#16a34a'};">${formatRupiah(t.sisa)}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;color:${statusColor};font-weight:bold;">${statusLabel}</td>
        </tr>`;
      }).join('');

      const rowsTrxHtml = semuaPembayaran.map((p, i) => {
        const tagihan = tagihanList.find(t => t.id === p.tagihanId);
        const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
        const periodeTagihan = tagihan?.bulan ? `${getNamaBulan(tagihan.bulan)} ${tagihan.tahun}` : `${tagihan?.tahun || '-'}`;
        return `<tr style="${p.dibatalkan ? 'color:#aaa;' : ''}">
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${jenis?.nama || '-'}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${periodeTagihan}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:${p.dibatalkan ? '#aaa' : '#16a34a'};font-weight:bold;">${formatRupiah(p.jumlah)}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${p.metodeBayar === 'cash' ? 'Cash' : `Transfer (${p.bankTujuan || '-'})`}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${p.dibatalkan ? `<span style="color:#dc2626;">Dibatalkan${p.alasanBatal ? ': ' + p.alasanBatal : ''}</span>` : '<span style="color:#16a34a;">Valid</span>'}</td>
        </tr>`;
      }).join('');

      const totalTagihanAll = waliTagihan.reduce((s, t) => s + t.total, 0);
      const totalBayarAll = waliTagihan.reduce((s, t) => s + t.dibayar, 0);
      const totalSisaAll = waliTagihan.reduce((s, t) => s + t.sisa, 0);

      const html = `
        ${kopSuratHtml(settings)}
        <h3 style="text-align:center;margin:0 0 4px;font-size:15px;letter-spacing:1px;">LAPORAN TAGIHAN & PEMBAYARAN SISWA</h3>
        <p style="text-align:center;margin:0 0 12px;font-size:11px;color:#555;">Per ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:2px 0;width:120px;color:#555;">Nama Siswa</td><td style="padding:2px 0;">: <strong>${waliSiswa?.nama || '-'}</strong></td></tr>
          <tr><td style="padding:2px 0;color:#555;">NIS</td><td style="padding:2px 0;">: ${waliSiswa?.nis || '-'}</td></tr>
          <tr><td style="padding:2px 0;color:#555;">Kelas</td><td style="padding:2px 0;">: ${waliKelas?.nama || '-'}</td></tr>
          <tr><td style="padding:2px 0;color:#555;">Status</td><td style="padding:2px 0;">: ${waliSiswa?.status || '-'}</td></tr>
        </table>

        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;">
            <div style="font-size:11px;color:#555;">Total Tagihan</div>
            <div style="font-size:16px;font-weight:bold;">${formatRupiah(totalTagihanAll)}</div>
          </div>
          <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;">
            <div style="font-size:11px;color:#555;">Sudah Dibayar</div>
            <div style="font-size:16px;font-weight:bold;color:#16a34a;">${formatRupiah(totalBayarAll)}</div>
          </div>
          <div style="flex:1;background:${totalSisaAll > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${totalSisaAll > 0 ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:10px 12px;">
            <div style="font-size:11px;color:#555;">Sisa Tagihan</div>
            <div style="font-size:16px;font-weight:bold;color:${totalSisaAll > 0 ? '#dc2626' : '#16a34a'};">${totalSisaAll > 0 ? formatRupiah(totalSisaAll) : '✓ LUNAS'}</div>
          </div>
        </div>

        <p style="font-weight:bold;font-size:13px;margin:0 0 6px;">Rincian Tagihan</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;">
          <thead>
            <tr style="background:#1a2744;color:white;">
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:center;">No</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Jenis Tagihan</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Periode</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Total</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Dibayar</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Sisa</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Status</th>
            </tr>
          </thead>
          <tbody>${rowsTagihanHtml || '<tr><td colspan="7" style="padding:10px;text-align:center;color:#999;">Tidak ada tagihan</td></tr>'}</tbody>
          <tfoot>
            <tr style="background:#f5f5f5;font-weight:bold;">
              <td colspan="3" style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Total</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${formatRupiah(totalTagihanAll)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatRupiah(totalBayarAll)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:${totalSisaAll > 0 ? '#dc2626' : '#16a34a'};">${formatRupiah(totalSisaAll)}</td>
              <td style="border:1px solid #ddd;"></td>
            </tr>
          </tfoot>
        </table>

        <p style="font-weight:bold;font-size:13px;margin:0 0 6px;">Riwayat Semua Transaksi</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;">
          <thead>
            <tr style="background:#1a2744;color:white;">
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:center;">No</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Tanggal</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Jenis Tagihan</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Periode</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Jumlah Bayar</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Metode</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Status</th>
            </tr>
          </thead>
          <tbody>${rowsTrxHtml || '<tr><td colspan="7" style="padding:10px;text-align:center;color:#999;">Belum ada transaksi</td></tr>'}</tbody>
          <tfoot>
            <tr style="background:#f5f5f5;font-weight:bold;">
              <td colspan="4" style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Total Pembayaran Valid</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatRupiah(semuaPembayaran.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0))}</td>
              <td colspan="2" style="border:1px solid #ddd;"></td>
            </tr>
          </tfoot>
        </table>

        <div style="display:flex;justify-content:space-between;margin-top:32px;font-size:12px;">
          <div style="text-align:center;width:45%;">
            <div>Wali Murid</div>
            <div style="height:60px;"></div>
            <div style="border-top:1px solid #333;padding-top:4px;">(${waliSiswa?.namaOrtu || '________________'})</div>
          </div>
          <div style="text-align:center;width:45%;position:relative;">
            <div>Bendahara</div>
            <div style="height:60px;position:relative;">
              ${settings.stempelUrl ? `<img src="${settings.stempelUrl}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:55px;opacity:0.7;" />` : ''}
              ${settings.ttdUrl ? `<img src="${settings.ttdUrl}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:50px;" />` : ''}
            </div>
            <div style="border-top:1px solid #333;padding-top:4px;">(${settings.namaBendahara || '________________'})</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:24px;font-size:10px;color:#999;">
          Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital
        </div>
      `;

      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<html><head><title>Laporan Tagihan & Pembayaran - ${waliSiswa?.nama}</title>
        <style>body{font-family:Arial,sans-serif;margin:24px;font-size:12px;}@media print{body{margin:12px;}}</style>
        </head><body>${html}</body></html>`);
      w.document.close();
      w.print();
    };

    // PDF Laporan Pembayaran Siswa (per periode, dari tab riwayat)
    const handleDownloadLaporan = () => {
      const tglDari = new Date(riwayatDari).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      const tglSampai = new Date(riwayatSampai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      const periodeStr = riwayatDari === riwayatSampai ? tglDari : `${tglDari} s/d ${tglSampai}`;

      const rowsHtml = waliRiwayat.map((p, i) => {
        const tagihan = tagihanList.find(t => t.id === p.tagihanId);
        const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
        const totalTagihan = tagihan ? tagihan.nominal - tagihan.diskon : 0;
        const periodeTagihan = tagihan?.bulan ? `${getNamaBulan(tagihan.bulan)} ${tagihan.tahun}` : `${tagihan?.tahun || '-'}`;
        return `<tr style="${p.dibatalkan ? 'color:#999;text-decoration:line-through;' : ''}">
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${jenis?.nama || '-'}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${periodeTagihan}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;">${formatRupiah(totalTagihan)}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:${p.dibatalkan ? '#999' : '#16a34a'};font-weight:bold;">${formatRupiah(p.jumlah)}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${p.metodeBayar === 'cash' ? 'Cash' : `Transfer (${p.bankTujuan || '-'})`}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${p.dibatalkan ? `<span style="color:#dc2626;">Dibatalkan${p.alasanBatal ? ': ' + p.alasanBatal : ''}</span>` : '<span style="color:#16a34a;">Valid</span>'}</td>
        </tr>`;
      }).join('');

      const totalValid = waliRiwayat.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0);
      const totalTagihanAll = [...new Set(waliRiwayat.map(p => p.tagihanId))].reduce((s, tid) => {
        const t = tagihanList.find(x => x.id === tid);
        return s + (t ? t.nominal - t.diskon : 0);
      }, 0);

      const html = `
        ${kopSuratHtml(settings)}
        <h3 style="text-align:center;margin:0 0 4px;font-size:15px;letter-spacing:1px;">LAPORAN PEMBAYARAN SISWA</h3>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">
          <tr><td style="padding:2px 0;width:120px;color:#555;">Nama Siswa</td><td style="padding:2px 0;">: <strong>${waliSiswa?.nama || '-'}</strong></td></tr>
          <tr><td style="padding:2px 0;color:#555;">NIS</td><td style="padding:2px 0;">: ${waliSiswa?.nis || '-'}</td></tr>
          <tr><td style="padding:2px 0;color:#555;">Kelas</td><td style="padding:2px 0;">: ${waliKelas?.nama || '-'}</td></tr>
          <tr><td style="padding:2px 0;color:#555;">Periode</td><td style="padding:2px 0;">: ${periodeStr}</td></tr>
          <tr><td style="padding:2px 0;color:#555;">Dicetak</td><td style="padding:2px 0;">: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
          <thead>
            <tr style="background:#1a2744;color:white;">
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:center;">No</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Tanggal</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Jenis Tagihan</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Periode</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Total Tagihan</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;text-align:right;">Jumlah Bayar</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Metode</th>
              <th style="padding:6px 8px;border:1px solid #1a2744;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#999;">Tidak ada data</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background:#f5f5f5;font-weight:bold;">
              <td colspan="4" style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Total</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${formatRupiah(totalTagihanAll)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatRupiah(totalValid)}</td>
              <td colspan="2" style="border:1px solid #ddd;"></td>
            </tr>
          </tfoot>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:32px;font-size:12px;">
          <div style="text-align:center;width:45%;">
            <div>Wali Murid</div>
            <div style="height:60px;"></div>
            <div style="border-top:1px solid #333;padding-top:4px;">(${waliSiswa?.namaOrtu || '________________'})</div>
          </div>
          <div style="text-align:center;width:45%;position:relative;">
            <div>Bendahara</div>
            <div style="height:60px;position:relative;">
              ${settings.stempelUrl ? `<img src="${settings.stempelUrl}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:55px;opacity:0.7;" />` : ''}
              ${settings.ttdUrl ? `<img src="${settings.ttdUrl}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:50px;" />` : ''}
            </div>
            <div style="border-top:1px solid #333;padding-top:4px;">(${settings.namaBendahara || '________________'})</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:24px;font-size:10px;color:#999;">
          Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital
        </div>
      `;

      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<html><head><title>Laporan Pembayaran Siswa</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; font-size: 12px; }
          @media print { body { margin: 12px; } }
        </style>
        </head><body>${html}</body></html>`);
      w.document.close();
      w.print();
    };

    const totalTagihan = waliTagihan.reduce((s, t) => s + t.total, 0);
    const totalBayar = waliTagihan.reduce((s, t) => s + t.dibayar, 0);
    const totalTunggakan = totalTagihan - totalBayar;

    return (
      <div className="p-6 space-y-4">
        {/* Header siswa */}
        {waliSiswa ? (
          <div className="bg-gradient-to-r from-[#1a2744] to-[#1e3a6e] rounded-xl p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                {waliSiswa.nama.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-lg">{waliSiswa.nama}</div>
                <div className="text-blue-200 text-sm">NIS: {waliSiswa.nis} • Kelas {waliKelas?.nama} • {waliSiswa.status}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-blue-200">Total Tagihan</div>
                <div className="font-bold">{formatRupiah(totalTagihan)}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-blue-200">Sudah Dibayar</div>
                <div className="font-bold text-green-300">{formatRupiah(totalBayar)}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-blue-200">Tunggakan</div>
                <div className={`font-bold ${totalTunggakan > 0 ? 'text-red-300' : 'text-green-300'}`}>{formatRupiah(totalTunggakan)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            Akun wali ini belum ditautkan ke siswa. Hubungi administrator.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(['tagihan', 'riwayat'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}>
              {t === 'tagihan' ? '📋 Jadwal Tagihan' : '📜 Riwayat Pembayaran'}
            </button>
          ))}
        </div>

        {/* Tagihan tab */}
        {tab === 'tagihan' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Jadwal & Status Tagihan</h3>
                <p className="text-xs text-gray-500">Semua tagihan yang terdaftar untuk siswa ini</p>
              </div>
              <button
                onClick={handleDownloadSemuaTransaksi}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a2744] text-white rounded-lg text-xs font-medium hover:bg-[#1e3a6e] transition-colors"
              >
                <Download size={13} /> Download Laporan Lengkap
              </button>
            </div>
            <div className="divide-y">
              {waliTagihan.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Belum ada tagihan</p>
                </div>
              ) : (
                waliTagihan.map(t => (
                  <div key={t.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{t.jenis?.kode}</span>
                          <span className="text-sm font-medium">{t.jenis?.nama}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : `Tahun ${t.tahun}`}
                          {t.diskon > 0 && <span className="ml-2 text-green-600">Diskon: {formatRupiah(t.diskon)}</span>}
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-xs">
                          <span className="text-gray-600">Total: <strong>{formatRupiah(t.total)}</strong></span>
                          <span className="text-green-600">Dibayar: <strong>{formatRupiah(t.dibayar)}</strong></span>
                          <span className={t.sisa > 0 ? 'text-red-500' : 'text-green-600'}>
                            Sisa: <strong>{formatRupiah(t.sisa)}</strong>
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${t.sisa === 0 ? 'bg-green-500' : t.dibayar > 0 ? 'bg-orange-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(100, (t.dibayar / t.total) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {t.sisa === 0 ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                            <CheckCircle size={12} /> Lunas
                          </span>
                        ) : t.dibayar > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full font-medium">
                            <Clock size={12} /> Cicilan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-full font-medium">
                            <AlertCircle size={12} /> Belum Bayar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {waliTagihan.length > 0 && (
              <div className="border-t">
                {/* Ringkasan 3 kolom */}
                <div className="grid grid-cols-3 divide-x border-b">
                  <div className="px-5 py-3 bg-gray-50">
                    <div className="text-xs text-gray-500">Total Tanggungan</div>
                    <div className="font-bold text-gray-800 text-sm mt-0.5">{formatRupiah(totalTagihan)}</div>
                  </div>
                  <div className="px-5 py-3 bg-green-50">
                    <div className="text-xs text-gray-500">Sudah Dibayar</div>
                    <div className="font-bold text-green-600 text-sm mt-0.5">{formatRupiah(totalBayar)}</div>
                  </div>
                  <div className={`px-5 py-3 ${totalTunggakan > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="text-xs text-gray-500">Sisa Tagihan</div>
                    <div className={`font-bold text-sm mt-0.5 ${totalTunggakan > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {totalTunggakan > 0 ? formatRupiah(totalTunggakan) : '✓ Semua Lunas'}
                    </div>
                  </div>
                </div>
                {/* Progress bar keseluruhan */}
                {totalTagihan > 0 && (
                  <div className="px-5 py-2.5 bg-gray-50 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${totalTunggakan === 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (totalBayar / totalTagihan) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap font-medium">
                      {Math.round((totalBayar / totalTagihan) * 100)}% terbayar
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Riwayat tab - wali */}
        {tab === 'riwayat' && (
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap items-center justify-between">
              <div className="flex gap-3 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 whitespace-nowrap">Dari:</label>
                  <input type="date" value={riwayatDari} onChange={e => setRiwayatDari(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 whitespace-nowrap">Sampai:</label>
                  <input type="date" value={riwayatSampai} onChange={e => setRiwayatSampai(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <button
                onClick={handleDownloadLaporan}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a2744] text-white rounded-lg text-sm hover:bg-[#1e3a6e] transition-colors"
              >
                <Download size={14} /> Download Laporan PDF
              </button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Jenis Tagihan</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Tagihan</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Jumlah Bayar</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Metode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Alasan Batal</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Kwitansi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {waliRiwayat.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Tidak ada riwayat pembayaran pada periode ini</td></tr>
                    ) : (
                      waliRiwayat.map(p => {
                        const tagihan = tagihanList.find(t => t.id === p.tagihanId);
                        const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
                        const totalTagihan = tagihan ? tagihan.nominal - tagihan.diskon : 0;
                        return (
                          <tr key={p.id} className={`hover:bg-gray-50 ${p.dibatalkan ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                            <td className="px-4 py-2.5">
                              {jenis?.kode && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">{jenis.kode}</span>}
                              <span className="text-gray-700 text-xs">{tagihan?.bulan ? `${getNamaBulan(tagihan.bulan)} ${tagihan.tahun}` : tagihan?.tahun}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">{formatRupiah(totalTagihan)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-green-600 whitespace-nowrap">{formatRupiah(p.jumlah)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${p.metodeBayar === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {p.metodeBayar === 'cash' ? 'Cash' : `Transfer${p.bankTujuan ? ` (${p.bankTujuan})` : ''}`}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {p.dibatalkan
                                ? <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Dibatalkan</span>
                                : <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Valid</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs max-w-36">
                              {p.dibatalkan && p.alasanBatal
                                ? <span className="text-red-500 italic">{p.alasanBatal}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {!p.dibatalkan && (
                                <button onClick={() => setKwitansiModal(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Lihat Kwitansi">
                                  <Printer size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {waliRiwayat.length > 0 && (
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-right">Total Valid</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-700">
                          {formatRupiah([...new Set(waliRiwayat.filter(p => !p.dibatalkan).map(p => p.tagihanId))].reduce((s, tid) => {
                            const t = tagihanList.find(x => x.id === tid);
                            return s + (t ? t.nominal - t.diskon : 0);
                          }, 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-green-600">
                          {formatRupiah(waliRiwayat.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0))}
                        </td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Kwitansi Modal - wali */}
        {kwitansiModal && kwitansiData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
              <div className="px-5 py-3 border-b flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-sm">Kwitansi Pembayaran</h3>
                <button onClick={() => setKwitansiModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
              </div>
              <div className="overflow-y-auto flex-1 p-1">
                <div ref={kwitansiRef} className="bg-white p-5">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1a2744', paddingBottom: 10, marginBottom: 12 }}>
                    {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 'bold' }}>{settings.namaSekolah.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: '#444' }}>{settings.alamat}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>Telp: {settings.telepon} | {settings.email}</div>
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <div className="font-bold text-base tracking-widest">KWITANSI PEMBAYARAN</div>
                    <div className="text-xs text-gray-500">No: {kwitansiModal.id.toUpperCase().slice(0, 16)}</div>
                  </div>
                  <table className="w-full text-xs mb-3">
                    <tbody>
                      <tr><td className="py-0.5 text-gray-500 w-32">Nama Siswa</td><td className="py-0.5">: <strong>{kwitansiData.siswa?.nama}</strong></td></tr>
                      <tr><td className="py-0.5 text-gray-500">NIS</td><td className="py-0.5">: {kwitansiData.siswa?.nis}</td></tr>
                      <tr><td className="py-0.5 text-gray-500">Kelas</td><td className="py-0.5">: {kwitansiData.kelas?.nama}</td></tr>
                      <tr><td className="py-0.5 text-gray-500">Jenis Tagihan</td><td className="py-0.5">: {kwitansiData.jenis?.nama}</td></tr>
                      <tr><td className="py-0.5 text-gray-500">Periode</td><td className="py-0.5">: {kwitansiData.t?.bulan ? `${getNamaBulan(kwitansiData.t.bulan)} ${kwitansiData.t.tahun}` : kwitansiData.t?.tahun}</td></tr>
                      <tr><td colSpan={2}><hr className="my-1.5 border-gray-200" /></td></tr>
                      <tr><td className="py-0.5 text-gray-500">Total Tagihan</td><td className="py-0.5">: {formatRupiah(kwitansiData.totalTagihan)}</td></tr>
                      {kwitansiData.dibayarSebelum > 0 && <tr><td className="py-0.5 text-gray-500">Sudah Dibayar</td><td className="py-0.5">: {formatRupiah(kwitansiData.dibayarSebelum)}</td></tr>}
                      <tr><td className="py-0.5 text-gray-500">Bayar Ini</td><td className="py-0.5">: <strong className="text-green-600 text-sm">{formatRupiah(kwitansiModal.jumlah)}</strong></td></tr>
                      <tr><td className="py-0.5 text-gray-500">Sisa Tagihan</td><td className="py-0.5">: <strong className={kwitansiData.sisaTagihan > 0 ? 'text-red-600' : 'text-green-600'}>{formatRupiah(kwitansiData.sisaTagihan)} {kwitansiData.sisaTagihan === 0 ? '✓ LUNAS' : ''}</strong></td></tr>
                      <tr><td colSpan={2}><hr className="my-1.5 border-gray-200" /></td></tr>
                      <tr><td className="py-0.5 text-gray-500">Metode</td><td className="py-0.5">: {kwitansiModal.metodeBayar === 'cash' ? 'Cash' : `Transfer — ${kwitansiModal.bankTujuan} (${kwitansiModal.nomorRekening})`}</td></tr>
                      <tr><td className="py-0.5 text-gray-500">Tanggal</td><td className="py-0.5">: {new Date(kwitansiModal.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
                      <tr><td className="py-0.5 text-gray-500">Petugas</td><td className="py-0.5">: {kwitansiModal.createdBy}</td></tr>
                      {kwitansiModal.keterangan && <tr><td className="py-0.5 text-gray-500">Keterangan</td><td className="py-0.5">: {kwitansiModal.keterangan}</td></tr>}
                    </tbody>
                  </table>
                  <div className="flex justify-between mt-4 text-xs">
                    <div className="text-center w-5/12">
                      <div>Wali Murid</div>
                      <div className="h-12" />
                      <div className="border-t border-gray-400 pt-1">({kwitansiData.siswa?.namaOrtu || '________________'})</div>
                    </div>
                    <div className="text-center w-5/12 relative">
                      <div>Bendahara</div>
                      <div className="h-12 relative flex items-center justify-center">
                        {settings.stempelUrl && <img src={settings.stempelUrl} alt="Stempel" className="absolute h-14 opacity-70" style={{ top: '-4px' }} />}
                        {settings.ttdUrl && <img src={settings.ttdUrl} alt="TTD" className="absolute h-10" />}
                      </div>
                      <div className="border-t border-gray-400 pt-1">({settings.namaBendahara || '________________'})</div>
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-400 mt-3 border-t pt-2">
                    Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t flex justify-end gap-2 flex-shrink-0">
                <button onClick={() => setKwitansiModal(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs">Tutup</button>
                <button onClick={handleDownloadKwitansiImage} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                  <Image size={12} /> Download
                </button>
                <button onClick={handlePrintKwitansi} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                  <Printer size={12} /> Cetak
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Admin view ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pembayaran</h2>
          <p className="text-sm text-gray-500">Kelola pembayaran tagihan siswa</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['tagihan', 'riwayat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {t === 'tagihan' ? 'Bayar Tagihan' : 'Riwayat Pembayaran'}
          </button>
        ))}
      </div>

      {tab === 'tagihan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Siswa List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchSiswa} onChange={e => setSearchSiswa(e.target.value)} placeholder="Cari siswa..." className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
              {filteredSiswa.map(s => {
                const kelas = kelasList.find(k => k.id === s.kelasId);
                const hasTunggakan = tagihanList.filter(t => t.siswaId === s.id).some(t => {
                  const dibayar = activePembayaran.filter(p => p.tagihanId === t.id).reduce((sum, p) => sum + p.jumlah, 0);
                  return dibayar < (t.nominal - t.diskon);
                });
                return (
                  <button key={s.id} onClick={() => setSelectedSiswaId(s.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 ${
                      selectedSiswaId === s.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                      {s.nama.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{s.nama}</div>
                      <div className="text-xs text-gray-400">{kelas?.nama} • {s.nis}</div>
                    </div>
                    {hasTunggakan && <AlertCircle size={14} className="text-red-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tagihan detail */}
          <div className="lg:col-span-2">
            {!selectedSiswa ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
                <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                <p>Pilih siswa untuk melihat tagihan</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-gray-50">
                  <div className="font-semibold text-gray-800">{selectedSiswa.nama}</div>
                  <div className="text-sm text-gray-500">
                    {kelasList.find(k => k.id === selectedSiswa.kelasId)?.nama} • {selectedSiswa.nis} • {selectedSiswa.status}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {siswaTagihan.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Tidak ada tagihan</div>
                  ) : (
                    siswaTagihan.map(t => (
                      <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{t.jenis?.kode}</span>
                            <span className="text-sm font-medium">{t.jenis?.nama}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : `Tahun ${t.tahun}`}
                            {t.diskon > 0 && <span className="ml-2 text-green-600">Diskon: {formatRupiah(t.diskon)}</span>}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs">
                            <span>Total: <strong>{formatRupiah(t.total)}</strong></span>
                            <span className="text-green-600">Dibayar: {formatRupiah(t.dibayar)}</span>
                            <span className="text-red-500">Sisa: {formatRupiah(t.sisa)}</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${t.sisa === 0 ? 'bg-green-500' : t.dibayar > 0 ? 'bg-orange-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, (t.dibayar / t.total) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          {t.sisa === 0 ? (
                            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              <CheckCircle size={12} /> Lunas
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedTagihanId(t.id);
                                setBayarForm(f => ({ ...f, jumlah: t.sisa.toString() }));
                                setShowBayarModal(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                            >
                              <CreditCard size={12} /> Bayar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {siswaTagihan.length > 0 && (
                  <div className="px-5 py-3 bg-gray-50 border-t flex justify-between text-sm">
                    <span className="text-gray-600">Total Tunggakan:</span>
                    <span className="font-bold text-red-600">{formatRupiah(siswaTagihan.reduce((s, t) => s + t.sisa, 0))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'riwayat' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={riwayatSearch} onChange={e => setRiwayatSearch(e.target.value)} placeholder="Cari siswa..." className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Dari:</label>
              <input type="date" value={riwayatDari} onChange={e => setRiwayatDari(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Sampai:</label>
              <input type="date" value={riwayatSampai} onChange={e => setRiwayatSampai(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Siswa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Jenis Tagihan</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Metode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Alasan Batal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Oleh</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {riwayatFiltered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Tidak ada data</td></tr>
                  ) : (
                    riwayatFiltered.map(p => {
                      const siswa = allSiswa.find(s => s.id === p.siswaId);
                      const tagihan = tagihanList.find(t => t.id === p.tagihanId);
                      const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50 ${p.dibatalkan ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-2.5 font-medium">{siswa?.nama || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {jenis?.kode && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">{jenis.kode}</span>}
                            {tagihan?.bulan ? `${getNamaBulan(tagihan.bulan)} ${tagihan.tahun}` : `${tagihan?.tahun || ''}`}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-green-600 whitespace-nowrap">{formatRupiah(p.jumlah)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${p.metodeBayar === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {p.metodeBayar === 'cash' ? 'Cash' : `Transfer${p.bankTujuan ? ` (${p.bankTujuan})` : ''}`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {p.dibatalkan
                              ? <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Dibatalkan</span>
                              : <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Valid</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs max-w-36">
                            {p.dibatalkan && p.alasanBatal ? (
                              <span className="text-red-500 italic">{p.alasanBatal}</span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{p.createdBy}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              <button onClick={() => setKwitansiModal(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Kwitansi">
                                <Printer size={13} />
                              </button>
                              {!p.dibatalkan && (
                                <button onClick={() => { setBatalModal(p.id); setAlasanBatal(''); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Batalkan">
                                  <XCircle size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {riwayatFiltered.length > 0 && (
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold">Total Pembayaran Valid</td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-600">
                        {formatRupiah(riwayatFiltered.filter(p => !p.dibatalkan).reduce((s, p) => s + p.jumlah, 0))}
                      </td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bayar Modal */}
      {showBayarModal && (() => {
        const info = getTagihanInfo(selectedTagihanId);
        const jenis = jenisTagihanList.find(j => j.id === info?.jenisTagihanId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="font-semibold">Bayar Tagihan</h3>
                <button onClick={() => setShowBayarModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-800">{selectedSiswa?.nama}</div>
                  <div className="text-xs text-blue-600">{jenis?.nama} • {info?.bulan ? `${getNamaBulan(info.bulan)} ${info.tahun}` : info?.tahun}</div>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span>Total: <strong>{formatRupiah(info?.total || 0)}</strong></span>
                    <span className="text-green-600">Dibayar: {formatRupiah(info?.dibayar || 0)}</span>
                    <span className="text-red-600">Sisa: <strong>{formatRupiah(info?.sisa || 0)}</strong></span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah Bayar (Rp) *</label>
                  <input
                    value={bayarForm.jumlah}
                    onChange={e => setBayarForm({ ...bayarForm, jumlah: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan jumlah"
                  />
                  {parseInt(bayarForm.jumlah.replace(/[^0-9]/g, '') || '0') > 0 &&
                   parseInt(bayarForm.jumlah.replace(/[^0-9]/g, '') || '0') < (info?.sisa || 0) && (
                    <p className="text-xs text-orange-500 mt-1">
                      Sisa setelah bayar: {formatRupiah((info?.sisa || 0) - parseInt(bayarForm.jumlah.replace(/[^0-9]/g, '') || '0'))}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['cash', 'transfer'] as MetodeBayar[]).map(m => (
                      <button key={m} onClick={() => setBayarForm({ ...bayarForm, metodeBayar: m, rekeningId: '' })}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                          bayarForm.metodeBayar === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}>
                        {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                      </button>
                    ))}
                  </div>
                </div>
                {bayarForm.metodeBayar === 'transfer' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rekening Tujuan *</label>
                    {rekeningAktif.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                        Belum ada rekening sekolah. Tambahkan di Pengaturan → Rekening Sekolah.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rekeningAktif.map(r => (
                          <button key={r.id} onClick={() => setBayarForm({ ...bayarForm, rekeningId: r.id })}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                              bayarForm.rekeningId === r.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}>
                            <CreditCard size={16} className="text-blue-500 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-semibold">{r.namaBank}</div>
                              <div className="text-xs font-mono text-gray-600">{r.nomorRekening}</div>
                              <div className="text-xs text-gray-400">a.n. {r.atasNama}</div>
                            </div>
                            {bayarForm.rekeningId === r.id && <CheckCircle size={16} className="text-blue-500 ml-auto flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                  <input type="date" value={bayarForm.tanggal} onChange={e => setBayarForm({ ...bayarForm, tanggal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan</label>
                  <input value={bayarForm.keterangan} onChange={e => setBayarForm({ ...bayarForm, keterangan: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowBayarModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
                <button onClick={handleBayar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Simpan Pembayaran</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Batal Modal */}
      {batalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-2">Batalkan Pembayaran?</h3>
            <p className="text-sm text-gray-600 mb-3">Masukkan alasan pembatalan:</p>
            <textarea value={alasanBatal} onChange={e => setAlasanBatal(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4" placeholder="Alasan pembatalan..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setBatalModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Tutup</button>
              <button onClick={handleBatal} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Kwitansi Modal - admin */}
      {kwitansiModal && kwitansiData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-sm">Kwitansi Pembayaran</h3>
              <button onClick={() => setKwitansiModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 p-1">
              <div ref={kwitansiRef} className="bg-white p-5">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1a2744', paddingBottom: 10, marginBottom: 12 }}>
                  {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 'bold' }}>{settings.namaSekolah.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{settings.alamat}</div>
                    <div style={{ fontSize: 10, color: '#666' }}>Telp: {settings.telepon} | {settings.email}</div>
                  </div>
                </div>
                <div className="text-center mb-3">
                  <div className="font-bold text-base tracking-widest">KWITANSI PEMBAYARAN</div>
                  <div className="text-xs text-gray-500">No: {kwitansiModal.id.toUpperCase().slice(0, 16)}</div>
                </div>
                <table className="w-full text-xs mb-3">
                  <tbody>
                    <tr><td className="py-0.5 text-gray-500 w-32">Nama Siswa</td><td className="py-0.5">: <strong>{kwitansiData.siswa?.nama}</strong></td></tr>
                    <tr><td className="py-0.5 text-gray-500">NIS</td><td className="py-0.5">: {kwitansiData.siswa?.nis}</td></tr>
                    <tr><td className="py-0.5 text-gray-500">Kelas</td><td className="py-0.5">: {kwitansiData.kelas?.nama}</td></tr>
                    <tr><td className="py-0.5 text-gray-500">Jenis Tagihan</td><td className="py-0.5">: {kwitansiData.jenis?.nama}</td></tr>
                    <tr><td className="py-0.5 text-gray-500">Periode</td><td className="py-0.5">: {kwitansiData.t?.bulan ? `${getNamaBulan(kwitansiData.t.bulan)} ${kwitansiData.t.tahun}` : kwitansiData.t?.tahun}</td></tr>
                    <tr><td colSpan={2}><hr className="my-1.5 border-gray-200" /></td></tr>
                    <tr><td className="py-0.5 text-gray-500">Total Tagihan</td><td className="py-0.5">: {formatRupiah(kwitansiData.totalTagihan)}</td></tr>
                    {kwitansiData.dibayarSebelum > 0 && <tr><td className="py-0.5 text-gray-500">Sudah Dibayar</td><td className="py-0.5">: {formatRupiah(kwitansiData.dibayarSebelum)}</td></tr>}
                    <tr><td className="py-0.5 text-gray-500">Bayar Ini</td><td className="py-0.5">: <strong className="text-green-600 text-sm">{formatRupiah(kwitansiModal.jumlah)}</strong></td></tr>
                    <tr><td className="py-0.5 text-gray-500">Sisa Tagihan</td><td className="py-0.5">: <strong className={kwitansiData.sisaTagihan > 0 ? 'text-red-600' : 'text-green-600'}>{formatRupiah(kwitansiData.sisaTagihan)} {kwitansiData.sisaTagihan === 0 ? '✓ LUNAS' : ''}</strong></td></tr>
                    <tr><td colSpan={2}><hr className="my-1.5 border-gray-200" /></td></tr>
                    <tr><td className="py-0.5 text-gray-500">Metode</td><td className="py-0.5">: {kwitansiModal.metodeBayar === 'cash' ? 'Cash' : `Transfer — ${kwitansiModal.bankTujuan} (${kwitansiModal.nomorRekening})`}</td></tr>
                    <tr><td className="py-0.5 text-gray-500">Tanggal</td><td className="py-0.5">: {new Date(kwitansiModal.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
                    <tr><td className="py-0.5 text-gray-500">Petugas</td><td className="py-0.5">: {kwitansiModal.createdBy}</td></tr>
                    {kwitansiModal.keterangan && <tr><td className="py-0.5 text-gray-500">Keterangan</td><td className="py-0.5">: {kwitansiModal.keterangan}</td></tr>}
                  </tbody>
                </table>
                <div className="flex justify-between mt-4 text-xs">
                  <div className="text-center w-5/12">
                    <div>Wali Murid</div>
                    <div className="h-12" />
                    <div className="border-t border-gray-400 pt-1">({kwitansiData.siswa?.namaOrtu || '________________'})</div>
                  </div>
                  <div className="text-center w-5/12 relative">
                    <div>Bendahara</div>
                    <div className="h-12 relative flex items-center justify-center">
                      {settings.stempelUrl && <img src={settings.stempelUrl} alt="Stempel" className="absolute h-14 opacity-70" style={{ top: '-4px' }} />}
                      {settings.ttdUrl && <img src={settings.ttdUrl} alt="TTD" className="absolute h-10" />}
                    </div>
                    <div className="border-t border-gray-400 pt-1">({settings.namaBendahara || '________________'})</div>
                  </div>
                </div>
                <div className="text-center text-xs text-gray-400 mt-3 border-t pt-2">
                  Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2 flex-shrink-0">
              <button onClick={() => setKwitansiModal(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs">Tutup</button>
              <button onClick={handleDownloadKwitansiImage} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                <Image size={12} /> Download Gambar
              </button>
              <button onClick={handlePrintKwitansi} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                <Printer size={12} /> Cetak / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
