import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, FileText,
  Settings, LogOut, ChevronRight, Menu, X, DollarSign,
  TrendingUp, TrendingDown, Upload, GraduationCap, Tag, Database
} from 'lucide-react';
import type { User } from '../types';
import { useApp } from '../lib/AppContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'siswa', label: 'Data Siswa', icon: <Users size={18} />, adminOnly: true },
  { id: 'kelas', label: 'Kelola Kelas', icon: <GraduationCap size={18} />, adminOnly: true },
  { id: 'tagihan-jenis', label: 'Jenis Tagihan', icon: <Tag size={18} />, adminOnly: true },
  { id: 'tagihan', label: 'Tagihan Siswa', icon: <BookOpen size={18} />, adminOnly: true },
  { id: 'pembayaran', label: 'Pembayaran', icon: <CreditCard size={18} /> },
  { id: 'pengeluaran', label: 'Pengeluaran', icon: <TrendingDown size={18} />, adminOnly: true },
  { id: 'pemasukan-lain', label: 'Pemasukan Lain', icon: <TrendingUp size={18} />, adminOnly: true },
  { id: 'laporan', label: 'Laporan', icon: <FileText size={18} />, adminOnly: true },
  { id: 'import', label: 'Import Data', icon: <Upload size={18} />, adminOnly: true },
  { id: 'akun-wali', label: 'Akun Wali Murid', icon: <Users size={18} />, adminOnly: true },
  { id: 'migrasi', label: 'Migrasi Data', icon: <Database size={18} />, adminOnly: true },
  { id: 'migrasi', label: 'Migrasi Data', icon: <Upload size={18} />, adminOnly: true },
  { id: 'settings', label: 'Pengaturan', icon: <Settings size={18} />, adminOnly: true },
];

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser: User;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, currentUser, onLogout, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { settings } = useApp();
  const isAdmin = currentUser.role === 'admin';

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 bg-[#1a2744] text-white flex flex-col overflow-hidden"
            style={{ width: 240 }}
          >
            {/* Logo */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.imgur.com/omtDTAj.png'; }}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">SMP IIBS</div>
                <div className="text-xs text-blue-300 leading-tight truncate">Ar-Rahman</div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
              {visibleNav.map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                    currentPage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {currentPage === item.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </nav>

            {/* User info */}
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{currentUser.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{currentUser.role}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 text-center">
              <p className="text-xs text-gray-500">© 2026 RUMAHIMI</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-800">
              {navItems.find(n => n.id === currentPage)?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-500">{settings.namaSekolah} — TA {settings.tahunAjaran}</p>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Bendahara</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 py-2 text-center">
          <p className="text-xs text-gray-400">Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital</p>
        </footer>
      </div>
    </div>
  );
}
