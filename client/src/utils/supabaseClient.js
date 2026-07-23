import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sidvrwffkcnrmfuypssz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YdpkbPKZglOwpX6h7hGpOg_7j5bJI56';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nama tabel Supabase Cloud
export const TABLES = {
  PESERTA: 'peserta',
  BANK_SOAL: 'bank_soal',
  JAWABAN_PESERTA: 'jawaban_peserta',
};

// Nama bucket Supabase Storage (Public)
export const BUCKET_LAMPIRAN_PRAKTIK = 'lampiran_praktik';

// Pengaman tambahan jika file lain meng-import format BUCKETS.LAMPIRAN_PRAKTIK
export const BUCKETS = {
  LAMPIRAN_PRAKTIK: 'lampiran_praktik'
};