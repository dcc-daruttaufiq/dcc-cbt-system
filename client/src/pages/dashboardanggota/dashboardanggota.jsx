import React, { useState, useEffect } from "react";
import { supabase, TABLES } from "../../utils/supabaseClient"; // Sesuaikan path utils kamu
import Sidebar from "../../components/ui/Sidebar"; // Sesuaikan path ui kamu
import Navbar from "../../components/ui/Navbar"; // Sesuaikan path ui kamu
import {
  Users,
  CheckSquare,
  CalendarCheck,
  Clock,
  Activity,
  Award,
  ArrowRight,
} from "lucide-react";

export default function DashboardAnggota() {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    hadirHariIni: 0,
    ujianAktif: 0,
    perluKoreksi: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      // 1. Hitung Total Peserta
      const { count: countPeserta } = await supabase
        .from(TABLES.PESERTA || "peserta")
        .select("*", { count: "exact", head: true });

      // 2. Hitung Presensi Hari Ini
      const d = new Date();
      const tglHariIni = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const { count: countPresensi } = await supabase
        .from("presensi_siswa")
        .select("*", { count: "exact", head: true })
        .eq("tanggal", tglHariIni);

      setStats({
        totalSiswa: countPeserta || 0,
        hadirHariIni: countPresensi || 0,
        ujianAktif: 1, // Contoh dinamis / static
        perluKoreksi: 0,
      });
    } catch (err) {
      console.error("Gagal memuat statistik dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <Activity className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">
                DASHBOARD UTAMA PENGAWAS
              </h1>
              <p className="text-xs text-slate-400">
                Ringkasan statistik akademik, aktivitas ujian, dan presensi siswa
              </p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
          {/* CARDS RINGKASAN STATISTIK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Siswa */}
            <div className="p-5 bg-[#0d1527]/70 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Peserta / Siswa
                </p>
                <h3 className="text-2xl font-display font-bold text-white mt-1">
                  {isLoading ? "..." : stats.totalSiswa}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            {/* Presensi Hari Ini */}
            <div className="p-5 bg-[#0d1527]/70 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Presensi Hari Ini
                </p>
                <h3 className="text-2xl font-display font-bold text-emerald-400 mt-1">
                  {isLoading ? "..." : stats.hadirHariIni}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Ujian Aktif */}
            <div className="p-5 bg-[#0d1527]/70 border border-amber-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Sesi Ujian Aktif
                </p>
                <h3 className="text-2xl font-display font-bold text-amber-400 mt-1">
                  {isLoading ? "..." : stats.ujianAktif}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
            </div>

            {/* Perlu Koreksi */}
            <div className="p-5 bg-[#0d1527]/70 border border-purple-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Perlu Koreksi
                </p>
                <h3 className="text-2xl font-display font-bold text-purple-400 mt-1">
                  {isLoading ? "..." : stats.perluKoreksi}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>

          {/* QUICK LINKS / NAVIGASI CEPAT */}
          <div className="bg-[#0d1527]/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Akses Cepat Modul Utama
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/koreksi-ujian"
                className="p-4 rounded-xl bg-[#030712] border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Koreksi &amp; Live Monitoring</p>
                    <p className="text-[10px] text-slate-400">Pantau progres ujian siswa</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-all" />
              </a>

              <a
                href="/absensi-scan"
                className="p-4 rounded-xl bg-[#030712] border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Scan QR Presensi</p>
                    <p className="text-[10px] text-slate-400">Scanner kehadiran harian</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-all" />
              </a>

              <a
                href="/rekap-absensi"
                className="p-4 rounded-xl bg-[#030712] border border-slate-800 hover:border-purple-500/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Rekap &amp; Override</p>
                    <p className="text-[10px] text-slate-400">Laporan absensi lengkap</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-all" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}