import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Edit2, Tag } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, formatRupiah, getTodayString, downloadCSV } from '../lib/utils';
import type { User, PengeluaranKategori } from '../types';

interface Props { currentUser: User; }

export default function PengeluaranPage({ currentUser }: Props) {
  const { pengeluaran: list, pengeluaranKategori: kategoriList, jenisTagihan: jenisTagihanList, insertPengeluaran: dbInsert, deletePengeluaran: dbDelete, upsertPengeluaranKategori: dbUpsertKat, deletePengeluaranKategori: dbDeleteKat } = useApp();
  const [tab, setTab] = useState<'list' | 'kategori'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showKategoriForm, setShowKategoriForm] = useState(false);
  const [editKategoriId, setEditKategoriId] = useState<string | null>(null);
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ kategoriId: '', jumlah: '', keterangan: '', tanggal: getTodayString() });
  const [kategoriForm, setKategoriForm] = useState({ nama: '', posAnggaranIds: [] as string[] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return list
      .filter(p => !filterBulan || p.tanggal.startsWith(filterBulan))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [list, filterBulan]);

  const totalBulan = filtered.reduce((s, p) => s + p.jumlah, 0);

  const togglePosAnggaran = (id: string) => {
    setKategoriForm(prev => ({
      ...prev,
      posAnggaranIds: prev.posAnggaranIds.includes(id)
        ? prev.posAnggaranIds.filter(x => x !== id)
        : [...prev.posAnggaranIds, id],
    }));
  };

  const handleSave = async () => {
    if (!form.kategoriId || !form.jumlah) return alert('Kategori dan jumlah wajib diisi!');
    const newItem = {
      id: generateId(),
      kategoriId: form.kategoriId,
      jumlah: parseInt(form.jumlah.replace(/[^0-9]/g, '')) || 0,
      keterangan: form.keterangan,
      tanggal: form.tanggal,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };
    await dbInsert(newItem);
    setShowForm(false);
    setForm({ kategoriId: '', jumlah: '', keterangan: '', tanggal: getTodayString() });
  };

  const handleDelete = async (id: string) => {
    await dbDelete(id);
    setDeleteConfirm(null);
  };

  const handleSaveKategori = async () => {
    if (!kategoriForm.nama.trim()) return alert('Nama kategori wajib diisi!');
    const k: PengeluaranKategori = {
      id: editKategoriId || generateId(),
      nama: kategoriForm.nama,
      posAnggaranIds: kategoriForm.posAnggaranIds,
      createdAt: new Date().toISOString(),
    };
    await dbUpsertKat(k);
    setShowKategoriForm(false);
    setEditKategoriId(null);
    setKategoriForm({ nama: '', posAnggaranIds: [] });
  };

  const handleEditKategori = (k: PengeluaranKategori) => {
    setKategoriForm({ nama: k.nama, posAnggaranIds: k.posAnggaranIds || [] });
    setEditKategoriId(k.id);
    setShowKategoriForm(true);
  };

  const handleDeleteKategori = async (id: string) => { await dbDeleteKat(id); };

  const getPosLabels = (ids: string[]) => ids.map(id => jenisTagihanList.find(j => j.id === id)).filter(Boolean);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pengeluaran</h2>
          <p className="text-sm text-gray-500">Total bulan ini: {formatRupiah(totalBulan)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV('pengeluaran.csv',
              ['Tanggal', 'Kategori', 'Pos Anggaran', 'Jumlah', 'Keterangan'],
              filtered.map(p => {
                const kat = kategoriList.find(k => k.id === p.kategoriId);
                const posLabels = getPosLabels(kat?.posAnggaranIds || []).map(j => j!.kode).join(', ');
                return [p.tanggal, kat?.nama || '-', posLabels || 'Umum', p.jumlah, p.keterangan];
              })
            )}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['list', 'kategori'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {t === 'list' ? 'Daftar Pengeluaran' : 'Kategori & Pos Anggaran'}
          </button>
        ))}
      </div>

      {/* Daftar Pengeluaran */}
      {tab === 'list' && (
        <>
          <div className="flex gap-3">
            <input
              type="month"
              value={filterBulan}
              onChange={e => setFilterBulan(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pos Anggaran</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Jumlah</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Keterangan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Oleh</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Tidak ada pengeluaran</td></tr>
                ) : (
                  filtered.map(p => {
                    const kat = kategoriList.find(k => k.id === p.kategoriId);
                    const posItems = getPosLabels(kat?.posAnggaranIds || []);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-2.5 font-medium">{kat?.nama || '-'}</td>
                        <td className="px-4 py-2.5">
                          {posItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {posItems.map(pos => (
                                <span key={pos!.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  <Tag size={10} /> {pos!.kode}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Umum</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">{formatRupiah(p.jumlah)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{p.keterangan}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{p.createdBy}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 font-semibold">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatRupiah(totalBulan)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Kategori & Pos Anggaran */}
      {tab === 'kategori' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Pos Anggaran</strong> — Setiap kategori bisa dikaitkan ke <strong>lebih dari satu</strong> jenis tagihan.
            Misalnya: "Gaji Guru" bisa masuk ke pos <strong>DPP Angkatan 2023</strong> sekaligus <strong>DPP Angkatan 2024</strong>.
          </div>

          <button
            onClick={() => { setShowKategoriForm(true); setEditKategoriId(null); setKategoriForm({ nama: '', posAnggaranIds: [] }); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Tambah Kategori
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kategoriList.map(k => {
              const posItems = getPosLabels(k.posAnggaranIds || []);
              return (
                <div key={k.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm text-gray-800">{k.nama}</div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditKategori(k)} className="p-1 text-blue-500 hover:bg-blue-50 rounded">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDeleteKategori(k.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {posItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {posItems.map(pos => (
                        <span key={pos!.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          <Tag size={10} /> {pos!.kode} — {pos!.nama}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-1">Pos: Umum (tidak dikaitkan)</div>
                  )}
                </div>
              );
            })}
            {kategoriList.length === 0 && (
              <div className="col-span-3 text-center py-10 text-gray-400 bg-white rounded-xl border">
                Belum ada kategori pengeluaran
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Pengeluaran */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Tambah Pengeluaran</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kategori *</label>
                <select
                  value={form.kategoriId}
                  onChange={e => setForm({ ...form, kategoriId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Kategori</option>
                  {kategoriList.map(k => {
                    const posItems = getPosLabels(k.posAnggaranIds || []);
                    const label = posItems.length > 0 ? ` [${posItems.map(p => p!.kode).join(', ')}]` : '';
                    return (
                      <option key={k.id} value={k.id}>{k.nama}{label}</option>
                    );
                  })}
                </select>
                {form.kategoriId && (() => {
                  const kat = kategoriList.find(k => k.id === form.kategoriId);
                  const posItems = getPosLabels(kat?.posAnggaranIds || []);
                  return posItems.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {posItems.map(pos => (
                        <span key={pos!.id} className="inline-flex items-center gap-1 text-xs text-blue-600">
                          <Tag size={10} /> {pos!.kode} — {pos!.nama}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-xs text-gray-400">Masuk ke pos: Umum</div>
                  );
                })()}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
                <input
                  value={form.jumlah}
                  onChange={e => setForm({ ...form, jumlah: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={e => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  value={form.keterangan}
                  onChange={e => setForm({ ...form, keterangan: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Kategori */}
      {showKategoriForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{editKategoriId ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
              <button onClick={() => setShowKategoriForm(false)} className="text-gray-400">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Kategori *</label>
                <input
                  value={kategoriForm.nama}
                  onChange={e => setKategoriForm({ ...kategoriForm, nama: e.target.value })}
                  placeholder="Contoh: Gaji Guru, Listrik, Makan Santri"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pos Anggaran <span className="text-gray-400 font-normal">(bisa pilih lebih dari satu)</span>
                </label>
                <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                  {jenisTagihanList.map(j => (
                    <label key={j.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kategoriForm.posAnggaranIds.includes(j.id)}
                        onChange={() => togglePosAnggaran(j.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{j.kode}</div>
                        <div className="text-xs text-gray-500">{j.nama}</div>
                      </div>
                    </label>
                  ))}
                  {jenisTagihanList.length === 0 && (
                    <div className="px-3 py-4 text-xs text-gray-400 text-center">Tidak ada jenis tagihan</div>
                  )}
                </div>
                {kategoriForm.posAnggaranIds.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Jika tidak dipilih, masuk ke pos Umum</p>
                )}
                {kategoriForm.posAnggaranIds.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Terpilih: {kategoriForm.posAnggaranIds.map(id => jenisTagihanList.find(j => j.id === id)?.kode).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowKategoriForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={handleSaveKategori} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-2">Hapus Pengeluaran?</h3>
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
