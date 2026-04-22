import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, formatRupiah, getNamaBulan, getBulanList, downloadCSV } from '../lib/utils';
import type { Tagihan } from '../types';

const BULAN_LIST = getBulanList();
const TAHUN_LIST = Array.from({ length: 31 }, (_, i) => 2020 + i); // 2020–2050

export default function TagihanPage() {
  const { tagihan: tagihanList, siswa: siswaList, kelas: kelasList, jenisTagihan: jenisTagihanList, pembayaran: allPembayaran, insertTagihan, deleteTagihan: dbDeleteTagihan } = useApp();
  const pembayaranList = allPembayaran.filter(p => !p.dibatalkan);

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());

  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const thisYear = new Date().getFullYear();

  const [form, setForm] = useState({
    siswaId: '',
    jenisTagihanId: '',
    // Untuk bulanan: rentang bulan+tahun
    bulanDari: 1,
    tahunDari: thisYear,
    bulanSampai: 12,
    tahunSampai: thisYear,
    // Untuk sekali bayar
    tahunSekali: thisYear,
    nominal: '',
    diskon: '0',
    keterangan: '',
  });

  const selectedJenis = jenisTagihanList.find(j => j.id === form.jenisTagihanId);

  const handleJenisChange = (id: string) => {
    const jenis = jenisTagihanList.find(j => j.id === id);
    setForm(f => ({
      ...f,
      jenisTagihanId: id,
      nominal: jenis ? jenis.nominal.toString() : '',
    }));
  };

  // Hitung jumlah bulan yang akan dibuat (lintas tahun)
  const hitungJumlahBulan = () => {
    const dari = form.tahunDari * 12 + (form.bulanDari - 1);
    const sampai = form.tahunSampai * 12 + (form.bulanSampai - 1);
    return sampai >= dari ? sampai - dari + 1 : 0;
  };

  // Generate semua pasangan {bulan, tahun} dari rentang
  const generateRentangBulan = (): { bulan: number; tahun: number }[] => {
    const hasil: { bulan: number; tahun: number }[] = [];
    const dari = form.tahunDari * 12 + (form.bulanDari - 1);
    const sampai = form.tahunSampai * 12 + (form.bulanSampai - 1);
    if (sampai < dari) return [];
    for (let i = dari; i <= sampai; i++) {
      hasil.push({ bulan: (i % 12) + 1, tahun: Math.floor(i / 12) });
    }
    return hasil;
  };

  const handleSave = async () => {
    if (!form.siswaId || !form.jenisTagihanId) return alert('Siswa dan Jenis Tagihan wajib dipilih!');
    const nominal = parseInt(form.nominal.replace(/[^0-9]/g, '')) || 0;
    const diskon = parseInt(form.diskon.replace(/[^0-9]/g, '')) || 0;

    let newTagihan: Tagihan[] = [];

    if (selectedJenis?.periode === 'bulanan') {
      const rentang = generateRentangBulan();
      if (rentang.length === 0) return alert('Rentang bulan tidak valid! Pastikan "Dari" tidak lebih besar dari "Sampai".');

      let skipped = 0;
      for (const { bulan, tahun } of rentang) {
        const exists = tagihanList.find(t =>
          t.siswaId === form.siswaId &&
          t.jenisTagihanId === form.jenisTagihanId &&
          t.bulan === bulan &&
          t.tahun === tahun
        );
        if (exists) { skipped++; continue; }
        newTagihan.push({
          id: generateId(),
          siswaId: form.siswaId,
          jenisTagihanId: form.jenisTagihanId,
          bulan,
          tahun,
          nominal,
          diskon,
          keterangan: form.keterangan,
          createdAt: new Date().toISOString(),
        });
      }

      if (newTagihan.length === 0) {
        return alert(`Semua ${rentang.length} tagihan pada rentang tersebut sudah ada!`);
      }
      if (skipped > 0) {
        const ok = window.confirm(`${skipped} tagihan sudah ada dan akan dilewati. ${newTagihan.length} tagihan baru akan ditambahkan. Lanjutkan?`);
        if (!ok) return;
      }
    } else {
      // Sekali bayar
      const exists = tagihanList.find(t =>
        t.siswaId === form.siswaId &&
        t.jenisTagihanId === form.jenisTagihanId &&
        t.tahun === form.tahunSekali
      );
      if (exists) return alert('Tagihan jenis ini untuk tahun tersebut sudah ada!');
      newTagihan.push({
        id: generateId(),
        siswaId: form.siswaId,
        jenisTagihanId: form.jenisTagihanId,
        bulan: undefined,
        tahun: form.tahunSekali,
        nominal,
        diskon,
        keterangan: form.keterangan,
        createdAt: new Date().toISOString(),
      });
    }

    await insertTagihan(newTagihan);
    setShowForm(false);
    alert(`✓ ${newTagihan.length} tagihan berhasil ditambahkan!`);
  };

  const handleDelete = async (id: string) => {
    await dbDeleteTagihan(id);
    setDeleteConfirm(null);
  };

  const getStatusTagihan = (tagihanId: string, nominal: number, diskon: number) => {
    const dibayar = pembayaranList.filter(p => p.tagihanId === tagihanId).reduce((s, p) => s + p.jumlah, 0);
    const total = nominal - diskon;
    if (dibayar >= total) return { status: 'lunas', sisa: 0, dibayar };
    if (dibayar > 0) return { status: 'cicil', sisa: total - dibayar, dibayar };
    return { status: 'belum', sisa: total, dibayar: 0 };
  };

  const filtered = useMemo(() => {
    return tagihanList.filter(t => {
      const siswa = siswaList.find(s => s.id === t.siswaId);
      const matchSearch = !search || (siswa?.nama.toLowerCase().includes(search.toLowerCase()) || siswa?.nis.includes(search));
      const matchKelas = !filterKelas || siswa?.kelasId === filterKelas;
      const matchJenis = !filterJenis || t.jenisTagihanId === filterJenis;
      const matchTahun = !filterTahun || t.tahun.toString() === filterTahun;
      return matchSearch && matchKelas && matchJenis && matchTahun;
    });
  }, [tagihanList, siswaList, search, filterKelas, filterJenis, filterTahun]);

  const handleDownload = () => {
    downloadCSV('tagihan.csv',
      ['Siswa', 'NIS', 'Kelas', 'Jenis Tagihan', 'Periode', 'Nominal', 'Diskon', 'Total', 'Status', 'Sisa'],
      filtered.map(t => {
        const siswa = siswaList.find(s => s.id === t.siswaId);
        const jenis = jenisTagihanList.find(j => j.id === t.jenisTagihanId);
        const kelas = kelasList.find(k => k.id === siswa?.kelasId);
        const { status, sisa } = getStatusTagihan(t.id, t.nominal, t.diskon);
        const periode = t.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : `${t.tahun}`;
        return [
          siswa?.nama || '-', siswa?.nis || '-', kelas?.nama || '-',
          jenis?.nama || '-', periode, t.nominal, t.diskon, t.nominal - t.diskon,
          status === 'lunas' ? 'Lunas' : status === 'cicil' ? 'Cicilan' : 'Belum Bayar',
          sisa
        ];
      })
    );
  };

  // Preview label rentang
  const previewRentang = () => {
    const jumlah = hitungJumlahBulan();
    if (jumlah <= 0) return <span className="text-red-500">Rentang tidak valid</span>;
    const dari = `${getNamaBulan(form.bulanDari)} ${form.tahunDari}`;
    const sampai = `${getNamaBulan(form.bulanSampai)} ${form.tahunSampai}`;
    if (dari === sampai) return <span>{dari} — <strong>1 bulan</strong></span>;
    return <span>{dari} s/d {sampai} — <strong>{jumlah} bulan</strong></span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Tagihan Siswa</h2>
          <p className="text-sm text-gray-500">{filtered.length} tagihan ditemukan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah Tagihan
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NIS..." className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Semua Jenis</option>
          {jenisTagihanList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
        </select>
        <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Semua Tahun</option>
          {TAHUN_LIST.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Siswa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kelas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Jenis Tagihan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Periode</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Dibayar</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Sisa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Tidak ada tagihan</td></tr>
              ) : (
                filtered.map(t => {
                  const siswa = siswaList.find(s => s.id === t.siswaId);
                  const jenis = jenisTagihanList.find(j => j.id === t.jenisTagihanId);
                  const kelas = kelasList.find(k => k.id === siswa?.kelasId);
                  const { status, sisa, dibayar } = getStatusTagihan(t.id, t.nominal, t.diskon);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{siswa?.nama || '-'}</div>
                        <div className="text-xs text-gray-400">{siswa?.nis}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{kelas?.nama || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{jenis?.kode}</span>
                        <div className="text-xs text-gray-500 mt-0.5">{jenis?.nama}</div>
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {t.bulan ? `${getNamaBulan(t.bulan)} ${t.tahun}` : `${t.tahun}`}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatRupiah(t.nominal - t.diskon)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{formatRupiah(dibayar)}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{formatRupiah(sisa)}</td>
                      <td className="px-4 py-2.5">
                        {status === 'lunas' && <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> Lunas</span>}
                        {status === 'cicil' && <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full"><Clock size={10} /> Cicilan</span>}
                        {status === 'belum' && <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle size={10} /> Belum</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => setDeleteConfirm(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold">Tambah Tagihan</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-6 space-y-4">

              {/* Siswa */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Siswa *</label>
                <select value={form.siswaId} onChange={e => setForm({ ...form, siswaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Siswa</option>
                  {siswaList.map(s => {
                    const kelas = kelasList.find(k => k.id === s.kelasId);
                    return <option key={s.id} value={s.id}>{s.nama} ({kelas?.nama || '-'}) — {s.nis}</option>;
                  })}
                </select>
              </div>

              {/* Jenis Tagihan */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Tagihan *</label>
                <select value={form.jenisTagihanId} onChange={e => handleJenisChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Jenis Tagihan</option>
                  {jenisTagihanList.filter(j => j.aktif).map(j => (
                    <option key={j.id} value={j.id}>{j.nama} — {j.periode === 'bulanan' ? '📅 Bulanan' : '💳 Sekali Bayar'}</option>
                  ))}
                </select>
              </div>

              {/* Bulanan: rentang bulan + tahun */}
              {selectedJenis?.periode === 'bulanan' && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <div className="text-xs font-semibold text-blue-800 mb-1">Rentang Periode Tagihan</div>

                    {/* Dari */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dari</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={form.bulanDari}
                          onChange={e => setForm({ ...form, bulanDari: parseInt(e.target.value) })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {BULAN_LIST.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                        <select
                          value={form.tahunDari}
                          onChange={e => setForm({ ...form, tahunDari: parseInt(e.target.value) })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TAHUN_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Sampai */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sampai</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={form.bulanSampai}
                          onChange={e => setForm({ ...form, bulanSampai: parseInt(e.target.value) })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {BULAN_LIST.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                        <select
                          value={form.tahunSampai}
                          onChange={e => setForm({ ...form, tahunSampai: parseInt(e.target.value) })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TAHUN_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                      hitungJumlahBulan() > 0
                        ? 'bg-white text-blue-700 border border-blue-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {hitungJumlahBulan() > 0 ? (
                        <>📅 Akan membuat <strong>{hitungJumlahBulan()} tagihan</strong>: {previewRentang()}</>
                      ) : (
                        <>⚠️ Rentang tidak valid — bulan "Sampai" harus setelah "Dari"</>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Sekali bayar: hanya tahun */}
              {selectedJenis?.periode === 'sekali' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tahun</label>
                  <select
                    value={form.tahunSekali}
                    onChange={e => setForm({ ...form, tahunSekali: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TAHUN_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}

              {/* Nominal & Diskon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                  <input
                    value={form.nominal}
                    onChange={e => setForm({ ...form, nominal: e.target.value })}
                    placeholder="1000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Diskon (Rp)</label>
                  <input
                    value={form.diskon}
                    onChange={e => setForm({ ...form, diskon: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Info diskon */}
              {parseInt(form.diskon.replace(/[^0-9]/g, '') || '0') > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700">
                  Total per bulan setelah diskon: <strong>{formatRupiah(
                    (parseInt(form.nominal.replace(/[^0-9]/g, '') || '0')) -
                    (parseInt(form.diskon.replace(/[^0-9]/g, '') || '0'))
                  )}</strong>
                </div>
              )}

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan</label>
                <input
                  value={form.keterangan}
                  onChange={e => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button
                onClick={handleSave}
                disabled={selectedJenis?.periode === 'bulanan' && hitungJumlahBulan() <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan Tagihan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-2">Hapus Tagihan?</h3>
            <p className="text-sm text-gray-600 mb-4">Tagihan dan riwayat pembayarannya akan dihapus.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
