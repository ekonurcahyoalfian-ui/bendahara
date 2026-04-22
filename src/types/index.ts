export type UserRole = 'admin' | 'wali';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  studentId?: string;
  createdAt: string;
}

export interface Kelas {
  id: string;
  nama: string;
  tahunAjaran: string;
  createdAt: string;
}

export interface Siswa {
  id: string;
  nis: string;
  nama: string;
  kelasId: string;
  jenisKelamin: 'L' | 'P';
  alamat: string;
  namaOrtu: string;
  noHp: string;
  status: 'aktif' | 'alumni';
  tahunMasuk: string;
  createdAt: string;
}

export type PeriodeTagihan = 'bulanan' | 'sekali';

export interface JenisTagihan {
  id: string;
  kode: string;
  nama: string;
  periode: PeriodeTagihan;
  nominal: number;
  deskripsi: string;
  aktif: boolean;
  createdAt: string;
}

export interface Tagihan {
  id: string;
  siswaId: string;
  jenisTagihanId: string;
  bulan?: number;
  tahun: number;
  nominal: number;
  diskon: number;
  keterangan: string;
  createdAt: string;
}

export type MetodeBayar = 'cash' | 'transfer';

export interface Pembayaran {
  id: string;
  tagihanId: string;
  siswaId: string;
  jumlah: number;
  metodeBayar: MetodeBayar;
  nomorRekening?: string;
  bankTujuan?: string;
  tanggal: string;
  keterangan: string;
  dibatalkan: boolean;
  alasanBatal?: string;
  createdAt: string;
  createdBy: string;
}

export interface PengeluaranKategori {
  id: string;
  nama: string;
  // Multiple pos anggaran — array of jenisTagihanId
  posAnggaranIds: string[];
  createdAt: string;
}

export interface Pengeluaran {
  id: string;
  kategoriId: string;
  jumlah: number;
  keterangan: string;
  tanggal: string;
  createdAt: string;
  createdBy: string;
}

export interface PemasukanLain {
  id: string;
  sumber: string;
  jumlah: number;
  keterangan: string;
  tanggal: string;
  createdAt: string;
  createdBy: string;
}

export interface RekeningSekolah {
  id: string;
  namaBank: string;
  nomorRekening: string;
  atasNama: string;
  aktif: boolean;
}

export interface AppSettings {
  namaSekolah: string;
  tahunAjaran: string;
  logoUrl: string;
  alamat: string;
  telepon: string;
  email: string;
  rekening: RekeningSekolah[];
  namaBendahara: string;
  ttdUrl: string;
  stempelUrl: string;
}
