import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { migrateFromLocalStorage } from '../lib/db';
import { useAppStore } from '../App';

export default function MigrasePage() {
  const store = useAppStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleMigrate = async () => {
    const konfirm = window.confirm(
      'Proses migrasi akan memindahkan semua data dari localStorage browser ini ke Supabase.\n\n' +
      'PERHATIAN: Data yang sudah ada di Supabase akan ditimpa!\n\n' +
      'Lanjutkan?'
    );
    if (!konfirm) return;
    setStatus('loading');
    const result = await migrateFromLocalStorage();
    setStatus(result.success ? 'success' : 'error');
    setMessage(result.message);
    if (result.success) await store.reload();
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Migrasi Data ke Supabase</h2>
        <p className="text-sm text-gray-500">Pindahkan data dari localStorage browser ke database cloud</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 mb-2">Petunjuk Migrasi</p>
            <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
              <li>Pastikan Anda sudah menjalankan SQL schema di Supabase (file <code className="bg-amber-100 px-1 rounded">supabase_schema.sql</code>)</li>
              <li>Migrasi hanya perlu dilakukan <strong>sekali</strong> dari perangkat yang memiliki data localStorage</li>
              <li>Setelah migrasi, semua perangkat akan menggunakan data dari Supabase</li>
              <li>Data localStorage tidak akan dihapus — tetap ada sebagai backup</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-blue-600" />
          <div>
            <div className="font-semibold text-gray-800">Data di localStorage saat ini:</div>
            <div className="text-sm text-gray-500">Browser ini</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: 'Siswa', key: 'iibs_siswa' },
            { label: 'Tagihan', key: 'iibs_tagihan' },
            { label: 'Pembayaran', key: 'iibs_pembayaran' },
            { label: 'Pengeluaran', key: 'iibs_pengeluaran' },
            { label: 'Kelas', key: 'iibs_kelas' },
            { label: 'Jenis Tagihan', key: 'iibs_jenis_tagihan' },
          ].map(item => {
            const count = JSON.parse(localStorage.getItem(item.key) || '[]').length;
            return (
              <div key={item.key} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="font-bold text-gray-800">{count} data</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleMigrate}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {status === 'loading' ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memigrasikan data...</>
          ) : (
            <><Upload size={16} /> Mulai Migrasi ke Supabase</>
          )}
        </button>

        {status === 'success' && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Migrasi Berhasil!</p>
              <p className="text-sm text-green-700">{message}</p>
              <p className="text-xs text-green-600 mt-1">Data sudah tersimpan di Supabase dan bisa diakses dari semua perangkat.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Migrasi Gagal</p>
              <p className="text-sm text-red-700">{message}</p>
              <p className="text-xs text-red-600 mt-1">Pastikan SQL schema sudah dijalankan di Supabase terlebih dahulu.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
