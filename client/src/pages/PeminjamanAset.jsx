import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PackageCheck, Laptop, Camera, Projector, Plus, Clock,
  CheckCircle2, XCircle, RotateCcw
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const asetTersedia = [
  { id: 1, nama: 'PC Lab Unit 12', icon: Laptop, kategori: 'Komputer' },
  { id: 2, nama: 'Proyektor Epson EB-X05', icon: Projector, kategori: 'Presentasi' },
  { id: 3, nama: 'Kamera Digital Canon EOS', icon: Camera, kategori: 'Multimedia' },
];

const statusStyle = {
  'Menunggu': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Disetujui': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'Dikembalikan': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Ditolak': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const statusIcon = {
  'Menunggu': Clock,
  'Disetujui': CheckCircle2,
  'Dikembalikan': RotateCcw,
  'Ditolak': XCircle,
};

const riwayatAwal = [
  { id: 1, aset: 'Kamera Digital Canon EOS', peminjam: 'Ahmad Rifa\'i (DCC26-0012)', keperluan: 'Dokumentasi lomba desain', tanggal: '28 Jul 2026', status: 'Disetujui' },
  { id: 2, aset: 'Proyektor Epson EB-X05', peminjam: 'Ust. Fauzan (Pengawas)', keperluan: 'Presentasi materi akademik', tanggal: '27 Jul 2026', status: 'Dikembalikan' },
  { id: 3, aset: 'PC Lab Unit 12', peminjam: 'Muhammad Fikri (DCC26-0089)', keperluan: 'Latihan CBT mandiri sore hari', tanggal: '26 Jul 2026', status: 'Menunggu' },
];

export default function PeminjamanAset() {
  useDocumentTitle('Peminjaman Aset Lab');
  const [riwayat, setRiwayat] = useState(riwayatAwal);
  const [form, setForm] = useState({ aset: '', peminjam: '', keperluan: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.aset || !form.peminjam || !form.keperluan) return;
    setRiwayat([
      { id: Date.now(), aset: form.aset, peminjam: form.peminjam, keperluan: form.keperluan, tanggal: 'Hari ini', status: 'Menunggu' },
      ...riwayat,
    ]);
    setForm({ aset: '', peminjam: '', keperluan: '' });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif] pb-20 px-6 pt-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <PackageCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-['Rajdhani',sans-serif] text-2xl font-bold text-white uppercase tracking-wide">
              Peminjaman Aset Lab
            </h1>
            <p className="text-xs text-slate-400">Ajukan dan pantau peminjaman perangkat lab DCC secara tercatat.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM PENGAJUAN */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-[#0d1527]/70 border border-slate-800 rounded-2xl p-6 h-fit"
          >
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" /> Ajukan Peminjaman
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">Pilih Aset</label>
                <select
                  value={form.aset}
                  onChange={(e) => setForm({ ...form, aset: e.target.value })}
                  className="w-full mt-1 bg-[#0a1120] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/60"
                >
                  <option value="">— Pilih perangkat —</option>
                  {asetTersedia.map((a) => (
                    <option key={a.id} value={a.nama}>{a.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">Nama Peminjam</label>
                <input
                  type="text"
                  value={form.peminjam}
                  onChange={(e) => setForm({ ...form, peminjam: e.target.value })}
                  placeholder="Nama & TechID / Jabatan"
                  className="w-full mt-1 bg-[#0a1120] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">Keperluan</label>
                <textarea
                  value={form.keperluan}
                  onChange={(e) => setForm({ ...form, keperluan: e.target.value })}
                  placeholder="Jelaskan keperluan peminjaman"
                  rows={3}
                  className="w-full mt-1 bg-[#0a1120] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/60 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-4 py-2.5 font-['Rajdhani',sans-serif] text-xs font-bold text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 transition-all uppercase tracking-wider"
              >
                Kirim Pengajuan
              </button>
            </div>
          </motion.form>

          {/* RIWAYAT PEMINJAMAN */}
          <div className="lg:col-span-2">
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4">
              Riwayat & Status Peminjaman
            </h2>
            <div className="space-y-3">
              {riwayat.map((row) => {
                const SIcon = statusIcon[row.status];
                return (
                  <div key={row.id} className="bg-[#0d1527]/70 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-['Rajdhani',sans-serif] font-bold text-white text-sm">{row.aset}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{row.peminjam}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{row.keperluan}</p>
                      <p className="text-[10px] text-slate-600 mt-2 font-['Rajdhani',sans-serif] uppercase tracking-wider">{row.tanggal}</p>
                    </div>
                    <span className={`flex items-center gap-1 shrink-0 text-[10px] font-['Rajdhani',sans-serif] font-bold px-2.5 py-1 rounded-md border uppercase ${statusStyle[row.status]}`}>
                      <SIcon className="h-3 w-3" /> {row.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
