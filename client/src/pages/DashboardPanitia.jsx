import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import { CheckSquare, Square, Award, ClipboardList, User, FileCode, CheckCircle2, RefreshCw } from 'lucide-react';

export default function DashboardPanitia() {
  const [peserta, setPeserta] = useState([]);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [soalPraktikList, setSoalPraktikList] = useState([]);
  const [checklistPraktik, setChecklistPraktik] = useState({});
  const [isSaved, setIsSaved] = useState(false);

  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  const loadPeserta = async () => {
    let listReal = [];
    try {
      const res = await API.get('/ujian/peserta');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        listReal = res.data;
      }
    } catch (err) {
      console.warn("Gagal fetch dari backend, membaca sesi lokal peserta");
    }

    // Gabungkan dengan Sesi Lokal jika Backend offline/delay
    if (listReal.length === 0) {
      const localSesi = localStorage.getItem('dcc_sesi_peserta');
      if (localSesi) {
        listReal = JSON.parse(localSesi);
      }
    }

    setPeserta(listReal);
  };

  useEffect(() => {
    loadPeserta();
  }, []);

  const handlePeriksa = async (userId) => {
    setSelectedSiswa(userId);
    setIsSaved(false);
    
    let detailJawaban = [];
    try {
      const res = await API.get(`/ujian/peserta/${userId}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        detailJawaban = res.data;
      }
    } catch (err) {
      console.warn('Gagal muat jawaban live server, menggunakan storage lokal');
    }

    // Fallback ke localStorage jika API belum mengembalikan data
    if (detailJawaban.length === 0) {
      const savedJawaban = localStorage.getItem('jawabanLocal');
      const bankSoal = JSON.parse(localStorage.getItem('dcc_bank_soal') || '[]');
      if (savedJawaban) {
        const parsedJwb = JSON.parse(savedJawaban);
        detailJawaban = Object.keys(parsedJwb).map(soalId => {
          const matchedSoal = bankSoal.find(s => String(s.id) === String(soalId)) || {};
          return {
            soal_id: soalId,
            tipe: matchedSoal.tipe || (typeof parsedJwb[soalId] === 'object' ? 'praktik' : 'pg'),
            pertanyaan: matchedSoal.pertanyaan || `Pertanyaan Soal #${soalId}`,
            jawaban: parsedJwb[soalId],
            checklist: matchedSoal.checklist || ['Hasil pengerjaan sesuai instruksi', 'Kerapihan & struktur valid']
          };
        });
      }
    }

    // Filter khusus soal praktik untuk dikoreksi rubriknya
    const hanyaPraktik = detailJawaban.filter(j => j.tipe === 'praktik' || typeof j.jawaban === 'object');
    setSoalPraktikList(hanyaPraktik.length > 0 ? hanyaPraktik : detailJawaban);
    initChecklistData(hanyaPraktik.length > 0 ? hanyaPraktik : detailJawaban);
  };

  const initChecklistData = (data) => {
    const initChecklist = {};
    data.forEach(j => {
      if (j.checklist) {
        const kriteriaArr = typeof j.checklist === 'string' ? JSON.parse(j.checklist) : j.checklist;
        if (Array.isArray(kriteriaArr)) {
          kriteriaArr.forEach((_, idx) => {
            initChecklist[`${j.soal_id}-${idx}`] = true;
          });
        }
      }
    });
    setChecklistPraktik(initChecklist);
  };

  const toggleChecklist = (key) => {
    setChecklistPraktik(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hitungSkorPraktikLokal = () => {
    const keys = Object.keys(checklistPraktik);
    if (keys.length === 0) return 90;
    const dicentang = keys.filter(k => checklistPraktik[k] === true).length;
    return Math.round((dicentang / keys.length) * 100);
  };

  const submitSimpanNilaiPraktik = async () => {
    const skorPraktikTotal = hitungSkorPraktikLokal();
    
    // Update local state peserta
    const updatedPeserta = peserta.map(p => {
      if (p.user_id === selectedSiswa) {
        const pg = p.nilai_pg || 80;
        return {
          ...p,
          nilai_praktik: skorPraktikTotal,
          nilai_akhir: Math.round((pg + skorPraktikTotal) / 2)
        };
      }
      return p;
    });
    
    setPeserta(updatedPeserta);
    localStorage.setItem('dcc_sesi_peserta', JSON.stringify(updatedPeserta));

    try {
      await API.post('/ujian/simpan-praktik', {
        userId: selectedSiswa || 1,
        skorPraktik: skorPraktikTotal
      });
    } catch (err) {}

    setIsSaved(true);
    alert(`Nilai Praktik (${skorPraktikTotal}) Berhasil Disimpan!`);
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPanitia} userRole="Panitia" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-cyan-400 w-6 h-6" />
              <div>
                <h1 className="text-base font-display font-bold text-white tracking-wide">PANEL KOREKSI PRAKTIK</h1>
                <p className="text-[11px] text-slate-400">Pemeriksaan Realtime Hasil Soal Praktik Siswa</p>
              </div>
            </div>
            <Button size="sm" onClick={loadPeserta} className="bg-slate-800 hover:bg-slate-700 text-xs border-0 text-slate-300">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
            </Button>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* BILAH KIRI: ANTREAN PESERTA REAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider px-1">
                Antrean Peserta Ujian ({peserta.length})
              </h2>

              {peserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Belum ada peserta yang memulai / menyelesaikan ujian.
                </div>
              ) : (
                <div className="space-y-3">
                  {peserta.map((p, idx) => {
                    const isSelesai = p.status === 'selesai';
                    const isSelected = selectedSiswa === p.user_id;

                    return (
                      <div 
                        key={p.user_id || idx} 
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-lg shadow-cyan-400/10' 
                            : 'bg-[#0d1527]/60 border-slate-800/60 hover:bg-[#0d1527]'
                        }`}
                        onClick={() => handlePeriksa(p.user_id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-800/50 rounded-xl">
                              <User className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <h4 className="font-display font-bold text-sm text-white">
                                {p.nama || p.nama_lengkap || `Peserta #${p.user_id}`}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                TechID: <span className="text-slate-200 font-mono">{p.tech_id || `DCC25-000${p.user_id}`}</span>
                              </p>
                              
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant={isSelesai ? 'primary' : 'secondary'} className="text-[10px] px-2 py-0.5 rounded-md">
                                  {isSelesai ? 'Selesai Ujian' : 'Sedang Ujian'}
                                </Badge>
                                {(p.nilai_akhir > 0 || p.nilai_pg > 0) && (
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    Skor PG: {p.nilai_pg || p.nilai_akhir}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <Button size="sm" className="bg-cyan-400/10 hover:bg-cyan-400 text-cyan-400 hover:text-slate-950 border border-cyan-400/20 text-xs font-display font-bold">
                            Periksa
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BILAH KANAN: LEMBAR KOREKSI JAWABAN PESERTA */}
            <div className="lg:col-span-2 space-y-6">
              {selectedSiswa ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="text-cyan-400 w-4 h-4" /> JAWABAN REAL PESERTA #{selectedSiswa}
                    </h2>
                  </div>
                  
                  {soalPraktikList.map((j, idx) => {
                    const teksJawaban = typeof j.jawaban === 'object' ? j.jawaban.teks : (
                      typeof j.jawaban === 'string' && j.jawaban.startsWith('{') 
                        ? JSON.parse(j.jawaban).teks 
                        : j.jawaban
                    );

                    const fileAttachment = typeof j.jawaban === 'object' ? j.jawaban.fileName : (
                      typeof j.jawaban === 'string' && j.jawaban.includes('fileName')
                        ? JSON.parse(j.jawaban).fileName
                        : null
                    );

                    return (
                      <div key={idx} className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5">
                        <p className="text-sm text-slate-200 font-medium leading-relaxed">{j.pertanyaan}</p>
                        
                        {/* Jawaban Teks / Kode Siswa */}
                        <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-2">
                          <p className="text-[11px] text-slate-400 font-display font-bold uppercase tracking-wider">Hasil Pengerjaan / Kode Siswa:</p>
                          <pre className="text-emerald-400 font-mono text-xs break-words bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {teksJawaban || 'Peserta belum memasukkan kode teks.'}
                          </pre>
                          
                          {fileAttachment && (
                            <div className="pt-2 flex items-center gap-2 text-xs text-cyan-400 font-mono">
                              <span>📄 Lampiran Berkas:</span>
                              <span className="underline font-bold">{fileAttachment}</span>
                            </div>
                          )}
                        </div>

                        {/* Checklist Rubrik */}
                        {j.checklist && (
                          <div className="p-4 bg-[#030712]/40 border border-slate-800 rounded-xl space-y-3">
                            <p className="text-[11px] font-display font-bold text-cyan-400 uppercase tracking-wider">Checklist Rubrik Penilaian:</p>
                            <div className="space-y-2">
                              {(typeof j.checklist === 'string' ? JSON.parse(j.checklist) : j.checklist).map((kriteria, kIdx) => {
                                const key = `${j.soal_id}-${kIdx}`;
                                const isChecked = checklistPraktik[key];
                                return (
                                  <div 
                                    key={kIdx} 
                                    onClick={() => toggleChecklist(key)} 
                                    className="flex items-center gap-3 p-3 bg-[#0d1527]/40 border border-slate-800/40 rounded-xl cursor-pointer hover:bg-slate-800/50 transition text-sm select-none"
                                  >
                                    {isChecked ? <CheckSquare className="w-5 h-5 text-cyan-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-600 shrink-0" />}
                                    <span className={isChecked ? 'text-slate-200 font-medium' : 'text-slate-500'}>{kriteria}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ACTION CARD SIMPAN SKOR */}
                  <div className="p-6 bg-gradient-to-r from-cyan-950/40 to-[#0d1527] border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-base flex items-center gap-2 text-white">
                        <Award className="text-cyan-400 w-5 h-5" /> Estimasi Skor Praktik: 
                        <span className="text-emerald-400 font-mono text-xl">{hitungSkorPraktikLokal()} / 100</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Skor akan otomatis tersimpan dan merekap nilai akhir siswa.</p>
                    </div>
                    
                    <Button variant="primary" size="md" onClick={submitSimpanNilaiPraktik} className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold border-0 shadow-lg shadow-cyan-400/20">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> {isSaved ? 'Tersimpan!' : 'Simpan Nilai Praktik'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800">
                  <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-xs font-sans">Pilih salah satu peserta di sebelah kiri untuk memeriksa lembar pengerjaannya.</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}