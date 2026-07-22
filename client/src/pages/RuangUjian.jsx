import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import API from '../utils/api';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Upload, 
  FileText, 
  Send, 
  AlertTriangle, 
  X
} from 'lucide-react';

export default function RuangUjian() {
  useDocumentTitle('Ruang Ujian Berjalan - DCC CBT');
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [techId, setTechId] = useState('');
  const [examName, setExamName] = useState('');

  const [listSoal, setListSoal] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({}); 
  const [flags, setFlags] = useState({}); 
  const [isSaving, setIsSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5400); 
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const storedName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || 'ASSHYFA YUNITIASARI';
    const storedExamName = sessionStorage.getItem('selectedExamName') || 'Microsoft Office';
    const storedExamId = localStorage.getItem('selectedExamCategory') || sessionStorage.getItem('selectedExamId') || 'msoffice';

    setUserName(storedName);
    setTechId('DCC25-0072');
    setExamName(storedExamName);

    const startExam = async () => {
      let loadedSoal = [];

      // 1. Coba ambil dari Backend API
      try {
        const res = await API.get(`/ujian/mulai?userId=1&kategori=${storedExamId}`);
        if (res.data && Array.isArray(res.data.soal) && res.data.soal.length > 0) {
          loadedSoal = res.data.soal;
          setTimeLeft(res.data.sisaDetik || 5400);
        }
      } catch (err) {
        console.warn("API Server unreachable, reading local Bank Soal");
      }

      // 2. Baca SELURUH SOAL dari Bank Soal (localStorage) sesuai kategori terpilih
      if (loadedSoal.length === 0) {
        const savedBank = localStorage.getItem('dcc_bank_soal') || sessionStorage.getItem('dcc_bank_soal');
        if (savedBank) {
          const parsedBank = JSON.parse(savedBank);
          const filtered = parsedBank.filter(s => (s.kategori || 'msoffice').toLowerCase() === storedExamId.toLowerCase());
          if (filtered.length > 0) {
            loadedSoal = filtered;
          }
        }
      }

      setListSoal(loadedSoal);
    };

    startExam();
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

  const executeAutosave = async (soalId, dataJawaban) => {
    setIsSaving(true);
    try {
      const savedLocal = JSON.parse(localStorage.getItem('jawabanLocal') || '{}');
      savedLocal[soalId] = dataJawaban;
      localStorage.setItem('jawabanLocal', JSON.stringify(savedLocal));
    } catch (e) {}

    try {
      await API.post('/ujian/autosave', { soalId, jawaban: dataJawaban, userId: 1 });
    } catch (err) {
    } finally {
      setTimeout(() => setIsSaving(false), 400);
    }
  };

  const handleSelectPG = (opsiTeks, labelHuruf) => {
    const nilaiSimpan = labelHuruf || opsiTeks;
    setJawaban((prev) => ({ ...prev, [soalAktif.id]: nilaiSimpan }));
    executeAutosave(soalAktif.id, nilaiSimpan);
  };

  const handleTextareaPraktik = (val) => {
    const dataLama = jawaban[soalAktif.id] || { teks: '', fileName: '' };
    const dataBaru = { ...dataLama, teks: val };
    setJawaban({ ...jawaban, [soalAktif.id]: dataBaru });
    executeAutosave(soalAktif.id, dataBaru);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const dataLama = jawaban[soalAktif.id] || { teks: '', fileName: '' };
    const dataBaru = { ...dataLama, fileName: file.name };
    setJawaban({ ...jawaban, [soalAktif.id]: dataBaru });

    const formData = new FormData();
    formData.append('file_praktik', file);

    setIsSaving(true);
    try {
      const uploadRes = await API.post('/upload-praktik', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (uploadRes.data && uploadRes.data.filename) {
        dataBaru.fileName = uploadRes.data.filename;
        setJawaban({ ...jawaban, [soalAktif.id]: dataBaru });
      }
    } catch (err) {
    } finally {
      executeAutosave(soalAktif.id, dataBaru);
    }
  };

  const toggleFlag = () => {
    setFlags({ ...flags, [soalAktif.id]: !flags[soalAktif.id] });
  };

  // FUNGSI SUBMIT REAL JAWABAN PESERTA KE PANITIA
  const handleAutoSubmit = async () => {
    clearInterval(timerRef.current);
    sessionStorage.setItem('examSubmitted', 'true');

    // 1. Hitung Nilai PG dari Jawaban Asli Peserta
    let soalPG = listSoal.filter(s => s.tipe === 'pg');
    let benarCount = 0;

    soalPG.forEach(s => {
      const jwbSiswa = jawaban[s.id];
      const kunci = s.jawaban_benar || s.jawabanBenar || 'A';
      if (jwbSiswa === kunci) {
        benarCount++;
      }
    });

    const calculatedSkorPG = soalPG.length > 0 ? Math.round((benarCount / soalPG.length) * 100) : 85;

    // 2. Simpan Rekapan Sesi Peserta Asli ke LocalStorage untuk Panel Panitia
    const recordPesertaAsli = {
      user_id: 1,
      nama: userName || 'ASSHYFA YUNITIASARI',
      tech_id: techId || 'DCC25-0072',
      mata_ujian: examName,
      status: 'selesai',
      nilai_pg: calculatedSkorPG,
      nilai_praktik: 0,
      nilai_akhir: calculatedSkorPG,
      total_dijawab: Object.keys(jawaban).length
    };

    let listSesiLokal = JSON.parse(localStorage.getItem('dcc_sesi_peserta') || '[]');
    listSesiLokal = listSesiLokal.filter(p => p.user_id !== 1);
    listSesiLokal.unshift(recordPesertaAsli);
    localStorage.setItem('dcc_sesi_peserta', JSON.stringify(listSesiLokal));

    // 3. Simpan Jawaban Peserta Asli
    localStorage.setItem('jawabanLocal', JSON.stringify(jawaban));

    // 4. Kirim ke API Server Backend
    try {
      await API.post('/ujian/submit', { userId: 1, jawaban });
    } catch (err) {}

    navigate('/dashboard-peserta');
  };

  if (listSoal.length === 0) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center font-display gap-3 p-4 text-center">
        <p className="text-sm font-bold text-cyan-400">Belum ada soal untuk mata ujian ini di Bank Soal.</p>
        <p className="text-xs text-slate-400 font-sans">Silakan tambah soal terlebih dahulu lewat Panel Panitia (Bank Soal).</p>
      </div>
    );
  }

  const soalAktif = listSoal[currentIdx] || listSoal[0];
  const totalSoalTerjawab = Object.keys(jawaban).length;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col select-none">
      <Navbar>
        <div className="flex justify-between items-center w-full max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-display font-bold shadow-lg shadow-cyan-400/20">
              D
            </div>
            <div>
              <h1 className="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest">{examName}</h1>
              <p className="text-[11px] text-slate-300 font-sans">{userName} • TechID: {techId}</p>
            </div>
          </div>

          <div className="p-2 px-4 rounded-xl bg-[#0d1527] border border-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-display font-bold text-sm tracking-wider text-emerald-400">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </Navbar>

      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-y-auto">
        <div className="lg:col-span-3 space-y-5">
          <div className="p-4 rounded-2xl bg-[#0d1527]/50 border border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary" className="text-xs px-3 py-1 font-display font-bold">
                SOAL NO. {currentIdx + 1}
              </Badge>

              <span className="text-[10px] font-display font-bold uppercase px-2.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {soalAktif.tipe === 'pg' ? 'Pilihan Ganda' : 'Ujian Praktik'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-cyan-400 flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" /> Menyimpan jawaban...
                </motion.span>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-sans">
                  <Save className="w-3.5 h-3.5 text-cyan-400" /> Autosave Aktif
                </span>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 min-h-[340px] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <p className="text-base md:text-lg font-sans leading-relaxed text-slate-100">
                {soalAktif.pertanyaan}
              </p>

              {soalAktif.tipe === 'pg' ? (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {soalAktif.opsi && soalAktif.opsi.map((opsiTeks, idx) => {
                    const teksPilihan = typeof opsiTeks === 'object' ? opsiTeks.teks : opsiTeks;
                    const labelHuruf = String.fromCharCode(65 + idx);
                    const isSelected = jawaban[soalAktif.id] === labelHuruf || jawaban[soalAktif.id] === teksPilihan;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectPG(teksPilihan, labelHuruf)}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                          isSelected
                            ? 'bg-[#0d1527] border-cyan-400 text-white shadow-md shadow-cyan-400/10'
                            : 'bg-[#030712]/60 border-slate-800/80 text-slate-300 hover:bg-[#0d1527]/60 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {labelHuruf}
                        </span>
                        <span className="text-sm font-sans pt-0.5">{teksPilihan}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <textarea
                    rows={5}
                    placeholder={soalAktif.placeholder || "Tuliskan kode jawaban atau deskripsi pengerjaan Anda di sini..."}
                    value={jawaban[soalAktif.id]?.teks || ''}
                    onChange={(e) => handleTextareaPraktik(e.target.value)}
                    className="w-full p-4 bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-xs text-white rounded-xl font-sans focus:outline-none"
                  />

                  <div className="p-4 bg-[#030712]/40 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <label className="relative flex items-center gap-2 bg-[#0d1527] hover:bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl cursor-pointer transition text-xs font-display font-bold text-slate-200">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>Unggah Berkas Praktik</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.zip,.png,.jpg,.jpeg,.xlsx" />
                    </label>

                    {jawaban[soalAktif.id]?.fileName ? (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg border border-cyan-400/20">
                        <FileText className="w-4 h-4" />
                        <span className="truncate max-w-[200px] font-mono">{jawaban[soalAktif.id].fileName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-sans">Format: .pdf, .zip, .png, .xlsx (Max 10MB)</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/40 pt-5 mt-6 gap-2">
              <Button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border-0 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>

              <button
                onClick={toggleFlag}
                className={`px-3 py-2 rounded-xl text-xs font-display font-bold border transition-all flex items-center gap-1.5 ${
                  flags[soalAktif.id]
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {flags[soalAktif.id] ? 'RAGU-RAGU AKTIF' : 'TANDAI RAGU-RAGU'}
              </button>

              <Button
                onClick={() => {
                  if (currentIdx < listSoal.length - 1) {
                    setCurrentIdx(currentIdx + 1);
                  } else {
                    setShowSubmitModal(true);
                  }
                }}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0"
              >
                {currentIdx === listSoal.length - 1 ? 'Selesai Ujian' : 'Berikutnya'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/40 pb-3">
              <h3 className="text-xs font-display font-bold text-slate-300 uppercase tracking-widest">
                NAVIGASI SOAL
              </h3>
              <span className="text-[10px] font-sans text-cyan-400">
                {totalSoalTerjawab}/{listSoal.length} Terisi
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {listSoal.map((item, index) => {
                const isCurrent = index === currentIdx;
                const isFlagged = flags[item.id];
                const isAnswered = jawaban[item.id] !== undefined && (
                  typeof jawaban[item.id] === 'string' 
                    ? jawaban[item.id] !== '' 
                    : (jawaban[item.id]?.teks !== '' || jawaban[item.id]?.fileName !== '')
                );

                let nodeStyles = "bg-[#030712] text-slate-400 border-slate-800";
                if (isFlagged) {
                  nodeStyles = "bg-amber-500/20 text-amber-400 border-amber-500/50";
                } else if (isAnswered) {
                  nodeStyles = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
                }

                if (isCurrent) {
                  nodeStyles += " ring-2 ring-cyan-400";
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIdx(index)}
                    className={`h-10 rounded-xl font-display font-bold text-xs border transition-all flex items-center justify-center ${nodeStyles}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800/40 space-y-2 text-[10px] font-sans text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50 inline-block"></span>
                <span>Sudah Dijawab / Terisi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50 inline-block"></span>
                <span>Ditandai Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#030712] border border-slate-800 inline-block"></span>
                <span>Belum Dijawab</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 rounded-xl shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> SUBMIT SELESAI UJIAN
              </Button>
            </div>
          </div>
        </div>

      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Konfirmasi Selesai Ujian
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Apakah Anda yakin ingin menyelesaikan sesi ujian ini? Jawaban Anda akan langsung dikirim ke Panel Panitia.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border-0"
              >
                Batal
              </Button>
              <Button
                onClick={handleAutoSubmit}
                className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 shadow-lg shadow-cyan-400/20"
              >
                Ya, Submit Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}