import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import API from '../utils/api'; // Import Axios Instance
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Plus, Trash2, Edit3, Save, X, LogOut } from 'lucide-react';

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

  // Fungsi Logout / Ganti Akun
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  // 1. Ambil Data dari MySQL saat halaman dibuka (Read)
  const fetchSoal = async () => {
    try {
      const response = await API.get('/soal');
      setDataSoal(response.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengambil data soal dari database.');
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
        A: soal.opsi[0]?.replace('A. ', '') || '',
        B: soal.opsi[1]?.replace('B. ', '') || '',
        C: soal.opsi[2]?.replace('C. ', '') || '',
        D: soal.opsi[3]?.replace('D. ', '') || ''
      });
      setJawabanBenar(soal.jawaban_benar || 'A');
    } else {
      setChecklist(soal.checklist || []);
    }
    setIsModalOpen(true);
  };

  // 2. Fungsi Hapus Data dari MySQL (Delete)
  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus soal ini dari database MySQL?')) {
      try {
        await API.delete(`/soal/${id}`);
        fetchSoal(); // Refresh tabel
      } catch (err) {
        alert('Gagal menghapus data.');
      }
    }
  };

  // 3. Fungsi Simpan ke MySQL (Create & Update)
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
        // Eksekusi HTTP PUT untuk Update
        await API.put(`/soal/${editingId}`, payload);
      } else {
        // Eksekusi HTTP POST untuk Create
        await API.post('/soal', payload);
      }
      fetchSoal(); // Refresh tabel
      setIsModalOpen(false);
    } catch (err) {
      alert('Gagal menyimpan data ke database.');
    }
  };

  return (
    <div className="space-y-6 text-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-wide">BANK SOAL (LIVE DB)</h1>
          <p className="text-slate-400 text-sm">Data di bawah ini tersimpan secara permanen di database MySQL Anda.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tombol Logout Tambahan */}
          <Button variant="outline" onClick={handleLogout} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            <LogOut className="w-4 h-4 mr-1.5" /> Logout / Ganti Akun
          </Button>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Soal Baru
          </Button>
        </div>
      </div>

      <Card className="border-customBorder bg-surface">
        <Table
          headers={['No', 'Tipe', 'Pertanyaan Ujian', 'Detail Penilaian', 'Aksi']}
          data={listSoal}
          renderRow={(row, index) => (
            <tr key={row.id} className="border-b border-customBorder/20 hover:bg-white/5">
              <td className="px-4 py-4 text-xs font-mono text-slate-500">{index + 1}</td>
              <td className="px-4 py-4">
                <Badge variant={row.tipe === 'pg' ? 'primary' : 'secondary'}>{row.tipe === 'pg' ? 'Pilihan Ganda' : 'Praktik'}</Badge>
              </td>
              <td className="px-4 py-4 max-w-md">
                <p className="text-sm font-medium text-slate-100 truncate">{row.pertanyaan}</p>
              </td>
              <td className="px-4 py-4 text-xs text-slate-400">
                {row.tipe === 'pg' ? (
                  <span>Kunci: <strong className="text-primary">{row.jawaban_benar}</strong></span>
                ) : (
                  <span>{row.checklist?.length || 0} Kriteria Penilaian</span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(row)} className="p-1.5 rounded border border-customBorder text-slate-300 hover:text-primary"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </Card>

      {/* MODAL FORM OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-darkBg/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-surface border border-customBorder rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-customBorder/40 pb-3">
                <h3 className="font-display text-xl font-bold">{editingId ? 'EDIT SOAL DATABASE' : 'TAMBAH SOAL DATABASE'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Tipe Konten Pertanyaan</label>
                  <Select value={tipe} onChange={(e) => { setTipe(e.target.value); setChecklist([]); }} disabled={!!editingId}>
                    <option value="pg">Pilihan Ganda</option>
                    <option value="praktik">Ujian Praktik</option>
                  </Select>
                </div>

                <Textarea label="Butir Soal / Pertanyaan Ujian" placeholder="Tulis pertanyaan..." value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} required />

                {tipe === 'pg' ? (
                  <div className="space-y-3 p-4 bg-background/30 rounded-xl border border-customBorder/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Opsi A" value={opsi.A} onChange={(e) => setOpsi({ ...opsi, A: e.target.value })} required />
                      <Input label="Opsi B" value={opsi.B} onChange={(e) => setOpsi({ ...opsi, B: e.target.value })} required />
                      <Input label="Opsi C" value={opsi.C} onChange={(e) => setOpsi({ ...opsi, C: e.target.value })} required />
                      <Input label="Opsi D" value={opsi.D} onChange={(e) => setOpsi({ ...opsi, D: e.target.value })} required />
                    </div>
                    <div className="mt-2">
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">Kunci Jawaban</label>
                      <Select value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)}>
                        <option value="A">Opsi A</option>
                        <option value="B">Opsi B</option>
                        <option value="C">Opsi C</option>
                        <option value="D">Opsi D</option>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-background/30 rounded-xl border border-customBorder/20">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><Input label="Tambah Kriteria Penilaian" value={inputChecklist} onChange={(e) => setInputChecklist(e.target.value)} /></div>
                      <Button variant="outline" type="button" onClick={handleAddChecklist} className="h-10 mb-0.5">Tambah</Button>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {checklist.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-surface rounded-lg border border-customBorder/30 text-xs">
                          <span>{index + 1}. {item}</span>
                          <button type="button" onClick={() => handleRemoveChecklist(index)} className="text-red-400"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-customBorder/20 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button variant="primary" onClick={handleSave}>
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