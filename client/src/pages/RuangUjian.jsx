import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase } from '../utils/supabaseClient';
import { normalizeKategori, getLabelKategori } from '../utils/examCategories';
import { STORAGE_KEYS } from '../utils/storageKeys';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Clock, ChevronLeft, ChevronRight, Save, Send, AlertTriangle } from 'lucide-react';

export default function RuangUjian() {
  useDocumentTitle('Ruang Ujian Berjalan - DCC CBT');
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '{}');

  const [listSoal, setListSoal] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({}); 
  const [timeLeft, setTimeLeft] = useState(5400); 
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loadingSoal, setLoadingSoal] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchSoalSupabase = async () => {
      setLoadingSoal(true);
      const rawExamId = localStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY) || currentUser.kategori || '';
      const userKategori = normalizeKategori(rawExamId);

      if (!userKategori) {
        setLoadingSoal(false);
        return;
      }

      // FETCH STRICT SOAL HANYA KATEGORI SISWA DARI SUPABASE CLOUD
      const { data, error } = await supabase
        .from('bank_soal')
        .select('*')
        .eq('kategori', userKategori);

      if (!error && data) {
        setListSoal(data);
      }
      setLoadingSoal(false);
    };

    fetchSoalSupabase();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
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

  const syncJawabanToSupabase = async (soalId, dataJawaban) => {
    if (!currentUser.tech_id) return;
    await supabase.from('jawaban_peserta').upsert({
      tech_id: currentUser.tech_id,
      soal_id: soalId,
      jawaban: dataJawaban,
      updated_at: new Date().toISOString()
    }, { onConflict: 'tech_id,soal_id' });
  };

  const handleSelectPG = (labelHuruf) => {
    const updated = { ...jawaban, [soalAktif.id]: labelHuruf };
    setJawaban(updated);
    syncJawabanToSupabase(soalAktif.id, labelHuruf);
  };

  const handleTextareaPraktik = (val) => {
    const dataBaru = { teks: val };
    const updated = { ...jawaban, [soalAktif.id]: dataBaru };
    setJawaban(updated);
    syncJawabanToSupabase(soalAktif.id, dataBaru);
  };

  const handleAutoSubmit = async () => {
    clearInterval(timerRef.current);

    let soalPG = listSoal.filter(s => s.tipe === 'pg');
    let benarCount = 0;

    soalPG.forEach(s => {
      const jwb = (jawaban[s.id] || '').toString().toUpperCase().trim();
      const kunci = (s.jawaban_benar || 'A').toString().toUpperCase().trim();
      if (jwb === kunci) benarCount++;
    });

    const calculatedSkorPG = soalPG.length > 0 ? Math.round((benarCount / soalPG.length) * 100) : 0;

    // UPDATE STATUS SELESAI DI SUPABASE CLOUD
    await supabase
      .from('peserta')
      .update({
        status: 'selesai',
        nilai_pg: calculatedSkorPG,
        nilai_akhir: calculatedSkorPG,
        waktu_selesai: new Date().toLocaleTimeString('id-ID')
      })
      .eq('tech_id', currentUser.tech_id);

    localStorage.setItem(STORAGE_KEYS.IS_EXAM_FINISHED, 'true');
    navigate('/dashboard-peserta');
  };

  if (loadingSoal) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center text-xs font-mono">
        MENGAMBIL SOAL LIVE DARI SUPABASE CLOUD...
      </div>
    );
  }

  if (listSoal.length === 0) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-bold text-cyan-400">Belum ada soal untuk kategori ({currentUser.kategori?.toUpperCase()}) di database Cloud.</p>
        <p className="text-xs text-slate-400">Panitia belum mengunggah soal untuk mata ujian ini ke Supabase.</p>
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
          <div>
            <h1 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{getLabelKategori(soalAktif.kategori)}</h1>
            <p className="text-[11px] text-slate-300">{currentUser.nama} • TechID: {currentUser.tech_id}</p>
          </div>
          <div className="p-2 px-4 rounded-xl bg-[#0d1527] border border-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-sm text-emerald-400">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </Navbar>

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-y-auto">
        <div className="lg:col-span-3 space-y-5">
          <div className="p-4 rounded-2xl bg-[#0d1527]/50 border border-slate-800 flex justify-between items-center">
            <Badge variant="primary" className="text-xs font-bold">SOAL NO. {currentIdx + 1}</Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Save className="w-3.5 h-3.5 text-cyan-400" /> Auto-Sync Active</span>
          </div>

          <div className="p-8 rounded-2xl bg-[#0d1527]/40 border border-slate-800 min-h-[340px] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <p className="text-base text-slate-100 whitespace-pre-wrap">{soalAktif.pertanyaan}</p>

              {soalAktif.tipe === 'pg' ? (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {soalAktif.opsi && (typeof soalAktif.opsi === 'string' ? JSON.parse(soalAktif.opsi) : soalAktif.opsi).map((opsiTeks, idx) => {
                    const labelHuruf = String.fromCharCode(65 + idx);
                    const isSelected = jawaban[soalAktif.id] === labelHuruf;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectPG(labelHuruf)}
                        className={`p-4 rounded-xl border cursor-pointer flex items-start gap-4 ${
                          isSelected ? 'bg-[#0d1527] border-cyan-400 text-white' : 'bg-[#030712]/60 border-slate-800 text-slate-300'
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
                  className="w-full p-4 bg-[#030712] border border-slate-800 text-xs text-white rounded-xl font-mono"
                />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-5">
              <Button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="bg-slate-800 text-xs">
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>
              <Button
                onClick={() => {
                  if (currentIdx < listSoal.length - 1) setCurrentIdx(currentIdx + 1);
                  else setShowSubmitModal(true);
                }}
                className="bg-cyan-400 text-slate-950 font-bold text-xs border-0"
              >
                {currentIdx === listSoal.length - 1 ? 'Selesai Ujian' : 'Berikutnya'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#0d1527]/40 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase border-b border-slate-800 pb-3">NAVIGASI SOAL</h3>
          <div className="grid grid-cols-5 gap-2">
            {listSoal.map((item, index) => (
              <button
                key={index}
                onClick={() => setCurrentIdx(index)}
                className={`h-10 rounded-xl font-bold text-xs border ${
                  index === currentIdx ? 'bg-cyan-400 text-slate-950' : jawaban[item.id] !== undefined ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#030712] text-slate-400 border-slate-800'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowSubmitModal(true)} className="w-full mt-4 py-3 bg-cyan-400 text-slate-950 font-bold text-xs border-0">
            <Send className="w-3.5 h-3.5 mr-1" /> SUBMIT SELESAI
          </Button>
        </div>
      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Konfirmasi Selesai</h3>
            <p className="text-xs text-slate-300">Submit pengerjaan ke Supabase Cloud?</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowSubmitModal(false)} className="flex-1 bg-slate-800 text-xs">Batal</Button>
              <Button onClick={handleAutoSubmit} className="flex-1 bg-cyan-400 text-slate-950 font-bold text-xs">Ya, Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}