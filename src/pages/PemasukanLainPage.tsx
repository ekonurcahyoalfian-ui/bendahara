import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, formatRupiah, getTodayString, downloadCSV } from '../lib/utils';
import type { User } from '../types';

interface Props { currentUser: User; }

export default function PemasukanLainPage({ currentUser }: Props) {
  const { pemasukanLain: list, insertPemasukanLain: dbInsert, deletePemasukanLain: dbDelete } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ sumber: '', jumlah: '', keterangan: '', tanggal: getTodayString() });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return list.filter(p => !filterBulan || p.tanggal.startsWith(filterBulan)).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [list, filterBulan]);

  const total = filtered.reduce((s, p) => s + p.jumlah, 0);

  const handleSave = async () => {
    if (!form.sumber || !form.jumlah) return alert('Sumber dan jumlah wajib diisi!');
    const newItem = {
      id: generateId(), sumber: form.sumber,
      jumlah: parseInt(form.jumlah.replace(/[^0-9]/g, '')) || 0,
      keterangan: form.keterangan, tanggal: form.tanggal,
      createdAt: new Date().toISOString(), createdBy: currentUser.name,
    };
    await dbInsert(newItem);
    setShowForm(false);
    setForm({ sumber: '', jumlah: '', keterangan: '', tanggal: getTodayString() });
  };

  const handleDelete = async (id: string) => { await dbDelete(id); setDeleteConfirm(null); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pemasukan Lain</h2>
          <p className="text-sm text-gray-500">Total: {formatRupiah(total)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('pemasukan-lain.csv', ['Tanggal','Sumber','Jumlah','Keterangan'],
            filtered.map(p => [p.tanggal, p.sumber, p.jumlah, p.keterangan])
          )} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      <input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tanggal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sumber</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Jumlah</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Keterangan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Oleh</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Tidak ada pemasukan lain</td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-2.5 font-medium">{p.sumber}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{formatRupiah(p.jumlah)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.keterangan}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{p.createdBy}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 font-semibold">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-green-600">{formatRupiah(total)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Tambah Pemasukan Lain</h3>
              <button onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sumber *</label>
                <input value={form.sumber} onChange={e => setForm({ ...form, sumber: e.target.value })} placeholder="Donasi, Subsidi, dll" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
                <input value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-2">Hapus Pemasukan?</h3>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
