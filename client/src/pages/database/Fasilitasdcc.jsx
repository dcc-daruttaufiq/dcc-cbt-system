import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
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
  Calendar,
  UserCheck,
  Tag,
} from "lucide-react";

const FASILITAS_TABLE = "fasilitas_dcc";
const AKUN_SESSION_KEY = "dcc_akun_session";

const KATEGORI_DEFAULT = [
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

  // Form State
  const [namaFasilitas, setNamaFasilitas] = useState("");
  const [kategoriOpsiList, setKategoriOpsiList] = useState(KATEGORI_DEFAULT);
  const [kategori, setKategori] = useState("Komputer");
  const [isTambahKategoriMode, setIsTambahKategoriMode] = useState(false);
  const [kategoriBaruInput, setKategoriBaruInput] = useState("");

  const [status, setStatus] = useState("Baik");
  const [catatan, setCatatan] = useState("");
  const [tanggalPembelian, setTanggalPembelian] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [namaPencatat, setNamaPencatat] = useState("");

  const menuPengawas = [
    { label: "Menu Utama", path: "/", icon: Home },
    { label: "Koreksi Ujian", path: "/dashboard-Pengawas", icon: CheckSquare },
    { label: "Repositori Soal", path: "/bank-soal", icon: Database },
    { label: "Pengaturan Ujian", path: "/pengaturan-ujian", icon: Sliders },
    { label: "Laporan Nilai", path: "/laporan", icon: FileBarChart },
    { label: "Fasilitas DCC", path: "/fasilitas-dcc", icon: MonitorCheck },
  ];

  // 🔐 Proteksi halaman
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AKUN_SESSION_KEY);
      const sesi = raw ? JSON.parse(raw) : null;
      if (!sesi || (sesi.tipe !== "anggota" && sesi.tipe !== "admin")) {
        navigate("/akun-login");
        return;
      }
      setSesiStaff(sesi);
      setNamaPencatat(sesi.nama || sesi.username || "Staff DCC");
    } catch (e) {
      navigate("/akun-login");
      return;
    } font-sans finally {
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
      
      const loaded = Array.isArray(data) ? data : [];
      setDaftarFasilitas(loaded);
      localStorage.setItem("dcc_fasilitas_cache", JSON.stringify(loaded));

      // Ekstrak kategori kustom dari database
      const customKat = loaded.map((i) => i.kategori).filter(Boolean);
      const uniqueKat = Array.from(new Set([...KATEGORI_DEFAULT, ...customKat]));
      setKategoriOpsiList(uniqueKat);

    } catch (err) {
      console.warn("Mengambil data dari cache lokal...", err);
      const cached = localStorage.getItem("dcc_fasilitas_cache");
      if (cached) {
        try {
          setDaftarFasilitas(JSON.parse(cached));
        } catch (e) {}
      }
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
    setTanggalPembelian(new Date().toISOString().split("T")[0]);
    setNamaPencatat(sesiStaff?.nama || sesiStaff?.username || "Staff DCC");
    setIsTambahKategoriMode(false);
    setKategoriBaruInput("");
    setIsModalOpen(true);
  };

  const handleTambahKategoriBaru = (e) => {
    e.preventDefault();
    if (!kategoriBaruInput.trim()) return;
    const cleanKategori = kategoriBaruInput.trim();
    if (!kategoriOpsiList.includes(cleanKategori)) {
      setKategoriOpsiList((prev) => [...prev, cleanKategori]);
    }
    setKategori(cleanKategori);
    setKategoriBaruInput("");
    setIsTambahKategoriMode(false);
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    if (!namaFasilitas.trim()) return alert("Nama fasilitas wajib diisi!");

    setIsSubmitting(true);
    const payload = {
      nama_fasilitas: namaFasilitas.trim(),
      kategori,
      status,
      catatan: catatan.trim(),
      dicatat_oleh: namaPencatat.trim() || "Staff DCC",
      tanggal_pembelian: tanggalPembelian,
    };

    try {
      const { data, error } = await supabase
        .from(FASILITAS_TABLE)
        .insert([payload])
        .select();

      if (error) throw error;

      alert("Data fasilitas berhasil dicatat! 🎉");
      setIsModalOpen(false);
      await loadFasilitas();
    } catch (err) {
      console.error("Gagal menyimpan ke Supabase Cloud, menyimpan ke lokal:", err);
      // Fallback lokal agar data tetap tersimpan jika Supabase error
      const newItem = {
        ...payload,
        id: Date.now(),
        created_at: new Date().toISOString(),
      };
      const updatedList = [newItem, ...daftarFasilitas];
      setDaftarFasilitas(updatedList);
      localStorage.setItem("dcc_fasilitas_cache", JSON.stringify(updatedList));
      alert("Tersimpan secara lokal (Terjadi kendala jaringan ke Cloud).");
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapus = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan fasilitas ini?")) return;
    try {
      const { error } = await supabase
        .from(FASILITAS_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;
      const updated = daftarFasilitas.filter((f) => f.id !== id);
      setDaftarFasilitas(updated);
      localStorage.setItem("dcc_fasilitas_cache", JSON.stringify(updated));
    } catch (err) {
      alert("Gagal menghapus catatan dari Cloud.");
    }
  };

  const daftarTerfilter = daftarFasilitas.filter((f) => {
    if (filterStatus !== "semua" && f.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (f.nama_fasilitas || "").toLowerCase().includes(q) ||
        (f.catatan || "").toLowerCase().includes(q) ||
        (f.kategori || "").toLowerCase().includes(q) ||
        (f.dicatat_oleh || "").toLowerCase().includes(q)
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
                  FASILITAS &amp; ASET DCC
                </h1>
                <p className="text-xs text-slate-400">
                  Manajemen &amp; Catatan Kondisi Perangkat Laboratorium
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
                  placeholder="Cari nama fasilitas, kategori, atau pencatat..."
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
                      className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-all hover:border-slate-700"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-display font-bold text-white">
                            {f.nama_fasilitas}
                          </h3>
                          <Badge className="bg-slate-800 text-slate-300 text-[9px] px-2 py-0.5 rounded-md border border-slate-700">
                            {f.kategori || "Umum"}
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

                        <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-500 flex-wrap font-sans">
                          <span className="flex items-center gap-1 text-slate-400">
                            <UserCheck className="w-3 h-3 text-cyan-400" /> Pencatat:{" "}
                            <strong className="text-slate-300">{f.dicatat_oleh || "Staff"}</strong>
                          </span>

                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3 text-amber-400" /> Tgl Aset:{" "}
                            <strong className="text-slate-300">
                              {formatTanggal(f.tanggal_pembelian || f.created_at)}
                            </strong>
                          </span>
                        </div>
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
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <h3 className="font-display text-base font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <MonitorCheck className="w-5 h-5" /> Catat Fasilitas &amp; Aset
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpan} className="space-y-4">
              {/* 1. NAMA FASILITAS */}
              <div>
                <label className="text-xs font-display font-bold text-slate-300 mb-1 block uppercase">
                  Nama Fasilitas / Aset
                </label>
                <Input
                  placeholder="Contoh: Komputer PC Lab Unit 05"
                  value={namaFasilitas}
                  onChange={(e) => setNamaFasilitas(e.target.value)}
                  required
                  className="bg-[#030712]/60 border-slate-800 text-xs rounded-xl"
                />
              </div>

              {/* 2. KATEGORI & FITUR TAMBAH KATEGORI BARU */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-display font-bold text-slate-300 uppercase flex items-center gap-1">
                    <Tag className="w-3 h-3 text-cyan-400" /> Kategori Aset
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTambahKategoriMode(!isTambahKategoriMode)}
                    className="text-[10px] text-cyan-400 font-bold hover:underline"
                  >
                    {isTambahKategoriMode ? "← Pilih Opsi" : "+ Kategori Baru"}
                  </button>
                </div>

                {isTambahKategoriMode ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Kategori Baru (Misal: Proyektor)..."
                      value={kategoriBaruInput}
                      onChange={(e) => setKategoriBaruInput(e.target.value)}
                      className="bg-[#030712]/60 border-slate-800 text-xs rounded-xl flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleTambahKategoriBaru}
                      className="bg-cyan-400 text-slate-950 font-bold text-xs px-3 rounded-xl border-0"
                    >
                      Tambah
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {kategoriOpsiList.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKategori(k)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-display font-bold transition truncate ${
                          kategori === k
                            ? "bg-cyan-400 text-slate-950 border-cyan-400"
                            : "text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. STATUS KONDISI */}
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

              {/* 4. TANGGAL ASET DITERIMA / DICEK */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1 block uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" /> Tanggal Aset
                  </label>
                  <Input
                    type="date"
                    value={tanggalPembelian}
                    onChange={(e) => setTanggalPembelian(e.target.value)}
                    required
                    className="bg-[#030712]/60 border-slate-800 text-xs rounded-xl text-slate-200"
                  />
                </div>

                {/* 5. NAMA PENCATAT */}
                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1 block uppercase flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-cyan-400" /> Pencatat
                  </label>
                  <Input
                    type="text"
                    placeholder="Nama Pencatat..."
                    value={namaPencatat}
                    onChange={(e) => setNamaPencatat(e.target.value)}
                    required
                    className="bg-[#030712]/60 border-slate-800 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* 6. CATATAN Tambahan */}
              <div>
                <label className="text-xs font-display font-bold text-slate-300 mb-1 block uppercase">
                  Catatan Kondisi / Detail (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Detail spesifikasi, kendala, atau lokasi barang..."
                  className="w-full p-2.5 bg-[#030712]/60 border border-slate-800 focus:border-cyan-400 text-xs text-white rounded-xl focus:outline-none"
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
                  {isSubmitting ? "Menyimpan..." : "Simpan Fasilitas"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}