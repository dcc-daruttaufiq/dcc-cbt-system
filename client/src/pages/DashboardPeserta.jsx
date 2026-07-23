import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase } from '../utils/supabaseClient';
import { normalizeKategori, getLabelKategori } from '../utils/examCategories';
import { STORAGE_KEYS } from '../utils/storageKeys';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { 
  CreditCard, Key, Play, LogOut, User, 
  AlertCircle, Sparkles, Award 
} from 'lucide-react';

const DAFTAR_UJIAN = [
  { id: 'word', nama: 'Microsoft Word', subNama: 'Pengolahan Dokumen & Surat', kategori: 'Perkantoran', durasi: '90 Menit', detailSoal: 'Soal PG + Praktik Word', tokenDefault: 'WORD2026' },
  { id: 'excel', nama: 'Microsoft Excel', subNama: 'Pengolahan Data & Formula', kategori: 'Perkantoran', durasi: '90 Menit', detailSoal: 'Soal PG + Praktik Excel', tokenDefault: 'EXCEL2026' },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint', subNama: 'Desain Presentasi Interaktif', kategori: 'Perkantoran', durasi: '90 Menit', detailSoal: 'Soal PG + Praktik Slide', tokenDefault: 'PPT2026' },
  { id: 'desain', nama: 'Desain Grafis', subNama: 'Canva & Visual Typography', kategori: 'Kreatif & Desain', durasi: '90 Menit', detailSoal: 'Soal PG + Praktik Layout', tokenDefault: 'DESAIN2026' },
  { id: 'pemrograman', nama: 'Pemrograman Web', subNama: 'HTML, CSS, & Logic JavaScript', kategori: 'Teknologi', durasi: '120 Menit', detailSoal: 'Soal PG + Praktik Web', tokenDefault: 'CODING2026' }
];

export default function DashboardPeserta() {
  useDocumentTitle('Dashboard Peserta - DCC CBT');
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  const [selectedUjian, setSelectedUjian] = useState('word');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [completedExamInfo, setCompletedExamInfo] = useState(null);

  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const initPeserta = async () => {
      // 1. AMBIL PROFIL SISWA AKTIF DARI LOCALSTORAGE
      const savedUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      let activeUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      if (!activeUser) {
        navigate('/login');
        return;
      }

      // Sync realtime dari Supabase jika tech_id tersedia
      if (activeUser.tech_id) {
        const { data: cloudData } = await supabase
          .from('peserta')
          .select('*')
          .eq('tech_id', activeUser.tech_id)
          .single();

        if (cloudData) {
          activeUser = { ...activeUser, ...cloudData };
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(activeUser));
        }
      }

      const nameToDisplay = activeUser?.nama || activeUser?.nama_lengkap || localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Peserta Ujian';
      const techIdToDisplay = activeUser?.tech_id || localStorage.getItem(STORAGE_KEYS.USER_TECH_ID) || '';

      setUserName(nameToDisplay);
      setTechId(techIdToDisplay);

      // 2. DETEKSI KATEGORI MATA UJIAN SISWA
      const rawKat = activeUser?.kategori || localStorage.getItem(STORAGE_KEYS.USER_KATEGORI) || '';
      const initialKat = normalizeKategori(rawKat);

      if (!initialKat) {
        setDataError(`Kategori ujian untuk akun ini tidak valid ("${rawKat || '-'}"). Silakan hubungi Panitia untuk memperbaiki data.`);
        return;
      }

      setSelectedUjian(initialKat);

      // 3. CEK STATUS SELESAI
      if (activeUser?.status === 'selesai' || localStorage.getItem(STORAGE_KEYS.IS_EXAM_FINISHED) === 'true') {
        setIsExamCompleted(true);
        const activeExam = DAFTAR_UJIAN.find(u => u.id === initialKat);
        setCompletedExamInfo({
          namaUjian: activeExam ? activeExam.nama : getLabelKategori(initialKat),
          skorPG: activeUser?.nilai_pg !== undefined ? activeUser.nilai_pg : 0,
          statusPraktik: activeUser?.status_koreksi === 'dikoreksi' ? 'Selesai Dikoreksi Panitia' : 'Berkas Diterima & Dalam Koreksi Panitia'
        });
      }
    };

    initPeserta();
  }, []);

  const activeExamDetail = DAFTAR_UJIAN.find((u) => u.id === selectedUjian) || DAFTAR_UJIAN[0];

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.USER_NAME);
    localStorage.removeItem(STORAGE_KEYS.USER_TECH_ID);
    localStorage.removeItem(STORAGE_KEYS.USER_KATEGORI);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY);
    sessionStorage.clear();
    navigate('/login');
  };

  const handleMulaiUjian = async (e) => {
    e.preventDefault();
    setTokenError('');

    if (!tokenInput.trim()) return setTokenError('Masukkan Token Ujian terlebih dahulu!');
    if (!isAgreed) return setTokenError('Anda harus menyetujui tata tertib pengerjaan ujian!');

    setIsLoading(true);

    const inputUpper = tokenInput.trim().toUpperCase();
    
    if (
      inputUpper === activeExamDetail.tokenDefault || 
      inputUpper === 'DCC2026' || 
      inputUpper === '12345' || 
      inputUpper === '1234'
    ) {
      sessionStorage.setItem('examStarted', 'true');
      sessionStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY, activeExamDetail.id);
      localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY, activeExamDetail.id);
      localStorage.setItem(STORAGE_KEYS.USER_KATEGORI, activeExamDetail.id);

      // UPDATE STATUS BERJALAN DI SUPABASE CLOUD
      if (techId) {
        await supabase
          .from('peserta')
          .update({ status: 'berjalan', kategori: activeExamDetail.id })
          .eq('tech_id', techId);
      }

      navigate('/ruang-ujian');
    } else {
      setTokenError(`Token untuk ujian ${activeExamDetail.nama} tidak valid! Gunakan token: ${activeExamDetail.tokenDefault}`);
      setIsLoading(false);
    }
  };

  if (dataError) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm font-bold text-rose-400">Data Peserta Bermasalah</p>
        <p className="text-xs text-slate-400 max-w-md">{dataError}</p>
        <Button onClick={handleLogout} className="mt-2 bg-slate-800 text-xs text-slate-300">
          ← Kembali ke Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col">
      <Navbar>
        <div className="flex justify-between items-center w-full max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-display font-bold shadow-lg shadow-cyan-400/20">D</div>
            <div>
              <h1 className="text-sm font-display font-bold text-white tracking-wide">DCC CBT PORTAL</h1>
              <p className="text-[10px] text-slate-400 font-sans">Panel Ruang Ujian Peserta</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-rose-400/80 hover:text-rose-400 transition-all font-sans flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl hover:bg-rose-500/10">
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </Navbar>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="p-6 md:p-8 bg-[#0d1527]/50 backdrop-blur-md rounded-2xl border border-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center font-display font-bold shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-white tracking-wide">{userName}</h2>
                  <Badge variant="primary" className="text-[9px] font-display font-bold px-2 py-0.5 rounded-md uppercase">PESERTA</Badge>
                </div>
                <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> TechID: <span className="text-slate-200 font-display font-bold tracking-wider">{techId}</span>
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-800/60 pt-4 sm:pt-0 w-full sm:w-auto">
              <p className="text-[10px] text-slate-500 font-display font-bold uppercase tracking-widest mb-1">MATA UJIAN TERPILIH</p>
              <span className="text-cyan-400 font-display font-bold text-sm uppercase">{activeExamDetail.nama}</span>
            </div>
          </div>

          {isExamCompleted ? (
            <div className="p-6 md:p-8 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl border border-emerald-500/40 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-display font-bold text-emerald-400 uppercase tracking-widest block">LEMBAR HASIL UJIAN</span>
                    <h3 className="text-lg font-display font-bold text-white">{completedExamInfo?.namaUjian}</h3>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs px-3 py-1 font-display font-bold">✓ UJIAN SELESAI</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-[#030712]/80 border border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider">SKOR PILIHAN GANDA (PG)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-emerald-400">{completedExamInfo?.skorPG}</span>
                    <span className="text-xs text-slate-400 font-sans">/ 100</span>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-[#030712]/80 border border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider">STATUS PRAKTIK</p>
                  <p className="text-sm font-display font-bold text-emerald-400 pt-1">{completedExamInfo?.statusPraktik}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 px-1">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-xs font-display font-bold uppercase tracking-widest">MATA UJIAN ANDA (SESUAI DATA PANITIA)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl border bg-[#0d1527] border-cyan-400 shadow-lg shadow-cyan-400/10 flex flex-col justify-between gap-4 md:col-span-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-display font-bold uppercase px-2.5 py-0.5 rounded-md bg-cyan-400 text-slate-950">
                          {activeExamDetail.kategori}
                        </span>
                        <span className="text-xs font-display font-bold text-cyan-400">Ditetapkan Panitia</span>
                      </div>
                      <h4 className="text-base font-display font-bold text-white tracking-wide">{activeExamDetail.nama}</h4>
                      <p className="text-xs text-slate-400 font-sans">{activeExamDetail.subNama}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[#0d1527]/50 backdrop-blur-md rounded-2xl border border-slate-800/50 space-y-4">
                <div className="border-b border-slate-800/50 pb-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-4 h-4" /> VERIFIKASI TOKEN UJIAN
                    </h4>
                    <p className="text-xs text-slate-300 font-sans mt-1">
                      Mata Ujian Terpilih: <strong className="text-white font-bold">{activeExamDetail.nama}</strong>
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-lg border border-cyan-400/20">
                    Token: {activeExamDetail.tokenDefault}
                  </span>
                </div>

                <form onSubmit={handleMulaiUjian} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Input
                        type="text"
                        placeholder={`Masukkan Token Ujian ${activeExamDetail.nama}...`}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 uppercase font-display font-bold tracking-widest text-sm bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-white rounded-xl"
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 rounded-xl shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2">
                      <Play className="w-3.5 h-3.5 fill-slate-950" /> MULAI PENGERJAAN
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="agree" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer" />
                    <label htmlFor="agree" className="text-[11px] text-slate-400 cursor-pointer select-none">Saya menyetujui tata tertib pengerjaan ujian {activeExamDetail.nama}.</label>
                  </div>

                  {tokenError && (
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{tokenError}</span>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}