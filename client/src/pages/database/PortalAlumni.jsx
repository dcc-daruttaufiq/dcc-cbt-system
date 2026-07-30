import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  GraduationCap,
  Quote,
  Building2,
  MapPin,
} from "lucide-react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle"; // ✅ Ubah ke ../../
import { supabase } from "../../utils/supabaseClient"; // ✅ Ubah ke ../../

const kategoriWarna = {
  Studi: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Kerja: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Wirausaha: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};
export default function PortalAlumni() {
  useDocumentTitle("Portal Alumni DCC");
  const [alumni, setAlumni] = useState([]);
  const [lowongan, setLowongan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: dataAlumni, error: errAlumni } = await supabase
        .from("alumni")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: dataLowongan, error: errLowongan } = await supabase
        .from("lowongan_magang")
        .select("*")
        .eq("aktif", true)
        .order("created_at", { ascending: false });

      if (errAlumni || errLowongan) {
        setErrMsg((errAlumni || errLowongan).message);
      } else {
        setAlumni(dataAlumni || []);
        setLowongan(dataLowongan || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

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
            <p className="text-xs text-slate-400">
              Jejak lulusan Daruttaufiq Computer Centre setelah lulus dari
              pondok.
            </p>
          </div>
        </div>

        {errMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg px-4 py-3">
            Gagal memuat data: {errMsg}
          </div>
        )}

        {/* DIREKTORI ALUMNI */}
        <div className="mb-12">
          <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-cyan-400" /> Cerita Alumni
          </h2>
          {loading ? (
            <p className="text-xs text-slate-500">Memuat...</p>
          ) : alumni.length === 0 ? (
            <p className="text-xs text-slate-500">
              Belum ada data alumni. Insert manual 1 baris di tabel `alumni`
              untuk uji coba.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {alumni.map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-[#0d1527]/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3"
                >
                  <span
                    className={`w-fit text-[9px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${kategoriWarna[a.kategori] || kategoriWarna.Studi}`}
                  >
                    {a.kategori}
                  </span>
                  <div>
                    <p className="font-['Rajdhani',sans-serif] font-bold text-white text-base">
                      {a.nama}
                    </p>
                    <p className="text-[11px] text-slate-500">{a.angkatan}</p>
                  </div>
                  <p className="text-xs text-slate-300">{a.status_sekarang}</p>
                  {a.testimoni && (
                    <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                      <Quote className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 italic leading-relaxed">
                        {a.testimoni}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* LOWONGAN MAGANG MITRA */}
        <div>
          <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" /> Info Magang dari
            Mitra
          </h2>
          {loading ? (
            <p className="text-xs text-slate-500">Memuat...</p>
          ) : lowongan.length === 0 ? (
            <p className="text-xs text-slate-500">
              Belum ada lowongan magang aktif. Insert manual di tabel
              `lowongan_magang` untuk uji coba.
            </p>
          ) : (
            <div className="space-y-3">
              {lowongan.map((l) => (
                <div
                  key={l.id}
                  className="bg-[#0d1527]/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-['Rajdhani',sans-serif] font-bold text-white text-sm">
                      {l.posisi}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{l.mitra}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                    <MapPin className="h-3.5 w-3.5" /> {l.lokasi}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
