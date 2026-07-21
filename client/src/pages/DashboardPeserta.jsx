import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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

  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || 'ASSHYFA YUNITIASARI';
    setUserName(storedName);
    setTechId('DCC25-0072');
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
      {/* NAVBAR ULTRA CLEAN */}
      <Navbar>
        <div className="flex justify-between items-center w-full max-w-5xl mx-auto px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-display font-bold shadow-lg shadow-cyan-400/20">
              D
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-white tracking-wider">DCC CBT PORTAL</h1>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            className="text-xs text-rose-400/80 hover:text-rose-400 transition-all font-sans flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-rose-500/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </Navbar>

      {/* MAIN CONTENT - LEFT ALIGNED & STRUCTURED */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-6"
        >

          {/* HEADER TEXT */}
          <div className="px-2 md:px-6 pb-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide">
              Ruang Tunggu Ujian
            </h1>
            <p className="text-sm text-slate-400 font-sans mt-1">
              Persiapkan diri Anda sebelum memasukkan token pengerjaan.
            </p>
          </div>

          {/* KARTU PROFIL - FLOATING LEFT ALIGNED */}
          <div className="p-6 md:p-8 rounded-[2rem] bg-transparent hover:bg-[#0d1527]/60 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center font-display font-bold shadow-inner group-hover:bg-cyan-400/20 transition-all">
                <User className="w-7 h-7" />
              </div>
              <div className="text-left space-y-1">
                <h2 className="text-xl font-display font-bold text-white tracking-wide">{userName}</h2>
                <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  TechID: <span className="text-slate-200 font-display font-bold tracking-wider">{techId}</span>
                </p>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 border-slate-800/40 pt-4 md:pt-0 w-full md:w-auto">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-display font-bold mb-1.5">Status Sistem</p>
              <span className="text-emerald-400 font-display font-bold flex items-center gap-1.5 text-sm md:justify-end">
                <CheckCircle2 className="w-4 h-4" /> TERVERIFIKASI
              </span>
            </div>
          </div>

          {/* INFO STATISTIK - LEFT ALIGNED TEXT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 md:p-8 rounded-[2rem] bg-transparent hover:bg-[#0d1527]/60 transition-all duration-300 flex flex-col gap-3 group">
              <Clock className="w-6 h-6 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              <div>
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase tracking-widest mb-1">Durasi Ujian</p>
                <h3 className="text-lg font-display font-bold text-white tracking-wide">120 Menit</h3>
              </div>
            </div>

            <div className="p-6 md:p-8 rounded-[2rem] bg-transparent hover:bg-[#0d1527]/60 transition-all duration-300 flex flex-col gap-3 group">
              <BookOpen className="w-6 h-6 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              <div>
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase tracking-widest mb-1">Materi Ujian</p>
                <h3 className="text-lg font-display font-bold text-white tracking-wide">PG & Praktik</h3>
              </div>
            </div>

            <div className="p-6 md:p-8 rounded-[2rem] bg-transparent hover:bg-[#0d1527]/60 transition-all duration-300 flex flex-col gap-3 group">
              <ShieldAlert className="w-6 h-6 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              <div>
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase tracking-widest mb-1">Pengawasan</p>
                <h3 className="text-lg font-display font-bold text-emerald-400 tracking-wide">Sistem Aktif</h3>
              </div>
            </div>
          </div>

          {/* FORM TOKEN - LEFT ALIGNED & STRUCTURED */}
          <div className="p-6 md:p-8 rounded-[2rem] bg-transparent hover:bg-[#0d1527]/40 transition-all duration-300 max-w-2xl mt-4">
            <h3 className="text-[11px] font-display font-bold text-cyan-400 tracking-widest uppercase mb-6 flex items-center gap-2">
              <Key className="w-4 h-4" /> Akses Lembar Pengerjaan
            </h3>
            
            <form onSubmit={handleMulaiUjian} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-sans text-slate-400 ml-1">
                  Masukkan Token Resmi
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: DCC2026"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="w-full px-5 py-3.5 uppercase font-display font-bold tracking-widest text-sm bg-[#0d1527]/40 hover:bg-[#0d1527]/80 focus:bg-[#0d1527] border border-transparent focus:border-cyan-400/30 text-white rounded-2xl transition-all duration-300"
                />
                <p className="text-[10px] text-slate-600 font-sans ml-1">
                  *Token testing: <code className="text-cyan-400/70 font-display font-bold">DCC2026</code>
                </p>
              </div>

              {/* CHECKBOX */}
              <div className="flex items-center gap-3 ml-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer select-none font-sans">
                  Saya mematuhi tata tertib ujian yang berlaku.
                </label>
              </div>

              {/* ERROR ALERT */}
              {tokenError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-400 text-xs font-sans flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </motion.div>
              )}

              {/* BUTTON SUBMIT */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-8 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm border-0 rounded-2xl shadow-xl shadow-cyan-400/20 hover:shadow-cyan-400/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'MEMVERIFIKASI...' : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" /> MULAI UJIAN
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