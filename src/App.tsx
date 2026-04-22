import React, { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, setCurrentUser } from './lib/storage';
import { dbGetUsers } from './lib/db';
import { useStore, type AppStore } from './lib/useStore';
import { AppContext } from './lib/AppContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SiswaPage from './pages/SiswaPage';
import KelasPage from './pages/KelasPage';
import JenisTagihanPage from './pages/JenisTagihanPage';
import TagihanPage from './pages/TagihanPage';
import PembayaranPage from './pages/PembayaranPage';
import PengeluaranPage from './pages/PengeluaranPage';
import PemasukanLainPage from './pages/PemasukanLainPage';
import LaporanPage from './pages/LaporanPage';
import ImportPage from './pages/ImportPage';
import AkunWaliPage from './pages/AkunWaliPage';
import SettingsPage from './pages/SettingsPage';
import MigrasePage from './pages/MigrasePage';
import type { User } from './types';

// ── Global store context ──────────────────────────────────────
export const StoreContext = createContext<AppStore | null>(null);
export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore must be used within StoreContext');
  return ctx;
}

function AppInner() {
  const store = useStore();
  const [currentUser, setUser] = useState<User | null>(() => getCurrentUser());
  const [currentPage, setCurrentPage] = useState('dashboard');

  const login = async (username: string, password: string): Promise<boolean> => {
    // Try Supabase users first
    let users = store.users;
    if (!users.length) users = await dbGetUsers();
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setCurrentUser(found);
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setUser(null);
    setCurrentPage('dashboard');
  };

  // Loading screen
  if (store.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2744] to-[#1e3a6e] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Memuat data...</p>
          <p className="text-sm text-blue-200 mt-1">Menghubungkan ke database</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (store.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2744] to-[#1e3a6e] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Gagal Terhubung ke Database</h2>
          <p className="text-sm text-gray-600 mb-4">{store.error}</p>
          <button onClick={store.reload} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={login} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard currentUser={currentUser} onNavigate={setCurrentPage} />;
      case 'siswa': return <SiswaPage />;
      case 'kelas': return <KelasPage />;
      case 'tagihan-jenis': return <JenisTagihanPage />;
      case 'tagihan': return <TagihanPage />;
      case 'pembayaran': return <PembayaranPage currentUser={currentUser} />;
      case 'pengeluaran': return <PengeluaranPage currentUser={currentUser} />;
      case 'pemasukan-lain': return <PemasukanLainPage currentUser={currentUser} />;
      case 'laporan': return <LaporanPage currentUser={currentUser} />;
      case 'import': return <ImportPage />;
      case 'akun-wali': return <AkunWaliPage />;
      case 'migrasi': return <MigrasePage />;
      case 'settings': return <SettingsPage currentUser={currentUser} onUserUpdate={(u) => setUser(u)} />;
      default: return <Dashboard currentUser={currentUser} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage} currentUser={currentUser} onLogout={logout}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  const store = useStore();
  return (
    <StoreContext.Provider value={store}>
      <AppContext.Provider value={store}>
      <AppInner />
    </AppContext.Provider>
    </StoreContext.Provider>
  );
}
