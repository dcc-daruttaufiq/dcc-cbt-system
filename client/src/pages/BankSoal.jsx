import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import API from '../utils/api';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Plus, Trash2, Edit3, Save, X, BookOpen } from 'lucide-react';

export default function BankSoal() {
  useDocumentTitle('Manajemen Bank Soal API');

  // States
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

  // Menu Sidebar Panitia
  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  // 1. Ambil Data dari MySQL saat halaman dibuka (Read)
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

  // 2. Fungsi Hapus Data (Delete)
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

  // 3. Fungsi Simpan (Create & Update)
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
      {/* SIDEBAR CLEAN */}
      <Sidebar links={menuPanitia} userRole="Panitia" />

      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <BookOpen className="text-primary w-6 h-6" />
              <div>
                <h1 className="text-base font-bold text-white tracking-wide">BANK SOAL (LIVE DB)</h1>
                <p className="text-[11px] text-slate-400">Data tersimpan secara permanen di Database</p>
              </div>
            </div>

            <Button variant="primary" onClick={openCreateModal} className="text-xs bg-primary hover:opacity-90 border-0 text-background font-bold">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Soal Baru
            </Button>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* TABEL DATA CLEAN */}
            <div className="bg-[#0d1527]/60 backdrop-blur-md rounded-2xl overflow-hidden">
              <Table
                headers={['No', 'Tipe', 'Pertanyaan Ujian', 'Detail Penilaian', 'Aksi']}
                data={listSoal}
                renderRow={(row, index) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4 text-xs font-mono text-slate-400">{index + 1}</td>
                    <td className="px-5 py-4">
                      <Badge variant={row.tipe === 'pg' ? 'primary' : 'secondary'} className="text-[10px] px-2 py-0.5 rounded-md">
                        {row.tipe === 'pg' ? 'Pilihan Ganda' : 'Praktik'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 max-w-md">
                      <p className="text-sm font-medium text-slate-100 truncate">{row.pertanyaan}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {row.tipe === 'pg' ? (
                        <span>Kunci: <strong className="text-primary font-bold">{row.jawaban_benar || row.jawabanBenar}</strong></span>
                      ) : (
                        <span>{row.checklist?.length || 0} Kriteria Penilaian</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(row)} className="p-2 rounded-xl bg-slate-800/60 text-slate-300 hover:text-primary transition">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </div>

          </div>
        </main>
      </div>

      {/* MODAL FORM OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0d1527] border-0 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <h3 className="font-display text-lg font-bold text-primary">{editingId ? 'EDIT SOAL DATABASE' : 'TAMBAH SOAL DATABASE'}</h3>
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

                <Textarea label="Butir Soal / Pertanyaan Ujian" placeholder="Tulis pertanyaan..." value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} required className="bg-[#030712]/60 border-0 text-sm rounded-xl" />

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
                <Button variant="primary" onClick={handleSave} className="bg-primary hover:opacity-90 text-background font-bold text-xs border-0">
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