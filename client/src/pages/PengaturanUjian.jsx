import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Sliders, Clock, Save, CheckCircle2, AlertCircle, ShieldCheck, Plus, Trash2, Edit3, X, BookOpen, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_KATALOG = [
  { id: 'word', nama: 'Microsoft Word', desc: 'Pengolahan Dokumen & Surat', durasi: 90, bobot_pg: 50, bobot_praktik: 50 },
  { id: 'excel', nama: 'Microsoft Excel', desc: 'Pengolahan Data & Formula', durasi: 90, bobot_pg: 50, bobot_praktik: 50 },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint', desc: 'Desain Presentasi Interaktif', durasi: 90, bobot_pg: 50, bobot_praktik: 50 },
  { id: 'desain', nama: 'Desain Grafis', desc: 'Canva & Visual Typography', durasi: 90, bobot_pg: 40, bobot_praktik: 60 },
  { id: 'pemrograman', nama: 'Pemrograman Web', desc: 'HTML, CSS, & JavaScript', durasi: 120, bobot_pg: 40, bobot_praktik: 60 }
];

export default function PengaturanUjian() {
  const [katalogMapel, setKatalogMapel] = useState(DEFAULT_KATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // State Modal Form Tambah/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formMapel, setFormMapel] = useState({ 
    id: '', 
    nama: '', 
    desc: '', 
    durasi: 90, 
    bobot_pg: 50, 
    bobot_praktik: 50 
  });

  const menuPengawas = [
    { label: 'Koreksi Ujian', path: '/dashboard-Pengawas', icon: '📊' },
    { label: 'Repositori Soal', path: '/bank-soal', icon: '📚' },
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
          const normalized = parsed.map(m => ({
            ...m,
            bobot_pg: m.bobot_pg !== undefined ? m.bobot_pg : 50,
            bobot_praktik: m.bobot_praktik !== undefined ? m.bobot_praktik : 50
          }));
          setKatalogMapel(normalized);
          localStorage.setItem('dcc_katalog_mapel', JSON.stringify(normalized));
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

  // Helper Auto-Save Ke Supabase Cloud
  const saveToSupabase = async (updatedList) => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      localStorage.setItem('dcc_katalog_mapel', JSON.stringify(updatedList));

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .upsert({
          key: 'katalog_mata_ujian',
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Katalog mata ujian & bobot berhasil disimpan permanen ke Cloud!' });
    } catch (err) {
      console.error('Gagal menyimpan ke Cloud:', err);
      setMessage({ type: 'warning', text: 'Tersimpan di Lokal. Pastikan Supabase terhubung.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimpan = (e) => {
    if (e) e.preventDefault();
    saveToSupabase(katalogMapel);
  };

  const handleDurasiChange = (id, val) => {
    const updated = katalogMapel.map(m => m.id === id ? { ...m, durasi: val } : m);
    setKatalogMapel(updated);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormMapel({ id: '', nama: '', desc: '', durasi: 90, bobot_pg: 50, bobot_praktik: 50 });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormMapel({ 
      ...item, 
      bobot_pg: item.bobot_pg ?? 50, 
      bobot_praktik: item.bobot_praktik ?? 50 
    });
    setIsModalOpen(true);
  };

  const handleDeleteMapel = (id, nama) => {
    if (katalogMapel.length <= 1) {
      return alert('Sistem harus memiliki minimal 1 Mata Ujian!');
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus Mata Ujian "${nama}"?`)) return;

    const updated = katalogMapel.filter(m => m.id !== id);
    setKatalogMapel(updated);
    saveToSupabase(updated);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formMapel.nama.trim()) return alert('Nama Mata Ujian wajib diisi!');

    const totalBobot = Number(formMapel.bobot_pg) + Number(formMapel.bobot_praktik);
    if (totalBobot !== 100) {
      return alert(`Total bobot penilaian harus 100%! Saat ini totalnya: ${totalBobot}% (PG: ${formMapel.bobot_pg}%, Praktik: ${formMapel.bobot_praktik}%)`);
    }

    const generatedId = formMapel.id.trim()
      ? formMapel.id.toLowerCase().replace(/[^a-z0-9]/g, '')
      : formMapel.nama.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!editingId && katalogMapel.some(m => m.id === generatedId)) {
      return alert('ID / Kode Mata Ujian ini sudah digunakan! Gunakan nama yang berbeda.');
    }

    const payloadItem = {
      ...formMapel,
      id: editingId ? editingId : generatedId,
      durasi: Number(formMapel.durasi),
      bobot_pg: Number(formMapel.bobot_pg),
      bobot_praktik: Number(formMapel.bobot_praktik)
    };

    let updatedList = [];
    if (editingId) {
      updatedList = katalogMapel.map(m => m.id === editingId ? payloadItem : m);
    } else {
      updatedList = [...katalogMapel, payloadItem];
    }

    setKatalogMapel(updatedList);
    saveToSupabase(updatedList);
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
              <p className="text-xs text-slate-400 font-sans">Kelola Mata Ujian, Alokasi Durasi & Bobot Penilaian</p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">

            <div className="p-6 bg-[#0d1527]/60 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> MASTER MATA UJIAN, DURASI & BOBOT
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Atur durasi pengerjaan serta persentase bobot nilai Pilihan Ganda & Praktik per mata ujian.
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
                      <div key={kat.id} className="p-4 rounded-xl bg-[#030712]/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* SISI KIRI: NAMA, ID & BOBOT (DISEJAJARIN RAPI PAKE FLEX & GRID) */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 flex-1 min-w-0">
                          
                          {/* Nama & Deskripsi Mapel */}
                          <div className="w-full md:w-52 shrink-0 space-y-0.5">
                            <h3 className="font-display font-bold text-sm text-white truncate">{kat.nama}</h3>
                            <p className="text-[11px] text-slate-400 font-sans truncate">{kat.desc}</p>
                          </div>

                          {/* ID Badge (Kolom Teratur) */}
                          <div className="w-32 shrink-0">
                            <span className="inline-block text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded font-display font-bold uppercase tracking-wider">
                              ID: {kat.id}
                            </span>
                          </div>

                          {/* Bobot Badge (Kolom Teratur) */}
                          <div className="w-48 shrink-0">
                            <span className="inline-block text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded font-display font-bold">
                              Bobot: PG {kat.bobot_pg ?? 50}% | Praktik {kat.bobot_praktik ?? 50}%
                            </span>
                          </div>

                        </div>

                        {/* SISI KANAN: BAR DURASI (SOLID CYAN, TEKS BIRU TUA, TANPA BORDER LINE) & BUTTONS */}
                        <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
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
                              /* 
                                Custom Bar Durasi:
                                - bg-cyan-400: Latar Biru Cyan Solid
                                - text-[#071426]: Warna Angka Biru Tua Kontras
                                - border-0: Tanpa Garis Tepi/Outlined
                              */
                              className="w-20 text-center font-display font-black text-[#071426] text-sm py-1.5 bg-cyan-400 border-0 focus:outline-none focus:ring-2 focus:ring-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20"
                            />
                            <span className="text-xs text-slate-300 font-sans font-bold">Menit</span>
                          </div>

                          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(kat)}
                              className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                              title="Edit Mata Ujian & Bobot"
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
                      <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Durasi'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* MODAL INPUT / EDIT MATA UJIAN & BOBOT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <h3 className="font-display text-base font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> {editingId ? 'EDIT MATA UJIAN & BOBOT' : 'TAMBAH MATA UJIAN & BOBOT'}
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
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Durasi Ujian (Menit)</label>
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

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div>
                    <label className="text-[11px] font-display font-bold text-cyan-400 mb-1 block uppercase flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Bobot PG (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formMapel.bobot_pg}
                      onChange={(e) => {
                        const pgVal = parseInt(e.target.value) || 0;
                        const prakVal = Math.max(0, 100 - pgVal);
                        setFormMapel({ ...formMapel, bobot_pg: pgVal, bobot_praktik: prakVal });
                      }}
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-display font-bold text-purple-400 mb-1 block uppercase flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Bobot Praktik (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formMapel.bobot_praktik}
                      onChange={(e) => {
                        const prakVal = parseInt(e.target.value) || 0;
                        setFormMapel({ ...formMapel, bobot_praktik: prakVal });
                      }}
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  *Total bobot Pilihan Ganda dan Praktik wajib berjumlah 100%.
                </p>

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