/**
 * Global data store — fetch dari Supabase, cache di memory.
 * Setiap page cukup panggil useDB() untuk get/mutate data.
 */
import { useState, useEffect, useCallback } from 'react';
import * as db from './db';
import type {
  User, Kelas, Siswa, JenisTagihan, Tagihan,
  Pembayaran, Pengeluaran, PengeluaranKategori,
  PemasukanLain, AppSettings,
} from '../types';

export interface DBState {
  loading: boolean;
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
  refresh: () => Promise<void>;
  // Mutators
  upsertUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveUsers: (list: User[]) => Promise<void>;
  upsertKelas: (k: Kelas) => Promise<void>;
  deleteKelas: (id: string) => Promise<void>;
  upsertSiswa: (s: Siswa) => Promise<void>;
  deleteSiswa: (id: string) => Promise<void>;
  upsertJenisTagihan: (j: JenisTagihan) => Promise<void>;
  deleteJenisTagihan: (id: string) => Promise<void>;
  insertTagihan: (list: Tagihan[]) => Promise<void>;
  deleteTagihan: (id: string) => Promise<void>;
  insertPembayaran: (p: Pembayaran) => Promise<void>;
  batalkanPembayaran: (id: string, alasan: string) => Promise<void>;
  insertPengeluaran: (p: Pengeluaran) => Promise<void>;
  deletePengeluaran: (id: string) => Promise<void>;
  upsertPengeluaranKategori: (k: PengeluaranKategori) => Promise<void>;
  deletePengeluaranKategori: (id: string) => Promise<void>;
  insertPemasukanLain: (p: PemasukanLain) => Promise<void>;
  deletePemasukanLain: (id: string) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  namaSekolah: 'SMP IIBS Ar-Rahman',
  tahunAjaran: '2025/2026',
  logoUrl: 'https://i.imgur.com/omtDTAj.png',
  alamat: 'Jl. Ar-Rahman No. 1',
  telepon: '021-0000000',
  email: 'admin@iibs-arrahman.sch.id',
  rekening: [],
  namaBendahara: '',
  ttdUrl: '',
  stempelUrl: '',
};

export function useDB(): DBState {
  const [loading, setLoading] = useState(true);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [u, k, s, jt, t, p, pe, pk, pl, st] = await Promise.all([
        db.dbGetUsers(),
        db.dbGetKelas(),
        db.dbGetSiswa(),
        db.dbGetJenisTagihan(),
        db.dbGetTagihan(),
        db.dbGetPembayaran(),
        db.dbGetPengeluaran(),
        db.dbGetPengeluaranKategori(),
        db.dbGetPemasukanLain(),
        db.dbGetSettings(),
      ]);
      setUsers(u); setKelas(k); setSiswa(s); setJenisTagihan(jt);
      setTagihan(t); setPembayaran(p); setPengeluaran(pe);
      setPengeluaranKategori(pk); setPemasukanLain(pl); setSettings(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    loading, users, kelas, siswa, jenisTagihan, tagihan,
    pembayaran, pengeluaran, pengeluaranKategori, pemasukanLain, settings,
    refresh,

    upsertUser: async (u) => { await db.dbUpsertUser(u); setUsers(prev => { const f = prev.filter(x => x.id !== u.id); return [...f, u]; }); },
    deleteUser: async (id) => { await db.dbDeleteUser(id); setUsers(prev => prev.filter(x => x.id !== id)); },
    saveUsers: async (list) => { await db.dbSaveUsers(list); setUsers(list); },

    upsertKelas: async (k) => { await db.dbUpsertKelas(k); setKelas(prev => { const f = prev.filter(x => x.id !== k.id); return [...f, k].sort((a,b) => a.nama.localeCompare(b.nama)); }); },
    deleteKelas: async (id) => { await db.dbDeleteKelas(id); setKelas(prev => prev.filter(x => x.id !== id)); },

    upsertSiswa: async (s) => { await db.dbUpsertSiswa(s); setSiswa(prev => { const f = prev.filter(x => x.id !== s.id); return [...f, s].sort((a,b) => a.nama.localeCompare(b.nama)); }); },
    deleteSiswa: async (id) => {
      await db.dbDeletePembayaranBySiswa(id);
      await db.dbDeleteTagihanBySiswa(id);
      await db.dbDeleteSiswa(id);
      setSiswa(prev => prev.filter(x => x.id !== id));
      setTagihan(prev => prev.filter(x => x.siswaId !== id));
      setPembayaran(prev => prev.filter(x => x.siswaId !== id));
    },

    upsertJenisTagihan: async (j) => { await db.dbUpsertJenisTagihan(j); setJenisTagihan(prev => { const f = prev.filter(x => x.id !== j.id); return [...f, j]; }); },
    deleteJenisTagihan: async (id) => { await db.dbDeleteJenisTagihan(id); setJenisTagihan(prev => prev.filter(x => x.id !== id)); },

    insertTagihan: async (list) => { await db.dbInsertTagihan(list); setTagihan(prev => [...prev, ...list]); },
    deleteTagihan: async (id) => { await db.dbDeleteTagihan(id); setTagihan(prev => prev.filter(x => x.id !== id)); },

    insertPembayaran: async (p) => { await db.dbInsertPembayaran(p); setPembayaran(prev => [p, ...prev]); },
    batalkanPembayaran: async (id, alasan) => {
      await db.dbBatalkanPembayaran(id, alasan);
      setPembayaran(prev => prev.map(p => p.id === id ? { ...p, dibatalkan: true, alasanBatal: alasan } : p));
    },

    insertPengeluaran: async (p) => { await db.dbInsertPengeluaran(p); setPengeluaran(prev => [p, ...prev]); },
    deletePengeluaran: async (id) => { await db.dbDeletePengeluaran(id); setPengeluaran(prev => prev.filter(x => x.id !== id)); },

    upsertPengeluaranKategori: async (k) => { await db.dbUpsertPengeluaranKategori(k); setPengeluaranKategori(prev => { const f = prev.filter(x => x.id !== k.id); return [...f, k]; }); },
    deletePengeluaranKategori: async (id) => { await db.dbDeletePengeluaranKategori(id); setPengeluaranKategori(prev => prev.filter(x => x.id !== id)); },

    insertPemasukanLain: async (p) => { await db.dbInsertPemasukanLain(p); setPemasukanLain(prev => [p, ...prev]); },
    deletePemasukanLain: async (id) => { await db.dbDeletePemasukanLain(id); setPemasukanLain(prev => prev.filter(x => x.id !== id)); },

    saveSettings: async (s) => { await db.dbSaveSettings(s); setSettings(s); },
  };
}
