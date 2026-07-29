import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Loader from '../components/ui/Loader';

// Lazy Loading Halaman
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const DashboardPeserta = lazy(() => import('../pages/DashboardPeserta'));
const DashboardPengawas = lazy(() => import('../pages/DashboardPengawas'));
const DashboardAdmin = lazy(() => import('../pages/DashboardAdmin'));
const RuangUjian = lazy(() => import('../pages/RuangUjian'));
const BankSoal = lazy(() => import('../pages/BankSoal'));
const Laporan = lazy(() => import('../pages/Laporan'));
const PengaturanUjian = lazy(() => import('../pages/PengaturanUjian')); // <-- 1. TAMBAHKAN LAZY IMPORT INI
const AbsensiScan = lazy(() => import('../pages/AbsensiScan'));
const RekapAbsensi = lazy(() => import('../pages/RekapAbsensi'));
const LoginAkun = lazy(() => import('../pages/LoginAkun'));
const KelolaAkun = lazy(() => import('../pages/KelolaAkun'));
const NotifikasiWhatsapp = lazy(() => import('../pages/NotifikasiWhatsapp')); // <-- MODUL BARU
const PeminjamanAset = lazy(() => import('../pages/PeminjamanAset')); // <-- MODUL BARU
const PoinGamifikasi = lazy(() => import('../pages/PoinGamifikasi')); // <-- MODUL BARU
const PortalAlumni = lazy(() => import('../pages/PortalAlumni')); // <-- MODUL BARU
const NotFound = lazy(() => import('../pages/NotFound'));

// Wrapper Suspense
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary font-display font-bold space-y-3">
      <Loader />
      <span>MEMUAT MODUL...</span>
    </div>
  }>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <SuspenseWrapper><Home /></SuspenseWrapper> },
      { path: 'login', element: <SuspenseWrapper><Login /></SuspenseWrapper> },
      { path: 'dashboard-peserta', element: <SuspenseWrapper><DashboardPeserta /></SuspenseWrapper> },
      { path: 'dashboard-Pengawas', element: <SuspenseWrapper><DashboardPengawas /></SuspenseWrapper> },
      { path: 'dashboard-admin', element: <SuspenseWrapper><DashboardAdmin /></SuspenseWrapper> },
      { path: 'ruang-ujian', element: <SuspenseWrapper><RuangUjian /></SuspenseWrapper> },
      { path: 'bank-soal', element: <SuspenseWrapper><BankSoal /></SuspenseWrapper> },
      { path: 'laporan', element: <SuspenseWrapper><Laporan /></SuspenseWrapper> },
      { path: 'pengaturan-ujian', element: <SuspenseWrapper><PengaturanUjian /></SuspenseWrapper> }, // <-- 2. TAMBAHKAN ROUTE INI
      { path: 'absensi-scan', element: <SuspenseWrapper><AbsensiScan /></SuspenseWrapper> },
      { path: 'rekap-absensi', element: <SuspenseWrapper><RekapAbsensi /></SuspenseWrapper> },
      { path: 'akun-login', element: <SuspenseWrapper><LoginAkun /></SuspenseWrapper> },
      { path: 'kelola-akun', element: <SuspenseWrapper><KelolaAkun /></SuspenseWrapper> },
      { path: 'notifikasi-whatsapp', element: <SuspenseWrapper><NotifikasiWhatsapp /></SuspenseWrapper> }, // <-- MODUL BARU
      { path: 'peminjaman-aset', element: <SuspenseWrapper><PeminjamanAset /></SuspenseWrapper> }, // <-- MODUL BARU
      { path: 'poin-gamifikasi', element: <SuspenseWrapper><PoinGamifikasi /></SuspenseWrapper> }, // <-- MODUL BARU
      { path: 'portal-alumni', element: <SuspenseWrapper><PortalAlumni /></SuspenseWrapper> }, // <-- MODUL BARU
      { path: '*', element: <SuspenseWrapper><NotFound /></SuspenseWrapper> },
    ],
  },
]);