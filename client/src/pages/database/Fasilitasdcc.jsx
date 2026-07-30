import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient"; // ✅ Ubah ke ../../
import Sidebar from "../../components/ui/Sidebar"; // ✅ Ubah ke ../../
import Navbar from "../../components/ui/Navbar"; // ✅ Ubah ke ../../
import Button from "../../components/ui/Button"; // ✅ Ubah ke ../../
import Input from "../../components/ui/Input"; // ✅ Ubah ke ../../
import Badge from "../../components/ui/Badge"; // ✅ Ubah ke ../../
import {
  MonitorCheck,
  Plus,
  X,
  Search,
  Trash2,
  Save,
  Home,
  CheckSquare,
  Database,
  Sliders,
  FileBarChart,
  AlertTriangle,
  Wrench,
} from "lucide-react";

const FASILITAS_TABLE = "fasilitas_dcc";
const AKUN_SESSION_KEY = "dcc_akun_session";

const KATEGORI_OPSI = [
  "Komputer",
  "Jaringan",
  "Elektronik",
  "Ruangan",
  "Furnitur",
  "Lainnya",
];

export default function FasilitasDCC() {
  const navigate = useNavigate();
  const [sesiStaff, setSesiStaff] = useState(null);
  const [isCheckingSesi, setIsCheckingSesi] = useState(true);

  const [daftarFasilitas, setDaftarFasilitas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [namaFasilitas, setNamaFasilitas] = useState("");
  const [kategori, setKategori] = useState("Komputer");
  const [status, setStatus] = useState("Baik");
  const [catatan, setCatatan] = useState("");

  const menuPengawas = [
    { label: "Menu Utama", path: "/", icon: Home },
    { label: "Koreksi Ujian", path: "/dashboard-Pengawas", icon: CheckSquare },
    { label: "Repositori Soal", path: "/bank-soal", icon: Database },
    { label: "Pengaturan Ujian", path: "/pengaturan-ujian", icon: Sliders },
    { label: "Laporan Nilai", path: "/laporan", icon: FileBarChart },
    { label: "Fasilitas DCC", path: "/fasilitas-dcc", icon: MonitorCheck },
  ];

  // 🔐 Proteksi halaman — sama seperti Dashboard Pengawas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AKUN_SESSION_KEY);
      const sesi = raw ? JSON.parse(raw) : null;
      if (!sesi || (sesi.tipe !== "anggota" && sesi.tipe !== "admin")) {
        navigate("/akun-login");
        return;
      }
      setSesiStaff(sesi);
    } catch (e) {
      navigate("/akun-login");
      return;
    } finally {
      setIsCheckingSesi(false);
    }
  }, [navigate]);

  const loadFasilitas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(FASILITAS_TABLE)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDaftarFasilitas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal memuat data fasilitas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sesiStaff) loadFasilitas();
  }, [sesiStaff]);

  const openTambahModal = () => {
    setNamaFasilitas("");
    setKategori("Komputer");
    setStatus("Baik");
    setCatatan("");
    setIsModalOpen(true);
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    if (!namaFasilitas.trim()) return alert("Nama fasilitas wajib diisi!");

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from(FASILITAS_TABLE).insert({
        nama_fasilitas: namaFasilitas.trim(),
        kategori,
        status,
        catatan: catatan.trim(),
        dicatat_oleh: sesiStaff?.nama || sesiStaff?.username || "Staff DCC",
      });
      if (error) throw error;

      setIsModalOpen(false);
      await loadFasilitas();
    } catch (err) {
      console.error("Gagal menyimpan data fasilitas:", err);
      alert("Gagal menyimpan ke Supabase Cloud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapus = async (id) => {
    if (!confirm("Hapus catatan fasilitas ini?")) return;
    try {
      const { error } = await supabase
        .from(FASILITAS_TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
      setDaftarFasilitas((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert("Gagal menghapus catatan.");
    }
  };

  const daftarTerfilter = daftarFasilitas.filter((f) => {
    if (filterStatus !== "semua" && f.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.nama_fasilitas.toLowerCase().includes(q) ||
        (f.catatan || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (s) => {
    if (s === "Rusak")
      return {
        className: "bg-rose-500/20 text-rose-400 border-rose-500/40",
        icon: AlertTriangle,
      };
    if (s === "Perlu Perbaikan")
      return {
        className: "bg-amber-500/20 text-amber-400 border-amber-500/40",
        icon: Wrench,
      };
    return {
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      icon: CheckSquare,
    };
  };

  const formatTanggal = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isCheckingSesi) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-400 text-xs">
        Memeriksa sesi login...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPengawas} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <MonitorCheck className="text-cyan-400 w-6 h-6" />
              <div>
                <h1 className="text-base font-display font-bold text-white tracking-wide">
                  FASILITAS & ASET DCC
                </h1>
                <p className="text-xs text-slate-400">
                  Catatan kondisi perangkat & fasilitas laboratorium
                </p>
              </div>
            </div>
            <Button
              onClick={openTambahModal}
              className="text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold border-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Catat Fasilitas
            </Button>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama fasilitas atau catatan..."
                  className="w-full bg-[#0d1527] border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex gap-1.5 bg-[#0d1527] p-1.5 rounded-xl border border-slate-800 text-xs font-display font-bold">
                {["semua", "Baik", "Perlu Perbaikan", "Rusak"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${filterStatus === s ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
                  >
                    {s === "semua" ? "Semua" : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  Memuat data fasilitas...
                </div>
              ) : daftarTerfilter.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800">
                  Belum ada catatan fasilitas pada filter ini.
                </div>
              ) : (
                daftarTerfilter.map((f) => {
                  const badge = getStatusBadge(f.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <div
                      key={f.id}
                      className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-display font-bold text-white">
                            {f.nama_fasilitas}
                          </h3>
                          <Badge className="bg-slate-800 text-slate-300 text-[9px] px-2 py-0.5 rounded-md border border-slate-700">
                            {f.kategori}
                          </Badge>
                          <Badge
                            className={`text-[9px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.className}`}
                          >
                            <BadgeIcon className="w-2.5 h-2.5" /> {f.status}
                          </Badge>
                        </div>
                        {f.catatan && (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {f.catatan}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500">
                          Dicatat oleh {f.dicatat_oleh} •{" "}
                          {formatTanggal(f.created_at)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleHapus(f.id)}
                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        title="Hapus catatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL TAMBAH FASILITAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <h3 className="font-display text-base font-bold text-cyan-400 uppercase">
                Catat Fasilitas
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpan} className="space-y-4">
              <Input
                label="Nama Fasilitas"
                placeholder="Contoh: Komputer Unit 05"
                value={namaFasilitas}
                onChange={(e) => setNamaFasilitas(e.target.value)}
                required
              />

              <div>
                <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">
                  Kategori
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {KATEGORI_OPSI.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKategori(k)}
                      className={`py-2 rounded-xl border text-[11px] font-display font-bold transition ${
                        kategori === k
                          ? "bg-cyan-400 text-slate-950 border-cyan-400"
                          : "text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">
                  Status Kondisi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Baik", "Perlu Perbaikan", "Rusak"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`py-2 rounded-xl border text-[11px] font-display font-bold transition ${
                        status === s
                          ? s === "Rusak"
                            ? "bg-rose-500 text-white border-rose-500"
                            : s === "Perlu Perbaikan"
                              ? "bg-amber-400 text-slate-950 border-amber-400"
                              : "bg-emerald-400 text-slate-950 border-emerald-400"
                          : "text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Detail kondisi, kapan terakhir dicek, dsb..."
                  className="w-full p-3 bg-[#030712]/60 border border-slate-800 focus:border-cyan-400 text-xs text-white rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 text-xs border-0"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />{" "}
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
