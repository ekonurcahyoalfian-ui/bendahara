import React, { useState, useRef } from 'react';
import { Save, Eye, EyeOff, Plus, Trash2, CreditCard, Upload } from 'lucide-react';
import { setCurrentUser } from '../lib/storage';
import { useApp } from '../lib/AppContext';
import { generateId } from '../lib/utils';
import type { User, RekeningSekolah } from '../types';

interface Props { currentUser: User; onUserUpdate: (u: User) => void; }

export default function SettingsPage({ currentUser, onUserUpdate }: Props) {
  const { settings: dbSettings, saveSettings: dbSaveSettings, users: allUsers, saveUsers: dbSaveUsers } = useApp();
  const [localSettings, setSettingsState] = useState(dbSettings);
  const [tab, setTab] = useState<'sekolah' | 'rekening' | 'bendahara' | 'password'>('sekolah');
  const [showPass, setShowPass] = useState(false);
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [saved, setSaved] = useState('');
  const [rekeningForm, setRekeningForm] = useState({ namaBank: '', nomorRekening: '', atasNama: '' });
  const [showRekeningForm, setShowRekeningForm] = useState(false);
  const ttdRef = useRef<HTMLInputElement>(null);
  const stempelRef = useRef<HTMLInputElement>(null);

  const showSaved = (msg = 'Berhasil disimpan!') => {
    setSaved(msg);
    setTimeout(() => setSaved(''), 3000);
  };

  const handleSaveSettings = async () => {
    await dbSaveSettings(localSettings);
    showSaved('Pengaturan berhasil disimpan!');
  
  };

  const handleChangePassword = async () => {
    const user = allUsers.find(u => u.id === currentUser.id);
    if (!user) return;
    if (user.password !== passForm.oldPass) return alert('Password lama salah!');
    if (passForm.newPass !== passForm.confirmPass) return alert('Password baru tidak cocok!');
    if (passForm.newPass.length < 6) return alert('Password minimal 6 karakter!');
    const updated = allUsers.map(u => u.id === currentUser.id ? { ...u, password: passForm.newPass } : u);
    await dbSaveUsers(updated);
    const updatedUser = { ...currentUser, password: passForm.newPass };
    setCurrentUser(updatedUser);
    onUserUpdate(updatedUser);
    setPassForm({ oldPass: '', newPass: '', confirmPass: '' });
    showSaved('Password berhasil diubah!');
  };

  const handleAddRekening = () => {
    if (!rekeningForm.namaBank || !rekeningForm.nomorRekening) return alert('Nama bank dan nomor rekening wajib diisi!');
    const newRek: RekeningSekolah = {
      id: generateId(),
      namaBank: rekeningForm.namaBank,
      nomorRekening: rekeningForm.nomorRekening,
      atasNama: rekeningForm.atasNama,
      aktif: true,
    };
    const updated = { ...localSettings, rekening: [...(localSettings.rekening || []), newRek] };
    setSettingsState(updated);
    dbSaveSettings(localSettings);
    setRekeningForm({ namaBank: '', nomorRekening: '', atasNama: '' });
    setShowRekeningForm(false);
    showSaved('Rekening berhasil ditambahkan!');
  };

  const handleDeleteRekening = (id: string) => {
    const updated = { ...localSettings, rekening: localSettings.rekening.filter(r => r.id !== id) };
    setSettingsState(updated);
    dbSaveSettings(localSettings);
  };

  const handleToggleRekening = (id: string) => {
    const updated = { ...localSettings, rekening: localSettings.rekening.map(r => r.id === id ? { ...r, aktif: !r.aktif } : r) };
    setSettingsState(updated);
    dbSaveSettings(localSettings);
  };

  const handleImageUpload = (field: 'ttdUrl' | 'stempelUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const updated = { ...localSettings, [field]: base64 };
      setSettingsState(updated);
      dbSaveSettings(localSettings);
      showSaved('Gambar berhasil disimpan!');
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: 'sekolah', label: 'Info Sekolah' },
    { id: 'rekening', label: 'Rekening Sekolah' },
    { id: 'bendahara', label: 'Bendahara & TTD' },
    { id: 'password', label: 'Ganti Password' },
  ] as const;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Pengaturan</h2>
        <p className="text-sm text-gray-500">Kelola pengaturan aplikasi</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Info Sekolah */}
      {tab === 'sekolah' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Sekolah</label>
            <input value={localSettings.namaSekolah} onChange={e => setSettingsState({ ...localSettings, namaSekolah: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Ajaran</label>
            <input value={localSettings.tahunAjaran} onChange={e => setSettingsState({ ...localSettings, tahunAjaran: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="2025/2026" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL Logo</label>
            <input value={localSettings.logoUrl} onChange={e => setSettingsState({ ...localSettings, logoUrl: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            {localSettings.logoUrl && (
              <img src={localSettings.logoUrl} alt="Logo Preview" className="mt-2 w-16 h-16 object-contain border rounded" />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alamat</label>
            <textarea value={localSettings.alamat} onChange={e => setSettingsState({ ...localSettings, alamat: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telepon</label>
              <input value={localSettings.telepon} onChange={e => setSettingsState({ ...localSettings, telepon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input value={localSettings.email} onChange={e => setSettingsState({ ...localSettings, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <button onClick={handleSaveSettings} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Save size={14} /> Simpan Pengaturan
          </button>
          {saved && <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{saved}</div>}
        </div>
      )}

      {/* Rekening Sekolah */}
      {tab === 'rekening' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Info:</strong> Rekening yang ditambahkan di sini akan muncul sebagai pilihan saat pembayaran transfer. Rekening aktif akan ditampilkan di kwitansi.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(localSettings.rekening || []).map(r => (
              <div key={r.id} className={`bg-white rounded-xl border p-4 ${!r.aktif ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-blue-600" />
                    <span className="font-semibold text-sm">{r.namaBank}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleRekening(r.id)}
                      className={`px-2 py-0.5 text-xs rounded-full ${r.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {r.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button onClick={() => handleDeleteRekening(r.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="text-lg font-mono font-bold text-gray-800">{r.nomorRekening}</div>
                <div className="text-xs text-gray-500 mt-0.5">a.n. {r.atasNama}</div>
              </div>
            ))}
            {(localSettings.rekening || []).length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-400 bg-white rounded-xl border">
                Belum ada rekening sekolah
              </div>
            )}
          </div>

          <button
            onClick={() => setShowRekeningForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Tambah Rekening
          </button>

          {saved && <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{saved}</div>}

          {showRekeningForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Tambah Rekening Sekolah</h3>
                  <button onClick={() => setShowRekeningForm(false)} className="text-gray-400">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama Bank *</label>
                    <input value={rekeningForm.namaBank} onChange={e => setRekeningForm({ ...rekeningForm, namaBank: e.target.value })} placeholder="BRI, BCA, BNI, Mandiri, dll" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Rekening *</label>
                    <input value={rekeningForm.nomorRekening} onChange={e => setRekeningForm({ ...rekeningForm, nomorRekening: e.target.value })} placeholder="1234567890" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Atas Nama</label>
                    <input value={rekeningForm.atasNama} onChange={e => setRekeningForm({ ...rekeningForm, atasNama: e.target.value })} placeholder="Nama pemilik rekening" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-3">
                  <button onClick={() => setShowRekeningForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Batal</button>
                  <button onClick={handleAddRekening} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Simpan</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bendahara & TTD */}
      {tab === 'bendahara' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Bendahara</label>
            <input
              value={localSettings.namaBendahara}
              onChange={e => setSettingsState({ ...localSettings, namaBendahara: e.target.value })}
              placeholder="Nama lengkap bendahara"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* TTD Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Tanda Tangan (PNG transparan)</label>
            <div className="flex items-start gap-4">
              {localSettings.ttdUrl ? (
                <div className="relative">
                  <img src={localSettings.ttdUrl} alt="TTD" className="h-20 border rounded-lg bg-gray-50 object-contain p-1" />
                  <button
                    onClick={() => { const u = { ...localSettings, ttdUrl: '' }; setSettingsState(u); dbSaveSettings(u); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >×</button>
                </div>
              ) : (
                <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  Belum ada
                </div>
              )}
              <div>
                <input ref={ttdRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('ttdUrl', e)} />
                <button onClick={() => ttdRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  <Upload size={13} /> Upload TTD
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG dengan background transparan</p>
              </div>
            </div>
          </div>

          {/* Stempel Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Stempel Sekolah (PNG transparan)</label>
            <div className="flex items-start gap-4">
              {localSettings.stempelUrl ? (
                <div className="relative">
                  <img src={localSettings.stempelUrl} alt="Stempel" className="h-20 border rounded-lg bg-gray-50 object-contain p-1" />
                  <button
                    onClick={() => { const u = { ...localSettings, stempelUrl: '' }; setSettingsState(u); dbSaveSettings(u); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >×</button>
                </div>
              ) : (
                <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  Belum ada
                </div>
              )}
              <div>
                <input ref={stempelRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('stempelUrl', e)} />
                <button onClick={() => stempelRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  <Upload size={13} /> Upload Stempel
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG dengan background transparan</p>
              </div>
            </div>
          </div>

          <button onClick={handleSaveSettings} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Save size={14} /> Simpan
          </button>
          {saved && <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{saved}</div>}
        </div>
      )}

      {/* Ganti Password */}
      {tab === 'password' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password Lama</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={passForm.oldPass} onChange={e => setPassForm({ ...passForm, oldPass: e.target.value })} className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password Baru</label>
            <input type="password" value={passForm.newPass} onChange={e => setPassForm({ ...passForm, newPass: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input type="password" value={passForm.confirmPass} onChange={e => setPassForm({ ...passForm, confirmPass: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={handleChangePassword} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Save size={14} /> Ubah Password
          </button>
          {saved && <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{saved}</div>}
        </div>
      )}
    </div>
  );
}
