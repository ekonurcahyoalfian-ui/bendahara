import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Download } from 'lucide-react';
import { useAppStore } from '../App';
import { generateId, formatDate, downloadCSV } from '../lib/utils';
import type { Siswa } from '../types';

const emptyForm: Omit<Siswa, 'id' | 'createdAt'> = {
  nis: '', nama: '', kelasId: '', jenisKelamin: 'L',
  alamat: '', namaOrtu: '', noHp: '', status: 'aktif', tahunMasuk: new Date().getFullYear().toString(),
};

export default function SiswaPage() {
  const store = useAppStore();
  const { siswa: list, kelas: kelasList } = store;
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => list.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.toLowerCase().includes(search.toLowerCase());
    const matchKelas = !filterKelas || s.kelasId === filterKelas;
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchKelas && matchStatus;
  }), [list, search, filterKelas, filterStatus]);

  const handleSave = async () => {
    if (!form.nis || !form.nama || !form.kelasId) return alert('NIS, Nama, dan Kelas wajib diisi!');
    setSaving(true);
    try {
      const s: Siswa = editId
        ? { ...list.find(x => x.id === editId)!, ...form }
        : { ...form, id: generateId(), createdAt: new Date().toISOString() };
      await store.upsertSiswa(s);
      setShowForm(false); setEditId(null); setForm({ ...emptyForm });
    } finally { setSaving(false); }
  };

  const handleEdit = (s: Siswa) => {
    setForm({ nis: s.nis, nama: s.nama, kelasId: s.kelasId, jenisKelamin: s.jenisKelamin, alamat: s.alamat, namaOrtu: s.namaOrtu, noHp: s.noHp, status: s.status, tahunMasuk: s.tahunMasuk });
    setEditId(s.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try { await store.deleteSiswa(id); } finally { setSaving(false); setDeleteConfirm(null); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-gray-800">Data Siswa</h2><p className="text-sm text-gray-500">{list.filter(s => s.status === 'aktif').length} siswa aktif</p></div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('data-siswa.csv', ['NIS','Nama','Kelas','JK','Nama Ortu','No HP','Status','Tahun Masuk'], filtered.map(s => [s.nis, s.nama, kelasList.find(k => k.id === s.kelasId)?.nama || '-', s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan', s.namaOrtu, s.noHp, s.status, s.tahunMasuk]))} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"><Download size={14} /> Export</button>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus size={14} /> Tambah Siswa</button>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NIS..." className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Semua Kelas</option>{kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Semua Status</option><option value="aktif">Aktif</option><option value="alumni">Alumni</option></select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">NIS</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nama Siswa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kelas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Orang Tua</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No HP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Tidak ada data siswa</td></tr> : filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.nis}</td>
                  <td className="px-4 py-2.5 font-medium">{s.nama}</td>
                  <td className="px-4 py-2.5">{kelasList.find(k => k.id === s.kelasId)?.nama || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.namaOrtu}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.noHp}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status === 'aktif' ? 'Aktif' : 'Alumni'}</span></td>
                  <td className="px-4 py-2.5"><div className="flex gap-1"><button onClick={() => handleEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button><button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="font-semibold">{editId ? 'Edit Siswa' : 'Tambah Siswa'}</h3><button onClick={() => setShowForm(false)}>&times;</button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">NIS *</label><input value={form.nis} onChange={e => setForm({ ...form, nis: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tahun Masuk</label><input value={form.tahunMasuk} onChange={e => setForm({ ...form, tahunMasuk: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap *</label><input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Kelas *</label><select value={form.kelasId} onChange={e => setForm({ ...form, kelasId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Pilih Kelas</option>{kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kelamin</label><select value={form.jenisKelamin} onChange={e => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nama Orang Tua / Wali</label><input value={form.namaOrtu} onChange={e => setForm({ ...form, namaOrtu: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">No HP</label><input value={form.noHp} onChange={e => setForm({ ...form, noHp: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Alamat</label><textarea value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'aktif' | 'alumni' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="aktif">Aktif</option><option value="alumni">Alumni</option></select></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-2">Hapus Siswa?</h3>
            <p className="text-sm text-gray-600 mb-4">Semua tagihan dan riwayat pembayaran siswa ini juga akan dihapus.</p>
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
