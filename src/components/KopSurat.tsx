import React from 'react';
import type { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  className?: string;
}

/**
 * Kop surat / header for all printed documents.
 * Used inside printable areas.
 */
export default function KopSurat({ settings, className = '' }: Props) {
  return (
    <div className={`kop-surat border-b-2 border-gray-800 pb-3 mb-4 ${className}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Logo"
            style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>
            {settings.namaSekolah.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{settings.alamat}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>
            Telp: {settings.telepon}{settings.email ? ` | Email: ${settings.email}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns an HTML string for kop surat — used in window.open print.
 */
export function kopSuratHtml(settings: AppSettings): string {
  return `
    <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
      ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="width:64px;height:64px;object-fit:contain;flex-shrink:0;" />` : ''}
      <div style="flex:1;text-align:center;">
        <div style="font-size:18px;font-weight:bold;letter-spacing:1px;">${settings.namaSekolah.toUpperCase()}</div>
        <div style="font-size:12px;margin-top:2px;">${settings.alamat}</div>
        <div style="font-size:11px;color:#555;margin-top:1px;">Telp: ${settings.telepon}${settings.email ? ` | Email: ${settings.email}` : ''}</div>
      </div>
    </div>
  `;
}
