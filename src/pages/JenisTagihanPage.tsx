import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, formatRupiah } from '../lib/utils';
import type { JenisTagihan, PeriodeTagihan } from '../types';

export default function JenisTagihanPage() {
  const { jenisTagihan: list, upsertJenisTagihan, deleteJenisTagihan } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ kode: '', nama: '', periode: 'bulanan' as PeriodeTagihan, nominal: '', deskripsi: '', aktif: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.kode || !form.nama) return alert('Kode dan Nama wajib diisi!');
    setSaving(true);
    const data: JenisTagihan = {
      id: editId || generateId(), kode: form.kode.toUpperCase(), nama: form.nama,
      periode: form.periode, nominal: parseInt(form.nominal.replace(/[^0-9]/g, '')) || 0,
      deskripsi: form.deskripsi, aktif: form.aktif, createdAt: new Date().toISOString(),
    };
    await upsertJenisTagihan(data);
    setSaving(false);
    setShowForm(false); setEditId(null);
    setForm({ kode: '', nama: '', periode: 'bulanan', nominal: '', deskripsi: '', aktif: true });
  };

  const handleEdit = (j: JenisTagihan) => {
    setForm({ kode: j.kode, nama: j.nama, periode: j.periode, nominal: j.nominal.toString(), deskripsi: j.deskripsi, aktif: j.aktif });
    setEditId(j.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => { setSaving(true); await deleteJenisTagihan(id); setSaving(false); setDeleteConfirm(null); };

  const toggleAktif = async (j: JenisTagihan) => { await upsertJenisTagihan({ ...j, aktif: !j.aktif }); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-gray-800">Jenis Tagihan</h2><p className="text-sm text-gray-500">Kelola jenis tagihan (DPP, Asrama, Infaq, dll)</p></div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ kode: '', nama: '', periode: 'bulanan', nominal: '', deskripsi: '', aktif: true }); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Tambah Jenis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(j => (
          <div key={j.id} className={`bg-white rounded-xl border p-5 shadow-sm ${!j.aktif ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Tag size={14} className="text-blue-600" /></div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{j.kode}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(j)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={13} /></button>
                <button onClick={() => setDeleteConfirm(j.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">{j.nama}</h3>
            <p className="text-xs text-gray-500 mb-3">{j.deskripsi || '-'}</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-green-600">{formatRupiah(j.nominal)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.periode === 'bulanan' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {j.periode === 'bulanan' ? '📅 Bulanan' : '💳 Sekali Bayar'}
                </span>
              </div>
              <button onClick={() => toggleAktif(j)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${j.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {j.aktif ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">Belum ada jenis tagihan</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="font-semibold">{editId ? 'Edit Jenis Tagihan' : 'Tambah Jenis Tagihan'}</h3><button onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Kode *</label><input value={form.kode} onChange={e => setForm({ ...form, kode: e.target.value })} placeholder="DPP" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Periode *</label>
                  <select value={form.periode} onChange={e => setForm({ ...form, periode: e.target.value as PeriodeTagihan })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="bulanan">Bulanan</option><option value="sekali">Sekali Bayar</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nama Tagihan *</label><input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nominal Default (Rp)</label><input value={form.nominal} onChange={e => setForm({ ...form, nominal: e.target.value })} placeholder="1000000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label><textarea value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="aktif" checked={form.aktif} onChange={e => setForm({ ...form, aktif: e.target.checked })} className="rounded" /><label htmlFor="aktif" className="text-sm text-gray-700">Aktif</label></div>
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
            <h3 className="font-semibold mb-2">Hapus Jenis Tagihan?</h3>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-60">{saving ? '...' : 'Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
