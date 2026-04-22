import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, downloadCSV } from '../lib/utils';
import type { Siswa, Tagihan, Pembayaran } from '../types';

type ImportType = 'siswa' | 'tagihan' | 'pembayaran' | 'wali';

interface ImportResult { success: number; errors: string[]; }

export default function ImportPage() {
  const { siswa: existingSiswa, kelas: kelasList, tagihan: existingTagihan, jenisTagihan: jenisTagihanList, pembayaran: existingPembayaran, upsertSiswa, insertTagihan, insertPembayaran: dbInsertPembayaran, reload } = useApp();
  const [activeType, setActiveType] = useState<ImportType>('siswa');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const templates: Record<ImportType, { headers: string[]; sample: (string | number)[][] }> = {
    siswa: {
      headers: ['NIS', 'Nama', 'Kelas', 'Jenis Kelamin (L/P)', 'Nama Orang Tua', 'No HP', 'Alamat', 'Status (aktif/alumni)', 'Tahun Masuk'],
      sample: [
        ['2024001', 'Ahmad Fauzi', '7A', 'L', 'Budi Santoso', '081234567890', 'Jl. Merdeka No. 1', 'aktif', '2024'],
        ['2024002', 'Siti Aisyah', '7B', 'P', 'Siti Rahayu', '081234567891', 'Jl. Pahlawan No. 2', 'aktif', '2024'],
        ['2023001', 'Rizky Pratama', '8A', 'L', 'Hendra Pratama', '081234567892', 'Jl. Sudirman No. 3', 'aktif', '2023'],
      ]
    },
    tagihan: {
      headers: ['NIS Siswa', 'Kode Jenis Tagihan', 'Bulan (1-12, kosong jika sekali bayar)', 'Tahun', 'Nominal', 'Diskon', 'Keterangan'],
      sample: [
        ['2024001', 'DPP', '1', '2025', '1000000', '0', 'DPP Januari'],
        ['2024001', 'DPP', '2', '2025', '1000000', '0', 'DPP Februari'],
        ['2024001', 'ASRAMA', '1', '2025', '500000', '0', 'Asrama Januari'],
        ['2024001', 'INFAQ', '', '2025', '2000000', '100000', 'Infaq pengembangan'],
      ]
    },
    pembayaran: {
      headers: ['NIS Siswa', 'Kode Jenis Tagihan', 'Bulan (1-12, kosong jika sekali bayar)', 'Tahun', 'Jumlah Bayar', 'Metode (cash/transfer)', 'Tanggal (YYYY-MM-DD)', 'Keterangan'],
      sample: [
        ['2024001', 'DPP', '1', '2025', '1000000', 'cash', '2025-01-15', 'Lunas'],
        ['2024001', 'DPP', '2', '2025', '500000', 'transfer', '2025-02-10', 'Cicilan pertama'],
        ['2024001', 'ASRAMA', '1', '2025', '500000', 'cash', '2025-01-15', 'Lunas'],
      ]
    },
    wali: {
      headers: ['Nama Wali', 'Username', 'Password', 'NIS Siswa'],
      sample: [
        ['Budi Santoso', 'budi.santoso', 'password123', '2024001'],
        ['Siti Rahayu', 'siti.rahayu', 'password123', '2024002'],
      ]
    }
  };

  const handleDownloadTemplate = () => {
    const t = templates[activeType];
    downloadCSV(`template-import-${activeType}.csv`, t.headers, t.sample);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += line[i]; }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);

    const text = await file.text();
    const rows = parseCSV(text).slice(1); // skip header
    const errors: string[] = [];
    let success = 0;

    if (activeType === 'siswa') {
      const newSiswa: Siswa[] = [];

      rows.forEach((row, i) => {
        const [nis, nama, kelasNama, jk, namaOrtu, noHp, alamat, status, tahunMasuk] = row;
        if (!nis || !nama) { errors.push(`Baris ${i + 2}: NIS dan Nama wajib diisi`); return; }
        const kelas = kelasList.find(k => k.nama.toLowerCase() === kelasNama?.toLowerCase());
        if (!kelas) { errors.push(`Baris ${i + 2}: Kelas "${kelasNama}" tidak ditemukan`); return; }
        if (existingSiswa.find(s => s.nis === nis)) { errors.push(`Baris ${i + 2}: NIS ${nis} sudah ada (dilewati)`); return; }
        newSiswa.push({
          id: generateId(), nis, nama,
          kelasId: kelas.id,
          jenisKelamin: (jk?.toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P',
          namaOrtu: namaOrtu || '', noHp: noHp || '', alamat: alamat || '',
          status: (status === 'alumni' ? 'alumni' : 'aktif') as 'aktif' | 'alumni',
          tahunMasuk: tahunMasuk || new Date().getFullYear().toString(),
          createdAt: new Date().toISOString(),
        });
        success++;
      });
      for (const s of newSiswa) await upsertSiswa(s);
    }

    else if (activeType === 'tagihan') {
      const siswaList = existingSiswa;
      const newTagihan: Tagihan[] = [];

      rows.forEach((row, i) => {
        const [nis, kodeJenis, bulanStr, tahunStr, nominalStr, diskonStr, keterangan] = row;
        const siswa = siswaList.find(s => s.nis === nis);
        if (!siswa) { errors.push(`Baris ${i + 2}: NIS ${nis} tidak ditemukan`); return; }
        const jenis = jenisTagihanList.find(j => j.kode === kodeJenis?.toUpperCase());
        if (!jenis) { errors.push(`Baris ${i + 2}: Kode jenis tagihan "${kodeJenis}" tidak ditemukan`); return; }
        const bulan = bulanStr ? parseInt(bulanStr) : undefined;
        const tahun = parseInt(tahunStr) || new Date().getFullYear();
        const exists = existingTagihan.find(t =>
          t.siswaId === siswa.id && t.jenisTagihanId === jenis.id &&
          t.tahun === tahun && t.bulan === bulan
        );
        if (exists) { errors.push(`Baris ${i + 2}: Tagihan sudah ada (dilewati)`); return; }
        newTagihan.push({
          id: generateId(), siswaId: siswa.id, jenisTagihanId: jenis.id,
          bulan, tahun,
          nominal: parseInt(nominalStr) || jenis.nominal,
          diskon: parseInt(diskonStr) || 0,
          keterangan: keterangan || '',
          createdAt: new Date().toISOString(),
        });
        success++;
      });
      await insertTagihan(newTagihan);
    }

    else if (activeType === 'pembayaran') {
      const siswaList = existingSiswa;
      const tagihanList = existingTagihan;
      const newPembayaran: Pembayaran[] = [];

      rows.forEach((row, i) => {
        const [nis, kodeJenis, bulanStr, tahunStr, jumlahStr, metode, tanggal, keterangan] = row;
        const siswa = siswaList.find(s => s.nis === nis);
        if (!siswa) { errors.push(`Baris ${i + 2}: NIS ${nis} tidak ditemukan`); return; }
        const jenis = jenisTagihanList.find(j => j.kode === kodeJenis?.toUpperCase());
        if (!jenis) { errors.push(`Baris ${i + 2}: Kode jenis tagihan "${kodeJenis}" tidak ditemukan`); return; }
        const bulan = bulanStr ? parseInt(bulanStr) : undefined;
        const tahun = parseInt(tahunStr) || new Date().getFullYear();
        const tagihan = tagihanList.find(t =>
          t.siswaId === siswa.id && t.jenisTagihanId === jenis.id &&
          t.tahun === tahun && t.bulan === bulan
        );
        if (!tagihan) { errors.push(`Baris ${i + 2}: Tagihan tidak ditemukan untuk ${nis} - ${kodeJenis} bulan ${bulanStr} tahun ${tahunStr}`); return; }
        newPembayaran.push({
          id: generateId(), tagihanId: tagihan.id, siswaId: siswa.id,
          jumlah: parseInt(jumlahStr) || 0,
          metodeBayar: (metode === 'transfer' ? 'transfer' : 'cash') as 'cash' | 'transfer',
          tanggal: tanggal || new Date().toISOString().split('T')[0],
          keterangan: keterangan || '',
          dibatalkan: false,
          createdAt: new Date().toISOString(),
          createdBy: 'Import',
        });
        success++;
      });
      for (const p of newPembayaran) await dbInsertPembayaran(p);
    }

    setResult({ success, errors });
    if (success > 0) await reload();
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const typeLabels: Record<ImportType, string> = {
    siswa: 'Data Siswa',
    tagihan: 'Tagihan',
    pembayaran: 'Pembayaran',
    wali: 'Akun Wali',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Import Data dari Excel/CSV</h2>
        <p className="text-sm text-gray-500">Impor data siswa, tagihan, dan pembayaran dari file CSV</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Petunjuk Import:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Download template CSV sesuai jenis data</li>
              <li>Isi data di Excel/Google Sheets sesuai format template</li>
              <li>Simpan sebagai file CSV (UTF-8)</li>
              <li>Upload file CSV di sini</li>
              <li>Untuk data historis (alumni/kelas lama), pastikan kelas sudah dibuat terlebih dahulu</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(typeLabels) as ImportType[]).map(type => (
          <button
            key={type}
            onClick={() => { setActiveType(type); setResult(null); }}
            className={`p-4 rounded-xl border text-sm font-medium transition-colors ${
              activeType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText size={20} className="mx-auto mb-1" />
            {typeLabels[type]}
          </button>
        ))}
      </div>

      {/* Template & Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Import {typeLabels[activeType]}</h3>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Format kolom:</p>
          <div className="flex flex-wrap gap-1">
            {templates[activeType].headers.map((h, i) => (
              <span key={i} className="text-xs bg-white border border-gray-200 rounded px-2 py-1">{i + 1}. {h}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Download size={14} /> Download Template CSV
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <Upload size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-3">Upload file CSV untuk import {typeLabels[activeType]}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            {loading ? 'Memproses...' : 'Pilih File CSV'}
          </label>
        </div>

        {result && (
          <div className={`rounded-xl p-4 ${
            result.errors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="font-semibold text-sm">{result.success} data berhasil diimport</span>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-yellow-800 mb-1">{result.errors.length} baris gagal:</p>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-yellow-700">{e}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
