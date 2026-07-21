import { motion } from 'framer-motion'
import { ShieldCheck, Zap, Route as RouteIcon } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const checks = [
  { icon: ShieldCheck, label: 'Tailwind CSS', desc: 'Utility styling & dark theme aktif' },
  { icon: RouteIcon, label: 'React Router', desc: 'Routing siap dikembangkan' },
  { icon: Zap, label: 'Framer Motion', desc: 'Animasi berjalan lancar' },
]

export default function Home() {
  useDocumentTitle('Beranda')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <p className="mb-3 font-display text-sm uppercase tracking-[0.3em] text-accent">
          Fondasi Proyek
        </p>
        <h1 className="font-display text-4xl font-bold text-text-primary md:text-5xl">
          DCC <span className="text-accent">CBT</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-text-secondary">
          Pondasi proyek React + Vite sudah terpasang dan siap dikembangkan.
          Halaman dashboard akan dibangun pada tahap berikutnya.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
        }}
        className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {checks.map(({ icon: Icon, label, desc }) => (
          <motion.div
            key={label}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            className="card flex flex-col items-center gap-2 p-6 text-center"
          >
            <Icon className="h-6 w-6 text-accent" strokeWidth={1.75} />
            <span className="font-display font-semibold">{label}</span>
            <span className="text-caption">{desc}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
