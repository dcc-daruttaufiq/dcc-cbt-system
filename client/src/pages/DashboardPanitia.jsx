import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import { 
  CheckSquare, 
  Square, 
  Award, 
  ClipboardList, 
  User, 
  FileCode, 
  CheckCircle2, 
  RefreshCw, 
  FileText,
  FileSpreadsheet
} from 'lucide-react';

export default function DashboardPanitia() {
  const [peserta, setPeserta] = useState([]);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [soalPraktikList, setSoalPraktikList] = useState([]);
  const [checklistPraktik, setChecklistPraktik] = useState({});
  const [isSaved, setIsSaved] = useState(false);

  // Filter Status (6 Tab Utama Murni Teks)
  const [filterPeserta, setFilterPeserta] = useState('perlu_dikoreksi');
  const [filterTipeJawaban, setFilterTipeJawaban] = useState('praktik');

  const pesertaFileInputRef = useRef(null);

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
      console.warn("Membaca sesi lokal peserta...");
    }

    if (listReal.length === 0) {
      const localSesi = localStorage.getItem('dcc_sesi_peserta');
      if (localSesi) {
        try {
          listReal = JSON.parse(localSesi);
        } catch (e) {
          listReal = [];
        }
      }
    }

    const currentActiveUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isExamFinished = localStorage.getItem('isExamFinished') === 'true';

    const updatedWithRealStatus = listReal.map(p => {
      if (currentActiveUser && (p.tech_id === currentActiveUser.tech_id || String(p.user_id) === String(currentActiveUser.user_id))) {
        return {
          ...p,
          status: isExamFinished ? 'selesai' : 'berjalan'
        };
      }
      return p;
    });

    setPeserta(updatedWithRealStatus);
  };

  useEffect(() => {
    loadPeserta();
    const interval = setInterval(() => {
      loadPeserta();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // HANDLER IMPOR PESERTA EXCEL / CSV DENGAN MAPPING 5 KATEGORI RESMI
  const handleImportPesertaExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const importedPesertaArr = [];

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('techid'))) {
          return;
        }

        const cols = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        
        if (cols.length >= 2) {
          const nama = cols[0] || `Peserta #${index + 1}`;
          const techId = cols[1] || `DCC25-${String(index + 1).padStart(3, '0')}`;
          
          // SMART MAPPER 5 KATEGORI RESMI PER SEMESTER
          const rawMataUjian = (cols[2] || '').toLowerCase();
          let finalKat = 'word';

          if (rawMataUjian.includes('excel')) finalKat = 'excel';
          else if (rawMataUjian.includes('power') || rawMataUjian.includes('ppt')) finalKat = 'powerpoint';
          else if (rawMataUjian.includes('word') || rawMataUjian.includes('doc')) finalKat = 'word';
          else if (rawMataUjian.includes('desain') || rawMataUjian.includes('canva')) finalKat = 'desain';
          else if (rawMataUjian.includes('pemrograman') || rawMataUjian.includes('coding') || rawMataUjian.includes('web')) finalKat = 'pemrograman';

          importedPesertaArr.push({
            user_id: Date.now() + index,
            nama: nama,
            nama_lengkap: nama,
            tech_id: techId,
            kategori: finalKat,
            status: 'belum_mulai',
            status_koreksi: 'belum_dikoreksi',
            nilai_pg: 0,
            nilai_praktik: 0,
            nilai_akhir: 0
          });
        }
      });

      if (importedPesertaArr.length > 0) {
        setPeserta(importedPesertaArr);
        localStorage.setItem('dcc_sesi_peserta', JSON.stringify(importedPesertaArr));
        alert(`Berhasil mengimpor ${importedPesertaArr.length} peserta! Status awal semua peserta: Belum Ujian.`);
      } else {
        alert('File tidak sesuai format! Pastikan Kolom A: Nama Lengkap, Kolom B: TechID, Kolom C: Mata Ujian.');
      }
    };

    reader.readAsText(file);
  };

  const handlePeriksa = async (userId) => {
    setSelectedSiswa(userId);
    setIsSaved(false);

    let detailJawaban = [];
    try {
      const res = await API.get(`/ujian/peserta/${userId}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        detailJawaban = res.data;
      }
    } catch (err) {}

    const targetUser = peserta.find(p => p.user_id === userId);
    const userTechId = targetUser?.tech_id;

    const savedJawabanStr = localStorage.getItem(`jawabanLocal_${userId}`) || 
                            localStorage.getItem(`jawabanLocal_${userTechId}`) || 
                            localStorage.getItem('jawabanLocal');
                            
    const questionsArr = JSON.parse(localStorage.getItem('activeExamQuestions') || localStorage.getItem('dcc_bank_soal') || '[]');

    if (savedJawabanStr) {
      try {
        const parsedJwb = JSON.parse(savedJawabanStr);
        detailJawaban = Object.keys(parsedJwb).map(soalId => {
          const matchedSoal = questionsArr.find(s => String(s.id) === String(soalId)) || {};
          return {
            soal_id: soalId,
            tipe: matchedSoal.tipe || (typeof parsedJwb[soalId] === 'object' ? 'praktik' : 'pg'),
            pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${soalId}`,
            jawaban: parsedJwb[soalId],
            checklist: matchedSoal.checklist || ['Hasil pengerjaan sesuai instruksi', 'Kerapihan & struktur berkas valid']
          };
        });
      } catch (e) {
        detailJawaban = [];
      }
    }

    setSoalPraktikList(detailJawaban);
    initChecklistData(detailJawaban);
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
    
    const updatedPeserta = peserta.map(p => {
      if (p.user_id === selectedSiswa) {
        const pg = p.nilai_pg || 0;
        return {
          ...p,
          nilai_praktik: skorPraktikTotal,
          nilai_akhir: Math.round((pg + skorPraktikTotal) / 2),
          status_koreksi: 'dikoreksi'
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
    alert(`Nilai Praktik (${skorPraktikTotal}) Berhasil Disimpan! Status siswa kini Selesai Dikoreksi.`);
  };

  // LOGIKA 6 FILTER STATUS REALTIME
  const filteredPeserta = peserta.filter(p => {
    const statusP = p.status || 'belum_mulai';
    const isDikoreksi = p.status_koreksi === 'dikoreksi';

    if (filterPeserta === 'belum_mulai') return statusP === 'belum_mulai';
    if (filterPeserta === 'berjalan') return statusP === 'berjalan';
    if (filterPeserta === 'perlu_dikoreksi') return statusP === 'selesai' && !isDikoreksi;
    if (filterPeserta === 'selesai_dikoreksi') return statusP === 'selesai' && isDikoreksi;
    if (filterPeserta === 'selesai_ujian') return statusP === 'selesai';
    return true; // semua
  });

  const filteredJawabanList = soalPraktikList.filter(j => {
    if (filterTipeJawaban === 'praktik') return j.tipe === 'praktik' || typeof j.jawaban === 'object';
    if (filterTipeJawaban === 'pg') return j.tipe === 'pg' && typeof j.jawaban !== 'object';
    return true;
  });

  const getBadgeStatus = (p) => {
    if (p.status === 'selesai' && p.status_koreksi === 'dikoreksi') {
      return { text: 'Selesai Dikoreksi', variant: 'success' };
    }
    if (p.status === 'selesai') {
      return { text: 'Perlu Dikoreksi', variant: 'warning' };
    }
    if (p.status === 'berjalan') {
      return { text: 'Sedang Ujian', variant: 'primary' };
    }
    return { text: 'Belum Ujian', variant: 'secondary' };
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
                <h1 className="text-base font-display font-bold text-white tracking-wide">PANEL KOREKSI UJIAN & PRAKTIK</h1>
                <p className="text-xs text-slate-400">Pemeriksaan Realtime Hasil Pengerjaan Siswa</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={pesertaFileInputRef} 
                onChange={handleImportPesertaExcelCSV} 
                accept=".csv,.xlsx" 
                className="hidden" 
              />
              
              <Button 
                onClick={() => pesertaFileInputRef.current.click()} 
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0 shadow-lg shadow-emerald-500/20"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Peserta Excel / CSV
              </Button>

              <Button size="sm" onClick={loadPeserta} className="bg-slate-800 hover:bg-slate-700 text-xs border-0 text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* BILAH KIRI: ANTREAN PESERTA DENGAN 6 TAB FILTER STATUS (TANPA IKON) */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2 px-1">
                <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                  Daftar Peserta Terdaftar ({filteredPeserta.length})
                </h2>

                {/* 6 TAB FILTER MURNI TEKS */}
                <div className="grid grid-cols-2 gap-1.5 bg-[#0d1527] p-2 rounded-xl border border-slate-800 text-xs font-display font-bold">
                  <button
                    onClick={() => setFilterPeserta('semua')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'semua' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({peserta.length})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('belum_mulai')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'belum_mulai' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Belum Ujian
                  </button>

                  <button
                    onClick={() => setFilterPeserta('berjalan')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'berjalan' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sedang Ujian
                  </button>

                  <button
                    onClick={() => setFilterPeserta('perlu_dikoreksi')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'perlu_dikoreksi' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Perlu Dikoreksi
                  </button>

                  <button
                    onClick={() => setFilterPeserta('selesai_dikoreksi')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'selesai_dikoreksi' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Selesai Dikoreksi
                  </button>

                  <button
                    onClick={() => setFilterPeserta('selesai_ujian')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'selesai_ujian' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Selesai Ujian
                  </button>
                </div>
              </div>

              {filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <p className="font-semibold text-slate-400">Tidak ada peserta pada status ini.</p>
                  <p className="text-[11px] text-slate-500">Pilih tab filter lain di atas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPeserta.map((p, idx) => {
                    const statusInfo = getBadgeStatus(p);
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
                              <p className="text-xs text-slate-400 mt-0.5">
                                TechID: <span className="text-slate-200 font-mono">{p.tech_id || `DCC25-000${p.user_id}`}</span>
                              </p>
                              
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant={statusInfo.variant} className="text-[10px] px-2 py-0.5 rounded-md">
                                  {statusInfo.text}
                                </Badge>
                                {p.status === 'selesai' && (
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    PG: {p.nilai_pg || 0}
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

            {/* BILAH KANAN: LEMBAR KOREKSI JAWABAN REAL PESERTA */}
            <div className="lg:col-span-2 space-y-6">
              {selectedSiswa ? (
                <div className="space-y-6">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-800/60 pb-3">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="text-cyan-400 w-4 h-4" /> LEMBAR JAWABAN PESERTA #{selectedSiswa}
                    </h2>

                    <div className="flex gap-1.5 bg-[#0d1527] p-1.5 rounded-xl border border-slate-800 text-xs font-display font-bold">
                      <button
                        onClick={() => setFilterTipeJawaban('praktik')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all ${
                          filterTipeJawaban === 'praktik' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Hanya Praktik
                      </button>
                      <button
                        onClick={() => setFilterTipeJawaban('semua')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all ${
                          filterTipeJawaban === 'semua' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Semua Soal
                      </button>
                      <button
                        onClick={() => setFilterTipeJawaban('pg')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all ${
                          filterTipeJawaban === 'pg' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Hanya PG
                      </button>
                    </div>
                  </div>

                  {filteredJawabanList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Peserta belum mengirimkan jawaban untuk kategori ini.
                    </div>
                  ) : (
                    filteredJawabanList.map((j, idx) => {
                      const isPraktikObj = typeof j.jawaban === 'object' && j.jawaban !== null;
                      const isPGString = typeof j.jawaban === 'string';

                      const teksJawaban = isPraktikObj ? j.jawaban.teks : (
                        isPGString && j.jawaban.startsWith('{') 
                          ? JSON.parse(j.jawaban).teks 
                          : j.jawaban
                      );

                      const fileAttachment = isPraktikObj ? j.jawaban.fileName : (
                        isPGString && j.jawaban.includes('fileName')
                          ? JSON.parse(j.jawaban).fileName
                          : null
                      );

                      return (
                        <div key={idx} className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-cyan-400/10 text-cyan-400 text-[10px] uppercase font-bold">
                              SOAL #{idx + 1} ({j.tipe === 'pg' ? 'PILIHAN GANDA' : 'PRAKTIK'})
                            </Badge>
                          </div>

                          <p className="text-sm text-slate-200 font-medium leading-relaxed">{j.pertanyaan}</p>
                          
                          <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-2">
                            <p className="text-xs text-slate-400 font-display font-bold uppercase tracking-wider">Hasil Jawaban Peserta:</p>
                            
                            <div className="text-emerald-400 font-mono text-xs break-words bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {teksJawaban || (isPGString ? `Opsi Terpilih: ${j.jawaban}` : 'Peserta tidak mengisikan teks.')}
                            </div>
                            
                            {fileAttachment && (
                              <div className="pt-2 flex items-center gap-2 text-xs text-cyan-400 font-mono bg-cyan-400/10 p-2.5 rounded-lg border border-cyan-400/20">
                                <FileText className="w-4 h-4 shrink-0" />
                                <span>Berkas Lampiran Praktik:</span>
                                <strong className="underline">{fileAttachment}</strong>
                              </div>
                            )}
                          </div>

                          {j.checklist && (
                            <div className="p-4 bg-[#030712]/40 border border-slate-800 rounded-xl space-y-3">
                              <p className="text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">Checklist Rubrik Penilaian:</p>
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
                    })
                  )}

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
                  <p className="text-xs font-sans">Pilih peserta di sebelah kiri untuk memeriksa lembar pengerjaannya.</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}