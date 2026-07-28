import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, ScanLine, Plus, ArrowRight } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LOGO_URL } from '../config/brand';

// 🧩 Daftar sistem/modul yang tersedia. Tambahin objek baru di sini kalau mau
// bikin sistem baru lagi ke depannya — otomatis muncul jadi kartu di halaman ini.
const modul = [
  {
    label: 'Sistem Ujian DCC',
    desc: 'CBT ujian sertifikasi kompetensi — bank soal, koreksi, dan laporan nilai.',
    path: '/dashboard-Pengawas',
    icon: ClipboardList,
  },
  {
    label: 'Presensi Harian Santri',
    desc: 'Scan kartu TechID via kamera untuk mencatat kehadiran harian secara realtime.',
    path: '/absensi-scan',
    icon: ScanLine,
  },
]

export default function Home() {
  useDocumentTitle('Menu Utama')
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <img src={LOGO_URL} alt="Logo DCC" className="mb-5 h-12 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        <p className="mb-3 font-display text-sm uppercase tracking-[0.3em] text-accent">
          Daruttaufiq Computer Centre
        </p>
        <h1 className="font-display text-4xl font-bold text-text-primary md:text-5xl">
          Menu <span className="text-accent">Utama</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-text-secondary">
          Pilih sistem yang ingin dibuka. Setiap sistem berjalan terpisah dengan
          data & halamannya masing-masing.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
        }}
        className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {modul.map(({ icon: Icon, label, desc, path }) => (
          <motion.button
            key={label}
            onClick={() => navigate(path)}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-accent/30 bg-accent/5 p-6 text-center shadow-lg transition-all hover:border-accent hover:bg-accent/10 hover:shadow-accent/20 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 group-hover:bg-accent group-hover:text-background transition-colors">
              <Icon className="h-6 w-6 text-accent group-hover:text-background transition-colors" strokeWidth={1.75} />
            </div>
            <span className="font-display text-base font-bold text-text-primary">{label}</span>
            <span className="text-caption">{desc}</span>
            <span className="mt-1 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-display text-xs font-bold text-background">
              Buka <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </motion.button>
        ))}

        {/* KARTU PLACEHOLDER — buat ide berikutnya, tinggal diisi kalau udah dibangun */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 p-6 text-center opacity-50 sm:col-span-2"
        >
          <Plus className="h-6 w-6" strokeWidth={1.75} />
          <span className="text-caption">Sistem berikutnya akan muncul di sini</span>
        </motion.div>
      </motion.div>
    </div>
  )
}