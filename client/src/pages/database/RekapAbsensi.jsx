import React, { useState, useEffect } from "react";
import { supabase, TABLES } from "../../utils/supabaseClient";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  CalendarDays,
  Search,
  Download,
  Clock,
  Save,
  CheckCircle2,
} from "lucide-react";

const ABSENSI_TABLE = "presensi_siswa";

const getTanggalHariIni = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function RekapAbsensi() {
  const [tanggalDipilih, setTanggalDipilih] = useState(getTanggalHariIni());
  const [semuaPeserta, setSemuaPeserta] = useState([]);
  const [absensiHariIni, setAbsensiHariIni] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");

  const [jamBatasMasuk, setJamBatasMasuk] = useState("07:30");
  const [isSavingJam, setIsSavingJam] = useState(false);
  const [pesanSimpan, setPesanSimpan] = useState("");

  const loadJamBatas = async () => {
    try {
      const { data } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "konfigurasi_absensi")
        .maybeSingle();

      if (data && data.value) {
        const parsed =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setJamBatasMasuk(parsed.jam_masuk_normal || "07:30");
      }
    } catch (e) {
      console.warn("Gagal memuat jam batas absensi.", e);
    }
  };

  const handleSimpanJamBatas = async () => {
    setIsSavingJam(true);
    setPesanSimpan("");
    try {
      const { data: existing } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "konfigurasi_absensi")
        .maybeSingle();

      let currentVal = {};
      if (existing && existing.value) {
        currentVal = typeof existing.value === "string" ? JSON.parse(existing.value) : existing.value;
      }

      const newVal = { ...currentVal, jam_masuk_normal: jamBatasMasuk };

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .upsert(
          {
            key: "konfigurasi_absensi",
            value: JSON.stringify(newVal),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      setPesanSimpan("Jam batas masuk berhasil disimpan!");
    } catch (e) {
      setPesanSimpan("Gagal menyimpan ke Cloud.");
    } finally {
      setIsSavingJam(false);
      setTimeout(() => setPesanSimpan(""), 3000);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: dataPeserta } = await supabase
        .from(TABLES.PESERTA || "peserta")
        .select("*");
      setSemuaPeserta(Array.isArray(dataPeserta) ? dataPeserta : []);

      const { data: dataAbsensi } = await supabase
        .from(ABSENSI_TABLE)
        .select("*")
        .eq("tanggal", tanggalDipilih);
      setAbsensiHariIni(Array.isArray(dataAbsensi) ? dataAbsensi : []);
    } catch (e) {
      console.error("Gagal memuat data rekap absensi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJamBatas();
  }, []);

  useEffect(() => {
    loadData();
  }, [tanggalDipilih]);

  // ✅ Manual Override Status oleh Admin/Pengawas
  const handleUpdateStatusManual = async (techId, newStatus) => {
    try {
      const { error } = await supabase.from(ABSENSI_TABLE).upsert(
        {
          tech_id: techId,
          tanggal: tanggalDipilih,
          status: newStatus,
          metode: "MANUAL_ADMIN",
          waktu_masuk: new Date().toISOString(),
          pencatat: "ADMIN_PANEL"
        },
        { onConflict: "tech_id,tanggal" }
      );

      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Gagal mengubah status presensi.");
    }
  };

  const rekapGabungan = semuaPeserta.map((p) => {
    const absenRow = absensiHariIni.find(
      (a) =>
        (a.tech_id || "").toLowerCase().trim() ===
        (p.tech_id || "").toLowerCase().trim()
    );
    return {
      ...p,
      sudahAbsen: !!absenRow,
      jamAbsen: absenRow && absenRow.waktu_masuk
        ? new Date(absenRow.waktu_masuk).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      statusAbsen: absenRow ? absenRow.status : "ALPHA",
    };
  });

  const totalHadir = rekapGabungan.filter((r) => r.statusAbsen === "HADIR").length;
  const totalTelat = rekapGabungan.filter((r) => r.statusAbsen === "TERLAMBAT").length;
  const totalIzinSakit = rekapGabungan.filter((r) => ["IZIN", "SAKIT", "DISPENSASI"].includes(r.statusAbsen)).length;
  const totalAlpha = rekapGabungan.filter((r) => r.statusAbsen === "ALPHA").length;

  const dataTerfilter = rekapGabungan.filter((r) => {
    let statusMatch = true;
    if (filterStatus === "hadir") statusMatch = r.statusAbsen === "HADIR";
    else if (filterStatus === "terlambat") statusMatch = r.statusAbsen === "TERLAMBAT";
    else if (filterStatus === "alpha") statusMatch = r.statusAbsen === "ALPHA";

    if (!statusMatch) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nama = (r.nama || r.nama_lengkap || "").toLowerCase();
      const techId = (r.tech_id || "").toLowerCase();
      return nama.includes(q) || techId.includes(q);
    }
    return true;
  });

  const handleExportRekap = () => {
    if (rekapGabungan.length === 0) return alert("Belum ada data!");

    let csvContent = `data:text/csv;charset=utf-8,Tanggal,Nama Lengkap,TechID,Kategori,Status,Jam Absen\n`;
    rekapGabungan.forEach((r) => {
      const nama = r.nama || r.nama_lengkap || "-";
      csvContent += `"${tanggalDipilih}","${nama}","${r.tech_id || "-"}","${r.kategori || "-"}","${r.statusAbsen}","${r.jamAbsen || "-"}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Absensi_${tanggalDipilih}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <CalendarDays className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">
                REKAP &amp; OVERRIDE PRESENSI
              </h1>
              <p className="text-xs text-slate-400">
                Kelola status absensi harian siswa secara presisi
              </p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="p-5 bg-[#0d1527]/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs font-display font-bold text-white uppercase tracking-wider">
                    Jam Batas Masuk Normal
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Scan melebihi jam ini otomatis berstatus "TERLAMBAT".
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={jamBatasMasuk}
                  onChange={(e) => setJamBatasMasuk(e.target.value)}
                  className="bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
                <Button
                  onClick={handleSimpanJamBatas}
                  disabled={isSavingJam}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-display font-bold border-0 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingJam ? "..." : "Simpan"}
                </Button>
              </div>
              {pesanSimpan && (
                <span className="text-[11px] text-emerald-400 font-sans">{pesanSimpan}</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0d1527]/70 border border-slate-800 rounded-2xl flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-cyan-400 shrink-0" />
                <input
                  type="date"
                  value={tanggalDipilih}
                  onChange={(e) => setTanggalDipilih(e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none w-full"
                />
              </div>

              <div className="p-4 bg-[#0d1527]/70 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-display font-bold">HADIR</span>
                <span className="text-xl font-display font-bold text-emerald-400">{totalHadir}</span>
              </div>

              <div className="p-4 bg-[#0d1527]/70 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-amber-400 font-display font-bold">TERLAMBAT</span>
                <span className="text-xl font-display font-bold text-amber-400">{totalTelat}</span>
              </div>

              <div className="p-4 bg-[#0d1527]/70 border border-rose-500/30 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-rose-400 font-display font-bold">ALPHA</span>
                <span className="text-xl font-display font-bold text-rose-400">{totalAlpha}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau TechID..."
                  className="w-full bg-[#0d1527] border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex gap-1 bg-[#0d1527] p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
                {[
                  { key: "semua", label: "Semua" },
                  { key: "hadir", label: "Hadir" },
                  { key: "terlambat", label: "Terlambat" },
                  { key: "alpha", label: "Alpha" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === f.key
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleExportRekap}
                className="bg-purple-500 hover:bg-purple-400 text-white text-xs font-display font-bold border-0 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>

            <div className="bg-[#0d1527]/60 border border-slate-800 rounded-2xl overflow-hidden">
              {isLoading ? (
                <div className="p-10 text-center text-xs text-slate-500">Memuat data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-display font-bold">
                        <th className="text-left p-3">Nama Siswa</th>
                        <th className="text-left p-3">TechID</th>
                        <th className="text-left p-3">Jam Masuk</th>
                        <th className="text-left p-3">Ubah Status Manual (Override)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataTerfilter.map((r) => (
                        <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                          <td className="p-3 font-display font-bold text-white">
                            {r.nama || r.nama_lengkap || "-"}
                          </td>
                          <td className="p-3 font-mono text-slate-400">{r.tech_id || "-"}</td>
                          <td className="p-3 text-slate-300 font-mono">{r.jamAbsen || "—"}</td>
                          <td className="p-3">
                            <select
                              value={r.statusAbsen}
                              onChange={(e) => handleUpdateStatusManual(r.tech_id, e.target.value)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none ${
                                r.statusAbsen === "HADIR"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : r.statusAbsen === "TERLAMBAT"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : r.statusAbsen === "ALPHA"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              }`}
                            >
                              <option value="HADIR" className="bg-[#0d1527] text-white">HADIR</option>
                              <option value="TERLAMBAT" className="bg-[#0d1527] text-white">TERLAMBAT</option>
                              <option value="IZIN" className="bg-[#0d1527] text-white">IZIN</option>
                              <option value="SAKIT" className="bg-[#0d1527] text-white">SAKIT</option>
                              <option value="DISPENSASI" className="bg-[#0d1527] text-white">DISPENSASI</option>
                              <option value="ALPHA" className="bg-[#0d1527] text-white">ALPHA</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}