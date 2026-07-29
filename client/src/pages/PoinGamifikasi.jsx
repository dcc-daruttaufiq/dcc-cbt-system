import React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Medal, Flame, ScanLine, ClipboardList, Award,
  Star, TrendingUp
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const leaderboard = [
  { peringkat: 1, nama: 'Ahmad Rifa\'i', techId: 'DCC26-0012', poin: 980, lencana: ['Presensi Emas', 'Karya Terpilih'] },
  { peringkat: 2, nama: 'Nurul Hidayah', techId: 'DCC26-0045', poin: 915, lencana: ['Nilai CBT Terbaik'] },
  { peringkat: 3, nama: 'Muhammad Fikri', techId: 'DCC26-0089', poin: 870, lencana: ['Presensi Emas'] },
  { peringkat: 4, nama: 'Siti Aisyah', techId: 'DCC26-0102', poin: 802, lencana: [] },
  { peringkat: 5, nama: 'Umar Faruq', techId: 'DCC26-0114', poin: 775, lencana: ['Karya Terpilih'] },
];

const sumberPoin = [
  { label: 'Presensi Tepat Waktu', poin: '+5 / hari', icon: ScanLine, warna: 'text-cyan-400' },
  { label: 'Nilai CBT ≥ 85', poin: '+50 / ujian', icon: ClipboardList, warna: 'text-emerald-400' },
  { label: 'Karya Masuk Hall of Fame', poin: '+100 / karya', icon: Award, warna: 'text-amber-400' },
  { label: 'Streak Kehadiran 30 Hari', poin: '+150 bonus', icon: Flame, warna: 'text-rose-400' },
];

const medaliWarna = ['text-amber-400', 'text-slate-300', 'text-orange-400'];

export default function PoinGamifikasi() {
  useDocumentTitle('Poin & Kedisiplinan Santri');

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif] pb-20 px-6 pt-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <Trophy className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-['Rajdhani',sans-serif] text-2xl font-bold text-white uppercase tracking-wide">
              Poin & Kedisiplinan Santri
            </h1>
            <p className="text-xs text-slate-400">Semangat belajar dan disiplin santri, terlihat dari progres nyata.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEADERBOARD */}
          <div className="lg:col-span-2">
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" /> Papan Peringkat Bulan Ini
            </h2>
            <div className="bg-[#0d1527]/70 border border-slate-800 rounded-2xl overflow-hidden">
              {leaderboard.map((row, idx) => (
                <motion.div
                  key={row.techId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${idx !== leaderboard.length - 1 ? 'border-b border-slate-800/80' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 flex justify-center">
                      {row.peringkat <= 3 ? (
                        <Medal className={`h-5 w-5 ${medaliWarna[row.peringkat - 1]}`} />
                      ) : (
                        <span className="font-['Rajdhani',sans-serif] text-slate-500 font-bold">{row.peringkat}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-['Rajdhani',sans-serif] font-bold text-white text-sm">{row.nama}</p>
                      <p className="text-[11px] text-slate-500">{row.techId}</p>
                      {row.lencana.length > 0 && (
                        <div className="flex gap-1.5 mt-1.5">
                          {row.lencana.map((l) => (
                            <span key={l} className="text-[9px] font-['Rajdhani',sans-serif] font-bold px-1.5 py-0.5 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/30 uppercase">
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Star className="h-4 w-4 text-amber-400" />
                    <span className="font-['Rajdhani',sans-serif] font-bold text-lg text-white">{row.poin}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* SUMBER POIN */}
          <div>
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4">
              Cara Mendapatkan Poin
            </h2>
            <div className="space-y-3">
              {sumberPoin.map(({ label, poin, icon: Icon, warna }) => (
                <div key={label} className="bg-[#0d1527]/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a1120] border border-slate-800 shrink-0">
                    <Icon className={`h-4 w-4 ${warna}`} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium leading-tight">{label}</p>
                    <p className="text-[11px] text-slate-500 font-['Rajdhani',sans-serif] font-bold">{poin}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
