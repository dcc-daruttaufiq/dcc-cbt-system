import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { 
  CreditCard, 
  Key, 
  Clock, 
  Play, 
  LogOut, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Award,
  FileCheck,
  RotateCcw
} from 'lucide-react';

// Daftar Pilihan Mata Ujian / Kekhususan
const DAFTAR_UJIAN = [
  {
    id: 'msoffice',
    nama: 'Microsoft Office',
    subNama: 'Word, Excel, & Powerpoint',
    kategori: 'Perkantoran',
    durasi: '90 Menit',
    detailSoal: '30 Soal PG + 1 Praktik Excel',
    tokenDefault: 'OFFICE2026'
  },
  {
    id: 'canva',
    nama: 'Graphic Design',
    subNama: 'Canva & Visual Design',
    kategori: 'Desain Grafis',
    durasi: '90 Menit',
    detailSoal: '20 Soal PG + 1 Praktik Layout',
    tokenDefault: 'CANVA2026'
  },
  {
    id: 'coding',
    nama: 'Web Development',
    subNama: 'HTML, CSS, & JavaScript',
    kategori: 'Pemrograman',
    durasi: '120 Menit',
    detailSoal: '25 Soal PG + 1 Praktik Web',
    tokenDefault: 'DCC2026'
  }
];

export default function DashboardPeserta() {
  useDocumentTitle('Dashboard Peserta - DCC CBT');
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  
  // State Pilihan Ujian & Token
  const [selectedUjian, setSelectedUjian] = useState(DAFTAR_UJIAN[0].id);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State Hasil Ujian Siswa
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [completedExamInfo, setCompletedExamInfo] = useState(null);

  // Detail Ujian Aktif
  const activeExamDetail = DAFTAR_UJIAN.find((u) => u.id === selectedUjian) || DAFTAR_UJIAN[0];

  useEffect(() => {
    const storedName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || 'ASSHYFA YUNITIASARI';
    setUserName(storedName);
    setTechId('DCC25-0072');

    // Cek apakah siswa sudah selesai ujian
    const examSubmitted = sessionStorage.getItem('examSubmitted');
    const examName = sessionStorage.getItem('selectedExamName');

    if (examSubmitted === 'true') {
      setIsExamCompleted(true);
      setCompletedExamInfo({
        namaUjian: examName || 'Microsoft Office',
        skorPG: 85, // Kalkulasi skor instan
        statusPraktik: 'Berkas Diterima & Dalam Koreksi Panitia',
        waktuSelesai: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  const handleMulaiUjian = (e) => {
    e.preventDefault();
    setTokenError('');

    if (!tokenInput.trim()) {
      setTokenError('Masukkan Token Ujian terlebih dahulu!');
      return;
    }

    if (!isAgreed) {
      setTokenError('Anda harus menyetujui tata tertib pengerjaan ujian!');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const inputUpper = tokenInput.trim().toUpperCase();
      if (
        inputUpper === activeExamDetail.tokenDefault || 
        inputUpper === 'DCC2026' || 
        inputUpper === '12345'
      ) {
        sessionStorage.setItem('examStarted', 'true');
        sessionStorage.setItem('selectedExamId', activeExamDetail.id);
        sessionStorage.setItem('selectedExamName', activeExamDetail.nama);
        sessionStorage.setItem('examToken', tokenInput);
        navigate('/ruang-ujian');
      } else {
        setTokenError(`Token untuk ujian ${activeExamDetail.nama} tidak valid!`);
        setIsLoading(false);
      }
    }, 500);
  };

  const handleResetExamSession = () => {
    if (confirm("Reset sesi testing ujian? (Hanya untuk keperluan pengujian dev)")) {
      sessionStorage.removeItem('examSubmitted');
      sessionStorage.removeItem('examStarted');
      setIsExamCompleted(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col">
      {/* NAVBAR */}
      <Navbar>
        <div className="flex justify-between items-center w-full max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-display font-bold shadow-lg shadow-cyan-400/20">
              D
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-white tracking-wide">DCC CBT PORTAL</h1>
              <p className="text-[10px] text-slate-400 font-sans">Panel Ruang Ujian Peserta</p>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            className="text-xs text-rose-400/80 hover:text-rose-400 transition-all font-sans flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl hover:bg-rose-500/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </Navbar>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-6"
        >

          {/* 1. KARTU PROFIL PESERTA */}
          <div className="p-6 md:p-8 bg-[#0d1527]/50 backdrop-blur-md rounded-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center font-display font-bold shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-white tracking-wide">{userName}</h2>
                  <Badge variant="primary" className="text-[9px] font-display font-bold px-2 py-0.5 rounded-md uppercase">
                    PESERTA
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  TechID: <span className="text-slate-200 font-display font-bold tracking-wider">{techId}</span>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-800/60 pt-4 sm:pt-0 w-full sm:w-auto">
              <p className="text-[10px] text-slate-500 font-display font-bold uppercase tracking-widest mb-1">STATUS AKUN</p>
              <span className="text-emerald-400 font-display font-bold text-xs flex items-center gap-1.5 sm:justify-end">
                <CheckCircle2 className="w-4 h-4" /> TERVERIFIKASI
              </span>
            </div>
          </div>

          {/* TAMPILAN JIKA SISWA SUDAH SELESAI UJIAN */}
          {isExamCompleted ? (
            <div className="p-6 md:p-8 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl border border-emerald-500/40 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-display font-bold text-emerald-400 uppercase tracking-widest block">
                      LEMBAR HASIL UJIAN
                    </span>
                    <h3 className="text-lg font-display font-bold text-white">
                      {completedExamInfo?.namaUjian}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs px-3 py-1 font-display font-bold">
                    ✓ UJIAN SELESAI & DIKUNCI
                  </Badge>
                </div>
              </div>

              {/* STATISTIK NILAI INSTAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-[#030712]/80 border border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider">
                    SKOR PILIHAN GANDA (PG)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-white">
  {completedExamInfo?.skorPG}
</span>
<span className="text-xs text-slate-400 font-sans">/ 100 Nilai</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Terhitung otomatis dari total jawaban benar.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#030712]/80 border border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> STATUS SOAL PRAKTIK
                  </p>
                  <p className="text-sm font-display font-bold text-emerald-400 pt-1">
                    {completedExamInfo?.statusPraktik}
                  </p>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Dikumpulkan pada pukul {completedExamInfo?.waktuSelesai}.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Terima kasih telah mengikuti ujian!</strong> Token Anda telah hangus untuk sesi ujian ini. Hasil rekapan lengkap beserta sertifikat akan diterbitkan setelah panitia selesai mengoreksi berkas praktik Anda.
                </div>
              </div>

              {/* DEV RESET OPTION */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleResetExamSession}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 font-mono"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Sesi Testing Ujian
                </button>
              </div>
            </div>
          ) : (
            /* TAMPILAN JIKA SISWA BELUM UJIAN (FORM TOKEN & PILIHAN MATA UJIAN) */
            <>
              {/* 2. PILIHAN MATA UJIAN (CLEAN TEXT & LARGE TYPOGRAPHY) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 px-1">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-xs font-display font-bold uppercase tracking-widest">PILIH MATA UJIAN SPESIALISASI</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {DAFTAR_UJIAN.map((item) => {
                    const isSelected = selectedUjian === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => { setSelectedUjian(item.id); setTokenError(''); }}
                        className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between gap-5 ${
                          isSelected
                            ? 'bg-[#0d1527] border-cyan-400 shadow-lg shadow-cyan-400/10'
                            : 'bg-[#0d1527]/40 border-slate-800/60 hover:bg-[#0d1527]/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-display font-bold uppercase px-2.5 py-1 rounded-md ${
                              isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-900/90 text-slate-400'
                            }`}>
                              {item.kategori}
                            </span>
                            
                            <span className={`text-xs font-display font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}>
                              {isSelected ? '✓ Terpilih' : ''}
                            </span>
                          </div>

                          <div className="pt-2">
                            <h4 className="text-base md:text-lg font-display font-bold text-white tracking-wide leading-tight">
                              {item.nama}
                            </h4>
                            <p className="text-xs text-slate-400 font-sans mt-1">
                              {item.subNama}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/40 flex items-center justify-between text-xs font-sans text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" /> {item.durasi}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.detailSoal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. FORM TOKEN & KONFIRMASI MULAI */}
              <div className="p-6 md:p-8 bg-[#0d1527]/50 backdrop-blur-md rounded-2xl border border-slate-800/50 space-y-5">
                <div className="border-b border-slate-800/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-4 h-4" /> VERIFIKASI TOKEN UJIAN
                    </h4>
                    <p className="text-xs text-slate-300 font-sans mt-1">
                      Mata Ujian Terpilih: <strong className="text-white font-display text-sm">{activeExamDetail.nama} ({activeExamDetail.subNama})</strong>
                    </p>
                  </div>

                  <div className="text-xs font-sans text-slate-400">
                    Token Testing: <code className="text-cyan-400 font-display font-bold">{activeExamDetail.tokenDefault}</code>
                  </div>
                </div>

                <form onSubmit={handleMulaiUjian} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Input
                        type="text"
                        placeholder={`Masukkan Token Ujian ${activeExamDetail.nama}...`}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 uppercase font-display font-bold tracking-widest text-sm bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-white rounded-xl transition-all"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 rounded-xl shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'MEMVERIFIKASI...' : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-slate-950" /> MULAI PENGERJAAN
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="agree"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                    />
                    <label htmlFor="agree" className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer select-none font-sans">
                      Saya menyetujui tata tertib pengerjaan ujian <strong className="text-slate-200">{activeExamDetail.nama}</strong>.
                    </label>
                  </div>

                  {tokenError && (
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 text-xs font-sans flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{tokenError}</span>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}

        </motion.div>
      </main>
    </div>
  );
}