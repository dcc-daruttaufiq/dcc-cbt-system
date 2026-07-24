import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Sliders, Clock, Save, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

const KATALOG_KATEGORI = [
  { id: 'word', nama: 'Microsoft Word', desc: 'Pengolahan Dokumen & Surat' },
  { id: 'excel', nama: 'Microsoft Excel', desc: 'Pengolahan Data & Formula' },
  { id: 'powerpoint', nama: 'Microsoft PowerPoint', desc: 'Desain Presentasi Interaktif' },
  { id: 'desain', nama: 'Desain Grafis', desc: 'Canva & Visual Typography' },
  { id: 'pemrograman', nama: 'Pemrograman Web', desc: 'HTML, CSS, & JavaScript' }
];

export default function PengaturanUjian() {
  const [durasiUjian, setDurasiUjian] = useState({
    word: 90,
    excel: 90,
    powerpoint: 90,
    desain: 90,
    pemrograman: 120
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const menuPanitia = [
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
        .eq('key', 'durasi_ujian_menit')
        .maybeSingle();

      if (!error && data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setDurasiUjian(prev => ({ ...prev, ...parsed }));
        localStorage.setItem('dcc_durasi_ujian', JSON.stringify(parsed));
      }
    } catch (err) {
      console.warn('Membaca durasi dari cache lokal...', err);
      const local = localStorage.getItem('dcc_durasi_ujian');
      if (local) {
        try { setDurasiUjian(JSON.parse(local)); } catch (e) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPengaturan();
  }, []);

  // Simpan Pengaturan ke Supabase Cloud
  const handleSimpan = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      localStorage.setItem('dcc_durasi_ujian', JSON.stringify(durasiUjian));

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .upsert({
          key: 'durasi_ujian_menit',
          value: JSON.stringify(durasiUjian),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Pengaturan durasi ujian berhasil disimpan ke Supabase Cloud!' });
    } catch (err) {
      console.error('Gagal menyimpan ke Cloud:', err);
      setMessage({ type: 'warning', text: 'Tersimpan di Lokal. Pastikan SQL Editor Supabase sudah dijalankan.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPanitia} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <Sliders className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">PENGATURAN UJIAN</h1>
              <p className="text-xs text-slate-400">Konfigurasi Alokasi Waktu Ujian Peserta</p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">

            <div className="p-6 bg-[#0d1527]/60 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800/80 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> ALOKASI WAKTU PENGERJAAN
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tentukan batas durasi waktu (dalam menit) untuk setiap mata ujian.
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-400 opacity-80" />
              </div>

              {message.text && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">Memuat konfigurasi durasi...</div>
              ) : (
                <form onSubmit={handleSimpan} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {KATALOG_KATEGORI.map((kat) => (
                      <div key={kat.id} className="p-4 rounded-xl bg-[#030712]/90 border border-slate-800 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-display font-bold text-sm text-white">{kat.nama}</h3>
                          <p className="text-[11px] text-slate-400">{kat.desc}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="5"
                            max="360"
                            value={durasiUjian[kat.id] || 90}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setDurasiUjian(prev => ({ ...prev, [kat.id]: val }));
                            }}
                            className="w-24 text-center font-display font-bold text-cyan-400 text-sm py-2 bg-[#0d1527] border-slate-700"
                          />
                          <span className="text-xs text-slate-400 font-sans font-bold">Menit</span>
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
    </div>
  );
}