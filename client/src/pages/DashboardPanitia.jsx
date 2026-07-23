import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { normalizeKategori } from '../utils/examCategories';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import { 
  CheckSquare, Square, Award, ClipboardList, User, FileCode, 
  CheckCircle2, RefreshCw, FileText, FileSpreadsheet, Trash2, Trash
} from 'lucide-react';

export default function DashboardPanitia() {
  const [peserta, setPeserta] = useState([]);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [soalPraktikList, setSoalPraktikList] = useState([]);
  const [checklistPraktik, setChecklistPraktik] = useState({});
  const [isSaved, setIsSaved] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [filterPeserta, setFilterPeserta] = useState('semua');
  const [filterTipeJawaban, setFilterTipeJawaban] = useState('praktik');

  const pesertaFileInputRef = useRef(null);

  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  const loadPeserta = async () => {
    try {
      const { data, error } = await supabase
        .from('peserta')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        setPeserta(data);
      }
    } catch (e) {
      console.error("Gagal mengambil peserta dari Supabase:", e);
    }
  };

  useEffect(() => {
    loadPeserta();
    const interval = setInterval(loadPeserta, 4000);
    return () => clearInterval(interval);
  }, []);

  // HANDLER IMPOR PESERTA EXCEL DIRECT SUPABASE (ANTI DUPLIKAT TECHID)
  const handleImportPesertaExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      const importedPesertaArr = [];
      let invalidKategoriCount = 0;

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('techid'))) return;

        let delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
        const regex = new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`);
        const cols = line.split(regex).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 2) {
          const nama = cols[0];
          const techId = cols[1];
          const finalKat = normalizeKategori(cols[2]);

          if (!finalKat) {
            invalidKategoriCount++;
            return;
          }

          if (nama && techId && !nama.toLowerCase().includes('nama lengkap')) {
            importedPesertaArr.push({
              nama,
              tech_id: techId,
              kategori: finalKat,
              status: 'belum_mulai',
              status_koreksi: 'belum_dikoreksi',
              nilai_pg: 0,
              nilai_praktik: 0,
              nilai_akhir: 0
            });
          }
        }
      });

      if (importedPesertaArr.length > 0) {
        const { error } = await supabase.from('peserta').upsert(importedPesertaArr, { onConflict: 'tech_id' });
        if (!error) {
          let msg = `Berhasil mengunggah ${importedPesertaArr.length} peserta ke Supabase Cloud!`;
          if (invalidKategoriCount > 0) msg += ` (${invalidKategoriCount} baris dilewati karena kategori tidak cocok).`;
          alert(msg);
          loadPeserta();
        } else {
          alert('Gagal mengunggah peserta: ' + error.message);
        }
      } else {
        alert('File Excel tidak valid atau Mata Ujian tidak cocok!');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteSingle = async (id, nama) => {
    if (confirm(`Apakah Anda yakin ingin menghapus peserta "${nama}" dari Supabase Cloud?`)) {
      await supabase.from('peserta').delete().eq('id', id);
      if (selectedSiswa === id) setSelectedSiswa(null);
      loadPeserta();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert("Pilih minimal satu peserta!");
    if (confirm(`Hapus ${selectedIds.length} peserta terpilih dari Supabase Cloud?`)) {
      await supabase.from('peserta').delete().in('id', selectedIds);
      setSelectedIds([]);
      setSelectedSiswa(null);
      loadPeserta();
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA PESERTA di Supabase Cloud?")) {
      await supabase.from('peserta').delete().neq('id', 0);
      setPeserta([]);
      setSelectedSiswa(null);
      setSelectedIds([]);
    }
  };

  const toggleSelectPeserta = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPeserta.length) setSelectedIds([]);
    else setSelectedIds(filteredPeserta.map(p => p.id));
  };

  const handlePeriksa = async (id) => {
    setSelectedSiswa(id);
    setIsSaved(false);

    const targetUser = peserta.find(p => p.id === id);
    if (!targetUser) return;

    // AMBIL JAWABAN PESERTA DARI SUPABASE CLOUD
    const { data: jawabanData } = await supabase
      .from('jawaban_peserta')
      .select('*, bank_soal(*)')
      .eq('tech_id', targetUser.tech_id);

    if (jawabanData) {
      const formattedJawaban = jawabanData.map(j => ({
        soal_id: j.soal_id,
        tipe: j.bank_soal?.tipe || 'pg',
        pertanyaan: j.bank_soal?.pertanyaan || 'Butir Soal Ujian',
        jawaban: j.jawaban,
        checklist: j.bank_soal?.checklist || ['Kerapihan & struktur berkas valid']
      }));
      setSoalPraktikList(formattedJawaban);
      initChecklistData(formattedJawaban);
    } else {
      setSoalPraktikList([]);
    }
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
    const targetUser = peserta.find(p => p.id === selectedSiswa);

    if (!targetUser) return;

    const pg = targetUser.nilai_pg || 0;
    const nilaiAkhirCalculated = Math.round((pg + skorPraktikTotal) / 2);

    await supabase
      .from('peserta')
      .update({
        nilai_praktik: skorPraktikTotal,
        nilai_akhir: nilaiAkhirCalculated,
        status_koreksi: 'dikoreksi'
      })
      .eq('id', selectedSiswa);

    setIsSaved(true);
    alert(`Nilai Praktik (${skorPraktikTotal}) Berhasil Disimpan ke Supabase Cloud!`);
    loadPeserta();
  };

  const filteredPeserta = peserta.filter(p => {
    const statusP = p.status || 'belum_mulai';
    const isDikoreksi = p.status_koreksi === 'dikoreksi';

    if (filterPeserta === 'belum_mulai') return statusP === 'belum_mulai';
    if (filterPeserta === 'berjalan') return statusP === 'berjalan';
    if (filterPeserta === 'perlu_dikoreksi') return statusP === 'selesai' && !isDikoreksi;
    if (filterPeserta === 'selesai_dikoreksi') return statusP === 'selesai' && isDikoreksi;
    if (filterPeserta === 'selesai_ujian') return statusP === 'selesai';
    return true;
  });

  const filteredJawabanList = soalPraktikList.filter(j => {
    if (filterTipeJawaban === 'praktik') return j.tipe === 'praktik' || typeof j.jawaban === 'object';
    if (filterTipeJawaban === 'pg') return j.tipe === 'pg' && typeof j.jawaban !== 'object';
    return true;
  });

  const getBadgeStatus = (p) => {
    if (p.status === 'selesai' && p.status_koreksi === 'dikoreksi') return { text: 'Selesai Dikoreksi', variant: 'success' };
    if (p.status === 'selesai') return { text: 'Perlu Dikoreksi', variant: 'warning' };
    if (p.status === 'berjalan') return { text: 'Sedang Ujian', variant: 'primary' };
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
                <h1 className="text-base font-display font-bold text-white tracking-wide">PANEL KOREKSI UJIAN (SUPABASE LIVE)</h1>
                <p className="text-xs text-slate-400">Pemeriksaan Realtime Peserta Seluruh Indonesia</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="file" ref={pesertaFileInputRef} onChange={handleImportPesertaExcelCSV} accept=".csv,.xlsx" className="hidden" />
              
              <Button onClick={() => pesertaFileInputRef.current.click()} className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0 shadow-lg shadow-emerald-500/20">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Peserta Excel / CSV
              </Button>

              {peserta.length > 0 && (
                <Button onClick={handleDeleteAll} className="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 font-display font-bold border border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset All Data
                </Button>
              )}

              <Button size="sm" onClick={loadPeserta} className="bg-slate-800 hover:bg-slate-700 text-xs border-0 text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-2 px-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Peserta ({filteredPeserta.length})
                  </h2>

                  {filteredPeserta.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button onClick={toggleSelectAll} className="text-[11px] text-cyan-400 hover:underline font-mono">
                        {selectedIds.length === filteredPeserta.length ? 'Batal Pilih' : 'Pilih Semua'}
                      </button>

                      {selectedIds.length > 0 && (
                        <button onClick={handleDeleteSelected} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                          <Trash className="w-3 h-3" /> Hapus ({selectedIds.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-[#0d1527] p-2 rounded-xl border border-slate-800 text-xs font-display font-bold">
                  {['semua', 'belum_mulai', 'berjalan', 'perlu_dikoreksi', 'selesai_dikoreksi', 'selesai_ujian'].map((flt) => (
                    <button
                      key={flt}
                      onClick={() => setFilterPeserta(flt)}
                      className={`py-2 px-2.5 rounded-lg transition-all capitalize ${
                        filterPeserta === flt ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {flt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Tidak ada peserta pada status ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPeserta.map((p, idx) => {
                    const statusInfo = getBadgeStatus(p);
                    const isSelected = selectedSiswa === p.id;
                    const isChecked = selectedIds.includes(p.id);

                    return (
                      <div 
                        key={p.id || idx} 
                        className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-cyan-500/10 border-cyan-400 shadow-lg' : 'bg-[#0d1527]/60 border-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSelectPeserta(p.id)} className="w-4 h-4 accent-cyan-400 cursor-pointer shrink-0" />
                          <div className="p-2.5 bg-slate-800/50 rounded-xl shrink-0 cursor-pointer" onClick={() => handlePeriksa(p.id)}>
                            <User className="w-5 h-5 text-cyan-400" />
                          </div>

                          <div className="space-y-0.5 flex-1 min-w-0 cursor-pointer" onClick={() => handlePeriksa(p.id)}>
                            <h4 className="font-display font-bold text-sm text-white truncate">{p.nama}</h4>
                            <p className="text-xs text-slate-400 truncate">TechID: <span className="text-slate-200 font-mono">{p.tech_id}</span> • <span className="uppercase text-[10px] text-cyan-400 font-bold">{p.kategori}</span></p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Badge variant={statusInfo.variant} className="text-[10px] px-2 py-0.5 rounded-md">{statusInfo.text}</Badge>
                              {p.status === 'selesai' && <span className="text-xs font-mono font-bold text-emerald-400">PG: {p.nilai_pg || 0}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" onClick={() => handlePeriksa(p.id)} className="bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-xs font-bold">Periksa</Button>
                          <button onClick={() => handleDeleteSingle(p.id, p.nama)} className="p-2 rounded-xl text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedSiswa ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-800/60 pb-3">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="text-cyan-400 w-4 h-4" /> LEMBAR JAWABAN PESERTA #{selectedSiswa}
                    </h2>
                  </div>

                  {filteredJawabanList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Peserta belum mengirimkan jawaban di Supabase Cloud.
                    </div>
                  ) : (
                    filteredJawabanList.map((j, idx) => (
                      <div key={idx} className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5">
                        <Badge className="bg-cyan-400/10 text-cyan-400 text-[10px] uppercase font-bold">SOAL #{idx + 1} ({j.tipe.toUpperCase()})</Badge>
                        <p className="text-sm text-slate-200 font-medium">{j.pertanyaan}</p>
                        
                        <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-2">
                          <p className="text-xs text-slate-400 font-bold uppercase">Jawaban Peserta:</p>
                          <div className="text-emerald-400 font-mono text-xs bg-black/40 p-3 rounded-lg whitespace-pre-wrap">
                            {typeof j.jawaban === 'object' ? j.jawaban.teks : j.jawaban}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="p-6 bg-gradient-to-r from-cyan-950/40 to-[#0d1527] border border-cyan-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                        <Award className="text-cyan-400 w-5 h-5" /> Estimasi Skor Praktik: <span className="text-emerald-400 font-mono text-xl">{hitungSkorPraktikLokal()} / 100</span>
                      </h3>
                    </div>
                    
                    <Button variant="primary" size="md" onClick={submitSimpanNilaiPraktik} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold border-0">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> {isSaved ? 'Tersimpan!' : 'Simpan Nilai'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800">
                  <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-xs font-sans">Pilih peserta di sebelah kiri untuk memeriksa jawaban.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}