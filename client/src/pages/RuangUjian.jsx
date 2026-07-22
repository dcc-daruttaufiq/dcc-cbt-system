import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import API from '../utils/api';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Clock, Flag, ChevronLeft, ChevronRight, Save, Upload, FileText, Send, AlertTriangle, X } from 'lucide-react';

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

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const userId = currentUser.user_id || Date.now();

  useEffect(() => {
    const realName = currentUser.nama || currentUser.nama_lengkap || localStorage.getItem('userName') || 'Peserta Ujian';
    const realTechId = currentUser.tech_id || localStorage.getItem('userTechId') || 'DCC25-000';
    
    // BACA ID KATEGORI TERPILIH SANGAT PRESISI
    const storedExamId = (localStorage.getItem('selectedExamCategory') || sessionStorage.getItem('selectedExamCategory') || currentUser.kategori || 'word').toLowerCase().trim();

    setUserName(realName);
    setTechId(realTechId);

    // Ambil Bank Soal dari Storage
    let allBank = JSON.parse(localStorage.getItem('dcc_bank_soal') || '[]');

    // SMART CATEGORY FILTER (MENCANGKUP VARIASI PENGETIKAN EXCEL/CSV)
    let filteredSoal = allBank.filter(s => {
      const kat = (s.kategori || '').toLowerCase().trim();

      if (storedExamId.includes('word')) return kat.includes('word') || kat.includes('doc');
      if (storedExamId.includes('excel')) return kat.includes('excel') || kat.includes('sheet');
      if (storedExamId.includes('power') || storedExamId.includes('ppt')) return kat.includes('power') || kat.includes('ppt');
      if (storedExamId.includes('desain')) return kat.includes('desain') || kat.includes('canva') || kat.includes('design');
      if (storedExamId.includes('pemrograman') || storedExamId.includes('coding')) return kat.includes('pemrograman') || kat.includes('coding') || kat.includes('web');

      return kat === storedExamId;
    });

    // FALLBACK SAFETY AUTO-RESCUE: Jika hasil filter 0, ambil semua bank soal agar peserta TIDAK KANAM / BLANK
    if (filteredSoal.length === 0 && allBank.length > 0) {
      filteredSoal = allBank;
    }

    setListSoal(filteredSoal);

    // Restore Jawaban Lama
    const savedJwbStr = localStorage.getItem(`jawabanLocal_${userId}`) || localStorage.getItem('jawabanLocal');
    if (savedJwbStr) {
      try { setJawaban(JSON.parse(savedJwbStr)); } catch (e) {}
    }
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

  const executeAutosave = (soalId, dataJawaban) => {
    setIsSaving(true);
    try {
      const savedLocal = JSON.parse(localStorage.getItem(`jawabanLocal_${userId}`) || '{}');
      savedLocal[soalId] = dataJawaban;
      localStorage.setItem(`jawabanLocal_${userId}`, JSON.stringify(savedLocal));
      localStorage.setItem('jawabanLocal', JSON.stringify(savedLocal));
    } catch (e) {}
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleSelectPG = (opsiTeks, labelHuruf) => {
    const nilaiSimpan = labelHuruf || opsiTeks;
    const updated = { ...jawaban, [soalAktif.id]: nilaiSimpan };
    setJawaban(updated);
    executeAutosave(soalAktif.id, nilaiSimpan);
  };

  const handleTextareaPraktik = (val) => {
    const dataLama = jawaban[soalAktif.id] || { teks: '', fileName: '' };
    const dataBaru = { ...dataLama, teks: val };
    const updated = { ...jawaban, [soalAktif.id]: dataBaru };
    setJawaban(updated);
    executeAutosave(soalAktif.id, dataBaru);
  };

  const handleAutoSubmit = () => {
    clearInterval(timerRef.current);
    localStorage.setItem('isExamFinished', 'true');

    // Hitung Nilai PG
    let soalPG = listSoal.filter(s => s.tipe === 'pg');
    let benarCount = 0;

    soalPG.forEach(s => {
      const jwbSiswa = (jawaban[s.id] || '').toString().toUpperCase().trim();
      const kunci = (s.jawaban_benar || s.jawabanBenar || 'A').toString().toUpperCase().trim();
      if (jwbSiswa === kunci) benarCount++;
    });

    const calculatedSkorPG = soalPG.length > 0 ? Math.round((benarCount / soalPG.length) * 100) : 0;

    // Update Status Sesi Peserta
    let listSesiLokal = JSON.parse(localStorage.getItem('dcc_sesi_peserta') || '[]');
    listSesiLokal = listSesiLokal.map(p => {
      if (p.tech_id?.toLowerCase().trim() === techId.toLowerCase().trim()) {
        return {
          ...p,
          status: 'selesai',
          status_koreksi: 'belum_dikoreksi',
          nilai_pg: calculatedSkorPG,
          nilai_akhir: calculatedSkorPG,
          waktu_selesai: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        };
      }
      return p;
    });

    localStorage.setItem('dcc_sesi_peserta', JSON.stringify(listSesiLokal));
    navigate('/dashboard-peserta');
  };

  if (listSoal.length === 0) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-bold text-cyan-400">Belum ada soal untuk mata ujian ini di Bank Soal.</p>
        <p className="text-xs text-slate-400">Silakan impor soal terlebih dahulu melalui Panel Panitia (Bank Soal).</p>
        <Button onClick={() => navigate('/dashboard-peserta')} className="mt-2 bg-slate-800 text-xs text-slate-300">
          ← Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const soalAktif = listSoal[currentIdx] || listSoal[0];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col select-none">
      <Navbar>
        <div className="flex justify-between items-center w-full max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 flex items-center justify-center text-slate-950 font-bold">D</div>
            <div>
              <h1 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{soalAktif.kategori || 'UJIAN'}</h1>
              <p className="text-[11px] text-slate-300">{userName} • TechID: {techId}</p>
            </div>
          </div>

          <div className="p-2 px-4 rounded-xl bg-[#0d1527] border border-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider text-emerald-400">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </Navbar>

      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-y-auto">
        <div className="lg:col-span-3 space-y-5">
          <div className="p-4 rounded-2xl bg-[#0d1527]/50 border border-slate-800/50 flex items-center justify-between">
            <Badge variant="primary" className="text-xs px-3 py-1 font-bold">SOAL NO. {currentIdx + 1}</Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Save className="w-3.5 h-3.5 text-cyan-400" /> Autosave Aktif</span>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 min-h-[340px] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <p className="text-base md:text-lg leading-relaxed text-slate-100 whitespace-pre-wrap">{soalAktif.pertanyaan}</p>

              {soalAktif.tipe === 'pg' ? (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {soalAktif.opsi && soalAktif.opsi.map((opsiTeks, idx) => {
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
                <textarea
                  rows={5}
                  placeholder="Tuliskan jawaban praktik Anda di sini..."
                  value={jawaban[soalAktif.id]?.teks || ''}
                  onChange={(e) => handleTextareaPraktik(e.target.value)}
                  className="w-full p-4 bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-xs text-white rounded-xl focus:outline-none font-mono"
                />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/40 pt-5 gap-2">
              <Button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="bg-slate-800 text-slate-300 text-xs border-0">
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
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

        {/* NAVIGASI NOMOR SOAL */}
        <div className="p-6 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-3">NAVIGASI SOAL</h3>
          <div className="grid grid-cols-5 gap-2">
            {listSoal.map((item, index) => {
              const isCurrent = index === currentIdx;
              const isAnswered = jawaban[item.id] !== undefined;

              return (
                <button
                  key={index}
                  onClick={() => setCurrentIdx(index)}
                  className={`h-10 rounded-xl font-bold text-xs border transition-all ${
                    isCurrent ? 'ring-2 ring-cyan-400 bg-cyan-400 text-slate-950' : isAnswered ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#030712] text-slate-400 border-slate-800'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
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