import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Sliders, Clock, Save, CheckCircle2, AlertCircle, Plus, Trash2, Edit3, X, BookOpen, Percent, Lock, Unlock, Power, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_KATALOG = [
  { id: 'word', nama: 'Microsoft Word', desc: 'Pengolahan Dokumen & Surat', durasi: 90, bobot_pg: 50, bobot_praktik: 50, kkm: 75 },
  { id: 'excel', nama: 'Microsoft Excel', desc: 'Pengolahan Data & Formula', durasi: 90, bobot_pg: 50, bobot_praktik: 50, kkm: 75 },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint', desc: 'Desain Presentasi Interaktif', durasi: 90, bobot_pg: 50, bobot_praktik: 50, kkm: 75 },
  { id: 'desain', nama: 'Desain Grafis', desc: 'Canva & Visual Typography', durasi: 90, bobot_pg: 40, bobot_praktik: 60, kkm: 75 },
  { id: 'pemrograman', nama: 'Pemrograman Web', desc: 'HTML, CSS, & JavaScript', durasi: 120, bobot_pg: 40, bobot_praktik: 60, kkm: 75 }
];

export default function PengaturanUjian() {
  const [katalogMapel, setKatalogMapel] = useState(DEFAULT_KATALOG);
  const [statusSesi, setStatusSesi] = useState('DITUTUP'); // 'DIBUKA' | 'DITUTUP'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
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
    bobot_praktik: 50,
    kkm: 75
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
      const { data: dataKatalog } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'katalog_mata_ujian')
        .maybeSingle();

      if (dataKatalog && dataKatalog.value) {
        const parsed = typeof dataKatalog.value === 'string' ? JSON.parse(dataKatalog.value) : dataKatalog.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(m => ({
            ...m,
            bobot_pg: m.bobot_pg !== undefined ? m.bobot_pg : 50,
            bobot_praktik: m.bobot_praktik !== undefined ? m.bobot_praktik : 50,
            kkm: m.kkm !== undefined && m.kkm !== null ? m.kkm : 75
          }));
          setKatalogMapel(normalized);
          localStorage.setItem('dcc_katalog_mapel', JSON.stringify(normalized));
        }
      }

      const { data: dataStatus } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'status_sesi_ujian')
        .maybeSingle();

      if (dataStatus && dataStatus.value) {
        const st = typeof dataStatus.value === 'string' ? JSON.parse(dataStatus.value) : dataStatus.value;
        setStatusSesi(st.status || 'DITUTUP');
        localStorage.setItem('dcc_status_sesi', st.status || 'DITUTUP');
      }
    } catch (err) {
      console.warn('Membaca pengaturan dari cache lokal...', err);
      const localKatalog = localStorage.getItem('dcc_katalog_mapel');
      if (localKatalog) {
        try { setKatalogMapel(JSON.parse(localKatalog)); } catch (e) {}
      }
      const localStatus = localStorage.getItem('dcc_status_sesi');
      if (localStatus) setStatusSesi(localStatus);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPengaturan();
  }, []);

  const handleToggleStatusSesi = async () => {
    const nextStatus = statusSesi === 'DIBUKA' ? 'DITUTUP' : 'DIBUKA';
    setIsTogglingStatus(true);
    setMessage({ type: '', text: '' });

    try {
      localStorage.setItem('dcc_status_sesi', nextStatus);

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .upsert({
          key: 'status_sesi_ujian',
          value: JSON.stringify({ status: nextStatus, updated_at: new Date().toISOString() }),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setStatusSesi(nextStatus);
      setMessage({
        type: 'success',
        text: `Sesi Ujian berhasil ${nextStatus === 'DIBUKA' ? 'DIBUKA! Peserta dapat mengakses ujian.' : 'DITUTUP! Akses ujian dikunci.'}`
      });
    } catch (err) {
      console.error('Gagal memperbarui status sesi:', err);
      setStatusSesi(nextStatus);
      setMessage({ type: 'warning', text: 'Status sesi berubah di lokal. Pastikan Supabase terhubung.' });
    } finally {
      setIsTogglingStatus(false);
    }
  };

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

      setMessage({ type: 'success', text: 'Katalog mata ujian, KKM & bobot berhasil disimpan!' });
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
    setFormMapel({ id: '', nama: '', desc: '', durasi: 90, bobot_pg: 50, bobot_praktik: 50, kkm: 75 });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormMapel({ 
      ...item, 
      bobot_pg: item.bobot_pg ?? 50, 
      bobot_praktik: item.bobot_praktik ?? 50,
      kkm: item.kkm ?? 75
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
      bobot_praktik: Number(formMapel.bobot_praktik),
      kkm: Number(formMapel.kkm)
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
              <p className="text-xs text-slate-400 font-sans">Kontrol Akses Sesi, Mata Ujian, KKM & Bobot Nilai</p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* KONTROL SESI UJIAN GLOBAL */}
            <div className="p-6 bg-[#0d1527]/80 border border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <Power className={`w-5 h-5 ${statusSesi === 'DIBUKA' ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <h2 className="text-sm font-display font-bold text-white uppercase tracking-widest">
                    KONTROL SESI UJIAN GLOBAL
                  </h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-display font-bold uppercase tracking-wider ${
                    statusSesi === 'DIBUKA' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}>
                    {statusSesi === 'DIBUKA' ? '● SESI AKTIF' : '○ SESI DITUTUP'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  {statusSesi === 'DIBUKA'
                    ? 'Sesi Ujian sedang DIBUKA. Seluruh peserta yang terdaftar dapat masuk ke Ruang Ujian.'
                    : 'Sesi Ujian sedang DITUTUP. Peserta tidak dapat masuk atau mengerjakan soal.'}
                </p>
              </div>

              <Button
                onClick={handleToggleStatusSesi}
                disabled={isTogglingStatus}
                className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 border-0 shadow-lg transition-all ${
                  statusSesi === 'DIBUKA'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                    : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-400/20'
                }`}
              >
                {statusSesi === 'DIBUKA' ? (
                  <>
                    <Lock className="w-4 h-4" /> KUNCI & TUTUP SESI
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" /> BUKA SESI UJIAN
                  </>
                )}
              </Button>
            </div>

            {/* MASTER MATA UJIAN, DURASI, KKM & BOBOT */}
            <div className="p-6 bg-[#0d1527]/60 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> MASTER MATA UJIAN, DURASI, KKM & BOBOT
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Atur durasi pengerjaan, KKM, serta persentase bobot nilai Pilihan Ganda & Praktik per mata ujian.
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
                <div className="p-8 text-center text-xs text-slate-500 font-sans">Memuat data pengaturan...</div>
              ) : (
                <form onSubmit={handleSimpan} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {katalogMapel.map((kat) => (
                      <div 
                        key={kat.id} 
                        className="p-4 rounded-xl bg-[#030712]/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700"
                      >
                        {/* KIRI: NAMA, ID, KKM, BOBOT (Flexbox Terkontrol) */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 flex-1 min-w-0">
                          
                          {/* Nama & Deskripsi (Lebar Minimal Terjaga) */}
                          <div className="w-full md:w-52 shrink-0 space-y-0.5">
                            <h3 className="font-display font-bold text-sm text-white truncate" title={kat.nama}>{kat.nama}</h3>
                            <p className="text-[11px] text-slate-400 font-sans truncate" title={kat.desc}>{kat.desc}</p>
                          </div>

                          {/* ID Badge */}
                          <div className="shrink-0 w-32">
                            <span className="inline-block text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded font-display font-bold uppercase tracking-wider truncate w-full text-center">
                              ID: {kat.id}
                            </span>
                          </div>

                          {/* KKM Badge */}
                          <div className="shrink-0 w-20">
                            <span className="inline-block text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded font-display font-bold w-full text-center">
                              KKM: {kat.kkm ?? 75}
                            </span>
                          </div>

                          {/* Bobot Badge */}
                          <div className="shrink-0 w-44">
                            <span className="inline-block text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded font-display font-bold w-full text-center">
                              Bobot: PG {kat.bobot_pg ?? 50}% | Prak {kat.bobot_praktik ?? 50}%
                            </span>
                          </div>
                        </div>

                        {/* KANAN: DURASI & AKSI (Fixed Right Alignment) */}
                        <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-slate-800/60 pt-2 md:pt-0">
                          
                          {/* Input Durasi dengan Lebar Pas (Lebar min 90px & padding lega) */}
                          <div className="flex items-center gap-1.5 bg-[#0d1527] border border-cyan-400/30 px-2 py-1 rounded-xl">
                            <input
                              type="number"
                              min="5"
                              max="360"
                              value={kat.durasi || 90}
                              onChange={(e) => handleDurasiChange(kat.id, parseInt(e.target.value) || 0)}
                              className="w-12 text-center font-display font-black text-cyan-400 bg-transparent text-sm focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400 font-sans font-bold pr-1">Mnt</span>
                          </div>

                          {/* Tombol Action */}
                          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">Durasi (Menit)</label>
                    <Input
                      type="number"
                      min="5"
                      max="360"
                      value={formMapel.durasi}
                      onChange={(e) => setFormMapel({ ...formMapel, durasi: parseInt(e.target.value) || 0 })}
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-display font-bold text-amber-400 mb-1.5 block uppercase flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Nilai KKM
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formMapel.kkm}
                      onChange={(e) => setFormMapel({ ...formMapel, kkm: parseInt(e.target.value) || 0 })}
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold text-amber-400"
                    />
                  </div>
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