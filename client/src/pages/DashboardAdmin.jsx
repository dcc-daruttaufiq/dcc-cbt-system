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
  Database, FileText, Users, Award, TrendingUp, RefreshCw,
  ScanLine, ClipboardList, Home, Power, Key, CheckCircle2, Clock
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
    { label: 'Sistem Ujian', path: '/dashboard-Pengawas', icon: ClipboardList },
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
    <div className="flex min-h-screen bg-background text-slate-100 font-sans">
      <Sidebar links={menuAdmin} userRole="Admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <Database className="text-primary w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">CORE CENTRAL ADMIN</h1>
              <p className="text-xs text-slate-400">Overview gabungan Sistem Ujian & Presensi — data langsung dari Supabase</p>
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
                className="bg-slate-800 hover:bg-slate-700 text-xs border-0 text-slate-300 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Data
              </Button>
            </div>

            {/* GRID STATISTIK REAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-customBorder bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-sans">Total Soal</span>
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-3xl font-display font-bold text-white">{isLoading ? '—' : statistik.totalSoal}</h3>
              </Card>

              <Card className="border-customBorder bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-sans">Total Peserta</span>
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-3xl font-display font-bold text-white">{isLoading ? '—' : statistik.totalPeserta}</h3>
              </Card>

              <Card className="border-customBorder bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-sans">Selesai Ujian</span>
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-display font-bold text-emerald-400">{isLoading ? '—' : statistik.pesertaSelesai}</h3>
              </Card>

              <Card className="border-customBorder bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-sans">Rata-Rata Nilai</span>
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-3xl font-display font-bold text-amber-400">{isLoading ? '—' : statistik.rataRataNilai}</h3>
              </Card>

              <Card className="border-customBorder bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-sans">Presensi Hari Ini</span>
                  <ScanLine className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-3xl font-display font-bold text-cyan-400">{isLoading ? '—' : statistik.presensiHariIni}</h3>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* STATUS SISTEM REAL */}
              <Card className="border-customBorder bg-surface/50 p-6 space-y-4">
                <h3 className="text-lg font-display font-bold text-white">Status Sistem Ujian</h3>

                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-customBorder/20">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><Power className="w-4 h-4" /> Sesi Ujian</span>
                  <Badge className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-md uppercase ${
                    statusSesi === 'DIBUKA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {statusSesi}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-customBorder/20">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><Key className="w-4 h-4" /> Mode Token</span>
                  <Badge className="text-[10px] font-display font-bold px-2.5 py-1 rounded-md uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    {modeToken === 'siswa' ? 'Per Siswa' : 'Per Mapel'}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-500">Pengaturan ini dikontrol dari halaman Pengaturan Ujian di Sistem Ujian.</p>
              </Card>

              {/* AKTIVITAS TERBARU REAL */}
              <Card className="border-customBorder bg-surface/50 p-6">
                <h3 className="text-lg font-display font-bold mb-3 text-white">Aktivitas Terbaru</h3>
                <div className="text-xs font-mono space-y-2 text-slate-400 bg-background/50 p-4 rounded-lg border border-customBorder/20 max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-slate-500">Memuat aktivitas...</p>
                  ) : aktivitasTerbaru.length === 0 ? (
                    <p className="text-slate-500">Belum ada aktivitas tercatat.</p>
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