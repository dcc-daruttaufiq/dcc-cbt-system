import React, { useState, useEffect, useRef } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import { normalizeKategori } from '../utils/examCategories';
import { STORAGE_KEYS, jawabanLocalKey } from '../utils/storageKeys';
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
  FileSpreadsheet,
  Trash2,
  Trash,
  WifiOff,
  AlertCircle,
  Search
} from 'lucide-react';

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

  // State Pilihan Checkbox untuk Bulk Delete
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter Status (6 Tab Utama Murni Teks)
  const [filterPeserta, setFilterPeserta] = useState('semua');
  const [filterTipeJawaban, setFilterTipeJawaban] = useState('praktik');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const pesertaFileInputRef = useRef(null);

  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  // MUAT PESERTA + BANK SOAL 100% DARI SUPABASE CLOUD.
  // LocalStorage hanya dipakai sebagai fallback tampilan saat koneksi gagal.
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
      console.warn('Gagal terhubung ke Supabase Cloud (peserta), menampilkan cache lokal terakhir.', err);
      setIsOffline(true);
      const localSesi = localStorage.getItem(STORAGE_KEYS.PESERTA);
      if (localSesi) {
        try {
          setPeserta(JSON.parse(localSesi));
        } catch (e) {
          setPeserta([]);
        }
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
      console.warn('Gagal memuat Bank Soal dari Supabase Cloud, menampilkan cache lokal terakhir.', err);
      const cached = localStorage.getItem(STORAGE_KEYS.BANK_SOAL);
      if (cached) {
        try { setBankSoalAll(JSON.parse(cached)); } catch (e) { setBankSoalAll([]); }
      }
    }
  };

  useEffect(() => {
    loadPeserta();
    loadBankSoal();
    const interval = setInterval(() => {
      loadPeserta();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Reset ke halaman 1 setiap kali filter status atau kata kunci pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeserta, searchQuery]);

  // HANDLER IMPOR PESERTA (SUPPORT MENUMPUK/APPEND 3+ FILE EXCEL/CSV & ANTI-DUPLIKAT TECHID)
  // Hasil parsing langsung di-insert ke Supabase Cloud (bulk insert).
  const handleImportPesertaExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      const importedPesertaArr = [];

      // Anti-duplikat: cek terhadap data peserta yang SUDAH ada di Supabase Cloud (state saat ini)
      const existingTechIds = new Set(peserta.map(p => (p.tech_id || '').toLowerCase().trim()));

      let duplicateCount = 0;
      let invalidKategoriCount = 0;

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('techid'))) {
          return;
        }

        // AUTO-DETECT PEMISAH KOLOM (TITIK KOMA, KOMA, ATAU TAB)
        let delimiter = ',';
        if (line.includes(';')) delimiter = ';';
        else if (line.includes('\t')) delimiter = '\t';

        const regex = new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`);
        const cols = line.split(regex).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 2) {
          const nama = cols[0] || `Peserta #${index + 1}`;
          const techId = cols[1] || `DCC25-${String(index + 1).padStart(3, '0')}`;
          const cleanTechId = techId.toLowerCase().trim();

          // CEK ANTI DUPLIKAT: Jika TechID sudah pernah terdaftar, lewati!
          if (existingTechIds.has(cleanTechId)) {
            duplicateCount++;
            return;
          }

          // MAPPER 5 KATEGORI RESMI (TERPUSAT). Jika kolom Mata Ujian pada Excel
          // tidak cocok dengan salah satu dari 5 kategori resmi, baris ini DILEWATI
          // (bukan dipaksa jadi 'word') supaya Panitia sadar ada data yang keliru.
          const finalKat = normalizeKategori(cols[2]);
          if (!finalKat) {
            invalidKategoriCount++;
            return;
          }

          if (nama && !nama.toLowerCase().includes('nama lengkap')) {
            existingTechIds.add(cleanTechId); // Tandai TechID ini sudah masuk
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
        if (duplicateCount > 0) {
          alert(`Semua data (${duplicateCount}) dalam file ini sudah terdaftar sebelumnya!`);
        } else if (invalidKategoriCount > 0) {
          alert(`Tidak ada peserta yang berhasil diimpor. ${invalidKategoriCount} baris dilewati karena kolom Mata Ujian tidak dikenali (harus salah satu dari: word, excel, powerpoint, desain, pemrograman).`);
        } else {
          alert('File tidak sesuai format! Pastikan kolom minimal: Nama, TechID, Mata Ujian.');
        }
        e.target.value = '';
        return;
      }

      try {
        const { error } = await supabase.from(TABLES.PESERTA).insert(importedPesertaArr);
        if (error) throw error;

        await loadPeserta();

        let msg = `Berhasil menambahkan ${importedPesertaArr.length} peserta baru ke Supabase Cloud!`;
        if (duplicateCount > 0) msg += ` (${duplicateCount} data duplikat dilewati).`;
        if (invalidKategoriCount > 0) msg += ` (${invalidKategoriCount} baris dilewati karena kolom Mata Ujian tidak dikenali — harus salah satu dari word/excel/powerpoint/desain/pemrograman).`;
        alert(msg);
      } catch (err) {
        console.error('Gagal mengimpor peserta ke Supabase Cloud:', err);
        alert('Gagal mengimpor peserta ke Supabase Cloud. Periksa koneksi internet Anda dan coba lagi.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // FITUR HAPUS SATU PESERTA
  const handleDeleteSingle = async (pesertaId, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data peserta "${nama}"?`)) return;

    try {
      const { error } = await supabase.from(TABLES.PESERTA).delete().eq('id', pesertaId);
      if (error) throw error;

      const updated = peserta.filter(p => p.id !== pesertaId);
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      if (selectedSiswa === pesertaId) setSelectedSiswa(null);
    } catch (err) {
      console.error('Gagal menghapus peserta di Supabase Cloud:', err);
      alert('Gagal menghapus peserta di Supabase Cloud. Periksa koneksi internet Anda dan coba lagi.');
    }
  };

  // FITUR HAPUS BEBERAPA PESERTA TERPILIH (BULK DELETE)
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert("Pilih minimal satu peserta yang ingin dihapus!");

    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} peserta terpilih?`)) return;

    try {
      const { error } = await supabase.from(TABLES.PESERTA).delete().in('id', selectedIds);
      if (error) throw error;

      const updated = peserta.filter(p => !selectedIds.includes(p.id));
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      setSelectedIds([]);
      if (selectedIds.includes(selectedSiswa)) setSelectedSiswa(null);
    } catch (err) {
      console.error('Gagal menghapus peserta terpilih di Supabase Cloud:', err);
      alert('Gagal menghapus peserta terpilih di Supabase Cloud. Periksa koneksi internet Anda dan coba lagi.');
    }
  };

  // FITUR RESET SEMUA DATA PESERTA (KONFIRMASI 2 LANGKAH SEBAGAI PENGAMAN)
  const handleDeleteAll = async () => {
    if (!confirm("PERINGATAN: Anda akan MENGHAPUS SEMUA PESERTA. Lanjutkan ke konfirmasi terakhir?")) return;
    if (!confirm(`Konfirmasi terakhir: ${peserta.length} data peserta akan dihapus PERMANEN dan tidak bisa dikembalikan. Yakin lanjut?`)) return;

    try {
      const idsToDelete = peserta.map(p => p.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        const { error } = await supabase.from(TABLES.PESERTA).delete().in('id', idsToDelete);
        if (error) throw error;
      }

      setPeserta([]);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify([]));
      setSelectedSiswa(null);
      setSelectedIds([]);
    } catch (err) {
      console.error('Gagal mereset seluruh data peserta di Supabase Cloud:', err);
      alert('Gagal mereset seluruh data peserta di Supabase Cloud. Periksa koneksi internet Anda dan coba lagi.');
    }
  };

  // TOGGLE CHECKBOX INDIVIDUAL
  const toggleSelectPeserta = (pesertaId) => {
    setSelectedIds(prev =>
      prev.includes(pesertaId) ? prev.filter(id => id !== pesertaId) : [...prev, pesertaId]
    );
  };

  // TOGGLE CHECKALL (tetap berbasis seluruh hasil filter, lintas halaman)
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPeserta.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPeserta.map(p => p.id));
    }
  };

  // PERIKSA JAWABAN PESERTA: 100% SUPABASE CLOUD (tabel jawaban_peserta di-join
  // manual dengan bank_soal di sisi client agar pertanyaan/checklist/tipe utuh).
  // LocalStorage (jawabanLocal_<techId>) dipakai sebagai fallback jika Supabase
  // sedang tidak bisa dihubungi.
  const handlePeriksa = async (pesertaId) => {
    setSelectedSiswa(pesertaId);
    setIsSaved(false);
    setIsLoadingPeriksa(true);

    const targetUser = peserta.find(p => p.id === pesertaId);
    const userTechId = targetUser?.tech_id;

    let detailJawaban = [];

    try {
      const { data: jawabanRows, error } = await supabase
        .from(TABLES.JAWABAN_PESERTA)
        .select('*')
        .eq('tech_id', userTechId);

      if (error) throw error;

      detailJawaban = (jawabanRows || []).map((row) => {
        const matchedSoal = bankSoalAll.find(s => String(s.id) === String(row.soal_id)) || {};
        return {
          soal_id: row.soal_id,
          tipe: matchedSoal.tipe || (typeof row.jawaban === 'object' ? 'praktik' : 'pg'),
          pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${row.soal_id}`,
          jawaban: row.jawaban,
          ragu_ragu: !!row.ragu_ragu,
          checklist: matchedSoal.checklist || null,
        };
      });
    } catch (err) {
      console.warn('Gagal memuat jawaban dari Supabase Cloud, mencoba cache lokal...', err);

      const savedJawabanStr = localStorage.getItem(jawabanLocalKey(userTechId)) ||
                              localStorage.getItem(jawabanLocalKey(pesertaId)) ||
                              localStorage.getItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY);

      if (savedJawabanStr) {
        try {
          const parsedJwb = JSON.parse(savedJawabanStr);
          detailJawaban = Object.keys(parsedJwb).map(soalId => {
            const matchedSoal = bankSoalAll.find(s => String(s.id) === String(soalId)) || {};
            const entry = parsedJwb[soalId];
            const isWrapped = entry && typeof entry === 'object' && 'jawaban' in entry;
            return {
              soal_id: soalId,
              tipe: matchedSoal.tipe || (typeof (isWrapped ? entry.jawaban : entry) === 'object' ? 'praktik' : 'pg'),
              pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${soalId}`,
              jawaban: isWrapped ? entry.jawaban : entry,
              ragu_ragu: isWrapped ? !!entry.ragu_ragu : false,
              checklist: matchedSoal.checklist || ['Hasil pengerjaan sesuai instruksi', 'Kerapihan & struktur berkas valid']
            };
          });
        } catch (e) {
          detailJawaban = [];
        }
      }
    }

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
        })
        .eq('id', selectedSiswa);

      if (error) throw error;

      const updatedPeserta = peserta.map((p) => {
        if (p.id === selectedSiswa) {
          return { ...p, nilai_praktik: skorPraktikTotal, nilai_akhir: nilaiAkhirBaru, status_koreksi: 'dikoreksi' };
        }
        return p;
      });

      setPeserta(updatedPeserta);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updatedPeserta));
      setIsSaved(true);
      alert(`Nilai Praktik (${skorPraktikTotal}) Berhasil Disimpan ke Supabase Cloud! Status siswa kini Selesai Dikoreksi.`);
    } catch (err) {
      console.error('Gagal menyimpan nilai praktik ke Supabase Cloud:', err);
      alert('Gagal menyimpan nilai praktik ke Supabase Cloud. Periksa koneksi internet Anda dan coba lagi.');
    }
  };

  // LOGIKA 6 FILTER STATUS REALTIME + PENCARIAN NAMA/TECHID
  const filteredPeserta = peserta.filter(p => {
    const statusP = p.status || 'belum_mulai';
    const isDikoreksi = p.status_koreksi === 'dikoreksi';

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

  // ANGKA COUNTER UNTUK SETIAP TAB FILTER STATUS (dihitung dari seluruh data, bukan hasil search)
  const countBelumUjian = peserta.filter(p => (p.status || 'belum_mulai') === 'belum_mulai').length;
  const countSedangUjian = peserta.filter(p => p.status === 'berjalan').length;
  const countPerluDikoreksi = peserta.filter(p => p.status === 'selesai' && p.status_koreksi !== 'dikoreksi').length;
  const countSelesaiDikoreksi = peserta.filter(p => p.status === 'selesai' && p.status_koreksi === 'dikoreksi').length;
  const countSelesaiUjian = peserta.filter(p => p.status === 'selesai').length;

  // PAGINASI
  const totalPages = Math.max(1, Math.ceil(filteredPeserta.length / ITEMS_PER_PAGE));
  const paginatedPeserta = filteredPeserta.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-lg">
                  <WifiOff className="w-3 h-3" /> Mode Offline (Cache Lokal)
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

              <Button
                onClick={() => pesertaFileInputRef.current.click()}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Peserta Excel / CSV
              </Button>

              {peserta.length > 0 && (
                <Button onClick={handleDeleteAll} className="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 font-display font-bold border border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset All Data
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

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* BILAH KIRI: ANTREAN PESERTA DENGAN 6 TAB FILTER STATUS + FITUR DELETE & ANTI-DUPLIKAT */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2 px-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Peserta ({filteredPeserta.length})
                  </h2>

                  {/* TOMBOL PILIH ALL & BULK DELETE (muncul kontekstual saat ada yang dicentang) */}
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

                {/* KOTAK PENCARIAN NAMA / TECHID */}
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

                {/* 6 TAB FILTER MURNI TEKS + ANGKA JUMLAH REALTIME */}
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
                    Belum Ujian ({countBelumUjian})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('berjalan')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'berjalan' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sedang Ujian ({countSedangUjian})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('perlu_dikoreksi')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'perlu_dikoreksi' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Perlu Dikoreksi ({countPerluDikoreksi})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('selesai_dikoreksi')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'selesai_dikoreksi' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Selesai Dikoreksi ({countSelesaiDikoreksi})
                  </button>

                  <button
                    onClick={() => setFilterPeserta('selesai_ujian')}
                    className={`py-2 px-2.5 rounded-lg transition-all ${
                      filterPeserta === 'selesai_ujian' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Selesai Ujian ({countSelesaiUjian})
                  </button>
                </div>
              </div>

              {filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <p className="font-semibold text-slate-400">Tidak ada peserta pada status ini.</p>
                  <p className="text-[11px] text-slate-500">Impor Excel, ubah kata kunci pencarian, atau pilih tab filter lain.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedPeserta.map((p, idx) => {
                    const statusInfo = getBadgeStatus(p);
                    const isSelected = selectedSiswa === p.id;
                    const isChecked = selectedIds.includes(p.id);

                    return (
                      <div
                        key={p.id || idx}
                        className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400'
                            : 'bg-[#0d1527]/60 border-slate-800/60 hover:bg-[#0d1527]'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Checkbox Custom Circular untuk Hapus Masal */}
                          <button
                            type="button"
                            onClick={() => toggleSelectPeserta(p.id)}
                            title={isChecked ? 'Batal pilih' : 'Pilih peserta'}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isChecked ? 'bg-cyan-400 border-cyan-400' : 'bg-transparent border-slate-700 hover:border-cyan-400/60'
                            }`}
                          >
                            {isChecked && <CheckCircle2 className="w-3 h-3 text-slate-950" strokeWidth={3} />}
                          </button>

                          <div className="p-2.5 bg-slate-800/50 rounded-xl shrink-0 cursor-pointer" onClick={() => handlePeriksa(p.id)}>
                            <User className="w-5 h-5 text-cyan-400" />
                          </div>

                          <div className="space-y-0.5 flex-1 min-w-0 cursor-pointer" onClick={() => handlePeriksa(p.id)}>
                            <h4 className="font-display font-bold text-sm text-white truncate">
                              {p.nama || p.nama_lengkap || `Peserta #${p.id}`}
                            </h4>
                            <p className="text-xs text-slate-400 truncate">
                              TechID: <span className="text-slate-200 font-mono">{p.tech_id || `DCC25-000${p.id}`}</span> • <span className="uppercase text-[10px] text-cyan-400 font-bold">{p.kategori || 'WORD'}</span>
                            </p>

                            <div className="mt-1.5 flex items-center gap-2">
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

                        {/* TOMBOL AKSI: PERIKSA & HAPUS SINGLE */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" onClick={() => handlePeriksa(p.id)} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 hover:text-slate-950 border border-cyan-400/20 text-xs font-display font-bold">
                            Periksa
                          </Button>
                          <button
                            onClick={() => handleDeleteSingle(p.id, p.nama || p.nama_lengkap)}
                            className="p-2 rounded-xl text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Hapus Peserta ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* NAVIGASI PAGINASI */}
                  {filteredPeserta.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-[#0d1527] border border-slate-800 text-xs text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-400/50"
                      >
                        ← Sebelumnya
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">Halaman {currentPage} / {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg bg-[#0d1527] border border-slate-800 text-xs text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-400/50"
                      >
                        Berikutnya →
                      </button>
                    </div>
                  )}
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

                  {isLoadingPeriksa ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Memuat jawaban peserta dari Supabase Cloud...
                    </div>
                  ) : filteredJawabanList.length === 0 ? (
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

                      const fileAttachmentName = isPraktikObj ? j.jawaban.fileName : (
                        isPGString && j.jawaban.includes('fileName')
                          ? JSON.parse(j.jawaban).fileName
                          : null
                      );

                      const fileAttachmentUrl = isPraktikObj ? j.jawaban.fileUrl : null;

                      return (
                        <div key={idx} className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-cyan-400/10 text-cyan-400 text-[10px] uppercase font-bold">
                              SOAL #{idx + 1} ({j.tipe === 'pg' ? 'PILIHAN GANDA' : 'PRAKTIK'})
                            </Badge>
                            {j.ragu_ragu && (
                              <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-[10px] uppercase font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Ditandai Ragu-ragu
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-200 font-medium leading-relaxed">{j.pertanyaan}</p>

                          <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-2">
                            <p className="text-xs text-slate-400 font-display font-bold uppercase tracking-wider">Hasil Jawaban Peserta:</p>

                            <div className="text-emerald-400 font-mono text-xs break-words bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {teksJawaban || (isPGString ? `Opsi Terpilih: ${j.jawaban}` : 'Peserta tidak mengisikan teks.')}
                            </div>

                            {fileAttachmentName && (
                              <div className="pt-2 flex items-center gap-2 text-xs text-cyan-400 font-mono bg-cyan-400/10 p-2.5 rounded-lg border border-cyan-400/20">
                                <FileText className="w-4 h-4 shrink-0" />
                                <span>Berkas Lampiran Praktik:</span>
                                {fileAttachmentUrl ? (
                                  <a href={fileAttachmentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-300">
                                    {fileAttachmentName}
                                  </a>
                                ) : (
                                  <strong className="underline">{fileAttachmentName}</strong>
                                )}
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
    </div>
  );
}