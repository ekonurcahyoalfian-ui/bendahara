import React, { useState } from 'react';
import { Database, ArrowRight, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { migrateFromLocalStorage } from '../lib/db';
import { useData } from '../lib/dataContext';

export default function MigrationPage() {
  const { reload } = useData();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleMigrate = async () => {
    if (!window.confirm('Migrasi akan memindahkan semua data dari browser ini ke Supabase (cloud). Data yang sudah ada di Supabase akan ditimpa. Lanjutkan?')) return;
    setStatus('loading');
    const result = await migrateFromLocalStorage();
    setStatus(result.success ? 'success' : 'error');
    setMessage(result.message);
    if (result.success) await reload();
  };

  // Check if there's localStorage data
  const lsKeys = ['iibs_siswa', 'iibs_tagihan', 'iibs_pembayaran'];
  const hasLocalData = lsKeys.some(k => {
    try { return JSON.parse(localStorage.getItem(k) || '[]').length > 0; } catch { return false; }
  });

  const counts = {
    siswa: (() => { try { return JSON.parse(localStorage.getItem('iibs_siswa') || '[]').length; } catch { return 0; } })(),
    tagihan: (() => { try { return JSON.parse(localStorage.getItem('iibs_tagihan') || '[]').length; } catch { return 0; } })(),
    pembayaran: (() => { try { return JSON.parse(localStorage.getItem('iibs_pembayaran') || '[]').length; } catch { return 0; } })(),
    kelas: (() => { try { return JSON.parse(localStorage.getItem('iibs_kelas') || '[]').length; } catch { return 0; } })(),
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Migrasi Data ke Supabase</h2>
        <p className="text-sm text-gray-500">Pindahkan data dari browser lokal ke database cloud</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl mb-1">💾</div>
            <div className="font-semibold text-sm">localStorage (Browser)</div>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>{counts.siswa} siswa</div>
              <div>{counts.tagihan} tagihan</div>
              <div>{counts.pembayaran} pembayaran</div>
              <div>{counts.kelas} kelas</div>
            </div>
          </div>
          <ArrowRight size={24} className="text-blue-500 flex-shrink-0" />
          <div className="flex-1 bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-2xl mb-1">☁️</div>
            <div className="font-semibold text-sm text-green-700">Supabase (Cloud)</div>
            <div className="text-xs text-green-600 mt-2">Bisa diakses dari<br />semua perangkat</div>
          </div>
        </div>

        {!hasLocalData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            ⚠️ Tidak ada data di localStorage browser ini. Mungkin data sudah di-migrasi sebelumnya atau Anda menggunakan browser/perangkat berbeda.
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Catatan:</strong> Migrasi ini hanya perlu dilakukan <strong>sekali</strong> dari perangkat yang memiliki data lama. Setelah migrasi, semua perangkat akan menggunakan data dari Supabase.
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">{message}</span>
          </div>
        )}

        <button
          onClick={handleMigrate}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {status === 'loading' ? (
            <><Loader size={16} className="animate-spin" /> Sedang migrasi...</>
          ) : (
            <><Database size={16} /> Mulai Migrasi ke Supabase</>
          )}
        </button>
      </div>
    </div>
  );
}
