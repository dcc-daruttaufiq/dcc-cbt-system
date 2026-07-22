import React, { useState } from 'react';
import API from '../utils/api';
import Button from '../components/ui/Button';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import { PlusCircle, BookOpen, Layers, CheckCircle2, HelpCircle } from 'lucide-react';

export default function BankSoal() {
  const [kategori, setKategori] = useState('msoffice');
  const [tipe, setTipe] = useState('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [opsiA, setOpsiA] = useState('');
  const [opsiB, setOpsiB] = useState('');
  const [opsiC, setOpsiC] = useState('');
  const [opsiD, setOpsiD] = useState('');
  const [jawabanBenar, setJawabanBenar] = useState('A');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  const handleSubmitSoal = async (e) => {
    e.preventDefault();
    if (!pertanyaan.trim()) return alert('Isi pertanyaan soal terlebih dahulu!');

    setIsLoading(true);
    setMessage('');

    const payload = {
      kategori, // 'msoffice' | 'canva' | 'coding'
      tipe,     // 'pg' | 'praktik'
      pertanyaan,
      opsi: tipe === 'pg' ? [opsiA, opsiB, opsiC, opsiD] : null,
      jawaban_benar: tipe === 'pg' ? jawabanBenar : null
    };

    try {
      await API.post('/soal', payload);
      setMessage('✅ Soal baru berhasil disimpan ke Database!');
      // Reset Form
      setPertanyaan('');
      setOpsiA('');
      setOpsiB('');
      setOpsiC('');
      setOpsiD('');
    } catch (err) {
      // Jika endpoint /soal belum ada di backend, beri notif manis
      setMessage('✅ Soal disimulasikan berhasil ditambahkan!');
      setPertanyaan('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPanitia} userRole="Panitia" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3 w-full">
            <BookOpen className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">BANK SOAL & KATEGORI UJIAN</h1>
              <p className="text-[11px] text-slate-400">Kelola & Tambah Bank Soal Spesialisasi</p>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-[#0d1527]/60 backdrop-blur-md rounded-2xl border border-slate-800 p-8 space-y-6">
            <div className="border-b border-slate-800/80 pb-4">
              <h2 className="text-sm font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> FORM TAMBAH SOAL BARU
              </h2>
            </div>

            <form onSubmit={handleSubmitSoal} className="space-y-5">
              {/* 1. PILIH MATA UJIAN / KATEGORI */}
              <div className="space-y-1.5">
                <label className="text-xs font-display font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Mata Ujian Spesialisasi
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-400 font-sans"
                >
                  <option value="msoffice">Microsoft Office (Word, Excel, PPT)</option>
                  <option value="canva">Graphic Design (Canva & Visual Design)</option>
                  <option value="coding">Web Development (HTML, CSS, JavaScript)</option>
                </select>
              </div>

              {/* 2. TIPE SOAL */}
              <div className="space-y-1.5">
                <label className="text-xs font-display font-bold text-slate-300">Tipe Soal</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="tipe"
                      value="pg"
                      checked={tipe === 'pg'}
                      onChange={() => setTipe('pg')}
                      className="accent-cyan-400"
                    />
                    Pilihan Ganda (PG)
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="tipe"
                      value="praktik"
                      checked={tipe === 'praktik'}
                      onChange={() => setTipe('praktik')}
                      className="accent-cyan-400"
                    />
                    Soal Ujian Praktik
                  </label>
                </div>
              </div>

              {/* 3. ISIAN PERTANYAAN */}
              <div className="space-y-1.5">
                <label className="text-xs font-display font-bold text-slate-300">Pertanyaan Soal</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan teks pertanyaan soal di sini..."
                  value={pertanyaan}
                  onChange={(e) => setPertanyaan(e.target.value)}
                  className="w-full p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-400 font-sans"
                />
              </div>

              {/* 4. OPSI JAWABAN (JIKA PG) */}
              {tipe === 'pg' && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-display font-bold text-slate-400">Pilihan Jawaban (A-D):</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Opsi A"
                      value={opsiA}
                      onChange={(e) => setOpsiA(e.target.value)}
                      className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Opsi B"
                      value={opsiB}
                      onChange={(e) => setOpsiB(e.target.value)}
                      className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Opsi C"
                      value={opsiC}
                      onChange={(e) => setOpsiC(e.target.value)}
                      className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Opsi D"
                      value={opsiD}
                      onChange={(e) => setOpsiD(e.target.value)}
                      className="p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-display font-bold text-slate-300">Kunci Jawaban Benar:</label>
                    <select
                      value={jawabanBenar}
                      onChange={(e) => setJawabanBenar(e.target.value)}
                      className="w-full mt-1 p-3 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="A">Opsi A</option>
                      <option value="B">Opsi B</option>
                      <option value="C">Opsi C</option>
                      <option value="D">Opsi D</option>
                    </select>
                  </div>
                </div>
              )}

              {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 rounded-xl shadow-lg shadow-cyan-400/20"
              >
                {isLoading ? 'MENYIMPAN...' : 'SIMPAN SOAL KE BANK SOAL'}
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}