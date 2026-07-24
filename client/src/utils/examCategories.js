// ============================================================================
// MODUL UTILITY KATEGORI MATA UJIAN ADAPTIF DCC CBT
// ============================================================================

export const KATEGORI_RESMI = ['word', 'excel', 'powerpoint', 'desain', 'pemrograman'];

export const KATEGORI_LABEL = {
  word: 'Microsoft Word',
  excel: 'Microsoft Excel',
  powerpoint: 'Microsoft PowerPoint',
  desain: 'Desain Grafis',
  pemrograman: 'Pemrograman Web',
};

/**
 * Mendapatkan label tampilan nama mata ujian.
 * Jika ID kategori ada di dictionary statis, gunakan label tersebut.
 * Jika ID baru dari Supabase/Pengaturan (misal: 'photoshop'), kapitalisasi huruf awal otomatis.
 */
export function getLabelKategori(kategoriId) {
  if (!kategoriId) return '-';
  
  // 1. Cek dari dictionary bawaan
  if (KATEGORI_LABEL[kategoriId]) {
    return KATEGORI_LABEL[kategoriId];
  }

  // 2. Fallback cerdas: ubah 'adobe-photoshop' atau 'photoshop' jadi 'Adobe Photoshop' / 'Photoshop'
  return String(kategoriId)
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalisasi string kategori MENTAH (dari Excel/CSV, input manual, dsb)
 */
export function normalizeKategori(rawInput, dynamicCategories = []) {
  if (!rawInput) return null;
  const kat = String(rawInput).toLowerCase().trim();

  // Array gabungan kategori bawaan + kategori baru hasil input pengawas
  const validCategories = Array.from(new Set([...KATEGORI_RESMI, ...dynamicCategories]));

  // 1. Cek langsung persis jika cocok dengan ID dinamis maupun statis
  if (validCategories.includes(kat)) return kat;

  // 2. Cek kemiripan string untuk ID baru
  const matchDynamic = validCategories.find(c => kat.includes(c) || c.includes(kat));
  if (matchDynamic) return matchDynamic;

  // 3. Fallback pencocokan kata kunci dasar
  if (kat.includes('excel') || kat.includes('spreadsheet') || kat.includes('sheet')) return 'excel';
  if (kat.includes('power') || kat.includes('ppt') || kat.includes('slide') || kat.includes('presentasi')) return 'powerpoint';
  if (kat.includes('word') || kat.includes('doc') || kat.includes('surat')) return 'word';
  if (kat.includes('desain') || kat.includes('design') || kat.includes('canva') || kat.includes('grafis')) return 'desain';
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

  // Jika berupa ID unik baru buatan pengawas tanpa spasi
  const cleanSlug = kat.replace(/[^a-z0-9]/g, '');
  if (cleanSlug) return cleanSlug;

  return null;
}