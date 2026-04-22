import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, Shield } from 'lucide-react';
import { useApp } from '../lib/AppContext';


interface Props {
  onLogin: (username: string, password: string) => boolean | Promise<boolean>;
}

export default function LoginPage({ onLogin }: Props) {
  const { settings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await onLogin(username, password);
    if (!ok) setError('Username atau password salah!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2744] via-[#1e3a6e] to-[#0f1f3d] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/5"
            style={{ width: Math.random()*180+40, height: Math.random()*180+40, left:`${Math.random()*100}%`, top:`${Math.random()*100}%`, transform:'translate(-50%,-50%)' }} />
        ))}
      </div>

      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2744] to-[#1e3a6e] p-8 text-center">
          <img src={settings.logoUrl} alt="Logo"
            className="w-20 h-20 mx-auto rounded-xl object-contain bg-white p-1 mb-4"
            onError={e => { (e.target as HTMLImageElement).src = 'https://i.imgur.com/omtDTAj.png'; }} />
          <h1 className="text-xl font-bold text-white">{settings.namaSekolah}</h1>
          <p className="text-blue-300 text-sm mt-1">Sistem Administrasi Keuangan Digital</p>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Masuk ke Sistem</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan username" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan password" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-60">
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-6">Hubungi administrator jika lupa password</p>
        </div>
        <div className="bg-gray-50 px-8 py-3 text-center border-t">
          <p className="text-xs text-gray-400">Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital</p>
        </div>
      </motion.div>
    </div>
  );
}
