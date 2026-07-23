import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase, TABLES, BUCKET_LAMPIRAN_PRAKTIK } from '../utils/supabaseClient';
import { normalizeKategori, getLabelKategori } from '../utils/examCategories';
import { STORAGE_KEYS, jawabanLocalKey } from '../utils/storageKeys';
import { LOGO_URL } from '../config/brand';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Clock, ChevronLeft, ChevronRight, Save, Send, AlertTriangle, X, HelpCircle, Paperclip, FileCheck } from 'lucide-react';

export default function RuangUjian() {
  useDocumentTitle('Ruang Ujian Berjalan - DCC CBT');
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  const [listSoal, setListSoal] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [raguRagu, setRaguRagu] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5400);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [errorState, setErrorState] = useState('');
  const [examKategori, setExamKategori] = useState('');
  const [logoGagalDimuat, setLogoGagalDimuat] = useState(false);
  const timerRef = useRef(null);
  const fileInputPraktikRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '{}');

  useEffect(() => {
    const initRuangUjian = async () => {
      const realName = currentUser.nama || currentUser.nama_lengkap || localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Peserta Ujian';
      const realTechId = currentUser.tech_id || localStorage.getItem(STORAGE_KEYS.USER_TECH_ID) || '';

      setUserName(realName);
      setTechId(realTechId);

      if (!realTechId) {
        setErrorState('Sesi login tidak valid (TechID tidak ditemukan). Silakan login ulang.');
        return;
      }

      const rawExamId =
        localStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY) ||
        sessionStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY) ||
        currentUser.kategori ||
        '';

      const storedExamId = normalizeKategori(rawExamId);

      if (!storedExamId) {
        setErrorState(`Kategori ujian Anda tidak valid/tidak dikenali ("${rawExamId || '-'}"). Silakan hubungi Panitia.`);
        return;
      }

      setExamKategori(storedExamId);

      // 1. AMBIL BANK SOAL DARI SUPABASE CLOUD
      let bankSoalImpor = [];
      try {
        const { data, error } = await supabase.from(TABLES.BANK_SOAL).select('*');
        if (error) throw error;
        bankSoalImpor = Array.isArray(data) ? data : [];
        localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify(bankSoalImpor));
      } catch (err) {
        console.warn('Gagal memuat Bank Soal dari Supabase Cloud, menggunakan cache lokal terakhir.', err);
        try {
          bankSoalImpor = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK_SOAL) || '[]');
        } catch (e) {
          bankSoalImpor = [];
        }
      }

      if (!Array.isArray(bankSoalImpor) || bankSoalImpor.length === 0) {
        setErrorState('EMPTY_BANK_SOAL');
        return;
      }

      // 2. FILTER SOAL KATEGORI PESERTA
      const filteredSoal = bankSoalImpor.filter(s => normalizeKategori(s.kategori) === storedExamId);

      if (filteredSoal.length === 0) {
        setErrorState('EMPTY_KATEGORI');
        return;
      }

      setListSoal(filteredSoal);

      // 3. RESTORE JAWABAN + STATUS RAGU-RAGU DARI SUPABASE CLOUD
      try {
        const { data: jawabanRows, error: jawabanErr } = await supabase
          .from(TABLES.JAWABAN_PESERTA)
          .select('*')
          .eq('tech_id', realTechId);

        if (jawabanErr) throw jawabanErr;

        const restoredJawaban = {};
        const restoredRagu = {};
        (jawabanRows || []).forEach((row) => {
          let parsedVal = row.jawaban;
          if (typeof row.jawaban === 'string' && (row.jawaban.startsWith('{') || row.jawaban.startsWith('['))) {
            try { parsedVal = JSON.parse(row.jawaban); } catch(e) {}
          }
          restoredJawaban[row.soal_id] = parsedVal;
          restoredRagu[row.soal_id] = !!row.ragu_ragu;
        });
        setJawaban(restoredJawaban);
        setRaguRagu(restoredRagu);

        const cachePayload = {};
        (jawabanRows || []).forEach((row) => {
          cachePayload[row.soal_id] = { jawaban: row.jawaban, ragu_ragu: !!row.ragu_ragu };
        });
        localStorage.setItem(jawabanLocalKey(realTechId), JSON.stringify(cachePayload));
        localStorage.setItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY, JSON.stringify(cachePayload));
      } catch (err) {
        console.warn('Gagal memuat jawaban dari Supabase Cloud, mencoba cache lokal...', err);
        const savedJwbStr = localStorage.getItem(jawabanLocalKey(realTechId)) || localStorage.getItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY);
        if (savedJwbStr) {
          try {
            const parsed = JSON.parse(savedJwbStr);
            const restoredJawaban = {};
            const restoredRagu = {};
            Object.keys(parsed).forEach((soalId) => {
              const entry = parsed[soalId];
              const isWrapped = entry && typeof entry === 'object' && 'jawaban' in entry;
              restoredJawaban[soalId] = isWrapped ? entry.jawaban : entry;
              restoredRagu[soalId] = isWrapped ? !!entry.ragu_ragu : false;
            });
            setJawaban(restoredJawaban);
            setRaguRagu(restoredRagu);
          } catch (e) {}
        }
      }
    };

    initRuangUjian();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // AUTOSAVE REALTIME KE SUPABASE CLOUD
  const persistJawaban = async (soalId, jawabanValue, raguValue) => {
    setIsSaving(true);

    try {
      const savedLocal = JSON.parse(localStorage.getItem(jawabanLocalKey(techId)) || '{}');
      savedLocal[soalId] = { jawaban: jawabanValue, ragu_ragu: raguValue };
      localStorage.setItem(jawabanLocalKey(techId), JSON.stringify(savedLocal));
      localStorage.setItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY, JSON.stringify(savedLocal));
    } catch (e) {}

    try {
      const dbJawabanPayload = typeof jawabanValue === 'object' && jawabanValue !== null 
        ? JSON.stringify(jawabanValue) 
        : jawabanValue;

      const { error } = await supabase.from(TABLES.JAWABAN_PESERTA).upsert(
        {
          tech_id: techId,
          soal_id: soalId,
          jawaban: dbJawabanPayload,
          ragu_ragu: raguValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tech_id,soal_id' }
      );
      if (error) throw error;
    } catch (err) {
      console.warn('Gagal autosave ke Supabase Cloud, disimpan di LocalStorage.', err);
    }

    setTimeout(() => setIsSaving(false), 300);
  };

  const handleSelectPG = (opsiTeks, labelHuruf) => {
    const nilaiSimpan = labelHuruf || opsiTeks;
    const updated = { ...jawaban, [soalAktif.id]: nilaiSimpan };
    setJawaban(updated);
    persistJawaban(soalAktif.id, nilaiSimpan, raguRagu[soalAktif.id] || false);
  };

  const handleTextareaPraktik = (val) => {
    const dataLama = typeof jawaban[soalAktif.id] === 'object' && jawaban[soalAktif.id] !== null 
      ? jawaban[soalAktif.id] 
      : { teks: '', fileName: '', fileUrl: '' };
    
    const dataBaru = { ...dataLama, teks: val };
    const updated = { ...jawaban, [soalAktif.id]: dataBaru };
    setJawaban(updated);
    persistJawaban(soalAktif.id, dataBaru, raguRagu[soalAktif.id] || false);
  };

  const toggleRaguRagu = () => {
    if (!soalAktif) return;
    const soalId = soalAktif.id;
    const newRaguValue = !raguRagu[soalId];
    const updated = { ...raguRagu, [soalId]: newRaguValue };
    setRaguRagu(updated);
    persistJawaban(soalId, jawaban[soalId] !== undefined ? jawaban[soalId] : null, newRaguValue);
  };

  // UPLOAD LAMPIRAN PRAKTIK
  const handleFileLampiranChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExt = ['.docx', '.xlsx', '.pdf'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExt.includes(ext)) {
      alert('Format file tidak didukung! Hanya menerima file .docx, .xlsx, atau .pdf');
      e.target.value = '';
      return;
    }

    setIsUploadingFile(true);
    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${techId}/${soalAktif.id}_${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_LAMPIRAN_PRAKTIK || 'lampiran_praktik')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET_LAMPIRAN_PRAKTIK || 'lampiran_praktik')
        .getPublicUrl(path);

      const fileUrl = urlData?.publicUrl || '';

      const dataLama = typeof jawaban[soalAktif.id] === 'object' && jawaban[soalAktif.id] !== null 
        ? jawaban[soalAktif.id] 
        : { teks: '', fileName: '', fileUrl: '' };

      const dataBaru = { ...dataLama, fileName: file.name, fileUrl };
      const updated = { ...jawaban, [soalAktif.id]: dataBaru };
      setJawaban(updated);
      
      await persistJawaban(soalAktif.id, dataBaru, raguRagu[soalAktif.id] || false);
    } catch (err) {
      console.error('Gagal mengunggah lampiran praktik:', err);
      alert('Gagal mengunggah lampiran praktik ke Supabase Cloud.');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleAutoSubmit = async () => {
    clearInterval(timerRef.current);
    localStorage.setItem(STORAGE_KEYS.IS_EXAM_FINISHED, 'true');

    let soalPG = listSoal.filter(s => s.tipe === 'pg');
    let benarCount = 0;

    soalPG.forEach(s => {
      const jwbSiswa = (jawaban[s.id] || '').toString().toUpperCase().trim();
      const kunci = (s.jawaban_benar || s.jawabanBenar || 'A').toString().toUpperCase().trim();
      if (jwbSiswa === kunci) benarCount++;
    });

    const calculatedSkorPG = soalPG.length > 0 ? Math.round((benarCount / soalPG.length) * 100) : 0;
    const waktuSelesai = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    try {
      const { error } = await supabase
        .from(TABLES.PESERTA)
        .update({
          status: 'selesai',
          status_koreksi: 'belum_dikoreksi',
          nilai_pg: calculatedSkorPG,
          nilai_akhir: calculatedSkorPG,
          waktu_selesai: waktuSelesai,
        })
        .eq('tech_id', techId);

      if (error) throw error;
    } catch (err) {
      console.warn('Gagal memperbarui status selesai ke Supabase Cloud.', err);
    }

    let listSesiLokal = JSON.parse(localStorage.getItem(STORAGE_KEYS.PESERTA) || '[]');
    listSesiLokal = listSesiLokal.map(p => {
      if (p.tech_id?.toLowerCase().trim() === techId.toLowerCase().trim()) {
        return {
          ...p,
          status: 'selesai',
          status_koreksi: 'belum_dikoreksi',
          nilai_pg: calculatedSkorPG,
          nilai_akhir: calculatedSkorPG,
          waktu_selesai: waktuSelesai
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(listSesiLokal));

    const currentUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (currentUserStr) {
      try {
        const cu = JSON.parse(currentUserStr);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
          ...cu,
          status: 'selesai',
          status_koreksi: 'belum_dikoreksi',
          nilai_pg: calculatedSkorPG,
          nilai_akhir: calculatedSkorPG,
          waktu_selesai: waktuSelesai
        }));
      } catch (e) {}
    }

    navigate('/dashboard-peserta');
  };

  if (errorState) {
    let judul = 'Ruang Ujian Tidak Dapat Dibuka';
    let pesan = errorState;

    if (errorState === 'EMPTY_BANK_SOAL') {
      judul = 'Bank Soal Masih Kosong';
      pesan = 'Panitia belum mengimpor Bank Soal sama sekali ke Supabase Cloud.';
    } else if (errorState === 'EMPTY_KATEGORI') {
      judul = 'Soal Untuk Kategori Anda Belum Tersedia';
      pesan = `Belum ada soal untuk kategori "${getLabelKategori(examKategori)}" di Bank Soal.`;
    }

    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-bold text-cyan-400">{judul}</p>
        <p className="text-xs text-slate-400 max-w-md">{pesan}</p>
        <Button onClick={() => navigate('/dashboard-peserta')} className="mt-2 bg-slate-800 text-xs text-slate-300">
          ← Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  if (listSoal.length === 0) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-bold text-cyan-400">Memuat soal ujian...</p>
      </div>
    );
  }

  const soalAktif = listSoal[currentIdx] || listSoal[0];
  const isSoalAktifRagu = !!raguRagu[soalAktif?.id];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col select-none">
      {/* NAVBAR CLEAN TRANSPARAN (LOGO MURNI TANPA KOTAK BACKGROUND & SHADOW) */}
      <header className="border-b border-slate-800 bg-[#0d1527]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="flex justify-between items-center w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {!logoGagalDimuat ? (
              <img
                src={LOGO_URL}
                alt="Logo Lembaga"
                onError={() => setLogoGagalDimuat(true)}
                className="h-10 w-auto object-contain drop-shadow-md"
              />
            ) : (
              <span className="text-cyan-400 font-display font-bold text-lg">DCC</span>
            )}
            <div>
              <h1 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{getLabelKategori(examKategori)}</h1>
              <p className="text-[11px] text-slate-300">{userName} • TechID: {techId}</p>
            </div>
          </div>

          <div className="p-2 px-4 rounded-xl bg-[#030712] border border-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider text-emerald-400">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-y-auto">
        <div className="lg:col-span-3 space-y-5">
          <div className="p-4 rounded-2xl bg-[#0d1527]/50 border border-slate-800/50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" className="text-xs px-3 py-1 font-bold">SOAL NO. {currentIdx + 1}</Badge>
              {isSoalAktifRagu && (
                <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/50 text-xs px-3 py-1 font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> RAGU-RAGU
                </Badge>
              )}
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Save className="w-3.5 h-3.5 text-cyan-400" /> {isSaving ? 'Menyimpan...' : 'Autosave Aktif'}</span>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 min-h-[340px] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <p className="text-base md:text-lg leading-relaxed text-slate-100 whitespace-pre-wrap">{soalAktif?.pertanyaan}</p>

              {soalAktif?.tipe === 'pg' ? (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {soalAktif?.opsi && soalAktif.opsi.map((opsiTeks, idx) => {
                    const labelHuruf = String.fromCharCode(65 + idx);
                    const isSelected = jawaban[soalAktif.id] === labelHuruf;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectPG(opsiTeks, labelHuruf)}
                        className={`p-4 rounded-xl border cursor-pointer flex items-start gap-4 ${
                          isSelected ? 'bg-[#0d1527] border-cyan-400 text-white shadow-md' : 'bg-[#030712]/60 border-slate-800 text-slate-300 hover:bg-[#0d1527]/60'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                          {labelHuruf}
                        </span>
                        <span className="text-sm pt-0.5">{typeof opsiTeks === 'string' ? opsiTeks.replace(/^[A-D]\.\s*/, '') : opsiTeks}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={5}
                    placeholder="Tuliskan jawaban praktik Anda di sini..."
                    value={(typeof jawaban[soalAktif?.id] === 'object' ? jawaban[soalAktif?.id]?.teks : jawaban[soalAktif?.id]) || ''}
                    onChange={(e) => handleTextareaPraktik(e.target.value)}
                    className="w-full p-4 bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-xs text-white rounded-xl focus:outline-none font-mono"
                  />

                  {/* UPLOAD LAMPIRAN PRAKTIK */}
                  <input
                    type="file"
                    ref={fileInputPraktikRef}
                    onChange={handleFileLampiranChange}
                    accept=".docx,.xlsx,.pdf"
                    className="hidden"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => fileInputPraktikRef.current && fileInputPraktikRef.current.click()}
                      disabled={isUploadingFile}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border-0 flex items-center gap-2 w-fit"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> {isUploadingFile ? 'Mengunggah Lampiran...' : 'Unggah Lampiran Praktik (.docx/.xlsx/.pdf)'}
                    </Button>
                    {typeof jawaban[soalAktif?.id] === 'object' && jawaban[soalAktif?.id]?.fileName && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg break-all">
                        <FileCheck className="w-3.5 h-3.5 shrink-0" /> {jawaban[soalAktif.id].fileName}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/40 pt-5 gap-2 flex-wrap">
              <Button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="bg-slate-800 text-slate-300 text-xs border-0">
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>

              {/* TOMBOL RAGU-RAGU */}
              <Button
                type="button"
                onClick={toggleRaguRagu}
                className={`text-xs border-0 font-bold flex items-center gap-1.5 ${
                  isSoalAktifRagu ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                }`}
              >
                <HelpCircle className="w-4 h-4" /> {isSoalAktifRagu ? 'Batal Ragu-ragu' : 'Tandai Ragu-ragu'}
              </Button>

              <Button
                onClick={() => {
                  if (currentIdx < listSoal.length - 1) setCurrentIdx(currentIdx + 1);
                  else setShowSubmitModal(true);
                }}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs border-0"
              >
                {currentIdx === listSoal.length - 1 ? 'Selesai Ujian' : 'Berikutnya'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* SIDEBAR NAVIGASI SOAL */}
        <div className="p-6 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-3">NAVIGASI SOAL</h3>
          <div className="grid grid-cols-5 gap-2">
            {listSoal.map((item, index) => {
              const isCurrent = index === currentIdx;
              const isAnswered = jawaban[item.id] !== undefined && jawaban[item.id] !== null && jawaban[item.id] !== '';
              const isRagu = !!raguRagu[item.id];

              return (
                <button
                  key={index}
                  onClick={() => setCurrentIdx(index)}
                  title={isRagu ? 'Ditandai Ragu-ragu' : undefined}
                  className={`h-10 rounded-xl font-bold text-xs border transition-all ${
                    isCurrent
                      ? 'ring-2 ring-cyan-400 bg-cyan-400 text-slate-950'
                      : isRagu
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : isAnswered
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-[#030712] text-slate-400 border-slate-800'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" /> Terjawab</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Ragu-ragu</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> Belum Dijawab</span>
          </div>

          <Button onClick={() => setShowSubmitModal(true)} className="w-full mt-4 py-3 bg-cyan-400 text-slate-950 font-bold text-xs border-0 rounded-xl flex items-center justify-center gap-2">
            <Send className="w-3.5 h-3.5" /> SUBMIT SELESAI
          </Button>
        </div>
      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Konfirmasi Selesai Ujian</h3>
            <p className="text-xs text-slate-300">Apakah Anda yakin ingin menyelesaikan ujian ini?</p>
            {Object.values(raguRagu).some(Boolean) && (
              <p className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" /> Anda masih memiliki soal yang ditandai Ragu-ragu.
              </p>
            )}
            <div className="flex gap-3">
              <Button onClick={() => setShowSubmitModal(false)} className="flex-1 bg-slate-800 text-xs border-0">Batal</Button>
              <Button onClick={handleAutoSubmit} className="flex-1 bg-cyan-400 text-slate-950 font-bold text-xs border-0">Ya, Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}