import React, { useState, useEffect } from 'react';
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
import { Plus, Trash2, Edit3, Save, X, Database, CheckCircle2 } from 'lucide-react';

export default function BankSoal() {
  useDocumentTitle('Manajemen Bank Soal API');

  const [listSoal, setDataSoal] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [tipe, setTipe] = useState('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [opsi, setOpsi] = useState({ A: '', B: '', C: '', D: '' });
  const [jawabanBenar, setJawabanBenar] = useState('A');
  const [checklist, setChecklist] = useState([]);
  const [inputChecklist, setInputChecklist] = useState('');

  const fetchSoal = async () => {
    try {
      const response = await API.get('/soal');
      setDataSoal(response.data);
    } catch (err) {
      console.warn('Gagal ambil data soal server');
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
    setTipe('pg');
    setPertanyaan('');
    setOpsi({ A: '', B: '', C: '', D: '' });
    setJawabanBenar('A');
    setChecklist([]);
    setIsModalOpen(true);
  };

  const openEditModal = (soal) => {
    setEditingId(soal.id);
    setTipe(soal.tipe);
    setPertanyaan(soal.pertanyaan);
    if (soal.tipe === 'pg') {
      setOpsi({
        A: soal.opsi?.[0]?.replace('A. ', '') || '',
        B: soal.opsi?.[1]?.replace('B. ', '') || '',
        C: soal.opsi?.[2]?.replace('C. ', '') || '',
        D: soal.opsi?.[3]?.replace('D. ', '') || ''
      });
      setJawabanBenar(soal.jawaban_benar || 'A');
    } else {
      setChecklist(soal.checklist || []);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus soal ini dari database?')) {
      try {
        await API.delete(`/soal/${id}`);
        fetchSoal();
      } catch (err) {
        alert('Gagal menghapus data.');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pertanyaan.trim()) return alert('Teks pertanyaan wajib diisi!');

    const formatOpsi = tipe === 'pg' ? [`A. ${opsi.A}`, `B. ${opsi.B}`, `C. ${opsi.C}`, `D. ${opsi.D}`] : [];

    const payload = {
      tipe,
      pertanyaan,
      opsi: formatOpsi,
      jawabanBenar: tipe === 'pg' ? jawabanBenar : '',
      checklist: tipe === 'praktik' ? checklist : []
    };

    try {
      if (editingId) {
        await API.put(`/soal/${editingId}`, payload);
      } else {
        await API.post('/soal', payload);
      }
      fetchSoal();
      setIsModalOpen(false);
    } catch (err) {
      alert('Gagal menyimpan data ke database.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-body">
      <Sidebar userRole="Panitia" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <Database className="text-cyan-400 w-5 h-5" />
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">BANK SOAL (LIVE DB)</h1>
                <p className="text-[11px] text-slate-400">Data tersimpan secara permanen di Database</p>
              </div>
            </div>

            <Button onClick={openCreateModal} className="text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold border-0 shadow-lg shadow-cyan-400/20">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Soal Baru
            </Button>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-4">
            
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Soal Tersedia ({listSoal.length})</h2>
            </div>

            {/* MODERN BORDERLESS LIST (TANPA TABLE KUNO & TEKS READABLE FULL) */}
            <div className="space-y-3">
              {listSoal.map((row, index) => (
                <div 
                  key={row.id || index}
                  className="p-5 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#0d1527] transition-all duration-200"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-lg shrink-0 mt-0.5">
                      #{index + 1}
                    </span>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
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

                      {/* Teks Soal Tampil Sepenuhnya Tanpa Terpotong */}
                      <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
                        {row.pertanyaan}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Aksi Clean */}
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
                      title="Hapus Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      {/* MODAL FORM OVERLAY CLEAN */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0d1527] border-0 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <h3 className="font-display text-base font-bold text-cyan-400">{editingId ? 'EDIT SOAL DATABASE' : 'TAMBAH SOAL DATABASE'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase">Tipe Konten Pertanyaan</label>
                  <Select value={tipe} onChange={(e) => { setTipe(e.target.value); setChecklist([]); }} disabled={!!editingId} className="bg-[#030712]/60 border-0 text-sm rounded-xl">
                    <option value="pg">Pilihan Ganda</option>
                    <option value="praktik">Ujian Praktik</option>
                  </Select>
                </div>

                <Textarea label="Butir Soal / Pertanyaan Ujian" placeholder="Tulis pertanyaan lengkap..." value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} required className="bg-[#030712]/60 border-0 text-sm rounded-xl" />

                {tipe === 'pg' ? (
                  <div className="space-y-3 p-4 bg-[#030712]/40 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Opsi A" value={opsi.A} onChange={(e) => setOpsi({ ...opsi, A: e.target.value })} required />
                      <Input label="Opsi B" value={opsi.B} onChange={(e) => setOpsi({ ...opsi, B: e.target.value })} required />
                      <Input label="Opsi C" value={opsi.C} onChange={(e) => setOpsi({ ...opsi, C: e.target.value })} required />
                      <Input label="Opsi D" value={opsi.D} onChange={(e) => setOpsi({ ...opsi, D: e.target.value })} required />
                    </div>
                    <div className="mt-2">
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase">Kunci Jawaban</label>
                      <Select value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} className="bg-[#030712]/60 border-0 text-sm rounded-xl">
                        <option value="A">Opsi A</option>
                        <option value="B">Opsi B</option>
                        <option value="C">Opsi C</option>
                        <option value="D">Opsi D</option>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-[#030712]/40 rounded-xl">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><Input label="Tambah Kriteria Penilaian" value={inputChecklist} onChange={(e) => setInputChecklist(e.target.value)} /></div>
                      <Button variant="outline" type="button" onClick={handleAddChecklist} className="h-10 mb-0.5 bg-slate-800 text-xs border-0">Tambah</Button>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {checklist.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-[#030712]/60 rounded-xl text-xs">
                          <span>{index + 1}. {item}</span>
                          <button type="button" onClick={() => handleRemoveChecklist(index)} className="text-rose-400 hover:text-rose-300"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-800 text-xs border-0">Batal</Button>
                <Button variant="primary" onClick={handleSave} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs border-0">
                  <Save className="w-4 h-4 mr-1.5" /> Simpan ke Database
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}