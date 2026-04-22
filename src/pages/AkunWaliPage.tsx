import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { generateId, downloadCSV } from '../lib/utils';
import type { User } from '../types';

export default function AkunWaliPage() {
  const { users: allUsers, siswa: siswaList, kelas: kelasList, upsertUser, deleteUser: dbDeleteUser } = useApp();
  const users = allUsers.filter(u => u.role === 'wali');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', studentId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name || !form.username || (!editId && !form.password)) return alert('Nama, Username, dan Password wajib diisi!');
    const existing = allUsers.find(u => u.username === form.username && u.id !== editId);
    if (existing) return alert('Username sudah digunakan!');
    const existingUser = allUsers.find(u => u.id === editId);
    const newUser: User = {
      id: editId || generateId(),
      name: form.name, username: form.username,
      password: form.password || (existingUser?.password || ''),
      role: 'wali', studentId: form.studentId,
      createdAt: new Date().toISOString(),
    };
    await upsertUser(newUser);
    setShowForm(false); setEditId(null);
    setForm({ name: '', username: '', password: '', studentId: '' });
  };

  const handleEdit = (u: User) => {
    setForm({ name: u.name, username: u.username, password: '', studentId: u.studentId || '' });
    setEditId(u.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => { await dbDeleteUser(id); setDeleteConfirm(null); };

  const handleDownloadTemplate = () => {
    downloadCSV('template-akun-wali.csv',
      ['Nama Wali', 'Username', 'Password', 'NIS Siswa'],
      [
        ['Budi Santoso', 'budi.santoso', 'password123', '2024001'],
        ['Siti Rahayu', 'siti.rahayu', 'password123', '2024002'],
      ]
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Akun Wali Murid</h2>
          <p className="text-sm text-gray-500">{users.length} akun wali terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <Download size={14} /> Template
          </button>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', username: '', password: '', studentId: '' }); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah Akun
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">Info Akun Wali Murid</p>
        <p className="text-xs text-blue-600">Wali murid dapat login menggunakan username dan password yang dibuat di sini. Mereka hanya dapat melihat tagihan dan riwayat pembayaran siswa yang ditautkan.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nama Wali</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Siswa Terkait</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kelas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Belum ada akun wali</td></tr>
            ) : (
              users.map((u, i) => {
                const siswa = siswaList.find(s => s.id === u.studentId);
                const kelas = kelasList.find(k => k.id === siswa?.kelasId);
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 font-mono text-sm">{u.username}</td>
                    <td className="px-4 py-2.5">{siswa?.nama || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-2.5">{kelas?.nama || '-'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{editId ? 'Edit Akun Wali' : 'Tambah Akun Wali'}</h3>
              <button onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Wali *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{editId ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Siswa Terkait</label>
                <select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Pilih Siswa</option>
                  {siswaList.map(s => {
                    const kelas = kelasList.find(k => k.id === s.kelasId);
                    return <option key={s.id} value={s.id}>{s.nama} ({kelas?.nama || '-'})</option>;
                  })}
                </select>
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
            <h3 className="font-semibold mb-2">Hapus Akun Wali?</h3>
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
