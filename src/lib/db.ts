import { supabase } from './supabase';
import type {
  User, Kelas, Siswa, JenisTagihan, Tagihan,
  Pembayaran, Pengeluaran, PengeluaranKategori,
  PemasukanLain, AppSettings
} from '../types';

// ─── Mappers snake_case → camelCase ──────────────────────────
const mapUser = (r: any): User => ({ id: r.id, username: r.username, password: r.password, role: r.role, name: r.name, studentId: r.student_id, createdAt: r.created_at });
const mapKelas = (r: any): Kelas => ({ id: r.id, nama: r.nama, tahunAjaran: r.tahun_ajaran, createdAt: r.created_at });
const mapSiswa = (r: any): Siswa => ({ id: r.id, nis: r.nis, nama: r.nama, kelasId: r.kelas_id, jenisKelamin: r.jenis_kelamin, alamat: r.alamat, namaOrtu: r.nama_ortu, noHp: r.no_hp, status: r.status, tahunMasuk: r.tahun_masuk, createdAt: r.created_at });
const mapJenis = (r: any): JenisTagihan => ({ id: r.id, kode: r.kode, nama: r.nama, periode: r.periode, nominal: r.nominal, deskripsi: r.deskripsi, aktif: r.aktif, createdAt: r.created_at });
const mapTagihan = (r: any): Tagihan => ({ id: r.id, siswaId: r.siswa_id, jenisTagihanId: r.jenis_tagihan_id, bulan: r.bulan, tahun: r.tahun, nominal: r.nominal, diskon: r.diskon, keterangan: r.keterangan, createdAt: r.created_at });
const mapPembayaran = (r: any): Pembayaran => ({ id: r.id, tagihanId: r.tagihan_id, siswaId: r.siswa_id, jumlah: r.jumlah, metodeBayar: r.metode_bayar, nomorRekening: r.nomor_rekening, bankTujuan: r.bank_tujuan, tanggal: r.tanggal, keterangan: r.keterangan, dibatalkan: r.dibatalkan, alasanBatal: r.alasan_batal, createdAt: r.created_at, createdBy: r.created_by });
const mapKategori = (r: any): PengeluaranKategori => ({ id: r.id, nama: r.nama, posAnggaranIds: Array.isArray(r.pos_anggaran_ids) ? r.pos_anggaran_ids : (r.pos_anggaran_id ? [r.pos_anggaran_id] : []), createdAt: r.created_at });
const mapPengeluaran = (r: any): Pengeluaran => ({ id: r.id, kategoriId: r.kategori_id, jumlah: r.jumlah, keterangan: r.keterangan, tanggal: r.tanggal, createdAt: r.created_at, createdBy: r.created_by });
const mapPemasukan = (r: any): PemasukanLain => ({ id: r.id, sumber: r.sumber, jumlah: r.jumlah, keterangan: r.keterangan, tanggal: r.tanggal, createdAt: r.created_at, createdBy: r.created_by });

const DEFAULT_SETTINGS: AppSettings = {
  namaSekolah: 'SMP IIBS Ar-Rahman', tahunAjaran: '2025/2026',
  logoUrl: 'https://i.imgur.com/omtDTAj.png', alamat: 'Jl. Ar-Rahman No. 1',
  telepon: '021-0000000', email: 'admin@iibs-arrahman.sch.id',
  rekening: [], namaBendahara: '', ttdUrl: '', stempelUrl: '',
};

// ─── Users ────────────────────────────────────────────────────
export async function dbGetUsers(): Promise<User[]> {
  const { data } = await supabase.from('users').select('*');
  return (data || []).map(mapUser);
}
export async function dbSaveUsers(users: User[]): Promise<void> {
  await supabase.from('users').delete().neq('id', '');
  if (users.length > 0) await supabase.from('users').insert(users.map(u => ({ id: u.id, username: u.username, password: u.password, role: u.role, name: u.name, student_id: u.studentId, created_at: u.createdAt })));
}
export async function dbUpsertUser(u: User): Promise<void> {
  await supabase.from('users').upsert({ id: u.id, username: u.username, password: u.password, role: u.role, name: u.name, student_id: u.studentId });
}
export async function dbDeleteUser(id: string): Promise<void> {
  await supabase.from('users').delete().eq('id', id);
}

// ─── Kelas ────────────────────────────────────────────────────
export async function dbGetKelas(): Promise<Kelas[]> {
  const { data } = await supabase.from('kelas').select('*').order('nama');
  return (data || []).map(mapKelas);
}
export async function dbUpsertKelas(k: Kelas): Promise<void> {
  await supabase.from('kelas').upsert({ id: k.id, nama: k.nama, tahun_ajaran: k.tahunAjaran });
}
export async function dbDeleteKelas(id: string): Promise<void> {
  await supabase.from('kelas').delete().eq('id', id);
}

// ─── Siswa ────────────────────────────────────────────────────
export async function dbGetSiswa(): Promise<Siswa[]> {
  const { data } = await supabase.from('siswa').select('*').order('nama');
  return (data || []).map(mapSiswa);
}
export async function dbUpsertSiswa(s: Siswa): Promise<void> {
  await supabase.from('siswa').upsert({ id: s.id, nis: s.nis, nama: s.nama, kelas_id: s.kelasId, jenis_kelamin: s.jenisKelamin, alamat: s.alamat, nama_ortu: s.namaOrtu, no_hp: s.noHp, status: s.status, tahun_masuk: s.tahunMasuk });
}
export async function dbDeleteSiswa(id: string): Promise<void> {
  await supabase.from('siswa').delete().eq('id', id);
}

// ─── Jenis Tagihan ────────────────────────────────────────────
export async function dbGetJenisTagihan(): Promise<JenisTagihan[]> {
  const { data } = await supabase.from('jenis_tagihan').select('*').order('kode');
  return (data || []).map(mapJenis);
}
export async function dbUpsertJenisTagihan(j: JenisTagihan): Promise<void> {
  await supabase.from('jenis_tagihan').upsert({ id: j.id, kode: j.kode, nama: j.nama, periode: j.periode, nominal: j.nominal, deskripsi: j.deskripsi, aktif: j.aktif });
}
export async function dbDeleteJenisTagihan(id: string): Promise<void> {
  await supabase.from('jenis_tagihan').delete().eq('id', id);
}

// ─── Tagihan ──────────────────────────────────────────────────
export async function dbGetTagihan(): Promise<Tagihan[]> {
  const { data } = await supabase.from('tagihan').select('*').order('tahun').order('bulan');
  return (data || []).map(mapTagihan);
}
export async function dbInsertTagihan(list: Tagihan[]): Promise<void> {
  if (!list.length) return;
  for (let i = 0; i < list.length; i += 100) {
    await supabase.from('tagihan').insert(list.slice(i, i + 100).map(t => ({ id: t.id, siswa_id: t.siswaId, jenis_tagihan_id: t.jenisTagihanId, bulan: t.bulan || null, tahun: t.tahun, nominal: t.nominal, diskon: t.diskon, keterangan: t.keterangan, created_at: t.createdAt })));
  }
}
export async function dbDeleteTagihan(id: string): Promise<void> {
  await supabase.from('tagihan').delete().eq('id', id);
}
export async function dbDeleteTagihanBySiswa(siswaId: string): Promise<void> {
  await supabase.from('tagihan').delete().eq('siswa_id', siswaId);
}

// ─── Pembayaran ───────────────────────────────────────────────
export async function dbGetPembayaran(): Promise<Pembayaran[]> {
  const { data } = await supabase.from('pembayaran').select('*').order('tanggal', { ascending: false });
  return (data || []).map(mapPembayaran);
}
export async function dbInsertPembayaran(p: Pembayaran): Promise<void> {
  await supabase.from('pembayaran').insert({ id: p.id, tagihan_id: p.tagihanId, siswa_id: p.siswaId, jumlah: p.jumlah, metode_bayar: p.metodeBayar, nomor_rekening: p.nomorRekening || '', bank_tujuan: p.bankTujuan || '', tanggal: p.tanggal, keterangan: p.keterangan, dibatalkan: p.dibatalkan, alasan_batal: p.alasanBatal || '', created_at: p.createdAt, created_by: p.createdBy });
}
export async function dbBatalkanPembayaran(id: string, alasan: string): Promise<void> {
  await supabase.from('pembayaran').update({ dibatalkan: true, alasan_batal: alasan }).eq('id', id);
}
export async function dbDeletePembayaranBySiswa(siswaId: string): Promise<void> {
  await supabase.from('pembayaran').delete().eq('siswa_id', siswaId);
}

// ─── Pengeluaran Kategori ─────────────────────────────────────
export async function dbGetPengeluaranKategori(): Promise<PengeluaranKategori[]> {
  const { data } = await supabase.from('pengeluaran_kategori').select('*').order('nama');
  return (data || []).map(mapKategori);
}
export async function dbUpsertPengeluaranKategori(k: PengeluaranKategori): Promise<void> {
  await supabase.from('pengeluaran_kategori').upsert({ id: k.id, nama: k.nama, pos_anggaran_ids: k.posAnggaranIds || [] });
}
export async function dbDeletePengeluaranKategori(id: string): Promise<void> {
  await supabase.from('pengeluaran_kategori').delete().eq('id', id);
}

// ─── Pengeluaran ──────────────────────────────────────────────
export async function dbGetPengeluaran(): Promise<Pengeluaran[]> {
  const { data } = await supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false });
  return (data || []).map(mapPengeluaran);
}
export async function dbInsertPengeluaran(p: Pengeluaran): Promise<void> {
  await supabase.from('pengeluaran').insert({ id: p.id, kategori_id: p.kategoriId, jumlah: p.jumlah, keterangan: p.keterangan, tanggal: p.tanggal, created_at: p.createdAt, created_by: p.createdBy });
}
export async function dbDeletePengeluaran(id: string): Promise<void> {
  await supabase.from('pengeluaran').delete().eq('id', id);
}

// ─── Pemasukan Lain ───────────────────────────────────────────
export async function dbGetPemasukanLain(): Promise<PemasukanLain[]> {
  const { data } = await supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false });
  return (data || []).map(mapPemasukan);
}
export async function dbInsertPemasukanLain(p: PemasukanLain): Promise<void> {
  await supabase.from('pemasukan_lain').insert({ id: p.id, sumber: p.sumber, jumlah: p.jumlah, keterangan: p.keterangan, tanggal: p.tanggal, created_at: p.createdAt, created_by: p.createdBy });
}
export async function dbDeletePemasukanLain(id: string): Promise<void> {
  await supabase.from('pemasukan_lain').delete().eq('id', id);
}

// ─── Settings ─────────────────────────────────────────────────
export async function dbGetSettings(): Promise<AppSettings> {
  const { data } = await supabase.from('settings').select('*').eq('id', 'main').single();
  if (!data) return DEFAULT_SETTINGS;
  return {
    namaSekolah: data.nama_sekolah || DEFAULT_SETTINGS.namaSekolah,
    tahunAjaran: data.tahun_ajaran || DEFAULT_SETTINGS.tahunAjaran,
    logoUrl: data.logo_url || DEFAULT_SETTINGS.logoUrl,
    alamat: data.alamat || DEFAULT_SETTINGS.alamat,
    telepon: data.telepon || DEFAULT_SETTINGS.telepon,
    email: data.email || DEFAULT_SETTINGS.email,
    rekening: data.rekening || [],
    namaBendahara: data.nama_bendahara || '',
    ttdUrl: data.ttd_url || '',
    stempelUrl: data.stempel_url || '',
  };
}
export async function dbSaveSettings(s: AppSettings): Promise<void> {
  await supabase.from('settings').upsert({ id: 'main', nama_sekolah: s.namaSekolah, tahun_ajaran: s.tahunAjaran, logo_url: s.logoUrl, alamat: s.alamat, telepon: s.telepon, email: s.email, rekening: s.rekening, nama_bendahara: s.namaBendahara, ttd_url: s.ttdUrl, stempel_url: s.stempelUrl });
}

// ─── Migrasi dari localStorage ────────────────────────────────
export async function migrateFromLocalStorage(): Promise<{ success: boolean; message: string }> {
  try {
    const get = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
    const users = get('iibs_users');
    const kelas = get('iibs_kelas');
    const siswa = get('iibs_siswa');
    const jenisTagihan = get('iibs_jenis_tagihan');
    const tagihan = get('iibs_tagihan');
    const pembayaran = get('iibs_pembayaran');
    const pengeluaranKategori = get('iibs_pengeluaran_kategori');
    const pengeluaran = get('iibs_pengeluaran');
    const pemasukanLain = get('iibs_pemasukan_lain');
    const settings = JSON.parse(localStorage.getItem('iibs_settings') || 'null');
    let total = 0;

    if (users.length) { await supabase.from('users').delete().neq('id', ''); await supabase.from('users').insert(users.map((u: any) => ({ id: u.id, username: u.username, password: u.password, role: u.role, name: u.name, student_id: u.studentId, created_at: u.createdAt }))); total += users.length; }
    if (kelas.length) { await supabase.from('kelas').delete().neq('id', ''); await supabase.from('kelas').insert(kelas.map((k: any) => ({ id: k.id, nama: k.nama, tahun_ajaran: k.tahunAjaran, created_at: k.createdAt }))); total += kelas.length; }
    if (jenisTagihan.length) { await supabase.from('jenis_tagihan').delete().neq('id', ''); await supabase.from('jenis_tagihan').insert(jenisTagihan.map((j: any) => ({ id: j.id, kode: j.kode, nama: j.nama, periode: j.periode, nominal: j.nominal, deskripsi: j.deskripsi, aktif: j.aktif, created_at: j.createdAt }))); total += jenisTagihan.length; }
    if (siswa.length) { await supabase.from('siswa').delete().neq('id', ''); await supabase.from('siswa').insert(siswa.map((s: any) => ({ id: s.id, nis: s.nis, nama: s.nama, kelas_id: s.kelasId, jenis_kelamin: s.jenisKelamin, alamat: s.alamat, nama_ortu: s.namaOrtu, no_hp: s.noHp, status: s.status, tahun_masuk: s.tahunMasuk, created_at: s.createdAt }))); total += siswa.length; }
    if (tagihan.length) {
      await supabase.from('tagihan').delete().neq('id', '');
      const rows = tagihan.map((t: any) => ({ id: t.id, siswa_id: t.siswaId, jenis_tagihan_id: t.jenisTagihanId, bulan: t.bulan || null, tahun: t.tahun, nominal: t.nominal, diskon: t.diskon, keterangan: t.keterangan, created_at: t.createdAt }));
      for (let i = 0; i < rows.length; i += 100) await supabase.from('tagihan').insert(rows.slice(i, i + 100));
      total += tagihan.length;
    }
    if (pembayaran.length) {
      await supabase.from('pembayaran').delete().neq('id', '');
      const rows = pembayaran.map((p: any) => ({ id: p.id, tagihan_id: p.tagihanId, siswa_id: p.siswaId, jumlah: p.jumlah, metode_bayar: p.metodeBayar, nomor_rekening: p.nomorRekening || '', bank_tujuan: p.bankTujuan || '', tanggal: p.tanggal, keterangan: p.keterangan, dibatalkan: p.dibatalkan, alasan_batal: p.alasanBatal || '', created_at: p.createdAt, created_by: p.createdBy || '' }));
      for (let i = 0; i < rows.length; i += 100) await supabase.from('pembayaran').insert(rows.slice(i, i + 100));
      total += pembayaran.length;
    }
    if (pengeluaranKategori.length) { await supabase.from('pengeluaran_kategori').delete().neq('id', ''); await supabase.from('pengeluaran_kategori').insert(pengeluaranKategori.map((k: any) => ({ id: k.id, nama: k.nama, pos_anggaran_ids: k.posAnggaranIds || (k.posAnggaranId ? [k.posAnggaranId] : []), created_at: k.createdAt }))); total += pengeluaranKategori.length; }
    if (pengeluaran.length) { await supabase.from('pengeluaran').delete().neq('id', ''); await supabase.from('pengeluaran').insert(pengeluaran.map((p: any) => ({ id: p.id, kategori_id: p.kategoriId, jumlah: p.jumlah, keterangan: p.keterangan, tanggal: p.tanggal, created_at: p.createdAt, created_by: p.createdBy || '' }))); total += pengeluaran.length; }
    if (pemasukanLain.length) { await supabase.from('pemasukan_lain').delete().neq('id', ''); await supabase.from('pemasukan_lain').insert(pemasukanLain.map((p: any) => ({ id: p.id, sumber: p.sumber, jumlah: p.jumlah, keterangan: p.keterangan, tanggal: p.tanggal, created_at: p.createdAt, created_by: p.createdBy || '' }))); total += pemasukanLain.length; }
    if (settings) await dbSaveSettings({ ...DEFAULT_SETTINGS, ...settings });

    return { success: true, message: `Berhasil migrasi ${total} data dari localStorage ke Supabase!` };
  } catch (err: any) {
    return { success: false, message: `Gagal migrasi: ${err.message}` };
  }
}
