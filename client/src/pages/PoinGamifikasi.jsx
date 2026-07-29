import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Star } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase } from '../utils/supabaseClient';

const medaliWarna = ['text-amber-400', 'text-slate-300', 'text-orange-400'];

export default function PoinGamifikasi() {
  useDocumentTitle('Poin & Kedisiplinan Santri');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const { data, error } = await supabase
        .from('leaderboard_santri')
        .select('*')
        .order('total_poin', { ascending: false })
        .limit(10);

      if (error) setErrMsg(error.message);
      else setLeaderboard(data || []);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

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

        {errMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg px-4 py-3">
            Gagal memuat leaderboard: {errMsg}
          </div>
        )}

        <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" /> Papan Peringkat
        </h2>

        <div className="bg-[#0d1527]/70 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <p className="px-5 py-6 text-xs text-slate-500">Memuat...</p>
          ) : leaderboard.length === 0 ? (
            <p className="px-5 py-6 text-xs text-slate-500">
              Belum ada data poin. Insert manual 1 baris ke tabel <code className="text-cyan-400">poin_santri</code> untuk uji coba, misalnya tech_id, sumber = 'presensi', jumlah_poin = 5.
            </p>
          ) : (
            leaderboard.map((row, idx) => (
              <motion.div
                key={row.tech_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${idx !== leaderboard.length - 1 ? 'border-b border-slate-800/80' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">
                    {idx < 3 ? (
                      <Medal className={`h-5 w-5 ${medaliWarna[idx]}`} />
                    ) : (
                      <span className="font-['Rajdhani',sans-serif] text-slate-500 font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-['Rajdhani',sans-serif] font-bold text-white text-sm">{row.nama_santri || 'Tanpa Nama'}</p>
                    <p className="text-[11px] text-slate-500">{row.tech_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="font-['Rajdhani',sans-serif] font-bold text-lg text-white">{row.total_poin}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}