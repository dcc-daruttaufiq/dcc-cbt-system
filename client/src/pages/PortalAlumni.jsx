import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, Quote, Building2, MapPin } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const alumni = [
  {
    nama: 'Fauzan Abdillah',
    angkatan: 'Angkatan 2023',
    status: 'Mahasiswa Informatika, Universitas Indonesia',
    testimoni: 'Skill dasar coding dari DCC bikin saya jauh lebih siap masuk kuliah teknik.',
    kategori: 'Studi',
  },
  {
    nama: 'Hana Salsabila',
    angkatan: 'Angkatan 2022',
    status: 'Staff Desain Grafis, PT Kreasi Visual',
    testimoni: 'Sertifikat DCC jadi portofolio pertama saya waktu melamar kerja.',
    kategori: 'Kerja',
  },
  {
    nama: 'Rizky Maulana',
    angkatan: 'Angkatan 2023',
    status: 'Freelance Web Developer',
    testimoni: 'Dari lab DCC, saya belajar HTML/CSS pertama kali dan sekarang jadi profesi.',
    kategori: 'Kerja',
  },
];

const lowonganMagang = [
  { posisi: 'Magang Front-End Developer', mitra: 'PT Digital Kreatif Nusantara', lokasi: 'Remote / Tangerang' },
  { posisi: 'Magang Desain Grafis', mitra: 'Studio Visual Rasa', lokasi: 'Tangerang' },
];

const kategoriWarna = {
  Studi: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  Kerja: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export default function PortalAlumni() {
  useDocumentTitle('Portal Alumni DCC');

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif] pb-20 px-6 pt-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <Briefcase className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-['Rajdhani',sans-serif] text-2xl font-bold text-white uppercase tracking-wide">
              Portal Alumni DCC
            </h1>
            <p className="text-xs text-slate-400">Jejak lulusan Daruttaufiq Computer Centre setelah lulus dari pondok.</p>
          </div>
        </div>

        {/* DIREKTORI ALUMNI */}
        <div className="mb-12">
          <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-cyan-400" /> Cerita Alumni
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {alumni.map((a, idx) => (
              <motion.div
                key={a.nama}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-[#0d1527]/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3"
              >
                <span className={`w-fit text-[9px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${kategoriWarna[a.kategori]}`}>
                  {a.kategori}
                </span>
                <div>
                  <p className="font-['Rajdhani',sans-serif] font-bold text-white text-base">{a.nama}</p>
                  <p className="text-[11px] text-slate-500">{a.angkatan}</p>
                </div>
                <p className="text-xs text-slate-300">{a.status}</p>
                <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                  <Quote className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 italic leading-relaxed">{a.testimoni}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* LOWONGAN MAGANG MITRA */}
        <div>
          <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" /> Info Magang dari Mitra
          </h2>
          <div className="space-y-3">
            {lowonganMagang.map((l) => (
              <div key={l.posisi} className="bg-[#0d1527]/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-['Rajdhani',sans-serif] font-bold text-white text-sm">{l.posisi}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{l.mitra}</p>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                  <MapPin className="h-3.5 w-3.5" /> {l.lokasi}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Belum ada mitra magang terhubung? Hubungi tim DCC untuk menambahkan kerja sama baru di halaman ini.
          </p>
        </div>
      </div>
    </div>
  );
}
