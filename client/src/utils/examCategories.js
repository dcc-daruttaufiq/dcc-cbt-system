// ============================================================================
// SUMBER KEBENARAN TUNGGAL UNTUK 5 KATEGORI UJIAN RESMI DCC CBT
// Semua file (BankSoal, DashboardPanitia, DashboardPeserta, RuangUjian, Login)
// WAJIB import dari sini. Jangan menulis ulang daftar kategori atau mapper
// kategori secara lokal di file lain — itu penyebab utama data "tidak sinkron".
// ============================================================================

export const KATEGORI_RESMI = ['word', 'excel', 'powerpoint', 'desain', 'pemrograman'];

export const KATEGORI_LABEL = {
  word: 'Microsoft Word',
  excel: 'Microsoft Excel',
  powerpoint: 'Microsoft PowerPoint',
  desain: 'Desain Grafis',
  pemrograman: 'Pemrograman Web',
};

export function getLabelKategori(kategoriId) {
  return KATEGORI_LABEL[kategoriId] || kategoriId || '-';
}

/**
 * Normalisasi string kategori MENTAH (dari kolom Excel/CSV, input manual, dsb)
 * menjadi salah satu dari 5 KATEGORI_RESMI.
 *
 * PENTING: fungsi ini SENGAJA mengembalikan `null` jika tidak ada kecocokan,
 * bukan default diam-diam ke 'word'. Default diam-diam adalah bentuk data
 * dummy terselubung — ia menyembunyikan kesalahan input Excel Panitia dan
 * membuat peserta salah kategori tanpa siapapun sadar. Pemanggil (caller)
 * WAJIB menangani kasus null dengan menampilkan pesan error yang jelas,
 * bukan meneruskan data yang tidak valid.
 */
export function normalizeKategori(rawInput) {
  if (!rawInput) return null;
  const kat = String(rawInput).toLowerCase().trim();

  if (KATEGORI_RESMI.includes(kat)) return kat;

  if (kat.includes('excel') || kat.includes('spreadsheet') || kat.includes('sheet') || kat.includes('data')) return 'excel';
  if (kat.includes('power') || kat.includes('ppt') || kat.includes('slide') || kat.includes('presentasi')) return 'powerpoint';
  if (kat.includes('word') || kat.includes('doc') || kat.includes('surat')) return 'word';
  if (kat.includes('desain') || kat.includes('design') || kat.includes('canva') || kat.includes('grafis') || kat.includes('visual')) return 'desain';
  if (
    kat.includes('pemrograman') ||
    kat.includes('coding') ||
    kat.includes('program') ||
    kat.includes('web') ||
    kat.includes('html') ||
    kat.includes('javascript') ||
    kat.includes('js')
  ) {
    return 'pemrograman';
  }

  return null;
}