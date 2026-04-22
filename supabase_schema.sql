-- ============================================================
-- IIBS Ar-Rahman — Skema Database Supabase
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
create table if not exists users (
  id text primary key,
  username text unique not null,
  password text not null,
  role text not null default 'admin',
  name text not null,
  student_id text,
  created_at timestamptz default now()
);

-- ── Kelas ────────────────────────────────────────────────────
create table if not exists kelas (
  id text primary key,
  nama text not null,
  tahun_ajaran text not null,
  created_at timestamptz default now()
);

-- ── Siswa ────────────────────────────────────────────────────
create table if not exists siswa (
  id text primary key,
  nis text unique not null,
  nama text not null,
  kelas_id text references kelas(id) on delete set null,
  jenis_kelamin text not null default 'L',
  alamat text default '',
  nama_ortu text default '',
  no_hp text default '',
  status text not null default 'aktif',
  tahun_masuk text default '',
  created_at timestamptz default now()
);

-- ── Jenis Tagihan ─────────────────────────────────────────────
create table if not exists jenis_tagihan (
  id text primary key,
  kode text unique not null,
  nama text not null,
  periode text not null default 'bulanan',
  nominal bigint not null default 0,
  deskripsi text default '',
  aktif boolean not null default true,
  created_at timestamptz default now()
);

-- ── Tagihan ───────────────────────────────────────────────────
create table if not exists tagihan (
  id text primary key,
  siswa_id text references siswa(id) on delete cascade,
  jenis_tagihan_id text references jenis_tagihan(id) on delete cascade,
  bulan int,
  tahun int not null,
  nominal bigint not null default 0,
  diskon bigint not null default 0,
  keterangan text default '',
  created_at timestamptz default now()
);

-- ── Pembayaran ────────────────────────────────────────────────
create table if not exists pembayaran (
  id text primary key,
  tagihan_id text references tagihan(id) on delete cascade,
  siswa_id text references siswa(id) on delete cascade,
  jumlah bigint not null default 0,
  metode_bayar text not null default 'cash',
  nomor_rekening text default '',
  bank_tujuan text default '',
  tanggal date not null,
  keterangan text default '',
  dibatalkan boolean not null default false,
  alasan_batal text default '',
  created_at timestamptz default now(),
  created_by text default ''
);

-- ── Pengeluaran Kategori ──────────────────────────────────────
create table if not exists pengeluaran_kategori (
  id text primary key,
  nama text not null,
  pos_anggaran_id text references jenis_tagihan(id) on delete set null,
  created_at timestamptz default now()
);

-- ── Pengeluaran ───────────────────────────────────────────────
create table if not exists pengeluaran (
  id text primary key,
  kategori_id text references pengeluaran_kategori(id) on delete set null,
  jumlah bigint not null default 0,
  keterangan text default '',
  tanggal date not null,
  created_at timestamptz default now(),
  created_by text default ''
);

-- ── Pemasukan Lain ────────────────────────────────────────────
create table if not exists pemasukan_lain (
  id text primary key,
  sumber text not null,
  jumlah bigint not null default 0,
  keterangan text default '',
  tanggal date not null,
  created_at timestamptz default now(),
  created_by text default ''
);

-- ── Settings ──────────────────────────────────────────────────
create table if not exists settings (
  id text primary key default 'main',
  nama_sekolah text default 'SMP IIBS Ar-Rahman',
  tahun_ajaran text default '2025/2026',
  logo_url text default 'https://i.imgur.com/omtDTAj.png',
  alamat text default '',
  telepon text default '',
  email text default '',
  rekening jsonb default '[]',
  nama_bendahara text default '',
  ttd_url text default '',
  stempel_url text default ''
);

-- Insert default settings
insert into settings (id) values ('main') on conflict (id) do nothing;

-- ── Row Level Security (RLS) — disable untuk simplicity ──────
-- Karena kita pakai anon key dengan full access
alter table users disable row level security;
alter table kelas disable row level security;
alter table siswa disable row level security;
alter table jenis_tagihan disable row level security;
alter table tagihan disable row level security;
alter table pembayaran disable row level security;
alter table pengeluaran_kategori disable row level security;
alter table pengeluaran disable row level security;
alter table pemasukan_lain disable row level security;
alter table settings disable row level security;

-- ── Default Admin User ────────────────────────────────────────
insert into users (id, username, password, role, name)
values ('admin-001', 'admin', 'admin123', 'admin', 'Administrator')
on conflict (id) do nothing;

-- ── Default Jenis Tagihan ─────────────────────────────────────
insert into jenis_tagihan (id, kode, nama, periode, nominal, deskripsi, aktif) values
  ('jt1', 'DPP', 'DPP (Dana Penunjang Pendidikan)', 'bulanan', 1000000, 'Uang bulanan siswa', true),
  ('jt2', 'ASRAMA', 'Uang Asrama', 'bulanan', 500000, 'Biaya asrama bulanan', true),
  ('jt3', 'INFAQ', 'Infaq Pengembangan', 'sekali', 2000000, 'Infaq pengembangan sekolah', true),
  ('jt4', 'BUKU', 'Uang Buku', 'sekali', 500000, 'Pembelian buku pelajaran', true)
on conflict (id) do nothing;

-- ── Default Pengeluaran Kategori ──────────────────────────────
insert into pengeluaran_kategori (id, nama, pos_anggaran_id) values
  ('k1', 'Gaji Guru', 'jt1'),
  ('k2', 'Operasional', null),
  ('k3', 'Pemeliharaan', null),
  ('k4', 'ATK', null),
  ('k5', 'Lainnya', null)
on conflict (id) do nothing;

-- ── Default Kelas ─────────────────────────────────────────────
insert into kelas (id, nama, tahun_ajaran) values
  ('kls1', '7A', '2025/2026'),
  ('kls2', '7B', '2025/2026'),
  ('kls3', '8A', '2025/2026'),
  ('kls4', '8B', '2025/2026'),
  ('kls5', '9A', '2025/2026'),
  ('kls6', '9B', '2025/2026')
on conflict (id) do nothing;
