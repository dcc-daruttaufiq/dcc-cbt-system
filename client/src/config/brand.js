// KONFIGURASI IDENTITAS LEMBAGA (TERPUSAT)
// PENTING: logo di-import langsung (bukan string path manual) agar Vite ikut
// memproses & membundel file gambar ini saat production build (Vercel).
// Kalau sebelumnya pakai string '/src/assets/logo.png', itu HANYA jalan saat
// development lokal dan akan 404 setelah di-build/deploy.
//
// Untuk ganti logo: cukup timpa file src/assets/logo.png dengan gambar baru
// (nama file tetap sama), otomatis terpakai di semua halaman.
import logoLembaga from '../assets/logo/logo.png';

export const LOGO_URL = logoLembaga;
export const NAMA_LEMBAGA = 'DCC CBT';