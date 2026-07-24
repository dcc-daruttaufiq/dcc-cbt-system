import React, { useState, useEffect, useRef } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import { normalizeKategori } from '../utils/examCategories';
import { STORAGE_KEYS, jawabanLocalKey } from '../utils/storageKeys';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Input from '../components/ui/Input';
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
  FileSpreadsheet,
  Trash2,
  Trash,
  WifiOff,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  Save,
  Sliders
} from 'lucide-react';

// Katalog 5 Mata Ujian
const KATALOG_KATEGORI = [
  { id: 'word', nama: 'Microsoft Word' },
  { id: 'excel', nama: 'Microsoft Excel' },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint' },
  { id: 'desain', nama: 'Desain Grafis' },
  { id: 'pemrograman', nama: 'Pemrograman Web' }
];

export default function DashboardPanitia() {
  const [peserta, setPeserta] = useState([]);
  const [bankSoalAll, setBankSoalAll] = useState([]);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [soalPraktikList, setSoalPraktikList] = useState([]);
  const [checklistPraktik, setChecklistPraktik] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoadingPeriksa, setIsLoadingPeriksa] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State Pengaturan Durasi Ujian (Dalam Menit)
  const [durasiUjian, setDurasiUjian] = useState({
    word: 90,
    excel: 90,
    powerpoint: 90,
    desain: 90,
    pemrograman: 120
  });
  const [showDurasiModal, setShowDurasiModal] = useState(false);
  const [isSavingDurasi, setIsSavingDurasi] = useState(false);

  // State Checkbox Bulk Delete
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter Status
  const [filterPeserta, setFilterPeserta] = useState('semua');
  const [filterTipeJawaban, setFilterTipeJawaban] = useState('semua');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const pesertaFileInputRef = useRef(null);

  // 1. LOAD CONFIG DURASI DARI SUPABASE / LOCALSTORAGE
  const loadPengaturanDurasi = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'durasi_ujian_menit')
        .maybeSingle();

      if (!error && data && data.value) {
        const parsedVal = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setDurasiUjian(prev => ({ ...prev, ...parsedVal }));
        localStorage.setItem('dcc_durasi_ujian', JSON.stringify(parsedVal));
        return;
      }
    } catch (err) {
      console.warn('Gagal membaca durasi dari Supabase, membaca dari LocalStorage...', err);
    }

    // Fallback LocalStorage
    const localDurasi = localStorage.getItem('dcc_durasi_ujian');
    if (localDurasi) {
      try {
        setDurasiUjian(JSON.parse(localDurasi));
      } catch (e) {}
    }
  };

  // 2. SIMPAN DURASI UJIAN KE SUPABASE & LOCALSTORAGE
  const handleSaveDurasi = async () => {
    setIsSavingDurasi(true);
    try {
      localStorage.setItem('dcc_durasi_ujian', JSON.stringify(durasiUjian));

      // Simpan/Upsert ke Supabase
      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .upsert({
          key: 'durasi_ujian_menit',
          value: JSON.stringify(durasiUjian),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) console.warn('Peringatan Upsert Supabase:', error);

      alert('Pengaturan durasi ujian berhasil disimpan!');
      setShowDurasiModal(false);
    } catch (err) {
      console.error('Gagal menyimpan durasi:', err);
      alert('Durasi tersimpan di sesi lokal.');
      setShowDurasiModal(false);
    } finally {
      setIsSavingDurasi(false);
    }
  };

  const loadPeserta = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PESERTA)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      setPeserta(rows);
      setIsOffline(false);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(rows));
    } catch (err) {
      console.warn('Gagal terhubung ke Supabase Cloud (peserta), menggunakan cache lokal.', err);
      setIsOffline(true);
      const localSesi = localStorage.getItem(STORAGE_KEYS.PESERTA);
      if (localSesi) {
        try { setPeserta(JSON.parse(localSesi)); } catch (e) { setPeserta([]); }
      }
    }
  };

  const loadBankSoal = async () => {
    try {
      const { data, error } = await supabase.from(TABLES.BANK_SOAL).select('*');
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setBankSoalAll(rows);
      localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify(rows));
    } catch (err) {
      console.warn('Gagal memuat Bank Soal dari Supabase Cloud, menggunakan cache lokal.', err);
      const cached = localStorage.getItem(STORAGE_KEYS.BANK_SOAL);
      if (cached) {
        try { setBankSoalAll(JSON.parse(cached)); } catch (e) { setBankSoalAll([]); }
      }
    }
  };

  useEffect(() => {
    loadPeserta();
    loadBankSoal();
    loadPengaturanDurasi();
    const interval = setInterval(() => {
      loadPeserta();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeserta, searchQuery]);

  const handleImportPesertaExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      const importedPesertaArr = [];

      const existingTechIds = new Set(peserta.map(p => (p.tech_id || '').toLowerCase().trim()));

      let duplicateCount = 0;
      let invalidKategoriCount = 0;

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('techid'))) {
          return;
        }

        let delimiter = ',';
        if (line.includes(';')) delimiter = ';';
        else if (line.includes('\t')) delimiter = '\t';

        const regex = new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`);
        const cols = line.split(regex).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 2) {
          const nama = cols[0] || `Peserta #${index + 1}`;
          const techId = cols[1] || `DCC25-${String(index + 1).padStart(3, '0')}`;
          const cleanTechId = techId.toLowerCase().trim();

          if (existingTechIds.has(cleanTechId)) {
            duplicateCount++;
            return;
          }

          const finalKat = normalizeKategori(cols[2]);
          if (!finalKat) {
            invalidKategoriCount++;
            return;
          }

          if (nama && !nama.toLowerCase().includes('nama lengkap')) {
            existingTechIds.add(cleanTechId);
            importedPesertaArr.push({
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
        }
      });

      if (importedPesertaArr.length === 0) {
        if (duplicateCount > 0) alert(`Semua data (${duplicateCount}) sudah terdaftar!`);
        else if (invalidKategoriCount > 0) alert(`Gagal impor. Kategori mata ujian tidak valid.`);
        else alert('Format file tidak sesuai!');
        e.target.value = '';
        return;
      }

      try {
        const { error } = await supabase.from(TABLES.PESERTA).insert(importedPesertaArr);
        if (error) throw error;
        await loadPeserta();
        alert(`Berhasil menambahkan ${importedPesertaArr.length} peserta baru!`);
      } catch (err) {
        console.error('Gagal impor peserta:', err);
        alert('Gagal mengimpor peserta.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleDeleteSingle = async (pesertaId, nama) => {
    if (!confirm(`Hapus data peserta "${nama}"?`)) return;

    try {
      const { error } = await supabase.from(TABLES.PESERTA).delete().eq('id', pesertaId);
      if (error) throw error;

      const updated = peserta.filter(p => p.id !== pesertaId);
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      if (selectedSiswa === pesertaId) setSelectedSiswa(null);
    } catch (err) {
      alert('Gagal menghapus peserta.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert("Pilih minimal satu peserta!");
    if (!confirm(`Hapus ${selectedIds.length} peserta terpilih?`)) return;

    try {
      const { error } = await supabase.from(TABLES.PESERTA).delete().in('id', selectedIds);
      if (error) throw error;

      const updated = peserta.filter(p => !selectedIds.includes(p.id));
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      setSelectedIds([]);
      if (selectedIds.includes(selectedSiswa)) setSelectedSiswa(null);
    } catch (err) {
      alert('Gagal menghapus peserta terpilih.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("HAPUS SEMUA PESERTA?")) return;
    if (!confirm(`Konfirmasi terakhir: ${peserta.length} data peserta akan dihapus PERMANEN.`)) return;

    try {
      const idsToDelete = peserta.map(p => p.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        await supabase.from(TABLES.PESERTA).delete().in('id', idsToDelete);
      }
      setPeserta([]);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify([]));
      setSelectedSiswa(null);
      setSelectedIds([]);
    } catch (err) {
      alert('Gagal mereset data peserta.');
    }
  };

  const toggleSelectPeserta = (pesertaId) => {
    setSelectedIds(prev =>
      prev.includes(pesertaId) ? prev.filter(id => id !== pesertaId) : [...prev, pesertaId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPeserta.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPeserta.map(p => p.id));
    }
  };

  const handlePeriksa = async (pesertaId) => {
    setSelectedSiswa(pesertaId);
    setIsSaved(false);
    setIsLoadingPeriksa(true);

    const targetUser = peserta.find(p => p.id === pesertaId);
    if (!targetUser) {
      setIsLoadingPeriksa(false);
      return;
    }

    const cleanTechId = (targetUser.tech_id || '').trim();
    let detailJawaban = [];

    try {
      const { data: jawabanRows, error } = await supabase
        .from(TABLES.JAWABAN_PESERTA)
        .select('*')
        .ilike('tech_id', cleanTechId);

      if (error) throw error;

      if (jawabanRows && jawabanRows.length > 0) {
        detailJawaban = jawabanRows.map((row) => {
          const matchedSoal = bankSoalAll.find(s => String(s.id).trim() === String(row.soal_id).trim()) || {};
          
          let parsedJwb = row.jawaban;
          if (typeof row.jawaban === 'string') {
            try {
              const trimmed = row.jawaban.trim();
              if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                parsedJwb = JSON.parse(trimmed);
              }
            } catch (e) {
              parsedJwb = row.jawaban;
            }
          }

          const isObj = typeof parsedJwb === 'object' && parsedJwb !== null;
          const rawTipe = (matchedSoal.tipe || '').toLowerCase();
          const tipeFinal = (rawTipe.includes('prak') || rawTipe.includes('essay') || isObj) ? 'praktik' : 'pg';

          return {
            soal_id: row.soal_id,
            tipe: tipeFinal,
            pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${row.soal_id}`,
            jawaban: parsedJwb,
            ragu_ragu: !!row.ragu_ragu,
            checklist: matchedSoal.checklist || ['Instruksi pengerjaan terpenuhi', 'Format berkas valid'],
          };
        });
      }
    } catch (err) {
      console.warn('Gagal fetch dari Cloud, membaca fallback LocalStorage...', err);
    }

    if (detailJawaban.length === 0) {
      const savedJawabanStr = localStorage.getItem(jawabanLocalKey(cleanTechId)) ||
                              localStorage.getItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY);

      if (savedJawabanStr) {
        try {
          const parsedJwb = JSON.parse(savedJawabanStr);
          detailJawaban = Object.keys(parsedJwb).map(soalId => {
            const matchedSoal = bankSoalAll.find(s => String(s.id).trim() === String(soalId).trim()) || {};
            const entry = parsedJwb[soalId];
            const isWrapped = entry && typeof entry === 'object' && 'jawaban' in entry;
            const actualJwb = isWrapped ? entry.jawaban : entry;

            return {
              soal_id: soalId,
              tipe: 'praktik',
              pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${soalId}`,
              jawaban: actualJwb,
              ragu_ragu: isWrapped ? !!entry.ragu_ragu : false,
              checklist: matchedSoal.checklist || ['Instruksi pengerjaan terpenuhi', 'Format berkas valid']
            };
          });
        } catch (e) { 
          detailJawaban = []; 
        }
      }
    }

    setFilterTipeJawaban('semua');
    setSoalPraktikList(detailJawaban);
    initChecklistData(detailJawaban);
    setIsLoadingPeriksa(false);
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
    const pg = targetUser?.nilai_pg || 0;
    const nilaiAkhirBaru = Math.round((pg + skorPraktikTotal) / 2);

    try {
      const { error } = await supabase
        .from(TABLES.PESERTA)
        .update({
          nilai_praktik: skorPraktikTotal,
          nilai_akhir: nilaiAkhirBaru,
          status_koreksi: 'dikoreksi',
          status: 'selesai'
        })
        .eq('id', selectedSiswa);

      if (error) throw error;

      const updatedPeserta = peserta.map((p) => {
        if (p.id === selectedSiswa) {
          return { ...p, nilai_praktik: skorPraktikTotal, nilai_akhir: nilaiAkhirBaru, status_koreksi: 'dikoreksi', status: 'selesai' };
        }
        return p;
      });

      setPeserta(updatedPeserta);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updatedPeserta));
      setIsSaved(true);
      alert(`Nilai Praktik (${skorPraktikTotal}) Berhasil Disimpan!`);
    } catch (err) {
      alert('Gagal menyimpan nilai praktik.');
    }
  };

  // FILTER PESERTA
  const filteredPeserta = peserta.filter(p => {
    const statusP = p.status || 'belum_mulai';
    const isDikoreksi = p.status_koreksi === 'dikoreksi' || p.status_koreksi === 'SELESAI';

    let statusMatch = true;
    if (filterPeserta === 'belum_mulai') statusMatch = statusP === 'belum_mulai';
    else if (filterPeserta === 'berjalan') statusMatch = statusP === 'berjalan';
    else if (filterPeserta === 'perlu_dikoreksi') statusMatch = statusP === 'selesai' && !isDikoreksi;
    else if (filterPeserta === 'selesai_dikoreksi') statusMatch = statusP === 'selesai' && isDikoreksi;
    else if (filterPeserta === 'selesai_ujian') statusMatch = statusP === 'selesai';

    if (!statusMatch) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nama = (p.nama || p.nama_lengkap || '').toLowerCase();
      const techId = (p.tech_id || '').toLowerCase();
      return nama.includes(q) || techId.includes(q);
    }

    return true;
  });

  const countBelumUjian = peserta.filter(p => (p.status || 'belum_mulai') === 'belum_mulai').length;
  const countSedangUjian = peserta.filter(p => p.status === 'berjalan').length;
  const countPerluDikoreksi = peserta.filter(p => p.status === 'selesai' && p.status_koreksi !== 'dikoreksi' && p.status_koreksi !== 'SELESAI').length;
  const countSelesaiDikoreksi = peserta.filter(p => p.status === 'selesai' && (p.status_koreksi === 'dikoreksi' || p.status_koreksi === 'SELESAI')).length;
  const countSelesaiUjian = peserta.filter(p => p.status === 'selesai').length;

  const totalPages = Math.max(1, Math.ceil(filteredPeserta.length / ITEMS_PER_PAGE));
  const paginatedPeserta = filteredPeserta.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filteredJawabanList = soalPraktikList.filter(j => {
    if (filterTipeJawaban === 'praktik') return j.tipe === 'praktik' || typeof j.jawaban === 'object';
    if (filterTipeJawaban === 'pg') return j.tipe === 'pg' && typeof j.jawaban !== 'object';
    return true;
  });

  const getBadgeStatus = (p) => {
    if (p.status === 'selesai' && (p.status_koreksi === 'dikoreksi' || p.status_koreksi === 'SELESAI')) {
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
      <Sidebar links={menuPanitia} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-cyan-400 w-6 h-6" />
              <div>
                <h1 className="text-base font-display font-bold text-white tracking-wide">PANEL KOREKSI UJIAN & PRAKTIK</h1>
                <p className="text-xs text-slate-400">Pemeriksaan Realtime Hasil Pengerjaan Siswa</p>
              </div>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-lg">
                  <WifiOff className="w-3 h-3" /> Mode Offline
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={pesertaFileInputRef}
                onChange={handleImportPesertaExcelCSV}
                accept=".csv,.xlsx"
                className="hidden"
              />

              {/* FITUR TOMBOL PENGATURAN DURASI */}
              <Button
                onClick={() => setShowDurasiModal(true)}
                className="text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold border-0 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" /> Atur Durasi Ujian
              </Button>

              <Button
                onClick={() => pesertaFileInputRef.current.click()}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Excel / CSV
              </Button>

              {peserta.length > 0 && (
                <Button onClick={handleDeleteAll} className="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 font-display font-bold border border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset All
                </Button>
              )}

              <Button
                size="sm"
                onClick={async () => {
                  setIsRefreshing(true);
                  await loadPeserta();
                  setTimeout(() => setIsRefreshing(false), 500);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-xs border-0 text-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Status
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* BILAH KIRI: ANTREAN PESERTA */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="flex flex-col gap-2 px-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Peserta ({filteredPeserta.length})
                  </h2>

                  {filteredPeserta.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSelectAll}
                        className="text-[11px] text-cyan-400 hover:underline font-mono"
                      >
                        {selectedIds.length === filteredPeserta.length ? 'Batal Pilih' : 'Pilih Semua'}
                      </button>

                      {selectedIds.length > 0 && (
                        <button
                          onClick={handleDeleteSelected}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-500/40 transition"
                        >
                          <Trash className="w-3 h-3" /> Hapus ({selectedIds.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau TechID..."
                    className="w-full bg-[#0d1527] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-[#0d1527] p-2 rounded-xl border border-slate-800 text-xs font-display font-bold">
                  <button
                    onClick={() => setFilterPeserta('semua')}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === 'semua' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({peserta.length})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('belum_mulai')}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === 'belum_mulai' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Belum ({countBelumUjian})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('berjalan')}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === 'berjalan' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sedang ({countSedangUjian})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('perlu_dikoreksi')}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === 'perlu_dikoreksi' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Perlu Koreksi ({countPerluDikoreksi})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('selesai_dikoreksi')}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === 'selesai_dikoreksi' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Terkoreksi ({countSelesaiDikoreksi})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('selesai_ujian')}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === 'selesai_ujian' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Selesai ({countSelesaiUjian})
                  </button>
                </div>
              </div>

              {/* DAFTAR CARD PESERTA */}
              {filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Tidak ada peserta pada status ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedPeserta.map((p, idx) => {
                    const statusInfo = getBadgeStatus(p);
                    const isSelected = selectedSiswa === p.id;
                    const isChecked = selectedIds.includes(p.id);
                    const nilaiDisplay = p.nilai_akhir || p.nilai_praktik || p.nilai_pg || '-';

                    return (
                      <div
                        key={p.id || idx}
                        className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-400'
                            : 'bg-[#0d1527]/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/50 pb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleSelectPeserta(p.id)}
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isChecked ? 'bg-cyan-400 border-cyan-400' : 'bg-transparent border-slate-700'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-3 h-3 text-slate-950" strokeWidth={3} />}
                            </button>

                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
                              {(p.nama || p.nama_lengkap || 'P').charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="font-display font-bold text-xs text-white truncate" title={p.nama || p.nama_lengkap}>
                                {p.nama || p.nama_lengkap || `Peserta #${p.id}`}
                              </h4>
                              <p className="text-[10px] font-mono text-slate-400 truncate">
                                {p.tech_id || `DCC25-000${p.id}`}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteSingle(p.id, p.nama || p.nama_lengkap)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Hapus Peserta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <Badge variant={statusInfo.variant} className="text-[9px] px-2 py-0.5 rounded-md font-sans">
                            {statusInfo.text}
                          </Badge>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-[#030712] px-2 py-0.5 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 font-bold">NILAI:</span>
                              <span className="text-xs font-bold font-mono text-cyan-400">{nilaiDisplay}</span>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handlePeriksa(p.id)}
                              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] border-0"
                            >
                              Periksa
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredPeserta.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-[#0d1527] border border-slate-800 text-xs text-slate-300 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">Halaman {currentPage} / {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg bg-[#0d1527] border border-slate-800 text-xs text-slate-300 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BILAH KANAN: LEMBAR KOREKSI JAWABAN REALTIME */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {selectedSiswa ? (
                <div className="space-y-6">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-800/60 pb-3">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="text-cyan-400 w-4 h-4" /> LEMBAR JAWABAN PESERTA #{selectedSiswa}
                    </h2>

                    <div className="flex gap-1.5 bg-[#0d1527] p-1.5 rounded-xl border border-slate-800 text-xs font-display font-bold">
                      <button
                        onClick={() => setFilterTipeJawaban('semua')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          filterTipeJawaban === 'semua' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setFilterTipeJawaban('praktik')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          filterTipeJawaban === 'praktik' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Praktik
                      </button>
                      <button
                        onClick={() => setFilterTipeJawaban('pg')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          filterTipeJawaban === 'pg' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        PG
                      </button>
                    </div>
                  </div>

                  {isLoadingPeriksa ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Memuat jawaban peserta dari Supabase Cloud...
                    </div>
                  ) : filteredJawabanList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Peserta belum mengisikan jawaban untuk kategori ini.
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

                      const fileAttachmentName = isPraktikObj ? j.jawaban.fileName : (
                        isPGString && j.jawaban.includes('fileName')
                          ? JSON.parse(j.jawaban).fileName
                          : null
                      );

                      const fileAttachmentUrl = isPraktikObj ? j.jawaban.fileUrl : (
                        isPGString && j.jawaban.includes('fileUrl')
                          ? JSON.parse(j.jawaban).fileUrl
                          : null
                      );

                      return (
                        <div key={idx} className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-cyan-400/10 text-cyan-400 text-[10px] uppercase font-bold">
                              SOAL #{idx + 1} ({j.tipe === 'pg' ? 'PILIHAN GANDA' : 'PRAKTIK'})
                            </Badge>
                            {j.ragu_ragu && (
                              <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-[10px] uppercase font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Ragu-ragu
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-200 font-medium leading-relaxed">{j.pertanyaan}</p>

                          <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-3">
                            <p className="text-xs text-slate-400 font-display font-bold uppercase tracking-wider">Jawaban Peserta:</p>

                            <div className="text-emerald-400 font-mono text-xs break-words bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {teksJawaban || (isPGString ? `Opsi Terpilih: ${j.jawaban}` : 'Belum ada teks dimasukkan.')}
                            </div>

                            {fileAttachmentName && (
                              <div className="pt-2 flex items-center justify-between gap-2 text-xs text-cyan-400 font-mono bg-cyan-400/10 p-3 rounded-lg border border-cyan-400/20">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{fileAttachmentName}</span>
                                </div>
                                {fileAttachmentUrl ? (
                                  <a 
                                    href={fileAttachmentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-1 bg-cyan-400 text-slate-950 px-3 py-1 rounded-md font-bold text-xs shrink-0 hover:bg-cyan-300 transition"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Buka / Unduh Berkas
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">Berkas terlampir</span>
                                )}
                              </div>
                            )}
                          </div>

                          {j.checklist && (
                            <div className="p-4 bg-[#030712]/40 border border-slate-800 rounded-xl space-y-3">
                              <p className="text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">Checklist Penilaian:</p>
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
                        <Award className="text-cyan-400 w-5 h-5" /> Estimasi Nilai Praktik:
                        <span className="text-emerald-400 font-mono text-xl">{hitungSkorPraktikLokal()} / 100</span>
                      </h3>
                    </div>

                    <Button variant="primary" size="md" onClick={submitSimpanNilaiPraktik} className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold border-0">
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

      {/* MODAL PENGATURAN DURASI UJIAN (PER MATA UJIAN) */}
      {showDurasiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1527] border border-cyan-500/40 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-lg text-white">Pengaturan Durasi Ujian</h3>
              </div>
              <button
                onClick={() => setShowDurasiModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Atur alokasi waktu pengerjaan (dalam menit) untuk masing-masing kategori mata ujian.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {KATALOG_KATEGORI.map((kat) => (
                <div key={kat.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#030712] border border-slate-800">
                  <span className="text-xs font-display font-bold text-slate-200">{kat.nama}</span>
                  <div className="flex items-center gap-2 w-36">
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      value={durasiUjian[kat.id] || 90}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDurasiUjian(prev => ({ ...prev, [kat.id]: val }));
                      }}
                      className="text-right font-mono font-bold text-cyan-400 py-1 px-2 text-xs"
                    />
                    <span className="text-xs text-slate-400 font-sans">Menit</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                onClick={() => setShowDurasiModal(false)}
                className="bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveDurasi}
                disabled={isSavingDurasi}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> {isSavingDurasi ? 'Menyimpan...' : 'Simpan Durasi'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}