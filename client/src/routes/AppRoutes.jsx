import React, { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Loader from "../components/ui/Loader";

// 🏠 Halaman Utama & Not Found (Di luar subfolder)
const Home = lazy(() => import("../pages/Home"));
const NotFound = lazy(() => import("../pages/NotFound"));

// 🏛️ Folder admin/
const DashboardAdmin = lazy(() => import("../pages/admin/DashboardAdmin"));
const KelolaAkun = lazy(() => import("../pages/admin/KelolaAkun"));

// 👥 Folder dashboardanggota/
const DashboardAnggota = lazy(
  () => import("../pages/dashboardanggota/dashboardanggota"),
);

// 🔐 Folder auth/
const LoginUjian = lazy(() => import("../pages/auth/LoginUjian"));
const LoginAkun = lazy(() => import("../pages/auth/LoginAkun"));

// 📋 Folder presensi/
const AbsensiScan = lazy(() => import("../pages/presensi/AbsensiScan"));
const RekapAbsensi = lazy(() => import("../pages/presensi/RekapAbsensi"));

// 📝 Folder ujian/
const DashboardPeserta = lazy(() => import("../pages/ujian/DashboardPeserta"));
const RuangUjian = lazy(() => import("../pages/ujian/RuangUjian"));
const BankSoal = lazy(() => import("../pages/ujian/BankSoal"));
const Laporan = lazy(() => import("../pages/ujian/Laporan"));
const PengaturanUjian = lazy(() => import("../pages/ujian/PengaturanUjian"));

// 🏢 Folder fasilitasdcc/
const Fasilitasdcc = lazy(() => import("../pages/fasilitasdcc/Fasilitasdcc"));
const PeminjamanAset = lazy(
  () => import("../pages/fasilitasdcc/PeminjamanAset"),
);

// 🚀 Folder fitur_tambahan/
const NotifikasiWhatsapp = lazy(
  () => import("../pages/fitur_tambahan/NotifikasiWhatsapp"),
);
const PoinGamifikasi = lazy(
  () => import("../pages/fitur_tambahan/PoinGamifikasi"),
);
const PortalAlumni = lazy(() => import("../pages/fitur_tambahan/PortalAlumni"));

// Wrapper Suspense
const SuspenseWrapper = ({ children }) => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary font-display font-bold space-y-3">
        <Loader />
        <span>MEMUAT MODUL...</span>
      </div>
    }
  >
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Home />
          </SuspenseWrapper>
        ),
      },
      // ✅ Route Login Ujian (Disupport via /login-ujian maupun /login)
      {
        path: "login-ujian",
        element: (
          <SuspenseWrapper>
            <LoginUjian />
          </SuspenseWrapper>
        ),
      },
      {
        path: "login",
        element: (
          <SuspenseWrapper>
            <LoginUjian />
          </SuspenseWrapper>
        ),
      },
      {
        path: "dashboard-peserta",
        element: (
          <SuspenseWrapper>
            <DashboardPeserta />
          </SuspenseWrapper>
        ),
      },
      {
        path: "dashboard-anggota",
        element: (
          <SuspenseWrapper>
            <DashboardAnggota />
          </SuspenseWrapper>
        ),
      },
      {
        path: "dashboard-admin",
        element: (
          <SuspenseWrapper>
            <DashboardAdmin />
          </SuspenseWrapper>
        ),
      },
      {
        path: "ruang-ujian",
        element: (
          <SuspenseWrapper>
            <RuangUjian />
          </SuspenseWrapper>
        ),
      },
      {
        path: "bank-soal",
        element: (
          <SuspenseWrapper>
            <BankSoal />
          </SuspenseWrapper>
        ),
      },
      {
        path: "laporan",
        element: (
          <SuspenseWrapper>
            <Laporan />
          </SuspenseWrapper>
        ),
      },
      {
        path: "pengaturan-ujian",
        element: (
          <SuspenseWrapper>
            <PengaturanUjian />
          </SuspenseWrapper>
        ),
      },
      {
        path: "absensi-scan",
        element: (
          <SuspenseWrapper>
            <AbsensiScan />
          </SuspenseWrapper>
        ),
      },
      {
        path: "rekap-absensi",
        element: (
          <SuspenseWrapper>
            <RekapAbsensi />
          </SuspenseWrapper>
        ),
      },
      {
        path: "akun-login",
        element: (
          <SuspenseWrapper>
            <LoginAkun />
          </SuspenseWrapper>
        ),
      },
      {
        path: "kelola-akun",
        element: (
          <SuspenseWrapper>
            <KelolaAkun />
          </SuspenseWrapper>
        ),
      },
      {
        path: "fasilitas",
        element: (
          <SuspenseWrapper>
            <Fasilitasdcc />
          </SuspenseWrapper>
        ),
      },
      {
        path: "peminjaman-aset",
        element: (
          <SuspenseWrapper>
            <PeminjamanAset />
          </SuspenseWrapper>
        ),
      },
      {
        path: "notifikasi-whatsapp",
        element: (
          <SuspenseWrapper>
            <NotifikasiWhatsapp />
          </SuspenseWrapper>
        ),
      },
      {
        path: "poin-gamifikasi",
        element: (
          <SuspenseWrapper>
            <PoinGamifikasi />
          </SuspenseWrapper>
        ),
      },
      {
        path: "portal-alumni",
        element: (
          <SuspenseWrapper>
            <PortalAlumni />
          </SuspenseWrapper>
        ),
      },
      {
        path: "*",
        element: (
          <SuspenseWrapper>
            <NotFound />
          </SuspenseWrapper>
        ),
      },
    ],
  },
]);
