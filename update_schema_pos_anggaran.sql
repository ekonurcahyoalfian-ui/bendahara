-- Tambah kolom pos_anggaran_ids (array) ke tabel pengeluaran_kategori
ALTER TABLE pengeluaran_kategori 
ADD COLUMN IF NOT EXISTS pos_anggaran_ids jsonb DEFAULT '[]';

-- Migrasi data lama: salin pos_anggaran_id ke dalam array pos_anggaran_ids
UPDATE pengeluaran_kategori 
SET pos_anggaran_ids = jsonb_build_array(pos_anggaran_id)
WHERE pos_anggaran_id IS NOT NULL AND (pos_anggaran_ids IS NULL OR pos_anggaran_ids = '[]');
