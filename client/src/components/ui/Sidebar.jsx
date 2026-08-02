import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 🖼️ Import Gambar Logo dari folder src/assets/logo/
import dccLogo from "../../assets/logo/logo.png";

import {
  Home,
  Activity,
  QrCode,
  ClipboardList,
  Database,
  Sliders,
  Award,
  Monitor,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAbsensiOpen, setIsAbsensiOpen] = useState(
    location.pathname.includes("/absensi") || location.pathname.includes("/rekap")
  );

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-[#0a101d] border-r border-slate-800/80 min-h-screen p-4 flex flex-col justify-between shrink-0 font-sans">
      <div className="space-y-6">
        
        {/* BRANDING LOGO LEMBAGA (BERSIH TANPA BINGKAI/BORDER) */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img
              src={dccLogo}
              alt="Logo DCC"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              DCC <span className="text-cyan-400">SISTEM</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              PENGAWAS DASHBOARD
            </p>
          </div>
        </div>

        {/* LIST NAVIGASI TERKELOMPOK */}
        <nav className="space-y-4 text-xs font-semibold">
          
          {/* === KELOMPOK 1: UTAMA & UJIAN === */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
              Akademik &amp; Ujian
            </p>

            {/* Menu Utama */}
            <button
              onClick={() => navigate("/dashboard-anggota")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive("/dashboard-anggota")
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Menu Utama</span>
            </button>

            {/* Monitoring Ujian */}
            <button
              onClick={() => navigate("/koreksi-ujian")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive("/koreksi-ujian")
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Monitoring Ujian</span>
            </button>

            {/* Repositori Soal */}
            <button
              onClick={() => navigate("/bank-soal")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive("/bank-soal")
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Repositori Soal</span>
            </button>

            {/* Pengaturan Ujian */}
            <button
              onClick={() => navigate("/pengaturan-ujian")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive("/pengaturan-ujian")
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Pengaturan Ujian</span>
            </button>

            {/* Nilai Akhir */}
            <button
              onClick={() => navigate("/nilai-akhir")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive("/nilai-akhir") || isActive("/laporan")
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Nilai Akhir</span>
            </button>
          </div>

          {/* === KELOMPOK 2: PRESENSI SISWA === */}
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            <p className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
              Kehadiran &amp; Absensi
            </p>

            <button
              onClick={() => setIsAbsensiOpen(!isAbsensiOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                location.pathname.includes("absensi") || location.pathname.includes("rekap")
                  ? "bg-slate-800/80 text-cyan-400 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4 text-cyan-400" />
                <span>Presensi Siswa</span>
              </div>
              {isAbsensiOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Sub-Menu Presensi */}
            {isAbsensiOpen && (
              <div className="pl-8 pr-1 space-y-1 pt-1">
                <button
                  onClick={() => navigate("/absensi-scan")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-all ${
                    isActive("/absensi-scan")
                      ? "bg-cyan-400 text-slate-950 font-bold shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR Presensi</span>
                </button>

                <button
                  onClick={() => navigate("/rekap-absensi")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-all ${
                    isActive("/rekap-absensi")
                      ? "bg-cyan-400 text-slate-950 font-bold shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Rekap &amp; Override</span>
                </button>
              </div>
            )}
          </div>

          {/* === KELOMPOK 3: FASILITAS === */}
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            <p className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
              Lainnya
            </p>
            <button
              onClick={() => navigate("/fasilitas")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive("/fasilitas")
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Fasilitas DCC</span>
            </button>
          </div>

        </nav>
      </div>

      {/* FOOTER / LOGOUT */}
      <div className="pt-4 border-t border-slate-800/80">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar / Logout</span>
        </button>
      </div>
    </aside>
  );
}