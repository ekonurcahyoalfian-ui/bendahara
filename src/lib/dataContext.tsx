/**
 * Global data context — semua data di-load dari Supabase sekali,
 * lalu disimpan di React state. Setiap mutasi langsung ke Supabase + update state.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  User, Kelas, Siswa, JenisTagihan, Tagihan,
  Pembayaran, Pengeluaran, PengeluaranKategori,
  PemasukanLain, AppSettings
} from '../types';
import {
  dbGetUsers, dbGetKelas, dbGetSiswa, dbGetJenisTagihan,
  dbGetTagihan, dbGetPembayaran, dbGetPengeluaran,
  dbGetPengeluaranKategori, dbGetPemasukanLain, dbGetSettings,
} from './db';

interface AppData {
  users: User[];
  kelas: Kelas[];
  siswa: Siswa[];
  jenisTagihan: JenisTagihan[];
  tagihan: Tagihan[];
  pembayaran: Pembayaran[];
  pengeluaran: Pengeluaran[];
  pengeluaranKategori: PengeluaranKategori[];
  pemasukanLain: PemasukanLain[];
  settings: AppSettings;
  loading: boolean;
  error: string;
  reload: (table?: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  namaSekolah: 'SMP IIBS Ar-Rahman', tahunAjaran: '2025/2026',
  logoUrl: 'https://i.imgur.com/omtDTAj.png', alamat: '',
  telepon: '', email: '', rekening: [], namaBendahara: '', ttdUrl: '', stempelUrl: '',
};

const DataContext = createContext<AppData>({
  users: [], kelas: [], siswa: [], jenisTagihan: [], tagihan: [],
  pembayaran: [], pengeluaran: [], pengeluaranKategori: [], pemasukanLain: [],
  settings: defaultSettings, loading: true, error: '',
  reload: async () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [jenisTagihan, setJenisTagihan] = useState<JenisTagihan[]>([]);
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [pembayaran, setPembayaran] = useState<Pembayaran[]>([]);
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [pengeluaranKategori, setPengeluaranKategori] = useState<PengeluaranKategori[]>([]);
  const [pemasukanLain, setPemasukanLain] = useState<PemasukanLain[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (table?: string) => {
    try {
      if (!table || table === 'users') setUsers(await dbGetUsers());
      if (!table || table === 'kelas') setKelas(await dbGetKelas());
      if (!table || table === 'siswa') setSiswa(await dbGetSiswa());
      if (!table || table === 'jenis_tagihan') setJenisTagihan(await dbGetJenisTagihan());
      if (!table || table === 'tagihan') setTagihan(await dbGetTagihan());
      if (!table || table === 'pembayaran') setPembayaran(await dbGetPembayaran());
      if (!table || table === 'pengeluaran') setPengeluaran(await dbGetPengeluaran());
      if (!table || table === 'pengeluaran_kategori') setPengeluaranKategori(await dbGetPengeluaranKategori());
      if (!table || table === 'pemasukan_lain') setPemasukanLain(await dbGetPemasukanLain());
      if (!table || table === 'settings') setSettings(await dbGetSettings());
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [u, kl, sw, jt, tg, pb, pg, pk, pl, st] = await Promise.all([
          dbGetUsers(), dbGetKelas(), dbGetSiswa(), dbGetJenisTagihan(),
          dbGetTagihan(), dbGetPembayaran(), dbGetPengeluaran(),
          dbGetPengeluaranKategori(), dbGetPemasukanLain(), dbGetSettings(),
        ]);
        setUsers(u); setKelas(kl); setSiswa(sw); setJenisTagihan(jt);
        setTagihan(tg); setPembayaran(pb); setPengeluaran(pg);
        setPengeluaranKategori(pk); setPemasukanLain(pl); setSettings(st);
      } catch (e: any) {
        setError('Gagal terhubung ke database: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DataContext.Provider value={{
      users, kelas, siswa, jenisTagihan, tagihan, pembayaran,
      pengeluaran, pengeluaranKategori, pemasukanLain, settings,
      loading, error, reload,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
