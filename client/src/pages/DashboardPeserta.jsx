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
        <div className="flex justify-between items-center w-full max-w-4xl mx-auto px-4 py-2">
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
            className="text-xs text-rose-400/80 hover:text-rose-400 transition-all font-sans flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-rose-500/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </Navbar>

      {/* MAIN CONTENT FLOATING CONCEPT */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center space-y-10 py-6"
        >

          {/* HEADER HEADERLESS & LEGA */}
          <div className="space-y-3">
            <p className="text-[11px] font-display font-bold text-cyan-400 uppercase tracking-widest">
              RUANG TUNGGU UJIAN PESERTA
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-wide">
              {userName}
            </h1>
            <p className="text-xs text-slate-400 font-sans flex items-center justify-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              TechID: <span className="text-slate-200 font-display font-bold tracking-wider">{techId}</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-display font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 inline" /> TERVERIFIKASI
              </span>
            </p>
          </div>

          {/* INFORMASI UTAMA: BAR / KOTAK CUMA MUNCUL SAAT HOVER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-transparent hover:bg-[#0d1527]/60 hover:shadow-xl transition-all duration-300 space-y-1 text-center group">
              <Clock className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors mx-auto" />
              <p className="text-[10px] text-slate-400 font-display uppercase tracking-wider">DURASI PENGERJAAN</p>
              <h3 className="text-base font-display font-bold text-white">120 Menit</h3>
            </div>

            <div className="p-4 rounded-2xl bg-transparent hover:bg-[#0d1527]/60 hover:shadow-xl transition-all duration-300 space-y-1 text-center group">
              <BookOpen className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors mx-auto" />
              <p className="text-[10px] text-slate-400 font-display uppercase tracking-wider">MATERI UJIAN</p>
              <h3 className="text-base font-display font-bold text-white">PG & Ujian Praktik</h3>
            </div>

            <div className="p-4 rounded-2xl bg-transparent hover:bg-[#0d1527]/60 hover:shadow-xl transition-all duration-300 space-y-1 text-center group">
              <ShieldAlert className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors mx-auto" />
              <p className="text-[10px] text-slate-400 font-display uppercase tracking-wider">SISTEM PENGAWASAN</p>
              <h3 className="text-base font-display font-bold text-emerald-400">Pengawasan Aktif</h3>
            </div>
          </div>

          {/* FORM TOKEN ELEGAN & FLOATING */}
          <form onSubmit={handleMulaiUjian} className="space-y-6 max-w-md mx-auto pt-4">
            
            <div className="space-y-2">
              <div className="relative">
                <Key className="w-4 h-4 text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="MASUKKAN TOKEN UJIAN..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="pl-11 pr-4 py-3.5 text-center uppercase font-display font-bold tracking-widest text-sm bg-[#0d1527]/40 hover:bg-[#0d1527]/80 focus:bg-[#0d1527] border-0 text-white rounded-2xl transition-all duration-300 focus:ring-1 focus:ring-cyan-400 shadow-lg"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                *Token testing: <code className="text-cyan-400 font-display font-bold">DCC2026</code>
              </p>
            </div>

            {/* CHECKBOX MINIMALIS */}
            <div className="flex items-center justify-center gap-2">
              <input
                type="checkbox"
                id="agree"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
              <label htmlFor="agree" className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none font-sans">
                Saya menyetujui tata tertib pengerjaan ujian.
              </label>
            </div>

            {/* ERROR ALERT */}
            {tokenError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-500/10 rounded-xl text-rose-400 text-xs font-sans flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tokenError}</span>
              </motion.div>
            )}

            {/* BUTTON MULAI ELEGAN */}
            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm border-0 rounded-2xl shadow-xl shadow-cyan-400/20 hover:shadow-cyan-400/40 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isLoading ? 'MEMVERIFIKASI TOKEN...' : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" /> MULAI UJIAN SEKARANG
                  </>
                )}
              </Button>
            </div>

          </form>

        </motion.div>
      </main>
    </div>
  );
}