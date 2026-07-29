import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Settings2,
  Users,
  ScanLine,
  FileSpreadsheet,
  ClipboardList,
} from "lucide-react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle"; // ✅ Ubah ke ../../
import { supabase } from "../../utils/supabaseClient"; // ✅ Ubah ke ../../

const jenisIcon = {
  presensi: ScanLine,
  perizinan: FileSpreadsheet,
  nilai_cbt: ClipboardList,
};

const jenisLabel = {
  presensi: "Presensi",
  perizinan: "Perizinan",
  nilai_cbt: "Nilai CBT",
};

const statusStyle = {
  Terkirim: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Tertunda: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Gagal: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

const statusIcon = {
  Terkirim: CheckCircle2,
  Tertunda: Clock,
  Gagal: XCircle,
};

export default function NotifikasiWhatsapp() {
  useDocumentTitle("Notifikasi WhatsApp Wali");
  const [pengaturan, setPengaturan] = useState([]);
  const [logNotifikasi, setLogNotifikasi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setErrMsg(null);

    const { data: dataPengaturan, error: errPengaturan } = await supabase
      .from("pengaturan_notifikasi")
      .select("*")
      .order("jenis", { ascending: true });

    const { data: dataLog, error: errLog } = await supabase
      .from("log_notifikasi")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (errPengaturan || errLog) {
      setErrMsg((errPengaturan || errLog).message);
    } else {
      setPengaturan(dataPengaturan || []);
      setLogNotifikasi(dataLog || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggle = async (jenis, aktifSekarang) => {
    // Optimistic update biar UI responsif
    setPengaturan((prev) =>
      prev.map((p) =>
        p.jenis === jenis ? { ...p, aktif: !aktifSekarang } : p,
      ),
    );
    const { error } = await supabase
      .from("pengaturan_notifikasi")
      .update({ aktif: !aktifSekarang, updated_at: new Date().toISOString() })
      .eq("jenis", jenis);

    if (error) {
      // Rollback kalau gagal
      setPengaturan((prev) =>
        prev.map((p) =>
          p.jenis === jenis ? { ...p, aktif: aktifSekarang } : p,
        ),
      );
      setErrMsg(error.message);
    }
  };

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
            <p className="text-xs text-slate-400">
              Kirim kabar otomatis ke orang tua/wali santri lewat WhatsApp.
            </p>
          </div>
        </div>

        {errMsg && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg px-4 py-3">
            Gagal memuat data: {errMsg}
          </div>
        )}

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

          {loading ? (
            <p className="text-xs text-slate-500">Memuat pengaturan...</p>
          ) : pengaturan.length === 0 ? (
            <p className="text-xs text-slate-500">
              Belum ada baris di tabel{" "}
              <code className="text-cyan-400">pengaturan_notifikasi</code>. Cek
              lagi apakah INSERT awal di SQL kamu berhasil.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pengaturan.map(({ jenis, aktif }) => {
                const Icon = jenisIcon[jenis] || MessageCircle;
                return (
                  <button
                    key={jenis}
                    onClick={() => toggle(jenis, aktif)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      aktif
                        ? "border-cyan-400/50 bg-cyan-400/5"
                        : "border-slate-800 bg-[#0a1120]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon
                        className={`h-4 w-4 ${aktif ? "text-cyan-400" : "text-slate-500"}`}
                      />
                      <span
                        className={`text-[10px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border uppercase ${
                          aktif
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-800 text-slate-500 border-slate-700"
                        }`}
                      >
                        {aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="font-['Rajdhani',sans-serif] font-bold text-sm text-white">
                      {jenisLabel[jenis] || jenis}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-6 text-center text-xs text-slate-500"
                    >
                      Memuat...
                    </td>
                  </tr>
                ) : logNotifikasi.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-6 text-center text-xs text-slate-500"
                    >
                      Belum ada riwayat notifikasi. Insert baris manual di tabel
                      `log_notifikasi` untuk uji coba.
                    </td>
                  </tr>
                ) : (
                  logNotifikasi.map((row) => {
                    const JIcon = jenisIcon[row.jenis] || MessageCircle;
                    const SIcon = statusIcon[row.status] || Clock;
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-slate-800/80 hover:bg-[#0a1120]/60 transition"
                      >
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">
                            {row.nama_santri || "—"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-['Rajdhani',sans-serif]">
                            {row.tech_id}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1.5 text-slate-300 text-xs">
                            <JIcon className="h-3.5 w-3.5 text-cyan-400" />{" "}
                            {jenisLabel[row.jenis] || row.jenis}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs">
                          {row.pesan}
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs font-['Rajdhani',sans-serif]">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString("id-ID")
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`flex items-center gap-1 w-fit text-[10px] font-['Rajdhani',sans-serif] font-bold px-2 py-1 rounded-md border uppercase ${statusStyle[row.status] || statusStyle.Tertunda}`}
                          >
                            <SIcon className="h-3 w-3" /> {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Nomor wali diambil dari tabel
            wali_kontak. Hubungkan API gateway (Fonnte/Wablas/dsb) untuk
            mengirim otomatis dan mengubah status jadi "Terkirim".
          </p>
        </div>
      </div>
    </div>
  );
}
