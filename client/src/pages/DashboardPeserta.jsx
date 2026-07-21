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
  BookOpen, 
  Play, 
  LogOut, 
  ShieldAlert,
  User,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function DashboardPeserta() {
  useDocumentTitle('Dashboard Peserta - DCC CBT');
  const navigate = useNavigate();

  // State Identitas & Token
  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Ambil info nama dari storage jika ada
    const storedName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || 'ASSHYFA YUNITIASARI';
    setUserName(storedName);
    setTechId('DCC25-0072'); // Format TechID Resmi
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

    // Simulasi verifikasi token
    setTimeout(() => {
      if (tokenInput.trim().toUpperCase() === 'DCC2026' || tokenInput.trim() === '12345') {
        sessionStorage.setItem('examStarted', 'true');
        sessionStorage.setItem('examToken', tokenInput);
        navigate('/ruang-ujian');
      } else {
        setTokenError('Token Ujian tidak valid! Periksa kembali token dari pengawas.');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col">
      {/* NAVBAR */}
      <Navbar>
        <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-display font-bold">
              D
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-white tracking-wide">DCC CBT PORTAL</h1>
              <p className="text-[10px] text-slate-400 font-sans">Panel Ruang Ujian Peserta</p>
            </div>
          </div>

          <Button 
            onClick={handleLogout} 
            className="bg-slate-800 hover:bg-slate-700 text-xs text-rose-400 border-0 font-sans flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </Button>
        </div>
      </Navbar>

      {/* MAIN CONTENT WITH ANIMATION */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-6"
        >

          {/* KARTU PROFIL PESERTA (TECHID DCC STYLE) */}
          <div className="p-6 bg-[#0d1527]/80 backdrop-blur-md rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-display font-bold shrink-0">
                <User className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-display font-bold text-white tracking-wide">{userName}</h2>
                  <Badge variant="primary" className="text-[9px] font-display font-bold px-2 py-0.5 rounded-md uppercase">
                    PESERTA AKTIF
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400 inline" /> 
                  TechID: <span className="text-slate-200 font-display font-bold">{techId}</span>
                </p>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
              <p className="text-[10px] text-slate-400 uppercase font-display font-bold tracking-wider">STATUS SESI</p>
              <p className="text-xs font-display font-bold text-emerald-400 flex items-center gap-1 md:justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" /> TERVERIFIKASI SISTEM
              </p>
            </div>
          </div>

          {/* STATISTIK RINGKAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-400/10 text-cyan-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-sans uppercase font-semibold">Sisa Waktu Ujian</p>
                <h3 className="text-lg font-display font-bold text-white">120 Menit</h3>
              </div>
            </div>

            <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-sans uppercase font-semibold">Total Ujian Hari Ini</p>
                <h3 className="text-lg font-display font-bold text-white">1 Ujian Aktif</h3>
              </div>
            </div>

            <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-sans uppercase font-semibold">Pengawasan</p>
                <h3 className="text-lg font-display font-bold text-amber-400 uppercase">Sistem CBT Aktif</h3>
              </div>
            </div>
          </div>

          {/* FORM PENGERJAAN & AKSES TOKEN */}
          <div className="p-6 md:p-8 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl space-y-6">
            <div className="border-b border-slate-800/60 pb-4">
              <h3 className="text-base font-display font-bold text-cyan-400 tracking-wide uppercase">
                UJIAN SERTIFIKASI TINGKAT AKHIR (PG & PRAKTIK)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Matematika & Pemrograman Dasar • 40 Soal PG + 2 Soal Praktik • KKM: 75
              </p>
            </div>

            {/* PETUNJUK */}
            <div className="p-4 bg-[#030712]/60 rounded-xl space-y-2 text-xs text-slate-300 font-sans">
              <p className="font-display font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Petunjuk & Tata Tertib Pengerjaan:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Dilarang berpindah tab atau keluar dari browser selama sesi ujian.</li>
                <li>Jawaban pilihan ganda akan tersimpan secara otomatis di database.</li>
                <li>Minta **Token Ujian** kepada panitia pengawas sebelum menekan tombol mulai.</li>
              </ul>
            </div>

            {/* FORM MASUKKAN TOKEN */}
            <form onSubmit={handleMulaiUjian} className="space-y-4">
              <div>
                <label className="text-xs font-display font-bold text-slate-300 uppercase block mb-1.5">
                  Masukkan Token Ujian
                </label>
                <div className="relative max-w-md">
                  <Key className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Contoh: DCC2026..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    className="pl-10 uppercase font-display font-bold tracking-widest text-sm bg-[#030712]/80 border-0 text-white rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  *Token testing: <code className="text-cyan-400 font-bold font-display">DCC2026</code>
                </p>
              </div>

              {/* CHECKBOX KONFIRMASI */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="agree"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-slate-300 cursor-pointer select-none font-sans">
                  Saya memahami tata tertib dan siap memulai pengerjaan ujian.
                </label>
              </div>

              {/* ERROR ALERT */}
              {tokenError && (
                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 text-xs font-sans flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}

              {/* BUTTON SUBMIT */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full md:w-auto px-8 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm border-0 shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'MEMVERIFIKASI TOKEN...' : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" /> MULAI PENGERJAAN UJIAN
                    </>
                  )}
                </Button>
              </div>
            </form>

          </div>

        </motion.div>
      </main>
    </div>
  );
}