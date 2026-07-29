import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Send, CheckCircle2, Clock, XCircle,
  Settings2, Users, ScanLine, FileSpreadsheet, ClipboardList
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Dummy log notifikasi — ganti dengan data dari API gateway (mis. Fonnte/Wablas)
const logNotifikasi = [
  { id: 1, santri: 'Ahmad Rifa\'i', techId: 'DCC26-0012', jenis: 'Presensi', pesan: 'Hadir di lab jam 07:15', status: 'Terkirim', waktu: '07:16' },
  { id: 2, santri: 'Nurul Hidayah', techId: 'DCC26-0045', jenis: 'Perizinan', pesan: 'Izin sakit disetujui pengawas', status: 'Terkirim', waktu: '08:02' },
  { id: 3, santri: 'Muhammad Fikri', techId: 'DCC26-0089', jenis: 'Nilai CBT', pesan: 'Nilai ujian Web Development: 88', status: 'Tertunda', waktu: '—' },
  { id: 4, santri: 'Siti Aisyah', techId: 'DCC26-0102', jenis: 'Presensi', pesan: 'Tidak hadir, belum scan TechID', status: 'Gagal', waktu: '07:40' },
];

const jenisIcon = {
  'Presensi': ScanLine,
  'Perizinan': FileSpreadsheet,
  'Nilai CBT': ClipboardList,
};

const statusStyle = {
  'Terkirim': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Tertunda': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Gagal': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const statusIcon = {
  'Terkirim': CheckCircle2,
  'Tertunda': Clock,
  'Gagal': XCircle,
};

export default function NotifikasiWhatsapp() {
  useDocumentTitle('Notifikasi WhatsApp Wali');
  const [aktif, setAktif] = useState({ presensi: true, perizinan: true, nilai: false });

  const toggle = (key) => setAktif((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif] pb-20 px-6 pt-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <MessageCircle className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-['Rajdhani',sans-serif] text-2xl font-bold text-white uppercase tracking-wide">
              Notifikasi WhatsApp Wali
            </h1>
            <p className="text-xs text-slate-400">Kirim kabar otomatis ke orang tua/wali santri lewat WhatsApp.</p>
          </div>
        </div>

        {/* PENGATURAN PEMICU NOTIFIKASI */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-[#0d1527]/70 border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-4 w-4 text-cyan-400" />
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm">
              Pemicu Notifikasi Otomatis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'presensi', label: 'Presensi Harian', desc: 'Kirim saat santri scan TechID masuk lab.', icon: ScanLine },
              { key: 'perizinan', label: 'Perizinan Disetujui', desc: 'Kirim saat pengawas menyetujui izin.', icon: FileSpreadsheet },
              { key: 'nilai', label: 'Nilai Ujian CBT', desc: 'Kirim saat hasil CBT santri terbit.', icon: ClipboardList },
            ].map(({ key, label, desc, icon: Icon }) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  aktif[key]
                    ? 'border-cyan-400/50 bg-cyan-400/5'
                    : 'border-slate-800 bg-[#0a1120]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${aktif[key] ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className={`text-[10px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border uppercase ${
                    aktif[key] ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {aktif[key] ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="font-['Rajdhani',sans-serif] font-bold text-sm text-white">{label}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* LOG NOTIFIKASI */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Send className="h-4 w-4 text-cyan-400" />
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm">
              Riwayat Notifikasi Terkirim
            </h2>
          </div>

          <div className="bg-[#0d1527]/70 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a1120] text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Santri</th>
                  <th className="px-5 py-3">Jenis</th>
                  <th className="px-5 py-3">Pesan</th>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logNotifikasi.map((row) => {
                  const JIcon = jenisIcon[row.jenis] || MessageCircle;
                  const SIcon = statusIcon[row.status];
                  return (
                    <tr key={row.id} className="border-t border-slate-800/80 hover:bg-[#0a1120]/60 transition">
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{row.santri}</p>
                        <p className="text-[11px] text-slate-500 font-['Rajdhani',sans-serif]">{row.techId}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5 text-slate-300 text-xs">
                          <JIcon className="h-3.5 w-3.5 text-cyan-400" /> {row.jenis}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{row.pesan}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs font-['Rajdhani',sans-serif]">{row.waktu}</td>
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1 w-fit text-[10px] font-['Rajdhani',sans-serif] font-bold px-2 py-1 rounded-md border uppercase ${statusStyle[row.status]}`}>
                          <SIcon className="h-3 w-3" /> {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Nomor wali diambil dari data induk santri di modul Akademik DCC. Hubungkan API gateway (Fonnte/Wablas/dsb) di halaman ini untuk mulai mengirim otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}