import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase, TABLES } from '../utils/supabaseClient';
import { KATEGORI_RESMI, getLabelKategori, normalizeKategori } from '../utils/examCategories';
import { STORAGE_KEYS } from '../utils/storageKeys';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { 
  Plus, Trash2, Trash, Edit3, Save, X, Database, Layers, 
  Download, Upload, FileSpreadsheet, WifiOff, CheckCircle2 
} from 'lucide-react';

export default function BankSoal() {
  useDocumentTitle('Manajemen Bank Soal - DCC CBT');

  const [listSoal, setDataSoal] = useState([]);
  const [filterKategori, setFilterKategori] = useState('semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Pilihan Checkbox (Bulk Delete)
  const [selectedIds, setSelectedIds] = useState([]);

  // Form States
  const [kategori, setKategori] = useState('word');
  const [tipe, setTipe] = useState('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [opsi, setOpsi] = useState({ A: '', B: '', C: '', D: '' });
  const [jawabanBenar, setJawabanBenar] = useState('A');
  const [checklist, setChecklist] = useState([]);
  const [inputChecklist, setInputChecklist] = useState('');

  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  const fetchSoal = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.BANK_SOAL)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      setDataSoal(rows);
      setIsOffline(false);
      localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify(rows));
    } catch (err) {
      console.warn('Gagal terhubung ke Supabase Cloud, menampilkan cache lokal terakhir.', err);
      setIsOffline(true);
      const savedLocal = localStorage.getItem(STORAGE_KEYS.BANK_SOAL);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          setDataSoal(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setDataSoal([]);
        }
      } else {
        setDataSoal([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSoal();
  }, []);

  const handleAddChecklist = (e) => {
    e.preventDefault();
    if (inputChecklist.trim()) {
      setChecklist([...checklist, inputChecklist.trim()]);
      setInputChecklist('');
    }
  };

  const handleRemoveChecklist = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setKategori('word');
    setTipe('pg');
    setPertanyaan('');
    setOpsi({ A: '', B: '', C: '', D: '' });
    setJawabanBenar('A');
    setChecklist([]);
    setIsModalOpen(true);
  };

  const openEditModal = (soal) => {
    setEditingId(soal.id);
    setKategori(soal.kategori || 'word');
    setTipe(soal.tipe);
    setPertanyaan(soal.pertanyaan);
    if (soal.tipe === 'pg') {
      setOpsi({
        A: soal.opsi?.[0]?.replace(/^A\.\s*/, '') || '',
        B: soal.opsi?.[1]?.replace(/^B\.\s*/, '') || '',
        C: soal.opsi?.[2]?.replace(/^C\.\s*/, '') || '',
        D: soal.opsi?.[3]?.replace(/^D\.\s*/, '') || ''
      });
      setJawabanBenar(soal.jawaban_benar || soal.jawabanBenar || 'A');
    } else {
      setChecklist(soal.checklist || []);
    }
    setIsModalOpen(true);
  };

  // FITUR 1: HAPUS SATU SOAL
  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;

    try {
      const { error } = await supabase.from(TABLES.BANK_SOAL).delete().eq('id', id);
      if (error) throw error;

      const updated = listSoal.filter((item) => item.id !== id);
      setDataSoal(updated);
      setSelectedIds(prev => prev.filter(sId => sId !== id));
      localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify(updated));
    } catch (err) {
      console.error('Gagal menghapus soal di Supabase Cloud:', err);
      alert('Gagal menghapus soal di Supabase Cloud.');
    }
  };

  // FITUR 2: HAPUS BEBERAPA SOAL TERPILIH (BULK DELETE)
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert('Pilih minimal satu soal yang ingin dihapus!');
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} soal terpilih?`)) return;

    try {
      const { error } = await supabase.from(TABLES.BANK_SOAL).delete().in('id', selectedIds);
      if (error) throw error;

      const updated = listSoal.filter((item) => !selectedIds.includes(item.id));
      setDataSoal(updated);
      setSelectedIds([]);
      localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify(updated));
      alert(`Berhasil menghapus ${selectedIds.length} soal terpilih!`);
    } catch (err) {
      console.error('Gagal menghapus soal terpilih:', err);
      alert('Gagal menghapus soal terpilih dari Supabase Cloud.');
    }
  };

  // FITUR 3: HAPUS SEMUA SOAL (RESET ALL)
  const handleDeleteAll = async () => {
    if (!confirm('PERINGATAN: Anda akan MENGHAPUS SELURUH BANK SOAL!')) return;
    if (!confirm(`Konfirmasi terakhir: ${listSoal.length} butir soal akan dihapus PERMANEN. Yakin lanjut?`)) return;

    try {
      const idsToDelete = listSoal.map(s => s.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        const { error } = await supabase.from(TABLES.BANK_SOAL).delete().in('id', idsToDelete);
        if (error) throw error;
      }

      setDataSoal([]);
      setSelectedIds([]);
      localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify([]));
      alert('Seluruh bank soal berhasil dikosongkan!');
    } catch (err) {
      console.error('Gagal mereset bank soal:', err);
      alert('Gagal mereset seluruh bank soal.');
    }
  };

  // TOGGLE CHECKBOX SOAL INDIVIDUAL
  const toggleSelectSoal = (soalId) => {
    setSelectedIds(prev =>
      prev.includes(soalId) ? prev.filter(id => id !== soalId) : [...prev, soalId]
    );
  };

  // TOGGLE CHECKBOX PILIH SEMUA
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSoalList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSoalList.map(s => s.id));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pertanyaan.trim()) return alert('Teks pertanyaan wajib diisi!');
    setIsSubmitting(true);

    const formatOpsi = tipe === 'pg' ? [`A. ${opsi.A}`, `B. ${opsi.B}`, `C. ${opsi.C}`, `D. ${opsi.D}`] : [];

    const payload = {
      kategori,
      tipe,
      pertanyaan,
      opsi: tipe === 'pg' ? formatOpsi : [],
      jawaban_benar: tipe === 'pg' ? jawabanBenar : null,
      checklist: tipe === 'praktik' ? checklist : [],
    };

    try {
      if (editingId) {
        const { error } = await supabase.from(TABLES.BANK_SOAL).update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.BANK_SOAL).insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchSoal();
    } catch (err) {
      console.error('Gagal menyimpan soal ke Supabase Cloud:', err);
      alert('Gagal menyimpan soal ke Supabase Cloud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      const importedSoalArr = [];
      let skippedKategoriTidakDikenal = 0;

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('kategori') || line.toLowerCase().includes('pertanyaan'))) {
          return;
        }

        let delimiter = ',';
        if (line.includes(';')) delimiter = ';';
        else if (line.includes('\t')) delimiter = '\t';

        const regex = new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`);
        const cols = line.split(regex).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 3) {
          const finalKategori = normalizeKategori(cols[0]);
          if (!finalKategori) {
            skippedKategoriTidakDikenal++;
            return;
          }

          const tpe = (cols[1] || 'pg').toLowerCase();
          const tnya = cols[2];

          if (tnya && !tnya.toLowerCase().includes('pertanyaan')) {
            if (tpe === 'pg') {
              const opsA = cols[3] || '';
              const opsB = cols[4] || '';
              const opsC = cols[5] || '';
              const opsD = cols[6] || '';
              const knci = (cols[7] || 'A').toUpperCase();

              importedSoalArr.push({
                kategori: finalKategori,
                tipe: 'pg',
                pertanyaan: tnya,
                opsi: [`A. ${opsA}`, `B. ${opsB}`, `C. ${opsC}`, `D. ${opsD}`],
                jawaban_benar: knci,
              });
            } else {
              const rubrikRaw = cols[8] || cols[3] || 'Kesesuaian pengerjaan, Kerapihan berkas';
              const rubrikArr = rubrikRaw.split(/[|,]/).map(r => r.trim()).filter(Boolean);

              importedSoalArr.push({
                kategori: finalKategori,
                tipe: 'praktik',
                pertanyaan: tnya,
                checklist: rubrikArr,
              });
            }
          }
        }
      });

      if (importedSoalArr.length === 0) {
        alert('Tidak ada soal valid yang berhasil diimpor!');
        e.target.value = '';
        return;
      }

      try {
        const { error } = await supabase.from(TABLES.BANK_SOAL).insert(importedSoalArr);
        if (error) throw error;

        await fetchSoal();
        alert(`Berhasil mengimpor ${importedSoalArr.length} soal ke Supabase Cloud!`);
      } catch (err) {
        console.error('Gagal mengimpor soal:', err);
        alert('Gagal mengimpor soal ke Supabase Cloud.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleExportBackup = () => {
    if (listSoal.length === 0) return alert('Belum ada soal untuk diekspor!');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(listSoal, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_BankSoal_DCC_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!Array.isArray(parsed)) return alert('Format JSON harus berupa array.');

          const payload = parsed.map((item) => ({
            kategori: normalizeKategori(item.kategori) || item.kategori || 'word',
            tipe: item.tipe || 'pg',
            pertanyaan: item.pertanyaan || '',
            opsi: item.opsi || [],
            jawaban_benar: item.jawaban_benar || item.jawabanBenar || null,
            checklist: item.checklist || [],
          }));

          const { error } = await supabase.from(TABLES.BANK_SOAL).insert(payload);
          if (error) throw error;

          await fetchSoal();
          alert(`Berhasil mengimpor ${payload.length} soal ke Supabase Cloud!`);
        } catch (err) {
          alert('Gagal membaca/mengimpor file JSON!');
        } finally {
          e.target.value = '';
        }
      };
    }
  };

  const filteredSoalList =
    filterKategori === 'semua'
      ? listSoal
      : listSoal.filter((item) => (item.kategori || 'word') === filterKategori);

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPanitia} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        {/* CLEAN NAVBAR TANPA SHADOW GLOWING */}
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <Database className="text-cyan-400 w-5 h-5" />
              <div>
                <h1 className="text-sm font-display font-bold text-white tracking-wide">BANK SOAL (LIVE DB)</h1>
                <p className="text-[11px] text-slate-400">Kelola & Import Bank Soal Spesialisasi</p>
              </div>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-lg">
                  <WifiOff className="w-3 h-3" /> Mode Offline
                </span>
              )}
            </div>

            {/* ACTION BUTTONS (FLAT CLEAN MURNI) */}
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
              <input type="file" ref={excelInputRef} onChange={handleImportExcelCSV} accept=".csv,.xlsx" className="hidden" />

              <Button onClick={() => excelInputRef.current.click()} className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Excel / CSV
              </Button>

              <Button onClick={() => fileInputRef.current.click()} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans border-0">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Import JSON
              </Button>

              <Button onClick={handleExportBackup} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans border-0">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Backup JSON
              </Button>

              {listSoal.length > 0 && (
                <Button onClick={handleDeleteAll} className="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 font-display font-bold border border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset All
                </Button>
              )}

              <Button onClick={openCreateModal} className="text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold border-0">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Manual
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-4">

            {/* CONTROLS BAR: FILTER & BULK DELETE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                  Daftar Soal Tersedia ({filteredSoalList.length})
                </h2>

                {filteredSoalList.length > 0 && (
                  <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                    <button
                      onClick={toggleSelectAll}
                      className="text-[11px] text-cyan-400 hover:underline font-mono"
                    >
                      {selectedIds.length === filteredSoalList.length ? 'Batal Pilih' : 'Pilih Semua'}
                    </button>

                    {selectedIds.length > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-500/40 transition"
                      >
                        <Trash className="w-3 h-3" /> Hapus Terpilih ({selectedIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* FILTER KATEGORI */}
              <div className="flex gap-1 bg-[#0d1527] p-1 rounded-xl border border-slate-800/80 text-[11px] overflow-x-auto">
                {['semua', ...KATEGORI_RESMI].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setFilterKategori(kat)}
                    className={`px-3 py-1 rounded-lg uppercase font-display font-bold transition-all whitespace-nowrap ${
                      filterKategori === kat ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>

            {/* LIST DAFTAR SOAL (FLAT CLEAN TANPA SHADOW) */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Memuat Bank Soal dari Supabase Cloud...
                </div>
              ) : filteredSoalList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Belum ada soal untuk kategori ini.
                </div>
              ) : (
                filteredSoalList.map((row, index) => {
                  const isChecked = selectedIds.includes(row.id);

                  return (
                    <div
                      key={row.id || index}
                      className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isChecked ? 'bg-cyan-950/20 border-cyan-400/80' : 'bg-[#0d1527]/60 border-slate-800/50 hover:bg-[#0d1527]'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Custom Round Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectSoal(row.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isChecked ? 'bg-cyan-400 border-cyan-400' : 'bg-transparent border-slate-700 hover:border-cyan-400/60'
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" strokeWidth={3} />}
                        </button>

                        <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-lg shrink-0 mt-0.5">
                          #{index + 1}
                        </span>

                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-cyan-400/10 text-cyan-400 border-cyan-400/20 text-[10px] uppercase font-display font-bold px-2 py-0.5">
                              {row.kategori || 'KATEGORI TIDAK DIKENALI'}
                            </Badge>

                            <Badge variant={row.tipe === 'pg' ? 'primary' : 'secondary'} className="text-[10px] px-2 py-0.5 rounded-md">
                              {row.tipe === 'pg' ? 'Pilihan Ganda' : 'Praktik'}
                            </Badge>

                            {row.tipe === 'pg' ? (
                              <span className="text-xs text-slate-400">
                                Kunci: <strong className="text-cyan-400 font-mono">{row.jawaban_benar || row.jawabanBenar}</strong>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {row.checklist?.length || 0} Kriteria Rubrik
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap font-sans break-words">
                            {row.pertanyaan}
                          </p>
                        </div>
                      </div>

                      {/* Tombol Aksi Single */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-2 rounded-xl bg-slate-800/60 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition"
                          title="Edit Soal"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                          title="Hapus Soal ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </main>
      </div>

      {/* MODAL INPUT / EDIT SOAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0d1527] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <h3 className="font-display text-base font-bold text-cyan-400 uppercase tracking-wider">{editingId ? 'EDIT SOAL DATABASE' : 'TAMBAH SOAL DATABASE'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 uppercase">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Mata Ujian Spesialisasi
                  </label>
                  <Select value={kategori} onChange={(e) => setKategori(e.target.value)} className="bg-[#030712]/60 border border-slate-800 text-sm rounded-xl">
                    {KATEGORI_RESMI.map((kat) => (
                      <option key={kat} value={kat}>{getLabelKategori(kat)}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Tipe Konten Pertanyaan</label>
                  <Select value={tipe} onChange={(e) => { setTipe(e.target.value); setChecklist([]); }} disabled={!!editingId} className="bg-[#030712]/60 border border-slate-800 text-sm rounded-xl">
                    <option value="pg">Pilihan Ganda (PG)</option>
                    <option value="praktik">Ujian Praktik</option>
                  </Select>
                </div>

                <Textarea label="Butir Soal / Pertanyaan Ujian" placeholder="Tulis pertanyaan lengkap..." value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} required className="bg-[#030712]/60 border border-slate-800 text-sm rounded-xl" />

                {tipe === 'pg' ? (
                  <div className="space-y-3 p-4 bg-[#030712]/40 border border-slate-800 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Opsi A" value={opsi.A} onChange={(e) => setOpsi({ ...opsi, A: e.target.value })} required />
                      <Input label="Opsi B" value={opsi.B} onChange={(e) => setOpsi({ ...opsi, B: e.target.value })} required />
                      <Input label="Opsi C" value={opsi.C} onChange={(e) => setOpsi({ ...opsi, C: e.target.value })} required />
                      <Input label="Opsi D" value={opsi.D} onChange={(e) => setOpsi({ ...opsi, D: e.target.value })} required />
                    </div>
                    <div className="mt-2">
                      <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Kunci Jawaban</label>
                      <Select value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} className="bg-[#030712]/60 border border-slate-800 text-sm rounded-xl">
                        <option value="A">Opsi A</option>
                        <option value="B">Opsi B</option>
                        <option value="C">Opsi C</option>
                        <option value="D">Opsi D</option>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-[#030712]/40 border border-slate-800 rounded-xl">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><Input label="Tambah Kriteria Penilaian" value={inputChecklist} onChange={(e) => setInputChecklist(e.target.value)} /></div>
                      <Button variant="outline" type="button" onClick={handleAddChecklist} className="h-10 mb-0.5 bg-slate-800 text-xs border-0">Tambah</Button>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {checklist.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-[#030712]/60 rounded-xl text-xs border border-slate-800/60">
                          <span>{index + 1}. {item}</span>
                          <button type="button" onClick={() => handleRemoveChecklist(index)} className="text-rose-400 hover:text-rose-300"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-800 text-xs border-0">Batal</Button>
                <Button variant="primary" onClick={handleSave} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0">
                  <Save className="w-4 h-4 mr-1.5" /> {isSubmitting ? 'Menyimpan...' : 'Simpan Soal'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}