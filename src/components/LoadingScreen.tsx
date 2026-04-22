import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2744] to-[#1e3a6e] flex flex-col items-center justify-center gap-4">
      <img
        src="https://i.imgur.com/omtDTAj.png"
        alt="Logo"
        className="w-20 h-20 object-contain bg-white rounded-xl p-1 animate-pulse"
      />
      <div className="text-white text-lg font-semibold">SMP IIBS Ar-Rahman</div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <div className="text-blue-300 text-sm">Memuat data dari server...</div>
      <div className="text-blue-400 text-xs mt-2">Copyright © 2026 RUMAHIMI — Sistem Administrasi Keuangan Digital</div>
    </div>
  );
}
