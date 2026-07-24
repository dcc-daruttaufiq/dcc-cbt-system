import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Sliders, Clock, Save, CheckCircle2, AlertCircle, ShieldCheck, Plus, Trash2, Edit3, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_KATALOG = [
  { id: 'word', nama: 'Microsoft Word', desc: 'Pengolahan Dokumen & Surat', durasi: 90 },
  { id: 'excel', nama: 'Microsoft Excel', desc: 'Pengolahan Data & Formula', durasi: 90 },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint', desc: 'Desain Presentasi Interaktif', durasi: 90 },
  { id: 'desain', nama: 'Desain Grafis', desc: 'Canva & Visual Typography', durasi: 90 },
  { id: 'pemrograman', nama: 'Pemrograman Web', desc: 'HTML, CSS, & JavaScript', durasi: 120 }
];

export default function PengaturanUjian() {
  const [katalogMapel, setKatalogMapel] = useState(DEFAULT_KATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // State Modal Form Tambah/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formMapel, setFormMapel] = useState({ id: '', nama: '', desc: '', durasi: 90 });

  const menuPengawas = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Pengaturan Ujian', path: '/pengaturan-ujian', icon: '⚙️' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  // Load Pengaturan dari Supabase Cloud
  const loadPengaturan = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'katalog_mata_ujian')
        .maybeSingle();

      if (!error && data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setKatalogMapel(parsed);
          localStorage.setItem('dcc_katalog_mapel', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.warn('Membaca katalog dari cache lokal...', err);
      const local = localStorage.getItem('dcc_katalog_mapel');
      if (local) {
        try { setKatalogMapel(JSON.parse(local)); } catch (e) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPengaturan();
  }, []);

  // Simpan Katalog Mata Ujian ke Supabase Cloud
  const handleSimpan = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      localStorage.setItem('dcc_katalog_mapel', JSON.stringify(katalogMapel));

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .upsert({
          key: 'katalog_mata_ujian',
          value: JSON.stringify(katalogMapel),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Pengaturan mata ujian & durasi berhasil disimpan!' });
    } catch (err) {
      console.error('Gagal menyimpan ke Cloud:', err);
      setMessage({ type: 'warning', text: 'Tersimpan di Lokal. Pastikan database Supabase terhubung.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Durasi Per-Item
  const handleDurasiChange = (id, val) => {
    setKatalogMapel(prev => prev.map(m => m.id === id ? { ...m, durasi: val } : m));
  };

  // Buka Modal Tambah
  const openAddModal = () => {
    setEditingId(null);
    setFormMapel({ id: '', nama: '', desc: '', durasi: 90 });
    setIsModalOpen(true);
  };

  // Buka Modal Edit
  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormMapel({ ...item });
    setIsModalOpen(true);
  };

  // Hapus Mata Ujian
  const handleDeleteMapel = (id, nama) => {
    if (katalogMapel.length <= 1) {
      return alert('Sistem harus memiliki minimal 1 Mata Ujian!');
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus Mata Ujian "${nama}"?`)) return;

    const updated = katalogMapel.filter(m => m.id !== id);
    setKatalogMapel(updated);
    localStorage.setItem('dcc_katalog_mapel', JSON.stringify(updated));
  };

  // Submit Modal Form (Tambah / Edit)
  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formMapel.nama.trim()) return alert('Nama Mata Ujian wajib diisi!');

    const generatedId = formMapel.id.trim()
      ? formMapel.id.toLowerCase().replace(/[^a-z0-9]/g, '')
      : formMapel.nama.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!editingId && katalogMapel.some(m => m.id === generatedId)) {
      return alert('ID / Kode Mata Ujian ini sudah digunakan! Gunakan nama yang berbeda.');
    }

    let updatedList = [];
    if (editingId) {
      updatedList = katalogMapel.map(m => m.id === editingId ? { ...formMapel, id: editingId } : m);
    } else {
      updatedList = [...katalogMapel, { ...formMapel, id: generatedId }];
    }

    setKatalogMapel(updatedList);
    localStorage.setItem('dcc_katalog_mapel', JSON.stringify(updatedList));
    setIsModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPengawas} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0 font-sans">
        <Navbar>
          <div className="flex items-center gap-3">
            <Sliders className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">PENGATURAN UJIAN</h1>
              <p className="text-xs text-slate-400 font-sans">Kelola Master Mata Ujian & Alokasi Durasi Waktu</p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">

            <div className="p-6 bg-[#0d1527]/60 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> MASTER MATA UJIAN & DURASI
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Tambah mata ujian baru atau atur alokasi durasi waktu pengerjaan (menit).
                  </p>
                </div>

                <Button
                  onClick={openAddModal}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs px-4 py-2 border-0 rounded-xl flex items-center gap-1.5 w-fit"
                >
                  <Plus className="w-4 h-4" /> Tambah Mata Ujian
                </Button>
              </div>

              {message.text && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border font-sans ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 font-sans">Memuat katalog mata ujian...</div>
              ) : (
                <form onSubmit={handleSimpan} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {katalogMapel.map((kat) => (
                      <div key={kat.id} className="p-4 rounded-xl bg-[#030712]/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-sm text-white">{kat.nama}</h3>
                            <span className="text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded font-display font-bold uppercase">
                              ID: {kat.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans">{kat.desc}</p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="5"
                              max="360"
                              value={kat.durasi || 90}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                handleDurasiChange(kat.id, val);
                              }}
                              className="w-20 text-center font-display font-extrabold text-slate-950 text-sm py-1.5 bg-cyan-400 border-2 border-cyan-300 focus:bg-cyan-300 focus:border-cyan-200 focus:outline-none shadow-[0_0_15px_rgba(34,211,238,0.4)] rounded-xl transition-all"
                            />
                            <span className="text-xs text-slate-300 font-sans font-bold">Menit</span>
                          </div>

                          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(kat)}
                              className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                              title="Edit Mata Ujian"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMapel(kat.id, kat.nama)}
                              className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                              title="Hapus Mata Ujian"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs px-6 py-2.5 border-0 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-400/20"
                    >
                      <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* MODAL INPUT / EDIT MATA UJIAN */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <h3 className="font-display text-base font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> {editingId ? 'EDIT MATA UJIAN' : 'TAMBAH MATA UJIAN'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Nama Mata Ujian</label>
                  <Input
                    placeholder="Contoh: Adobe Photoshop"
                    value={formMapel.nama}
                    onChange={(e) => setFormMapel({ ...formMapel, nama: e.target.value })}
                    required
                    className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Deskripsi Singkat</label>
                  <Input
                    placeholder="Contoh: Desain Grafis & Manipulasi Foto"
                    value={formMapel.desc}
                    onChange={(e) => setFormMapel({ ...formMapel, desc: e.target.value })}
                    className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Durasi Default (Menit)</label>
                  <Input
                    type="number"
                    min="5"
                    max="360"
                    value={formMapel.durasi}
                    onChange={(e) => setFormMapel({ ...formMapel, durasi: parseInt(e.target.value) || 0 })}
                    required
                    className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-800 text-xs border-0 font-sans">Batal</Button>
                  <Button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0">
                    <Save className="w-4 h-4 mr-1.5" /> Simpan Mata Ujian
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}