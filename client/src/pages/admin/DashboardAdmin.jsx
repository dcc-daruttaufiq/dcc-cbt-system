import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  Database, FileText, Users, TrendingUp, RefreshCw,
  ScanLine, ClipboardList, Home, Power, Key
} from 'lucide-react';

const PRESENSI_TABLE = 'presensi_harian';

const getTanggalHariIni = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function DashboardAdmin() {
  useDocumentTitle('Master Administrator');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [statistik, setStatistik] = useState({
    totalSoal: 0,
    totalPeserta: 0,
    pesertaSelesai: 0,
    rataRataNilai: 0,
    presensiHariIni: 0
  });

  const [statusSesi, setStatusSesi] = useState('DITUTUP');
  const [modeToken, setModeToken] = useState('mapel');
  const [aktivitasTerbaru, setAktivitasTerbaru] = useState([]);

  const menuAdmin = [
    { label: 'Menu Utama', path: '/', icon: Home },
    { label: 'Sistem Ujian', path: '/dashboard-pengawas', icon: ClipboardList },
    { label: 'Presensi Harian', path: '/absensi-scan', icon: ScanLine },
    { label: 'Kelola Akun DCC', path: '/kelola-akun', icon: Users },
  ];

  const loadData = async () => {
    try {
      // 1. Total soal di bank soal
      const { count: totalSoal } = await supabase
        .from(TABLES.BANK_SOAL)
        .select('*', { count: 'exact', head: true });

      // 2. Total peserta terdaftar
      const { count: totalPeserta } = await supabase
        .from(TABLES.PESERTA)
        .select('*', { count: 'exact', head: true });

      // 3. Peserta yang sudah selesai ujian + nilai akhir (buat rata-rata)
      const { data: pesertaSelesaiData } = await supabase
        .from(TABLES.PESERTA)
        .select('nilai_akhir, status')
        .eq('status', 'selesai');

      const jumlahSelesai = pesertaSelesaiData?.length || 0;
      const totalNilai = (pesertaSelesaiData || []).reduce((acc, p) => acc + (Number(p.nilai_akhir) || 0), 0);
      const rataRata = jumlahSelesai > 0 ? Math.round(totalNilai / jumlahSelesai) : 0;

      // 4. Presensi hari ini
      const { count: presensiHariIni } = await supabase
        .from(PRESENSI_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('tanggal', getTanggalHariIni());

      setStatistik({
        totalSoal: totalSoal || 0,
        totalPeserta: totalPeserta || 0,
        pesertaSelesai: jumlahSelesai,
        rataRataNilai: rataRata,
        presensiHariIni: presensiHariIni || 0
      });

      // 5. Status sesi ujian & mode token
      const { data: dataStatus } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'status_sesi_ujian')
        .maybeSingle();
      if (dataStatus?.value) {
        const parsed = typeof dataStatus.value === 'string' ? JSON.parse(dataStatus.value) : dataStatus.value;
        setStatusSesi(parsed.status || 'DITUTUP');
      }

      const { data: dataMode } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'mode_token_ujian')
        .maybeSingle();
      if (dataMode?.value) {
        const parsed = typeof dataMode.value === 'string' ? JSON.parse(dataMode.value) : dataMode.value;
        setModeToken(parsed.mode || 'mapel');
      }

      // 6. Aktivitas terbaru — gabungan presensi terakhir & peserta yang baru selesai ujian
      const { data: presensiTerbaru } = await supabase
        .from(PRESENSI_TABLE)
        .select('*')
        .order('waktu_masuk', { ascending: false })
        .limit(5);

      const { data: ujianTerbaru } = await supabase
        .from(TABLES.PESERTA)
        .select('nama, nama_lengkap, tech_id, waktu_selesai, nilai_akhir')
        .eq('status', 'selesai')
        .not('waktu_selesai', 'is', null)
        .order('waktu_selesai', { ascending: false })
        .limit(5);

      const gabunganAktivitas = [
        ...(presensiTerbaru || []).map((p) => ({
          tipe: 'presensi',
          nama: p.nama,
          techId: p.tech_id,
          waktu: p.waktu_masuk,
          status: p.status
        })),
        ...(ujianTerbaru || []).map((p) => ({
          tipe: 'ujian',
          nama: p.nama || p.nama_lengkap,
          techId: p.tech_id,
          waktu: p.waktu_selesai,
          nilai: p.nilai_akhir
        }))
      ].sort((a, b) => new Date(b.waktu) - new Date(a.waktu)).slice(0, 8);

      setAktivitasTerbaru(gabunganAktivitas);
    } catch (err) {
      console.error('Gagal memuat data overview admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatWaktu = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif]">
      <Sidebar links={menuAdmin} userRole="Admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <Database className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-['Rajdhani',sans-serif] font-bold text-white tracking-wider uppercase">
                DASBOR UTAMA
              </h1>
              <p className="text-xs text-slate-400 font-['Poppins',sans-serif]">
                Overview gabungan Sistem Ujian & Presensi
              </p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-6"
          >
            <div className="flex justify-end">
              <Button
                onClick={async () => { setIsRefreshing(true); await loadData(); setTimeout(() => setIsRefreshing(false), 400); }}
                className="bg-[#0d1527] hover:bg-[#1e293b] text-xs border border-slate-800 text-slate-300 font-['Poppins',sans-serif] flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Data
              </Button>
            </div>

            {/* GRID STATISTIK REAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-slate-800/80 bg-[#0d1527]/80 backdrop-blur-md p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-['Poppins',sans-serif]">Total Soal</span>
                  <Database className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-3xl font-['Rajdhani',sans-serif] font-bold text-white tracking-wide">
                  {isLoading ? '—' : statistik.totalSoal}
                </h3>
              </Card>

              <Card className="border-slate-800/80 bg-[#0d1527]/80 backdrop-blur-md p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-['Poppins',sans-serif]">Total Peserta</span>
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-3xl font-['Rajdhani',sans-serif] font-bold text-white tracking-wide">
                  {isLoading ? '—' : statistik.totalPeserta}
                </h3>
              </Card>

              <Card className="border-slate-800/80 bg-[#0d1527]/80 backdrop-blur-md p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-['Poppins',sans-serif]">Selesai Ujian</span>
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-['Rajdhani',sans-serif] font-bold text-emerald-400 tracking-wide">
                  {isLoading ? '—' : statistik.pesertaSelesai}
                </h3>
              </Card>

              <Card className="border-slate-800/80 bg-[#0d1527]/80 backdrop-blur-md p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-['Poppins',sans-serif]">Rata-Rata Nilai</span>
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-3xl font-['Rajdhani',sans-serif] font-bold text-amber-400 tracking-wide">
                  {isLoading ? '—' : statistik.rataRataNilai}
                </h3>
              </Card>

              <Card className="border-slate-800/80 bg-[#0d1527]/80 backdrop-blur-md p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-['Poppins',sans-serif]">Presensi Hari Ini</span>
                  <ScanLine className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-3xl font-['Rajdhani',sans-serif] font-bold text-cyan-400 tracking-wide">
                  {isLoading ? '—' : statistik.presensiHariIni}
                </h3>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* STATUS SISTEM REAL */}
              <Card className="border-slate-800/80 bg-[#0d1527]/50 backdrop-blur-md p-6 space-y-4 rounded-2xl shadow-xl">
                <h3 className="text-lg font-['Rajdhani',sans-serif] font-bold text-white tracking-wider uppercase">
                  Status Sistem Ujian
                </h3>

                <div className="flex items-center justify-between p-3.5 bg-[#030712]/80 rounded-xl border border-slate-800/60">
                  <span className="text-xs text-slate-300 font-['Poppins',sans-serif] flex items-center gap-2">
                    <Power className="w-4 h-4 text-cyan-400" /> Sesi Ujian
                  </span>
                  <Badge className={`text-[10px] font-['Rajdhani',sans-serif] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                    statusSesi === 'DIBUKA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {statusSesi}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#030712]/80 rounded-xl border border-slate-800/60">
                  <span className="text-xs text-slate-300 font-['Poppins',sans-serif] flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" /> Mode Token
                  </span>
                  <Badge className="text-[10px] font-['Rajdhani',sans-serif] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    {modeToken === 'siswa' ? 'Per Siswa' : 'Per Mapel'}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-400 font-['Poppins',sans-serif]">
                  Pengaturan ini dikontrol dari halaman Pengaturan Ujian di Sistem Ujian.
                </p>
              </Card>

              {/* AKTIVITAS TERBARU REAL */}
              <Card className="border-slate-800/80 bg-[#0d1527]/50 backdrop-blur-md p-6 rounded-2xl shadow-xl">
                <h3 className="text-lg font-['Rajdhani',sans-serif] font-bold mb-3 text-white tracking-wider uppercase">
                  Aktivitas Terbaru
                </h3>
                <div className="text-xs font-['Rajdhani',sans-serif] tracking-wide space-y-2 text-slate-300 bg-[#030712]/80 p-4 rounded-xl border border-slate-800/60 max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-slate-500 font-['Poppins',sans-serif]">Memuat aktivitas...</p>
                  ) : aktivitasTerbaru.length === 0 ? (
                    <p className="text-slate-500 font-['Poppins',sans-serif]">Belum ada aktivitas tercatat.</p>
                  ) : (
                    aktivitasTerbaru.map((a, idx) => (
                      <p key={idx} className={a.tipe === 'presensi' ? 'text-cyan-400' : 'text-emerald-400'}>
                        [{formatWaktu(a.waktu)}] {a.tipe === 'presensi'
                          ? `${a.nama || a.techId} melakukan presensi (${a.status})`
                          : `${a.nama || a.techId} menyelesaikan ujian — nilai ${a.nilai ?? '-'}`}
                      </p>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}