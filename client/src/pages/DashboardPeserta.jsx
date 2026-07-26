import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase, TABLES } from '../utils/supabaseClient';
import { normalizeKategori, getLabelKategori } from '../utils/examCategories';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { LOGO_URL } from '../config/brand';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import {
  CreditCard, Key, Play, LogOut, User,
  AlertCircle, Sparkles, Award, CheckCircle2, Clock, XCircle, ShieldCheck
} from 'lucide-react';

const DEFAULT_KATALOG = [
  { id: 'word', nama: 'Microsoft Word', subNama: 'Pengolahan Dokumen & Surat', kategori: 'Spesialisasi', durasi: '90 Menit', tokenDefault: 'WORD2026', bobot_pg: 50, bobot_praktik: 50, kkm: 75 },
  { id: 'excel', nama: 'Microsoft Excel', subNama: 'Pengolahan Data & Formula', kategori: 'Spesialisasi', durasi: '90 Menit', tokenDefault: 'EXCEL2026', bobot_pg: 50, bobot_praktik: 50, kkm: 75 },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint', subNama: 'Desain Presentasi Interaktif', kategori: 'Spesialisasi', durasi: '90 Menit', tokenDefault: 'PPT2026', bobot_pg: 50, bobot_praktik: 50, kkm: 75 },
  { id: 'desain', nama: 'Desain Grafis', subNama: 'Canva & Visual Typography', kategori: 'Spesialisasi', durasi: '90 Menit', tokenDefault: 'DESAIN2026', bobot_pg: 40, bobot_praktik: 60, kkm: 75 },
  { id: 'pemrograman', nama: 'Pemrograman Web', subNama: 'HTML, CSS, & Logic JavaScript', kategori: 'Spesialisasi', durasi: '120 Menit', tokenDefault: 'CODING2026', bobot_pg: 40, bobot_praktik: 60, kkm: 75 }
];

export default function DashboardPeserta() {
  useDocumentTitle('Dashboard Peserta - DCC SISTEM');
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  const [userTokenIndividu, setUserTokenIndividu] = useState('');
  const [selectedUjian, setSelectedUjian] = useState('word');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [completedExamInfo, setCompletedExamInfo] = useState(null);
  const [logoGagalDimuat, setLogoGagalDimuat] = useState(false);

  // State Mode Token Global & Katalog
  const [modeToken, setModeToken] = useState('mapel'); // 'mapel' | 'siswa'
  const [daftarUjianDinamis, setDaftarUjianDinamis] = useState(DEFAULT_KATALOG);
  const [dataError, setDataError] = useState('');

  // Helper Format Durasi Waktu Pengerjaan
  const formatLamaPengerjaan = (mulaiStr, selesaiStr) => {
    if (!mulaiStr) return null;

    const parseDateToMs = (str) => {
      if (!str) return null;
      if (typeof str === 'number') return str;
      const isoFormatted = str.toString().trim().replace(' ', 'T');
      const timeMs = new Date(isoFormatted).getTime();
      return isNaN(timeMs) ? null : timeMs;
    };

    const tMulai = parseDateToMs(mulaiStr);
    const tSelesai = parseDateToMs(selesaiStr) || Date.now();

    if (!tMulai) return null;

    const diffMs = Math.max(0, tSelesai - tMulai);
    const totalDetik = Math.floor(diffMs / 1000);

    if (isNaN(totalDetik)) return null;

    const jam = Math.floor(totalDetik / 3600);
    const menit = Math.floor((totalDetik % 3600) / 60);
    const detik = totalDetik % 60;

    if (jam > 0) {
      return `${jam} Jam ${menit} Mnt`;
    } else if (menit > 0) {
      return `${menit} Menit ${detik} Dtk`;
    } else {
      return `${detik} Detik`;
    }
  };

  useEffect(() => {
    const fetchModeToken = async () => {
      try {
        const { data } = await supabase
          .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
          .select('*')
          .eq('key', 'mode_token_ujian')
          .maybeSingle();

        if (data && data.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          const currentMode = parsed.mode || 'mapel';
          setModeToken(currentMode);
          localStorage.setItem('dcc_mode_token', currentMode);
        } else {
          const localMode = localStorage.getItem('dcc_mode_token');
          if (localMode) setModeToken(localMode);
        }
      } catch (e) {
        const localMode = localStorage.getItem('dcc_mode_token');
        if (localMode) setModeToken(localMode);
      }
    };

    const loadKatalogDinamis = async () => {
      let catalogArr = DEFAULT_KATALOG;
      try {
        const { data } = await supabase
          .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
          .select('*')
          .eq('key', 'katalog_mata_ujian')
          .maybeSingle();

        if (data && data.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            catalogArr = parsed.map(item => ({
              id: item.id,
              nama: item.nama || getLabelKategori(item.id),
              subNama: item.desc || 'Ujian Sertifikasi Kompetensi',
              kategori: 'Spesialisasi',
              durasi: `${item.durasi || 90} Menit`,
              tokenDefault: item.token || `${item.id.toUpperCase()}2026`,
              bobot_pg: item.bobot_pg !== undefined ? Number(item.bobot_pg) : 50,
              bobot_praktik: item.bobot_praktik !== undefined ? Number(item.bobot_praktik) : 50,
              kkm: item.kkm !== undefined && item.kkm !== null ? Number(item.kkm) : 75
            }));
          }
        }
      } catch (e) {
        console.warn('Membaca katalog mata ujian dari local storage...');
        const local = localStorage.getItem('dcc_katalog_mapel');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              catalogArr = parsed.map(item => ({
                id: item.id,
                nama: item.nama || getLabelKategori(item.id),
                subNama: item.desc || 'Ujian Sertifikasi Kompetensi',
                kategori: 'Spesialisasi',
                durasi: `${item.durasi || 90} Menit`,
                tokenDefault: item.token || `${item.id.toUpperCase()}2026`,
                bobot_pg: item.bobot_pg !== undefined ? Number(item.bobot_pg) : 50,
                bobot_praktik: item.bobot_praktik !== undefined ? Number(item.bobot_praktik) : 50,
                kkm: item.kkm !== undefined && item.kkm !== null ? Number(item.kkm) : 75
              }));
            }
          } catch (e) {}
        }
      }
      setDaftarUjianDinamis(catalogArr);
      return catalogArr;
    };

    const initDashboard = async () => {
      await fetchModeToken();
      const activeCatalog = await loadKatalogDinamis();
      const savedUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      let activeUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      if (!activeUser) {
        navigate('/login');
        return;
      }

      if (activeUser.tech_id) {
        try {
          const { data: freshRow, error } = await supabase
            .from(TABLES.PESERTA)
            .select('*')
            .eq('tech_id', activeUser.tech_id)
            .maybeSingle();

          if (error) throw error;
          if (freshRow) {
            activeUser = { ...activeUser, ...freshRow };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(activeUser));
          }
        } catch (err) {
          console.warn('Gagal menyinkronkan profil dari Supabase Cloud.', err);
          const localSesi = JSON.parse(localStorage.getItem(STORAGE_KEYS.PESERTA) || '[]');
          const matchedFromCache = localSesi.find(p => p.tech_id?.toLowerCase().trim() === activeUser.tech_id?.toLowerCase().trim());
          if (matchedFromCache) {
            activeUser = { ...activeUser, ...matchedFromCache };
          }
        }
      }

      const techIdVal = activeUser?.tech_id || localStorage.getItem(STORAGE_KEYS.USER_TECH_ID) || '';

      // Ambil token unik siswa dengan pencarian yang aman & robust
      let tokenIndividuToDisplay = activeUser?.token || activeUser?.token_peserta || '';
      if (!tokenIndividuToDisplay && techIdVal) {
        try {
          const savedTokenMap = JSON.parse(localStorage.getItem('dcc_persistent_tokens') || '{}');
          const foundKey = Object.keys(savedTokenMap).find(k => k.toLowerCase().trim() === techIdVal.toLowerCase().trim());
          if (foundKey) {
            tokenIndividuToDisplay = savedTokenMap[foundKey];
          }
        } catch (e) {}
      }

      // Fallback buat token darurat jika masih kosong melompong
      if (!tokenIndividuToDisplay) {
        tokenIndividuToDisplay = `TS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      const nameToDisplay = activeUser?.nama || activeUser?.nama_lengkap || localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Peserta Ujian';

      setUserName(nameToDisplay);
      setTechId(techIdVal);
      setUserTokenIndividu(tokenIndividuToDisplay);

      const rawKat = activeUser?.kategori || localStorage.getItem(STORAGE_KEYS.USER_KATEGORI) || '';
      const dynamicCategoryIds = activeCatalog.map(item => item.id);
      const initialKat = normalizeKategori(rawKat, dynamicCategoryIds);

      if (!initialKat) {
        setDataError(`Kategori ujian untuk akun ini tidak valid ("${rawKat || '-'}"). Silakan hubungi Pengawas untuk memperbaiki data.`);
        return;
      }

      setSelectedUjian(initialKat);

      const isFinished = activeUser?.status === 'selesai' || activeUser?.status_koreksi === 'SELESAI' || localStorage.getItem(STORAGE_KEYS.IS_EXAM_FINISHED) === 'true';

      if (isFinished) {
        const activeExam = activeCatalog.find(u => u.id === initialKat);
        const kkmReal = activeExam?.kkm ?? 75;

        let totalSoalKategori = 0;
        let totalSoalTerjawab = 0;

        try {
          const { data: dataSoal } = await supabase
            .from(TABLES.BANK_SOAL || 'bank_soal')
            .select('id, kategori');
          
          if (dataSoal && Array.isArray(dataSoal)) {
            const filteredSoal = dataSoal.filter(s => normalizeKategori(s.kategori) === initialKat);
            totalSoalKategori = filteredSoal.length;
          }

          const { data: dataJawaban } = await supabase
            .from(TABLES.JAWABAN_PESERTA || 'jawaban_peserta')
            .select('jawaban')
            .eq('tech_id', techIdVal);

          if (dataJawaban && Array.isArray(dataJawaban)) {
            totalSoalTerjawab = dataJawaban.filter(j => {
              if (!j.jawaban) return false;
              if (typeof j.jawaban === 'string' && j.jawaban.startsWith('{')) {
                try {
                  const p = JSON.parse(j.jawaban);
                  return !!(p.teks || p.fileName);
                } catch (e) { return true; }
              }
              return true;
            }).length;
          }
        } catch (e) {
          console.warn('Gagal menghitung statistik jawaban:', e);
        }

        const nilaiPG = activeUser?.nilai_pg !== undefined && activeUser?.nilai_pg !== null ? Number(activeUser.nilai_pg) : 0;
        const nilaiPraktik = activeUser?.nilai_praktik !== undefined && activeUser?.nilai_praktik !== null ? Number(activeUser.nilai_praktik) : null;
        const jumlahBenar = activeUser?.jumlah_benar !== undefined && activeUser?.jumlah_benar !== null ? Number(activeUser.jumlah_benar) : null;
        const jumlahSalah = activeUser?.jumlah_salah !== undefined && activeUser?.jumlah_salah !== null ? Number(activeUser.jumlah_salah) : null;
        
        let totalNilai = activeUser?.nilai_akhir !== undefined && activeUser?.nilai_akhir !== null ? Number(activeUser.nilai_akhir) : null;
        
        if (totalNilai === null && nilaiPraktik !== null) {
          const bPG = activeExam?.bobot_pg ?? 50;
          const bPrak = activeExam?.bobot_praktik ?? 50;
          totalNilai = Math.round((nilaiPG * (bPG / 100)) + (nilaiPraktik * (bPrak / 100)));
        }

        const finalCalculatedScore = totalNilai !== null ? totalNilai : nilaiPG;
        const isLulus = finalCalculatedScore >= kkmReal;
        const isFullyCorrected = activeUser?.status_koreksi === 'SELESAI' || activeUser?.status_koreksi === 'dikoreksi' || nilaiPraktik !== null;

        const wMulai = activeUser?.waktu_mulai 
          || localStorage.getItem(`startTime_${techIdVal}`)
          || sessionStorage.getItem(`startTime_${techIdVal}`);
          
        const wSelesai = activeUser?.waktu_selesai 
          || localStorage.getItem(`endTime_${techIdVal}`)
          || sessionStorage.getItem(`endTime_${techIdVal}`);

        let lamaKerja = formatLamaPengerjaan(wMulai, wSelesai);
        
        if (!lamaKerja || lamaKerja.includes('NaN')) {
          lamaKerja = activeUser?.lama_pengerjaan || 'Selesai Ujian';
        }

        setCompletedExamInfo({
          namaUjian: activeExam ? activeExam.nama : getLabelKategori(initialKat),
          nilaiPG: nilaiPG,
          nilaiPraktik: nilaiPraktik,
          totalNilai: finalCalculatedScore,
          kkm: kkmReal,
          isLulus: isLulus,
          lamaPengerjaan: lamaKerja,
          totalTerjawab: totalSoalTerjawab,
          totalSoal: totalSoalKategori || 0,
          jumlahBenar: jumlahBenar,
          jumlahSalah: jumlahSalah,
          statusPraktikText: isFullyCorrected 
            ? (nilaiPraktik !== null ? `${nilaiPraktik}` : 'Selesai Dikoreksi') 
            : 'Dalam Koreksi Pengawas'
        });

        setIsExamCompleted(true);
      }
    };

    initDashboard();
  }, [navigate]);

  const activeExamDetail = daftarUjianDinamis.find((u) => u.id === selectedUjian) || daftarUjianDinamis[0] || DEFAULT_KATALOG[0];

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

    try {
      const { data: dataStatus } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'status_sesi_ujian')
        .maybeSingle();

      const st = dataStatus?.value ? (typeof dataStatus.value === 'string' ? JSON.parse(dataStatus.value) : dataStatus.value) : null;
      const statusSesi = st?.status || localStorage.getItem('dcc_status_sesi') || 'DITUTUP';

      if (statusSesi !== 'DIBUKA') {
        setIsLoading(false);
        return setTokenError('AKSES DITOLAK: Sesi ujian saat ini sedang DITUTUP oleh pengawas!');
      }
    } catch (err) {
      console.warn('Gagal mengecek status sesi ujian, menggunakan fallback...', err);
    }

    const inputUpper = tokenInput.trim().toUpperCase();

    // 🛑 VALIDASI MUTLAK DUAL-MODE TOKEN (AMBIL LANGSUNG DARI SUMBER LOCALSTORAGE/STATE)
    let isTokenValid = false;

    if (modeToken === 'siswa') {
      let realSiswaToken = userTokenIndividu;
      if (!realSiswaToken && techId) {
        try {
          const savedMap = JSON.parse(localStorage.getItem('dcc_persistent_tokens') || '{}');
          const foundKey = Object.keys(savedMap).find(k => k.toLowerCase().trim() === techId.toLowerCase().trim());
          if (foundKey) {
            realSiswaToken = savedMap[foundKey];
          }
        } catch (e) {}
      }

      const validIndividuToken = realSiswaToken ? realSiswaToken.toUpperCase().trim() : '';

      // HANYA COCOK DENGAN TOKEN UNIK SISWA TERSEBUT
      if (validIndividuToken && inputUpper === validIndividuToken) {
        isTokenValid = true;
      } else {
        isTokenValid = false;
      }
    } else {
      // 🟢 MODE MAPEL: BOLEH PAKAI TOKEN MAPEL / EMERGENCY
      const tokenMapelAktif = activeExamDetail.tokenDefault ? activeExamDetail.tokenDefault.toUpperCase().trim() : '';
      if (
        (tokenMapelAktif && inputUpper === tokenMapelAktif) ||
        inputUpper === 'WORD2026' || inputUpper === 'DCC2026' || inputUpper === '12345' || inputUpper === '1234'
      ) {
        isTokenValid = true;
      }
    }

    if (isTokenValid) {
      const nowIso = new Date().toISOString();
      sessionStorage.setItem('examStarted', 'true');
      sessionStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY, activeExamDetail.id);
      localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY, activeExamDetail.id);
      localStorage.setItem(STORAGE_KEYS.USER_KATEGORI, activeExamDetail.id);
      localStorage.setItem(`startTime_${techId}`, nowIso);
      sessionStorage.setItem(`startTime_${techId}`, nowIso);

      try {
        await supabase
          .from(TABLES.PESERTA)
          .update({ status: 'berjalan', kategori: activeExamDetail.id, waktu_mulai: nowIso })
          .eq('tech_id', techId);
      } catch (err) {
        console.warn('Gagal memperbarui status ke Supabase Cloud.', err);
      }

      const localSesi = JSON.parse(localStorage.getItem(STORAGE_KEYS.PESERTA) || '[]');
      const updatedSesi = localSesi.map(p => {
        if (p.tech_id?.toLowerCase().trim() === techId.toLowerCase().trim()) {
          return { ...p, status: 'berjalan', kategori: activeExamDetail.id, waktu_mulai: nowIso };
        }
        return p;
      });
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updatedSesi));

      const currentUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (currentUserStr) {
        try {
          const cu = JSON.parse(currentUserStr);
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ ...cu, status: 'berjalan', kategori: activeExamDetail.id, waktu_mulai: nowIso }));
        } catch (e) {}
      }

      navigate('/ruang-ujian');
    } else {
      setIsLoading(false);
      if (modeToken === 'siswa') {
        setTokenError(`Token Unik Siswa tidak valid! Pastikan Anda memasukkan Token Rahasia milik Anda sendiri yang benar.`);
      } else {
        setTokenError(`Token untuk ujian ${activeExamDetail.nama} tidak valid! Gunakan token resmi mapel atau hubungi Pengawas.`);
      }
    }
  };

  if (dataError) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center font-sans">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm font-bold text-rose-400">Data Peserta Bermasalah</p>
        <p className="text-xs text-slate-400 max-w-md">{dataError}</p>
        <Button onClick={handleLogout} className="mt-2 bg-slate-800 text-xs text-slate-300 font-sans">
          ← Kembali ke Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-[#0d1527]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            {!logoGagalDimuat ? (
              <img
                src={LOGO_URL}
                alt="Logo DCC"
                onError={() => setLogoGagalDimuat(true)}
                className="h-10 w-auto object-contain drop-shadow-md"
              />
            ) : (
              <span className="text-cyan-400 font-display font-bold text-lg">DCC</span>
            )}
            <div>
              <h1 className="text-sm font-display font-bold text-white tracking-wide">DCC SISTEM</h1>
              <p className="text-[10px] text-slate-400 font-sans">Dashboard Peserta</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-xs text-rose-400/80 hover:text-rose-400 transition-all font-sans flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl hover:bg-rose-500/10 border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto font-sans">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* CARD PROFIL PESERTA */}
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

          {/* TAMPILAN LEMBAR HASIL JIKA SUDAH SELESAI UJIAN */}
          {isExamCompleted && completedExamInfo ? (
            <div className="p-6 md:p-8 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl border border-emerald-500/40 space-y-6 shadow-2xl font-sans">
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

                <div className="flex items-center gap-2 flex-wrap">
                  {(completedExamInfo?.totalSoal ?? 0) > 0 && (
                    <div className="bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 text-xs px-3 py-1 rounded-lg font-display font-bold tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil menjawab {completedExamInfo?.totalTerjawab ?? 0} dari {completedExamInfo?.totalSoal ?? 0} soal
                    </div>
                  )}

                  <div className="bg-slate-800/80 text-cyan-400 border border-cyan-400/30 text-xs px-3 py-1 rounded-lg font-display font-bold tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {completedExamInfo?.lamaPengerjaan}
                  </div>

                  {/* BADGE STATUS KELULUSAN KKM DINAMIS */}
                  {completedExamInfo?.isLulus ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs px-3 py-1 font-display font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> LULUS (KKM: {completedExamInfo?.kkm})
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-xs px-3 py-1 font-display font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> BELUM LULUS (KKM: {completedExamInfo?.kkm})
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* NILAI PILIHAN GANDA */}
                <div className="p-5 rounded-xl bg-[#030712]/80 border border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider">NILAI PILIHAN GANDA</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-cyan-400">{completedExamInfo?.nilaiPG ?? 0}</span>
                    <span className="text-xs text-slate-500 font-sans">/ 100</span>
                  </div>
                  {(completedExamInfo?.jumlahBenar !== null && completedExamInfo?.jumlahBenar !== undefined) && (
                    <p className="text-[11px] font-sans font-bold">
                      <span className="text-emerald-400">{completedExamInfo.jumlahBenar} jawaban benar</span>
                      <span className="text-slate-500"> • </span>
                      <span className="text-rose-400">{completedExamInfo.jumlahSalah ?? 0} jawaban salah</span>
                    </p>
                  )}
                </div>

                {/* NILAI PRAKTIK */}
                <div className="p-5 rounded-xl bg-[#030712]/80 border border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider">NILAI PRAKTIK</p>
                  <p className="text-sm font-display font-bold text-amber-400 pt-1">
                    {completedExamInfo?.nilaiPraktik !== null && completedExamInfo?.nilaiPraktik !== undefined ? (
                      <span className="text-3xl font-display font-bold text-amber-400">{completedExamInfo.nilaiPraktik}</span>
                    ) : (
                      <span className="text-xs font-sans text-amber-400/90">{completedExamInfo?.statusPraktikText ?? 'Dalam Koreksi Pengawas'}</span>
                    )}
                  </p>
                </div>

                {/* NILAI AKHIR TOTAL & ATURAN KKM */}
                <div className={`p-5 rounded-xl bg-[#030712]/80 border space-y-2 ${completedExamInfo?.isLulus ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                  <p className={`text-[11px] font-display font-bold uppercase tracking-wider ${completedExamInfo?.isLulus ? 'text-emerald-400' : 'text-rose-400'}`}>
                    NILAI AKHIR TOTAL
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-display font-bold ${completedExamInfo?.isLulus ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {completedExamInfo?.totalNilai ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-sans">(Batas KKM: {completedExamInfo?.kkm})</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* CARD MATA UJIAN TERKUNCI */}
              <div className="space-y-3 font-sans">
                <div className="flex items-center gap-2 text-cyan-400 px-1">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-xs font-display font-bold uppercase tracking-widest">MATA UJIAN ANDA (SESUAI DATA PENGAWAS)</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 rounded-2xl border bg-[#0d1527] border-cyan-400/80 shadow-lg shadow-cyan-400/5 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-display font-bold uppercase px-2.5 py-0.5 rounded-md bg-cyan-400 text-slate-950">
                          {activeExamDetail.kategori}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-display font-bold text-amber-400">KKM: {activeExamDetail.kkm ?? 75}</span>
                          <span className="text-xs font-display font-bold text-cyan-400">Durasi: {activeExamDetail.durasi}</span>
                        </div>
                      </div>
                      <h4 className="text-base font-display font-bold text-white tracking-wide">{activeExamDetail.nama}</h4>
                      <p className="text-xs text-slate-400 font-sans">{activeExamDetail.subNama}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM VERIFIKASI TOKEN UJIAN */}
              <div className="p-6 bg-[#0d1527]/50 backdrop-blur-md rounded-2xl border border-slate-800/50 space-y-4 font-sans">
                <div className="border-b border-slate-800/50 pb-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-4 h-4" /> VERIFIKASI TOKEN UJIAN
                    </h4>
                    <p className="text-xs text-slate-300 font-sans mt-1">
                      Mata Ujian Terpilih: <strong className="text-white font-bold">{activeExamDetail.nama}</strong>
                    </p>
                  </div>

                  {/* INDICATOR TIPE MODE TOKEN YANG SANGAT JELAS */}
                  {modeToken === 'siswa' ? (
                    <span className="text-[11px] font-display font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Mode: Token Unik Siswa
                    </span>
                  ) : (
                    <span className="text-[11px] font-display font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-lg border border-cyan-400/20">
                      Token Mapel: {activeExamDetail.tokenDefault}
                    </span>
                  )}
                </div>

                <form onSubmit={handleMulaiUjian} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Input
                        type="text"
                        placeholder={modeToken === 'siswa' ? "Masukkan Token Unik Siswa Anda..." : `Masukkan Token Ujian ${activeExamDetail.nama}...`}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 uppercase font-display font-bold tracking-widest text-sm bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-white rounded-xl font-sans"
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 rounded-xl shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2">
                      <Play className="w-3.5 h-3.5 fill-slate-950" /> MULAI PENGERJAAN
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="agree" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer" />
                    <label htmlFor="agree" className="text-[11px] text-slate-400 cursor-pointer select-none font-sans">Saya menyetujui tata tertib pengerjaan ujian {activeExamDetail.nama}.</label>
                  </div>

                  {tokenError && (
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 text-xs flex items-center gap-2 border border-rose-500/20 font-sans">
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