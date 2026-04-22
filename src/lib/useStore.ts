/**
 * Global store — loads all data from Supabase once,
 * provides setters that update both state and Supabase.
 */
import { useState, useEffect, useCallback } from 'react';
import type { User, Kelas, Siswa, JenisTagihan, Tagihan, Pembayaran, Pengeluaran, PengeluaranKategori, PemasukanLain, AppSettings } from '../types';
import {
  dbGetUsers, dbGetKelas, dbGetSiswa, dbGetJenisTagihan,
  dbGetTagihan, dbGetPembayaran, dbGetPengeluaran,
  dbGetPengeluaranKategori, dbGetPemasukanLain, dbGetSettings,
  dbUpsertUser, dbDeleteUser, dbSaveUsers,
  dbUpsertKelas, dbDeleteKelas,
  dbUpsertSiswa, dbDeleteSiswa, dbDeleteTagihanBySiswa, dbDeletePembayaranBySiswa,
  dbUpsertJenisTagihan, dbDeleteJenisTagihan,
  dbInsertTagihan, dbDeleteTagihan,
  dbInsertPembayaran, dbBatalkanPembayaran,
  dbUpsertPengeluaranKategori, dbDeletePengeluaranKategori,
  dbInsertPengeluaran, dbDeletePengeluaran,
  dbInsertPemasukanLain, dbDeletePemasukanLain,
  dbSaveSettings,
} from './db';

export interface AppStore {
  loading: boolean;
  error: string;
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
  reload: () => Promise<void>;
  // Users
  saveUsers: (list: User[]) => Promise<void>;
  upsertUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  // Kelas
  upsertKelas: (k: Kelas) => Promise<void>;
  deleteKelas: (id: string) => Promise<void>;
  // Siswa
  upsertSiswa: (s: Siswa) => Promise<void>;
  deleteSiswa: (id: string) => Promise<void>;
  // Jenis Tagihan
  upsertJenisTagihan: (j: JenisTagihan) => Promise<void>;
  deleteJenisTagihan: (id: string) => Promise<void>;
  // Tagihan
  insertTagihan: (list: Tagihan[]) => Promise<void>;
  deleteTagihan: (id: string) => Promise<void>;
  // Pembayaran
  insertPembayaran: (p: Pembayaran) => Promise<void>;
  batalkanPembayaran: (id: string, alasan: string) => Promise<void>;
  // Pengeluaran Kategori
  upsertPengeluaranKategori: (k: PengeluaranKategori) => Promise<void>;
  deletePengeluaranKategori: (id: string) => Promise<void>;
  // Pengeluaran
  insertPengeluaran: (p: Pengeluaran) => Promise<void>;
  deletePengeluaran: (id: string) => Promise<void>;
  // Pemasukan Lain
  insertPemasukanLain: (p: PemasukanLain) => Promise<void>;
  deletePemasukanLain: (id: string) => Promise<void>;
  // Settings
  saveSettings: (s: AppSettings) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  namaSekolah: 'SMP IIBS Ar-Rahman', tahunAjaran: '2025/2026',
  logoUrl: 'https://i.imgur.com/omtDTAj.png', alamat: '',
  telepon: '', email: '', rekening: [], namaBendahara: '', ttdUrl: '', stempelUrl: '',
};

export function useStore(): AppStore {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [jenisTagihan, setJenisTagihan] = useState<JenisTagihan[]>([]);
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [pembayaran, setPembayaran] = useState<Pembayaran[]>([]);
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [pengeluaranKategori, setPengeluaranKategori] = useState<PengeluaranKategori[]>([]);
  const [pemasukanLain, setPemasukanLain] = useState<PemasukanLain[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [u, kl, sw, jt, tg, pb, pe, pk, pl, st] = await Promise.all([
        dbGetUsers(), dbGetKelas(), dbGetSiswa(), dbGetJenisTagihan(),
        dbGetTagihan(), dbGetPembayaran(), dbGetPengeluaran(),
        dbGetPengeluaranKategori(), dbGetPemasukanLain(), dbGetSettings(),
      ]);
      setUsers(u); setKelas(kl); setSiswa(sw); setJenisTagihan(jt);
      setTagihan(tg); setPembayaran(pb); setPengeluaran(pe);
      setPengeluaranKategori(pk); setPemasukanLain(pl); setSettings(st);
    } catch (e: any) {
      setError('Gagal terhubung ke database: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return {
    loading, error,
    users, kelas, siswa, jenisTagihan, tagihan,
    pembayaran, pengeluaran, pengeluaranKategori, pemasukanLain, settings,
    reload,
    saveUsers: async (list) => { await dbSaveUsers(list); setUsers(list); },
    upsertUser: async (u) => { await dbUpsertUser(u); setUsers(prev => { const f = prev.find(x => x.id === u.id); return f ? prev.map(x => x.id === u.id ? u : x) : [...prev, u]; }); },
    deleteUser: async (id) => { await dbDeleteUser(id); setUsers(prev => prev.filter(x => x.id !== id)); },
    upsertKelas: async (k) => { await dbUpsertKelas(k); setKelas(prev => { const f = prev.find(x => x.id === k.id); return f ? prev.map(x => x.id === k.id ? k : x) : [...prev, k]; }); },
    deleteKelas: async (id) => { await dbDeleteKelas(id); setKelas(prev => prev.filter(x => x.id !== id)); },
    upsertSiswa: async (s) => { await dbUpsertSiswa(s); setSiswa(prev => { const f = prev.find(x => x.id === s.id); return f ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]; }); },
    deleteSiswa: async (id) => {
      await dbDeletePembayaranBySiswa(id);
      await dbDeleteTagihanBySiswa(id);
      await dbDeleteSiswa(id);
      setSiswa(prev => prev.filter(x => x.id !== id));
      setTagihan(prev => prev.filter(x => x.siswaId !== id));
      setPembayaran(prev => prev.filter(x => x.siswaId !== id));
    },
    upsertJenisTagihan: async (j) => { await dbUpsertJenisTagihan(j); setJenisTagihan(prev => { const f = prev.find(x => x.id === j.id); return f ? prev.map(x => x.id === j.id ? j : x) : [...prev, j]; }); },
    deleteJenisTagihan: async (id) => { await dbDeleteJenisTagihan(id); setJenisTagihan(prev => prev.filter(x => x.id !== id)); },
    insertTagihan: async (list) => { await dbInsertTagihan(list); setTagihan(prev => [...prev, ...list]); },
    deleteTagihan: async (id) => { await dbDeleteTagihan(id); setTagihan(prev => prev.filter(x => x.id !== id)); setPembayaran(prev => prev.filter(x => x.tagihanId !== id)); },
    insertPembayaran: async (p) => { await dbInsertPembayaran(p); setPembayaran(prev => [...prev, p]); },
    batalkanPembayaran: async (id, alasan) => { await dbBatalkanPembayaran(id, alasan); setPembayaran(prev => prev.map(x => x.id === id ? { ...x, dibatalkan: true, alasanBatal: alasan } : x)); },
    upsertPengeluaranKategori: async (k) => { await dbUpsertPengeluaranKategori(k); setPengeluaranKategori(prev => { const f = prev.find(x => x.id === k.id); return f ? prev.map(x => x.id === k.id ? k : x) : [...prev, k]; }); },
    deletePengeluaranKategori: async (id) => { await dbDeletePengeluaranKategori(id); setPengeluaranKategori(prev => prev.filter(x => x.id !== id)); },
    insertPengeluaran: async (p) => { await dbInsertPengeluaran(p); setPengeluaran(prev => [p, ...prev]); },
    deletePengeluaran: async (id) => { await dbDeletePengeluaran(id); setPengeluaran(prev => prev.filter(x => x.id !== id)); },
    insertPemasukanLain: async (p) => { await dbInsertPemasukanLain(p); setPemasukanLain(prev => [p, ...prev]); },
    deletePemasukanLain: async (id) => { await dbDeletePemasukanLain(id); setPemasukanLain(prev => prev.filter(x => x.id !== id)); },
    saveSettings: async (s) => { await dbSaveSettings(s); setSettings(s); },
  };
}
