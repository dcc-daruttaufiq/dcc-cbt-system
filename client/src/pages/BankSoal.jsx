import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import API from '../utils/api';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { Plus, Trash2, Edit3, Save, X, Database, Layers, Download, Upload, FileSpreadsheet } from 'lucide-react';

const initialDummySoal = [
  { id: 101, kategori: 'word', tipe: 'pg', pertanyaan: 'Shortcut keyboard untuk menyimpan dokumen pada Microsoft Word adalah...', opsi: ['A. Ctrl + S', 'B. Ctrl + P', 'C. Ctrl + C', 'D. Ctrl + V'], jawaban_benar: 'A' },
  { id: 102, kategori: 'excel', tipe: 'pg', pertanyaan: 'Fungsi Excel yang digunakan untuk menjumlahkan sekumpulan data numerik adalah...', opsi: ['A. AVERAGE', 'B. SUM', 'C. COUNT', 'D. MAX'], jawaban_benar: 'B' },
  { id: 103, kategori: 'desain', tipe: 'pg', pertanyaan: 'Format berkas gambar yang mendukung latar belakang transparan adalah...', opsi: ['A. JPG', 'B. PNG', 'C. PDF', 'D. BMP'], jawaban_benar: 'B' },
  { id: 104, kategori: 'pemrograman', tipe: 'praktik', pertanyaan: 'TUGAS PRAKTIK: Buatlah fungsi JavaScript untuk memfilter elemen array secara dinamis.', checklist: ['Fungsi valid', 'No syntax error'] }
];

export default function BankSoal() {
  useDocumentTitle('Manajemen Bank Soal - DCC CBT');

  const [listSoal, setDataSoal] = useState([]);
  const [filterKategori, setFilterKategori] = useState('semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  // LOGIKA FETCH SOAL PERMANEN (UTAMAKAN LOCALSTORAGE BIAR TIDAK HILANG SAAT REFRESH)
  const fetchSoal = async () => {
    const savedLocal = localStorage.getItem('dcc_bank_soal');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDataSoal(parsed);
          return;
        }
      } catch (e) {
        console.warn("Gagal membaca localStorage...");
      }
    }

    try {
      let res = await API.get('/soal').catch(() => API.get('/ujian/soal'));
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setDataSoal(res.data);
        localStorage.setItem('dcc_bank_soal', JSON.stringify(res.data));
        return;
      }
    } catch (err) {
      console.warn('API server offline, menggunakan penyimpanan lokal.');
    }

    setDataSoal(initialDummySoal);
    localStorage.setItem('dcc_bank_soal', JSON.stringify(initialDummySoal));
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

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
      try {
        await API.delete(`/soal/${id}`).catch(() => API.delete(`/ujian/soal/${id}`));
      } catch (err) {}

      const updated = listSoal.filter((item) => item.id !== id);
      setDataSoal(updated);
      localStorage.setItem('dcc_bank_soal', JSON.stringify(updated));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pertanyaan.trim()) return alert('Teks pertanyaan wajib diisi!');

    const formatOpsi = tipe === 'pg' ? [`A. ${opsi.A}`, `B. ${opsi.B}`, `C. ${opsi.C}`, `D. ${opsi.D}`] : [];

    const newSoalItem = {
      id: editingId || Date.now(),
      kategori,
      tipe,
      pertanyaan,
      opsi: formatOpsi,
      jawaban_benar: tipe === 'pg' ? jawabanBenar : '',
      jawabanBenar: tipe === 'pg' ? jawabanBenar : '',
      checklist: tipe === 'praktik' ? checklist : []
    };

    let updatedList = [];
    if (editingId) {
      updatedList = listSoal.map((item) => (item.id === editingId ? newSoalItem : item));
    } else {
      updatedList = [newSoalItem, ...listSoal];
    }

    setDataSoal(updatedList);
    localStorage.setItem('dcc_bank_soal', JSON.stringify(updatedList));
    setIsModalOpen(false);

    try {
      if (editingId) {
        await API.put(`/soal/${editingId}`, newSoalItem).catch(() => API.put(`/ujian/soal/${editingId}`, newSoalItem));
      } else {
        await API.post('/soal', newSoalItem).catch(() => API.post('/ujian/soal', newSoalItem));
      }
    } catch (err) {}
  };

  // HANDLER IMPORT EXCEL / CSV DENGAN MAPPING 5 KATEGORI MURNI
  const handleImportExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const importedSoalArr = [];

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('kategori') || line.toLowerCase().includes('pertanyaan'))) {
          return;
        }

        const cols = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        
        if (cols.length >= 3) {
          const rawKategori = (cols[0] || '').toLowerCase();
          let finalKategori = 'word';

          // MAPPER 5 KATEGORI TERPISAH
          if (rawKategori.includes('excel')) {
            finalKategori = 'excel';
          } else if (rawKategori.includes('power') || rawKategori.includes('ppt') || rawKategori.includes('point')) {
            finalKategori = 'powerpoint';
          } else if (rawKategori.includes('word') || rawKategori.includes('doc')) {
            finalKategori = 'word';
          } else if (rawKategori.includes('desain') || rawKategori.includes('design') || rawKategori.includes('canva') || rawKategori.includes('grafis')) {
            finalKategori = 'desain';
          } else if (rawKategori.includes('pemrograman') || rawKategori.includes('coding') || rawKategori.includes('web') || rawKategori.includes('html') || rawKategori.includes('js')) {
            finalKategori = 'pemrograman';
          } else {
            finalKategori = rawKategori || 'word';
          }

          const tpe = (cols[1] || 'pg').toLowerCase();
          const tnya = cols[2];
          
          if (tpe === 'pg') {
            const opsA = cols[3] || '';
            const opsB = cols[4] || '';
            const opsC = cols[5] || '';
            const opsD = cols[6] || '';
            const knci = (cols[7] || 'A').toUpperCase();

            importedSoalArr.push({
              id: Date.now() + index,
              kategori: finalKategori,
              tipe: 'pg',
              pertanyaan: tnya,
              opsi: [`A. ${opsA}`, `B. ${opsB}`, `C. ${opsC}`, `D. ${opsD}`],
              jawaban_benar: knci,
              jawabanBenar: knci
            });
          } else {
            const rubrikRaw = cols[8] || cols[3] || 'Kesesuaian pengerjaan, Kerapihan berkas';
            const rubrikArr = rubrikRaw.split(/[|,]/).map(r => r.trim()).filter(Boolean);

            importedSoalArr.push({
              id: Date.now() + index,
              kategori: finalKategori,
              tipe: 'praktik',
              pertanyaan: tnya,
              checklist: rubrikArr
            });
          }
        }
      });

      if (importedSoalArr.length > 0) {
        const combined = [...importedSoalArr, ...listSoal];
        setDataSoal(combined);
        localStorage.setItem('dcc_bank_soal', JSON.stringify(combined));
        alert(`Berhasil mengimpor ${importedSoalArr.length} soal! Terpetakan ke 5 Kategori Ujian.`);
      } else {
        alert('File tidak sesuai format kolom!');
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
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            setDataSoal(parsed);
            localStorage.setItem('dcc_bank_soal', JSON.stringify(parsed));
            alert(`Berhasil mengimpor ${parsed.length} soal ke Bank Soal!`);
          }
        } catch (err) { alert('Gagal membaca file JSON!'); }
      };
    }
  };

  const filteredSoalList =
    filterKategori === 'semua'
      ? listSoal
      : listSoal.filter((item) => (item.kategori || 'word') === filterKategori);

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPanitia} userRole="Panitia" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <Database className="text-cyan-400 w-5 h-5" />
              <div>
                <h1 className="text-sm font-display font-bold text-white tracking-wide">BANK SOAL (LIVE DB)</h1>
                <p className="text-[11px] text-slate-400">Kelola & Import Bank Soal Spesialisasi</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
              <input type="file" ref={excelInputRef} onChange={handleImportExcelCSV} accept=".csv,.xlsx" className="hidden" />

              <Button onClick={() => excelInputRef.current.click()} className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0 shadow-lg shadow-emerald-500/20">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Excel / CSV
              </Button>

              <Button onClick={() => fileInputRef.current.click()} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans border-0">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Import JSON
              </Button>

              <Button onClick={handleExportBackup} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans border-0">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Backup JSON
              </Button>

              <Button onClick={openCreateModal} className="text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold border-0 shadow-lg shadow-cyan-400/20">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Manual
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                Daftar Soal Tersedia ({filteredSoalList.length})
              </h2>

              {/* 5 FILTER KATEGORI MURNI PER SEMESTER */}
              <div className="flex gap-1 bg-[#0d1527] p-1 rounded-xl border border-slate-800/80 text-[11px] overflow-x-auto">
                {['semua', 'word', 'excel', 'powerpoint', 'desain', 'pemrograman'].map((kat) => (
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

            <div className="space-y-3">
              {filteredSoalList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Belum ada soal untuk kategori ini. Klik <strong>"Import Excel / CSV"</strong> atau <strong>"Tambah Manual"</strong> di atas.
                </div>
              ) : (
                filteredSoalList.map((row, index) => (
                  <div 
                    key={row.id || index}
                    className="p-5 bg-[#0d1527]/60 backdrop-blur-md border border-slate-800/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#0d1527] transition-all duration-200"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-lg shrink-0 mt-0.5">
                        #{index + 1}
                      </span>

                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-cyan-400/10 text-cyan-400 border-cyan-400/20 text-[10px] uppercase font-display font-bold px-2 py-0.5">
                            {row.kategori || 'WORD'}
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

                        <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                          {row.pertanyaan}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button 
                        onClick={() => openEditModal(row)} 
                        className="p-2 rounded-xl bg-slate-800/60 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(row.id)} 
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </main>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0d1527] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white">
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
                    <option value="word">Microsoft Word</option>
                    <option value="excel">Microsoft Excel</option>
                    <option value="powerpoint">Microsoft PowerPoint</option>
                    <option value="desain">Desain Grafis (Canva / Visual)</option>
                    <option value="pemrograman">Pemrograman Web (Coding / Web Dev)</option>
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
                <Button variant="primary" onClick={handleSave} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0">
                  <Save className="w-4 h-4 mr-1.5" /> Simpan Soal
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}