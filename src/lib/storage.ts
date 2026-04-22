import type {
  User, Kelas, Siswa, JenisTagihan, Tagihan,
  Pembayaran, Pengeluaran, PengeluaranKategori,
  PemasukanLain, AppSettings
} from '../types';

const KEYS = {
  users: 'iibs_users',
  kelas: 'iibs_kelas',
  siswa: 'iibs_siswa',
  jenisTagihan: 'iibs_jenis_tagihan',
  tagihan: 'iibs_tagihan',
  pembayaran: 'iibs_pembayaran',
  pengeluaran: 'iibs_pengeluaran',
  pengeluaranKategori: 'iibs_pengeluaran_kategori',
  pemasukanLain: 'iibs_pemasukan_lain',
  settings: 'iibs_settings',
  currentUser: 'iibs_current_user',
};

function get<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getObj<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch { return def; }
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function setObj<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = (): User[] => get<User>(KEYS.users);
export const saveUsers = (data: User[]) => set(KEYS.users, data);
export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem(KEYS.currentUser);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
export const setCurrentUser = (u: User | null) => {
  if (u) setObj(KEYS.currentUser, u);
  else localStorage.removeItem(KEYS.currentUser);
};

// ─── Kelas ────────────────────────────────────────────────────────────────────
export const getKelas = (): Kelas[] => get<Kelas>(KEYS.kelas);
export const saveKelas = (data: Kelas[]) => set(KEYS.kelas, data);

// ─── Siswa ────────────────────────────────────────────────────────────────────
export const getSiswa = (): Siswa[] => get<Siswa>(KEYS.siswa);
export const saveSiswa = (data: Siswa[]) => set(KEYS.siswa, data);

// ─── Jenis Tagihan ────────────────────────────────────────────────────────────
export const getJenisTagihan = (): JenisTagihan[] => get<JenisTagihan>(KEYS.jenisTagihan);
export const saveJenisTagihan = (data: JenisTagihan[]) => set(KEYS.jenisTagihan, data);

// ─── Tagihan ──────────────────────────────────────────────────────────────────
export const getTagihan = (): Tagihan[] => get<Tagihan>(KEYS.tagihan);
export const saveTagihan = (data: Tagihan[]) => set(KEYS.tagihan, data);

// ─── Pembayaran ───────────────────────────────────────────────────────────────
export const getPembayaran = (): Pembayaran[] => get<Pembayaran>(KEYS.pembayaran);
export const savePembayaran = (data: Pembayaran[]) => set(KEYS.pembayaran, data);

// ─── Pengeluaran ──────────────────────────────────────────────────────────────
export const getPengeluaran = (): Pengeluaran[] => get<Pengeluaran>(KEYS.pengeluaran);
export const savePengeluaran = (data: Pengeluaran[]) => set(KEYS.pengeluaran, data);
export const getPengeluaranKategori = (): PengeluaranKategori[] => get<PengeluaranKategori>(KEYS.pengeluaranKategori);
export const savePengeluaranKategori = (data: PengeluaranKategori[]) => set(KEYS.pengeluaranKategori, data);

// ─── Pemasukan Lain ───────────────────────────────────────────────────────────
export const getPemasukanLain = (): PemasukanLain[] => get<PemasukanLain>(KEYS.pemasukanLain);
export const savePemasukanLain = (data: PemasukanLain[]) => set(KEYS.pemasukanLain, data);

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = (): AppSettings => {
  const defaults: AppSettings = {
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
  const saved = getObj<AppSettings>(KEYS.settings, defaults);
  return { ...defaults, ...saved };
};
export const saveSettings = (data: AppSettings) => setObj(KEYS.settings, data);

// ─── Init Seed ────────────────────────────────────────────────────────────────
export function initSeed() {
  const users = getUsers();
  if (users.length === 0) {
    const adminUser: User = {
      id: 'admin-001',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'Administrator',
      createdAt: new Date().toISOString(),
    };
    saveUsers([adminUser]);
  }

  const kategori = getPengeluaranKategori();
  if (kategori.length === 0) {
    savePengeluaranKategori([
      { id: 'k1', nama: 'Gaji Guru', posAnggaranIds: [], createdAt: new Date().toISOString() },
      { id: 'k2', nama: 'Operasional', posAnggaranIds: [], createdAt: new Date().toISOString() },
      { id: 'k3', nama: 'Pemeliharaan', posAnggaranIds: [], createdAt: new Date().toISOString() },
      { id: 'k4', nama: 'ATK', posAnggaranIds: [], createdAt: new Date().toISOString() },
      { id: 'k5', nama: 'Lainnya', posAnggaranIds: [], createdAt: new Date().toISOString() },
    ]);
  }

  const jenisTagihan = getJenisTagihan();
  if (jenisTagihan.length === 0) {
    saveJenisTagihan([
      { id: 'jt1', kode: 'DPP', nama: 'DPP (Dana Penunjang Pendidikan)', periode: 'bulanan', nominal: 1000000, deskripsi: 'Uang bulanan siswa', aktif: true, createdAt: new Date().toISOString() },
      { id: 'jt2', kode: 'ASRAMA', nama: 'Uang Asrama', periode: 'bulanan', nominal: 500000, deskripsi: 'Biaya asrama bulanan', aktif: true, createdAt: new Date().toISOString() },
      { id: 'jt3', kode: 'INFAQ', nama: 'Infaq Pengembangan', periode: 'sekali', nominal: 2000000, deskripsi: 'Infaq pengembangan sekolah', aktif: true, createdAt: new Date().toISOString() },
      { id: 'jt4', kode: 'BUKU', nama: 'Uang Buku', periode: 'sekali', nominal: 500000, deskripsi: 'Pembelian buku pelajaran', aktif: true, createdAt: new Date().toISOString() },
    ]);
  }

  const kelas = getKelas();
  if (kelas.length === 0) {
    const now = new Date().toISOString();
    saveKelas([
      { id: 'kls1', nama: '7A', tahunAjaran: '2025/2026', createdAt: now },
      { id: 'kls2', nama: '7B', tahunAjaran: '2025/2026', createdAt: now },
      { id: 'kls3', nama: '8A', tahunAjaran: '2025/2026', createdAt: now },
      { id: 'kls4', nama: '8B', tahunAjaran: '2025/2026', createdAt: now },
      { id: 'kls5', nama: '9A', tahunAjaran: '2025/2026', createdAt: now },
      { id: 'kls6', nama: '9B', tahunAjaran: '2025/2026', createdAt: now },
    ]);
  }
}
