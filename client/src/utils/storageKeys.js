// ============================================================================
// SUMBER KEBENARAN TUNGGAL UNTUK SEMUA KEY LOCALSTORAGE/SESSIONSTORAGE DCC CBT
// Jangan pernah menulis string key secara manual (misal 'dcc_sesi_peserta')
// langsung di dalam komponen. Selalu import STORAGE_KEYS dari sini agar tidak
// ada typo/drift antara Login, DashboardPeserta, DashboardPanitia, BankSoal,
// dan RuangUjian.
// ============================================================================

export const STORAGE_KEYS = {
  // Data murni hasil impor Panitia (SATU-SATUNYA sumber data peserta)
  PESERTA: 'dcc_sesi_peserta',
  // Data murni hasil impor Panitia (SATU-SATUNYA sumber bank soal)
  BANK_SOAL: 'dcc_bank_soal',

  // Sesi login yang sedang aktif di browser ini
  CURRENT_USER: 'currentUser',
  USER_NAME: 'userName',
  USER_TECH_ID: 'userTechId',
  USER_KATEGORI: 'userKategori',
  SELECTED_EXAM_CATEGORY: 'selectedExamCategory',

  TOKEN: 'token',
  USER_ROLE: 'userRole',
  IS_EXAM_FINISHED: 'isExamFinished',

  // Jawaban lokal disimpan per-peserta: `jawabanLocal_${userId}`
  JAWABAN_LOCAL_PREFIX: 'jawabanLocal_',
  // Key legacy tanpa suffix id (dipertahankan untuk backward-compat pembacaan lama)
  JAWABAN_LOCAL_LEGACY: 'jawabanLocal',
};

export function jawabanLocalKey(userId) {
  return `${STORAGE_KEYS.JAWABAN_LOCAL_PREFIX}${userId}`;
}