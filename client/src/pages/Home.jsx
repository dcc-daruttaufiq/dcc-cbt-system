import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, ScanLine, KeyRound, ArrowRight,
  FileSpreadsheet, MessageSquareHeart, MonitorCheck, GraduationCap, Award
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LOGO_URL } from '../config/brand';

// 🧩 Daftar sistem/modul terpadu DCC.
// Semua ide kamu & fitur pelengkap sudah dipajang di sini secara rapi!
const modul = [
  {
    label: 'Sistem Ujian DCC',
    desc: 'CBT ujian sertifikasi kompetensi — bank soal, koreksi, dan laporan nilai.',
    path: '/dashboard-pengawas',
    icon: ClipboardList,
    badge: 'Aktif'
  },
  {
    label: 'Presensi Harian Santri',
    desc: 'Scan kartu TechID via kamera untuk mencatat kehadiran harian secara realtime.',
    path: '/absensi-scan',
    icon: ScanLine,
    badge: 'Aktif'
  },
  {
    label: 'Akun DCC',
    desc: 'Login khusus Admin, Anggota/Pengawas, dan Tamu untuk akses sistem terpadu.',
    path: '/akun-login',
    icon: KeyRound,
    badge: 'Aktif'
  },
  {
    label: 'Perizinan Santri',
    desc: 'Form pengajuan izin resmi santri (sakit / keperluan) via komputer bersama.',
    path: '/perizinan-santri',
    icon: FileSpreadsheet,
    badge: 'Baru'
  },
  {
    label: 'Aspirasi Santri',
    desc: 'Ruang aman tempat santri bercerita, menyampaikan kesan, & saran belajar.',
    path: '/aspirasi-santri',
    icon: MessageSquareHeart,
    badge: 'Baru'
  },
  {
    label: 'Fasilitas & Aset DCC',
    desc: 'Pencatatan inventaris perangkat komputer & fasilitas laboratorium DCC.',
    path: '/fasilitas-dcc',
    icon: MonitorCheck,
    badge: 'Baru'
  },
  {
    label: 'Akademik DCC',
    desc: 'Portal belajar santri — modul materi, silabus, jadwal, & riwayat nilai.',
    path: '/akademik-dcc',
    icon: GraduationCap,
    badge: 'Baru'
  },
  {
    label: 'E-Sertifikat & Verifikasi',
    desc: 'Portal unduh & verifikasi publik keaslian sertifikat kelulusan santri.',
    path: '/verifikasi-sertifikat',
    icon: Award,
    badge: 'Pengembangan'
  },
];

export default function Home() {
  useDocumentTitle('Menu Utama');
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-[#030712] px-6 py-16 text-center font-['Poppins',sans-serif]">
      
      {/* HEADER HERO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center max-w-2xl mx-auto"
      >
        <img 
          src={LOGO_URL} 
          alt="Logo DCC" 
          className="mb-4 h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]" 
          onError={(e) => { e.target.style.display = 'none'; }} 
        />
        <p className="mb-2 font-['Rajdhani',sans-serif] text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">
          Daruttaufiq Computer Centre
        </p>
        <h1 className="font-['Rajdhani',sans-serif] text-4xl font-bold text-white md:text-5xl tracking-wide uppercase">
          Menu <span className="text-cyan-400">Utama</span>
        </h1>
        <p className="mt-3 text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed">
          Pilih portal/sistem yang ingin dibuka. Seluruh modul terintegrasi dalam ekosistem digital terpadu DCC.
        </p>
      </motion.div>

      {/* GRID KARTU MODUL */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
        }}
        className="grid w-full max-w-5xl grid-cols-1 gap-5 mt-10 sm:grid-cols-2 lg:grid-cols-4"
      >
        {modul.map(({ icon: Icon, label, desc, path, badge }) => (
          <motion.button
            key={label}
            onClick={() => navigate(path)}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0 },
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0d1527]/70 backdrop-blur-md p-6 text-center shadow-xl transition-all hover:border-cyan-400/60 hover:bg-[#0d1527] hover:shadow-cyan-400/10 cursor-pointer text-left"
          >
            {/* BADGE STATUS */}
            <span className={`absolute top-3 right-3 text-[9px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
              badge === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              badge === 'Baru' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
              'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {badge}
            </span>

            {/* ICON DENGAN SHADOW DI BELAKANG */}
            <div className="flex flex-col items-center gap-3 w-full mt-2">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30 group-hover:bg-cyan-400 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <Icon className="h-6 w-6 text-cyan-400 group-hover:text-slate-950 transition-colors" strokeWidth={1.75} />
              </div>
              
              <span className="font-['Rajdhani',sans-serif] text-base font-bold text-white tracking-wide uppercase leading-tight">
                {label}
              </span>
              <span className="text-[11px] text-slate-400 font-['Poppins',sans-serif] leading-relaxed line-clamp-3">
                {desc}
              </span>
            </div>

            {/* TOMBOL BUKAI */}
            <span className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-4 py-2 font-['Rajdhani',sans-serif] text-xs font-bold text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-all uppercase tracking-wider">
              Buka Portal <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* FOOTER */}
      <footer className="mt-16 text-xs text-slate-500 font-['Poppins',sans-serif]">
        © {new Date().getFullYear()} Daruttaufiq Computer Centre. All rights reserved.
      </footer>
    </div>
  );
}