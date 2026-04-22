import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useAppStore } from '../App';
import { generateId } from '../lib/utils';
import type { Kelas } from '../types';

export default function KelasPage() {
  const store = useAppStore();
  const list = store.kelas;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nama: '', tahunAjaran: '2025/2026' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.nama.trim()) return alert('Nama kelas wajib diisi!');
    setSaving(true);
    try {
      const k: Kelas = editId
        ? { ...list.find(x => x.id === editId)!, ...form }
        : { ...form, id: generateId(), createdAt: new Date().toISOString() };
      await store.upsertKelas(k);
      setShowForm(false); setEditId(null); setForm({ nama: '', tahunAjaran: '2025/2026' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try { await store.deleteKelas(id); } finally { setSaving(false); setDeleteConfirm(null); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-gray-800">Kelola Kelas</h2><p className="text-sm text-gray-500">{list.length} kelas terdaftar</p></div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nama: '', tahunAjaran: '2025/2026' }); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus size={14} /> Tambah Kelas</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nama Kelas</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tahun Ajaran</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {list.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Belum ada kelas</td></tr> : list.map((k, i) => (
              <tr key={k.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                <td className="px-4 py-2.5 font-semibold">{k.nama}</td>
                <td className="px-4 py-2.5 text-gray-600">{k.tahunAjaran}</td>
                <td className="px-4 py-2.5"><div className="flex gap-1"><button onClick={() => { setForm({ nama: k.nama, tahunAjaran: k.tahunAjaran }); setEditId(k.id); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button><button onClick={() => setDeleteConfirm(k.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="font-semibold">{editId ? 'Edit Kelas' : 'Tambah Kelas'}</h3><button onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nama Kelas *</label><input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="7A, 8B, 9C" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tahun Ajaran</label><input value={form.tahunAjaran} onChange={e => setForm({ ...form, tahunAjaran: e.target.value })} placeholder="2025/2026" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-2">Hapus Kelas?</h3>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-60">{saving ? 'Menghapus...' : 'Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
