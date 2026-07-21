import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Loader from '../components/ui/Loader';

// Lazy Loading Halaman
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const DashboardPeserta = lazy(() => import('../pages/DashboardPeserta'));
const DashboardPanitia = lazy(() => import('../pages/DashboardPanitia'));
const DashboardAdmin = lazy(() => import('../pages/DashboardAdmin'));
const RuangUjian = lazy(() => import('../pages/RuangUjian'));
const BankSoal = lazy(() => import('../pages/BankSoal'));
const Laporan = lazy(() => import('../pages/Laporan'));
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
      { path: 'dashboard-panitia', element: <SuspenseWrapper><DashboardPanitia /></SuspenseWrapper> },
      { path: 'dashboard-admin', element: <SuspenseWrapper><DashboardAdmin /></SuspenseWrapper> },
      { path: 'ruang-ujian', element: <SuspenseWrapper><RuangUjian /></SuspenseWrapper> },
      { path: 'bank-soal', element: <SuspenseWrapper><BankSoal /></SuspenseWrapper> },
      { path: 'laporan', element: <SuspenseWrapper><Laporan /></SuspenseWrapper> },
      { path: '*', element: <SuspenseWrapper><NotFound /></SuspenseWrapper> },
    ],
  },
]);