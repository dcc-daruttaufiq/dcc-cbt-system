import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  ScanLine,
  KeyRound,
  ArrowRight,
  FileSpreadsheet,
  MessageSquareHeart,
  MonitorCheck,
  GraduationCap,
  Award,
  Sparkles,
  Users,
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
  PackageCheck,
  Trophy,
  Briefcase,
  Camera,
  Code,
  UserCheck,
} from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { LOGO_URL } from "../config/brand";

// 1. Modul / Portal Terpadu DCC
const modul = [
  {
    label: "Sistem Ujian DCC",
    desc: "CBT ujian sertifikasi kompetensi — bank soal, koreksi, dan laporan nilai.",
    path: "/login-ujian", // ✅ Diubah ke /login-ujian
    icon: ClipboardList,
    badge: "Aktif",
  },
  {
    label: "Presensi Harian Santri",
    desc: "Scan kartu TechID via kamera untuk mencatat kehadiran harian secara realtime.",
    path: "/absensi-scan",
    icon: ScanLine,
    badge: "Aktif",
  },
  {
    label: "Akun DCC",
    desc: "Login khusus Admin, Anggota/Pengawas, dan Tamu untuk akses sistem terpadu.",
    path: "/akun-login",
    icon: KeyRound,
    badge: "Aktif",
  },
  {
    label: "Perizinan Santri",
    desc: "Form pengajuan izin resmi santri (sakit / keperluan) via komputer bersama.",
    path: "/perizinan-santri",
    icon: FileSpreadsheet,
    badge: "Baru",
  },
  {
    label: "Aspirasi Santri",
    desc: "Ruang aman tempat santri bercerita, menyampaikan kesan, & saran belajar.",
    path: "/aspirasi-santri",
    icon: MessageSquareHeart,
    badge: "Baru",
  },
  {
    label: "Fasilitas & Aset DCC",
    desc: "Pencatatan inventaris perangkat komputer & fasilitas laboratorium DCC.",
    path: "/fasilitas-dcc",
    icon: MonitorCheck,
    badge: "Baru",
  },
  {
    label: "Akademik DCC",
    desc: "Portal belajar santri — modul materi, silabus, jadwal, & riwayat nilai.",
    path: "/akademik-dcc",
    icon: GraduationCap,
    badge: "Baru",
  },
  {
    label: "E-Sertifikat & Verifikasi",
    desc: "Portal unduh & verifikasi publik keaslian sertifikat kelulusan santri.",
    path: "/verifikasi-sertifikat",
    icon: Award,
    badge: "Pengembangan",
  },
  {
    label: "Notifikasi WhatsApp Wali",
    desc: "Kirim notifikasi otomatis ke orang tua/wali saat presensi, izin, & nilai keluar.",
    path: "/notifikasi-whatsapp",
    icon: MessageCircle,
    badge: "Baru",
  },
  {
    label: "Peminjaman Aset Lab",
    desc: "Booking & checkout perangkat lab dengan approval pengawas dan riwayat pinjam.",
    path: "/peminjaman-aset",
    icon: PackageCheck,
    badge: "Baru",
  },
  {
    label: "Poin & Kedisiplinan Santri",
    desc: "Sistem poin dan lencana dari presensi, nilai CBT, dan karya untuk memacu semangat santri.",
    path: "/poin-gamifikasi",
    icon: Trophy,
    badge: "Baru",
  },
  {
    label: "Portal Alumni DCC",
    desc: "Jejak lulusan DCC — status studi/kerja, testimoni, dan info magang mitra.",
    path: "/portal-alumni",
    icon: Briefcase,
    badge: "Pengembangan",
  },
];

// 2. Sample Showcase Karya Santri (Hall of Fame)
const karyaSantri = [
  {
    id: 1,
    judul: "Desain Poster Digital Branding",
    pembuat: "Santri Ahmad Rifa'i",
    techId: "DCC26-0012",
    kategori: "Graphic Design",
    gambar:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 2,
    judul: "Otomasi Rekapitulasi Data Keuangan",
    pembuat: "Santriwati Nurul Hidayah",
    techId: "DCC26-0045",
    kategori: "Advanced Excel",
    gambar:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 3,
    judul: "Landing Page Portfolio HTML/CSS",
    pembuat: "Santri Muhammad Fikri",
    techId: "DCC26-0089",
    kategori: "Web Development",
    gambar:
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
  },
];

// 3. Data Foto & Portofolio Anggota Tim DCC
const anggotaDCC = [
  {
    id: 1,
    nama: "Pembina / Lead Instructor",
    peran: "Koordinator Utama & Instructor",
    foto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    keahlian: ["System Architect", "Fullstack Dev", "Mentor"],
  },
  {
    id: 2,
    nama: "Instruktur Lab Komputer",
    peran: "Pengawas Ujian & Teknisi Lab",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    keahlian: ["Hardware & Networking", "CBT Supervision"],
  },
  {
    id: 3,
    nama: "Tim Multimedia & Desain",
    peran: "Pengelola Aset & Konten Digital",
    foto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    keahlian: ["Graphic Design", "UI/UX Design", "Content Creator"],
  },
  {
    id: 4,
    nama: "Divisi Kedisiplinan & Presensi",
    peran: "Penanggung Jawab Absensi Santri",
    foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    keahlian: ["Data Management", "Santri Monitoring"],
  },
];

export default function Home() {
  useDocumentTitle("Menu Utama");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif] pb-20">
      {/* 🚀 HERO SECTION */}
      <div className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center max-w-3xl mx-auto"
        >
          <img
            src={LOGO_URL}
            alt="Logo DCC"
            className="mb-4 h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.25)]"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <p className="mb-2 font-['Rajdhani',sans-serif] text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">
            Daruttaufiq Computer Centre
          </p>
          <h1 className="font-['Rajdhani',sans-serif] text-4xl font-bold text-white md:text-6xl tracking-wide uppercase leading-tight">
            Digitalisasi Santri <span className="text-cyan-400">Daruttaufiq</span>
          </h1>
          <p className="mt-4 text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed">
            Program Integrasi Teknologi & Nilai Islami
Wujud komitmen Pondok Pesantren Daruttaufiq dalam membentuk generasi santri yang mahir teknologi, kreatif berinovasi, dan beretika Islami. Melalui Daruttaufiq Computer Centre (DCC), teknologi dioptimalkan sebagai sarana pendidikan, pengembangan diri, dan dakwah.
          </p>
        </motion.div>

        {/* 📊 BARIS STATISTIK RINGKAS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-10 p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl"
        >
          <div className="flex flex-col items-center p-3 border-r border-slate-800/80 last:border-r-0">
            <Users className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="font-['Rajdhani',sans-serif] text-2xl font-bold text-white">
              150+
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-['Rajdhani',sans-serif]">
              Santri Aktif
            </span>
          </div>
          <div className="flex flex-col items-center p-3 border-r border-slate-800/80 last:border-r-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="font-['Rajdhani',sans-serif] text-2xl font-bold text-emerald-400">
              98%
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-['Rajdhani',sans-serif]">
              Kelulusan CBT
            </span>
          </div>
          <div className="flex flex-col items-center p-3 border-r border-slate-800/80 last:border-r-0">
            <MonitorCheck className="w-5 h-5 text-amber-400 mb-1" />
            <span className="font-['Rajdhani',sans-serif] text-2xl font-bold text-amber-400">
              40 Unit
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-['Rajdhani',sans-serif]">
              Komputer Ready
            </span>
          </div>
          <div className="flex flex-col items-center p-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 mb-1" />
            <span className="font-['Rajdhani',sans-serif] text-2xl font-bold text-indigo-400">
              Official
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-['Rajdhani',sans-serif]">
              Sertifikasi Lab
            </span>
          </div>
        </motion.div>
      </div>

      {/* 🧩 GRID KARTU MODUL UTAMA */}
      <div className="max-w-6xl mx-auto px-6 mt-6">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="font-['Rajdhani',sans-serif] text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" /> Modul & Portal
              Utama
            </h2>
            <p className="text-xs text-slate-400">
              Pilih sistem yang ingin diakses sesuai dengan wewenang Anda.
            </p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.08, delayChildren: 0.15 },
            },
          }}
          className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
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
              <span
                className={`absolute top-3 right-3 text-[9px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                  badge === "Aktif"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : badge === "Baru"
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {badge}
              </span>

              <div className="flex flex-col items-center gap-3 w-full mt-2">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30 group-hover:bg-cyan-400 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  <Icon
                    className="h-6 w-6 text-cyan-400 group-hover:text-slate-950 transition-colors"
                    strokeWidth={1.75}
                  />
                </div>

                <span className="font-['Rajdhani',sans-serif] text-base font-bold text-white tracking-wide uppercase leading-tight">
                  {label}
                </span>
                <span className="text-[11px] text-slate-400 font-['Poppins',sans-serif] leading-relaxed line-clamp-3">
                  {desc}
                </span>
              </div>

              <span className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-4 py-2 font-['Rajdhani',sans-serif] text-xs font-bold text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-all uppercase tracking-wider">
                Buka Portal <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* 🎨 SECTION SHOWCASE KARYA SANTRI (DCC HALL OF FAME) */}
      <div className="max-w-6xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="font-['Rajdhani',sans-serif] text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" /> DCC Hall of Fame
              (Karya Santri)
            </h2>
            <p className="text-xs text-slate-400">
              Apresiasi hasil karya praktik terbaik santri Daruttaufiq Computer
              Centre.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {karyaSantri.map((item) => (
            <div
              key={item.id}
              className="bg-[#0d1527]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition group"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={item.gambar}
                  alt={item.judul}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-3 left-3 bg-[#030712]/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700 text-[10px] font-['Rajdhani',sans-serif] font-bold text-cyan-400 uppercase">
                  {item.kategori}
                </div>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-['Rajdhani',sans-serif] font-bold text-base text-white tracking-wide group-hover:text-cyan-400 transition">
                  {item.judul}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5 font-['Poppins',sans-serif]">
                  <span>{item.pembuat}</span>
                  <span className="font-['Rajdhani',sans-serif] font-bold text-slate-500">
                    {item.techId}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📸 SECTION PORTOFOLIO ANGGOTA DCC (DCC TEAM & MEMBERS) */}
      <div className="max-w-6xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="font-['Rajdhani',sans-serif] text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" /> Anggota &
              Pengelola DCC
            </h2>
            <p className="text-xs text-slate-400">
              Tim instruktur, pengawas, dan pengelola laboratorium komputer DCC.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {anggotaDCC.map((anggota) => (
            <div
              key={anggota.id}
              className="group bg-[#0d1527]/70 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-300 hover:shadow-cyan-500/10 hover:shadow-xl"
            >
              <div className="relative w-28 h-28 mb-4 rounded-full overflow-hidden border-2 border-cyan-400/30 group-hover:border-cyan-400 transition duration-300">
                <img
                  src={anggota.foto}
                  alt={anggota.nama}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
              </div>
              <h3 className="font-['Rajdhani',sans-serif] font-bold text-base text-white tracking-wide uppercase">
                {anggota.nama}
              </h3>
              <p className="text-[11px] text-cyan-400 font-medium mb-3">
                {anggota.peran}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
                {anggota.keahlian.map((skill, index) => (
                  <span
                    key={index}
                    className="text-[9px] bg-slate-800/80 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full font-['Rajdhani',sans-serif]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER RESMI */}
      <footer className="mt-20 border-t border-slate-800/80 pt-8 text-center text-xs text-slate-500 font-['Poppins',sans-serif]">
        <p>
          © {new Date().getFullYear()} Daruttaufiq Computer Centre. All rights
          reserved.
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Sistem Terintegrasi Laboratorium Komputer & Pendidikan Santri
        </p>
      </footer>
    </div>
  );
}
