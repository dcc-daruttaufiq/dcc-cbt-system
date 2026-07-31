import React, { useState, useEffect } from "react";
import { supabase, TABLES } from "../../utils/supabaseClient"; // ✅ Ubah ke ../../
import Sidebar from "../../components/ui/Sidebar"; // ✅ Ubah ke ../../
import Navbar from "../../components/ui/Navbar"; // ✅ Ubah ke ../../
import Button from "../../components/ui/Button"; // ✅ Ubah ke ../../
import Input from "../../components/ui/Input"; // ✅ Ubah ke ../../
import {
  Sliders,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  X,
  BookOpen,
  Percent,
  Lock,
  Unlock,
  Power,
  Award,
  Key,
  RefreshCw,
  Users,
  ShieldCheck,
  Home,
  CheckSquare,
  Database,
  FileBarChart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_KATALOG = [
  {
    id: "word",
    nama: "Microsoft Word",
    desc: "Pengolahan Dokumen & Surat",
    durasi: 90,
    bobot_pg: 50,
    bobot_praktik: 50,
    kkm: 75,
    token: "WORD2026",
  },
  {
    id: "excel",
    nama: "Microsoft Excel",
    desc: "Pengolahan Data & Formula",
    durasi: 90,
    bobot_pg: 50,
    bobot_praktik: 50,
    kkm: 75,
    token: "EXCEL2026",
  },
  {
    id: "powerpoint",
    nama: "Microsoft PowerPoint",
    desc: "Desain Presentasi Interaktif",
    durasi: 90,
    bobot_pg: 50,
    bobot_praktik: 50,
    kkm: 75,
    token: "PPT2026",
  },
  {
    id: "desain",
    nama: "Desain Grafis",
    desc: "Canva & Visual Typography",
    durasi: 90,
    bobot_pg: 40,
    bobot_praktik: 60,
    kkm: 75,
    token: "DESAIN2026",
  },
  {
    id: "pemrograman",
    nama: "Pemrograman Web",
    desc: "HTML, CSS, & JavaScript",
    durasi: 120,
    bobot_pg: 40,
    bobot_praktik: 60,
    kkm: 75,
    token: "CODING2026",
  },
];

// Helper Generator Token Random (6 Karakter Kapital)
const generateRandomToken = (prefix = "") => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix.toUpperCase()}-${rand}` : rand;
};

export default function PengaturanUjian() {
  const [katalogMapel, setKatalogMapel] = useState(DEFAULT_KATALOG);
  const [statusSesi, setStatusSesi] = useState("DITUTUP");
  const [modeToken, setModeToken] = useState("mapel"); // 'mapel' | 'siswa'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formMapel, setFormMapel] = useState({
    id: "",
    nama: "",
    desc: "",
    durasi: 90,
    bobot_pg: 50,
    bobot_praktik: 50,
    kkm: 75,
    token: "",
  });

  const menuPengawas = [
    { label: "Menu Utama", path: "/", icon: Home },
    { label: "Koreksi Ujian", path: "/dashboard-anggota", icon: CheckSquare },
    { label: "Repositori Soal", path: "/bank-soal", icon: Database },
    { label: "Pengaturan Ujian", path: "/pengaturan-ujian", icon: Sliders },
    { label: "Laporan Nilai", path: "/laporan", icon: FileBarChart },
  ];

  const loadPengaturan = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Katalog Mata Ujian
      const { data: dataKatalog } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "katalog_mata_ujian")
        .maybeSingle();

      if (dataKatalog && dataKatalog.value) {
        const parsed =
          typeof dataKatalog.value === "string"
            ? JSON.parse(dataKatalog.value)
            : dataKatalog.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((m) => ({
            ...m,
            bobot_pg: m.bobot_pg !== undefined ? m.bobot_pg : 50,
            bobot_praktik: m.bobot_praktik !== undefined ? m.bobot_praktik : 50,
            kkm: m.kkm !== undefined && m.kkm !== null ? m.kkm : 75,
            token: m.token || `${m.id.toUpperCase()}2026`,
          }));
          setKatalogMapel(normalized);
          localStorage.setItem("dcc_katalog_mapel", JSON.stringify(normalized));
        }
      }

      // 2. Fetch Status Sesi Ujian Global
      const { data: dataStatus } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "status_sesi_ujian")
        .maybeSingle();

      if (dataStatus && dataStatus.value) {
        const st =
          typeof dataStatus.value === "string"
            ? JSON.parse(dataStatus.value)
            : dataStatus.value;
        setStatusSesi(st.status || "DITUTUP");
        localStorage.setItem("dcc_status_sesi", st.status || "DITUTUP");
      }

      // 3. Fetch Mode Token (Mapel / Siswa)
      const { data: dataModeToken } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "mode_token_ujian")
        .maybeSingle();

      if (dataModeToken && dataModeToken.value) {
        const mt =
          typeof dataModeToken.value === "string"
            ? JSON.parse(dataModeToken.value)
            : dataModeToken.value;
        setModeToken(mt.mode || "mapel");
        localStorage.setItem("dcc_mode_token", mt.mode || "mapel");
      }
    } catch (err) {
      console.warn("Membaca pengaturan dari cache lokal...", err);
      const localKatalog = localStorage.getItem("dcc_katalog_mapel");
      if (localKatalog) {
        try {
          setKatalogMapel(JSON.parse(localKatalog));
        } catch (e) {}
      }
      const localStatus = localStorage.getItem("dcc_status_sesi");
      if (localStatus) setStatusSesi(localStatus);

      const localModeToken = localStorage.getItem("dcc_mode_token");
      if (localModeToken) setModeToken(localModeToken);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPengaturan();
  }, []);

  const handleToggleStatusSesi = async () => {
    const nextStatus = statusSesi === "DIBUKA" ? "DITUTUP" : "DIBUKA";
    setIsTogglingStatus(true);
    setMessage({ type: "", text: "" });

    try {
      localStorage.setItem("dcc_status_sesi", nextStatus);

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .upsert(
          {
            key: "status_sesi_ujian",
            value: JSON.stringify({
              status: nextStatus,
              updated_at: new Date().toISOString(),
            }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );

      if (error) throw error;

      setStatusSesi(nextStatus);
      setMessage({
        type: "success",
        text: `Sesi Ujian berhasil ${nextStatus === "DIBUKA" ? "DIBUKA! Peserta dapat mengakses ujian." : "DITUTUP! Akses ujian dikunci."}`,
      });
    } catch (err) {
      console.error("Gagal memperbarui status sesi:", err);
      setStatusSesi(nextStatus);
      setMessage({
        type: "warning",
        text: "Status sesi berubah di lokal. Pastikan Supabase terhubung.",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Toggle Mode Token (Per Mapel <-> Per Siswa)
  const handleToggleModeToken = async (newMode) => {
    setModeToken(newMode);
    localStorage.setItem("dcc_mode_token", newMode);

    try {
      await supabase.from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian").upsert(
        {
          key: "mode_token_ujian",
          value: JSON.stringify({
            mode: newMode,
            updated_at: new Date().toISOString(),
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

      setMessage({
        type: "success",
        text: `Mode Token berhasil diubah ke: ${newMode === "mapel" ? "TOKEN PER MATA UJIAN (GLOBAL)" : "TOKEN UNIK PER SISWA (INDIVIDU)"}`,
      });
    } catch (e) {
      setMessage({ type: "warning", text: "Mode Token tersimpan di Lokal." });
    }
  };

  const saveToSupabase = async (updatedList) => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      localStorage.setItem("dcc_katalog_mapel", JSON.stringify(updatedList));

      const { error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .upsert(
          {
            key: "katalog_mata_ujian",
            value: JSON.stringify(updatedList),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Katalog mata ujian, KKM, Token & Bobot berhasil disimpan!",
      });
    } catch (err) {
      console.error("Gagal menyimpan ke Cloud:", err);
      setMessage({
        type: "warning",
        text: "Tersimpan di Lokal. Pastikan Supabase terhubung.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimpan = (e) => {
    if (e) e.preventDefault();
    saveToSupabase(katalogMapel);
  };

  const handleDurasiChange = (id, val) => {
    const updated = katalogMapel.map((m) =>
      m.id === id ? { ...m, durasi: val } : m,
    );
    setKatalogMapel(updated);
  };

  // Generate Token Acak untuk Satu Mapel
  const handleGenerateTokenMapel = (id) => {
    const newToken = generateRandomToken(id.substring(0, 4));
    const updated = katalogMapel.map((m) =>
      m.id === id ? { ...m, token: newToken } : m,
    );
    setKatalogMapel(updated);
    saveToSupabase(updated);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormMapel({
      id: "",
      nama: "",
      desc: "",
      durasi: 90,
      bobot_pg: 50,
      bobot_praktik: 50,
      kkm: 75,
      token: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormMapel({
      ...item,
      bobot_pg: item.bobot_pg ?? 50,
      bobot_praktik: item.bobot_praktik ?? 50,
      kkm: item.kkm ?? 75,
      token: item.token || `${item.id.toUpperCase()}2026`,
    });
    setIsModalOpen(true);
  };

  const handleDeleteMapel = (id, nama) => {
    if (katalogMapel.length <= 1) {
      return alert("Sistem harus memiliki minimal 1 Mata Ujian!");
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus Mata Ujian "${nama}"?`))
      return;

    const updated = katalogMapel.filter((m) => m.id !== id);
    setKatalogMapel(updated);
    saveToSupabase(updated);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formMapel.nama.trim()) return alert("Nama Mata Ujian wajib diisi!");

    const totalBobot =
      Number(formMapel.bobot_pg) + Number(formMapel.bobot_praktik);
    if (totalBobot !== 100) {
      return alert(
        `Total bobot penilaian harus 100%! Saat ini totalnya: ${totalBobot}% (PG: ${formMapel.bobot_pg}%, Praktik: ${formMapel.bobot_praktik}%)`,
      );
    }

    const generatedId = formMapel.id.trim()
      ? formMapel.id.toLowerCase().replace(/[^a-z0-9]/g, "")
      : formMapel.nama.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!editingId && katalogMapel.some((m) => m.id === generatedId)) {
      return alert(
        "ID / Kode Mata Ujian ini sudah digunakan! Gunakan nama yang berbeda.",
      );
    }

    const finalToken = formMapel.token.trim()
      ? formMapel.token.trim().toUpperCase()
      : generateRandomToken(generatedId.substring(0, 4));

    const payloadItem = {
      ...formMapel,
      id: editingId ? editingId : generatedId,
      durasi: Number(formMapel.durasi),
      bobot_pg: Number(formMapel.bobot_pg),
      bobot_praktik: Number(formMapel.bobot_praktik),
      kkm: Number(formMapel.kkm),
      token: finalToken,
    };

    let updatedList = [];
    if (editingId) {
      updatedList = katalogMapel.map((m) =>
        m.id === editingId ? payloadItem : m,
      );
    } else {
      updatedList = [...katalogMapel, payloadItem];
    }

    setKatalogMapel(updatedList);
    saveToSupabase(updatedList);
    setIsModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPengawas} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0 font-sans">
        <Navbar>
          <div className="flex items-center gap-3">
            <Sliders className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">
                PENGATURAN UJIAN
              </h1>
              <p className="text-xs text-slate-400 font-sans">
                Kontrol Akses Sesi, Mode Token, KKM & Bobot Nilai
              </p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* BARIS 1: DUA PANEL KONTROL (KONTROL SESI & MODE TOKEN) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PANEL A: KONTROL SESI UJIAN GLOBAL */}
              <div className="p-6 bg-[#0d1527]/80 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <Power
                      className={`w-5 h-5 ${statusSesi === "DIBUKA" ? "text-emerald-400" : "text-rose-400"}`}
                    />
                    <h2 className="text-sm font-display font-bold text-white uppercase tracking-widest">
                      SESI UJIAN GLOBAL
                    </h2>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-display font-bold uppercase tracking-wider ${
                        statusSesi === "DIBUKA"
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {statusSesi === "DIBUKA"
                        ? "● SESI AKTIF"
                        : "○ SESI DITUTUP"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {statusSesi === "DIBUKA"
                      ? "Sesi Ujian sedang DIBUKA. Peserta yang terdaftar dapat meloloskan verifikasi."
                      : "Sesi Ujian sedang DITUTUP. Akses pengerjaan dikunci rapat."}
                  </p>
                </div>

                <Button
                  onClick={handleToggleStatusSesi}
                  disabled={isTogglingStatus}
                  className={`w-full py-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 border-0 shadow-lg transition-all ${
                    statusSesi === "DIBUKA"
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                      : "bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-400/20"
                  }`}
                >
                  {statusSesi === "DIBUKA" ? (
                    <>
                      <Lock className="w-4 h-4" /> KUNCI & TUTUP SESI
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" /> BUKA SESI UJIAN
                    </>
                  )}
                </Button>
              </div>

              {/* PANEL B: SAKLAR DUAL-MODE TOKEN UJIAN */}
              <div className="p-6 bg-[#0d1527]/80 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <Key className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-display font-bold text-white uppercase tracking-widest">
                      MODE VERIFIKASI TOKEN
                    </h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-display font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      {modeToken === "mapel"
                        ? "PER MATA UJIAN"
                        : "PER SISWA UNIK"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Pilih apakah seluruh siswa menggunakan 1 Token Mapel yang
                    sama atau tiap siswa punya Token unik tersendiri.
                  </p>
                </div>

                {/* SWITCH BUTTONS */}
                <div className="grid grid-cols-2 gap-2 bg-[#030712] p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleModeToken("mapel")}
                    className={`py-2 px-3 rounded-lg text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5 ${
                      modeToken === "mapel"
                        ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Per Mata Ujian
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleModeToken("siswa")}
                    className={`py-2 px-3 rounded-lg text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5 ${
                      modeToken === "siswa"
                        ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Per Siswa Unik
                  </button>
                </div>
              </div>
            </div>

            {/* MASTER MATA UJIAN - TABLE GRID TEGAK LURUS PERFEK */}
            <div className="p-6 bg-[#0d1527]/60 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> MASTER MATA UJIAN, DURASI, KKM
                    & BOBOT
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Atur durasi pengerjaan, KKM, persentase bobot nilai, serta
                    Token acak per mata ujian.
                  </p>
                </div>

                <Button
                  onClick={openAddModal}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs px-4 py-2 border-0 rounded-xl flex items-center gap-1.5 w-fit shrink-0"
                >
                  <Plus className="w-4 h-4" /> Tambah Mata Ujian
                </Button>
              </div>

              {message.text && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border font-sans ${
                    message.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 font-sans">
                  Memuat data pengaturan...
                </div>
              ) : (
                <form onSubmit={handleSimpan} className="space-y-4">
                  <div className="space-y-3">
                    {katalogMapel.map((kat) => (
                      <div
                        key={kat.id}
                        className="p-4 rounded-xl bg-[#030712]/90 border border-slate-800 flex items-center justify-between gap-3 transition-all hover:border-slate-700 font-sans"
                      >
                        {/* 1. NAMA & DESKRIPSI (Lebar terpaksa min 200px) */}
                        <div className="w-[220px] shrink-0 space-y-0.5 pr-2">
                          <h3
                            className="font-display font-bold text-sm text-white truncate"
                            title={kat.nama}
                          >
                            {kat.nama}
                          </h3>
                          <p
                            className="text-[11px] text-slate-400 font-sans truncate"
                            title={kat.desc}
                          >
                            {kat.desc}
                          </p>
                        </div>

                        {/* 2. KELOMPOK BADGE MATRIKS (Kunci Lebar Tegak Lurus) */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* ID BADGE (120px) */}
                          <div className="w-[120px] shrink-0 text-center">
                            <span className="block text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded font-display font-bold uppercase tracking-wider truncate">
                              ID: {kat.id}
                            </span>
                          </div>

                          {/* KKM BADGE (70px) */}
                          <div className="w-[70px] shrink-0 text-center">
                            <span className="block text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-1 rounded font-display font-bold">
                              KKM: {kat.kkm ?? 75}
                            </span>
                          </div>

                          {/* BOBOT BADGE (165px) */}
                          <div className="w-[165px] shrink-0 text-center">
                            <span className="block text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded font-display font-bold">
                              Bobot: PG {kat.bobot_pg ?? 50}% | Prak{" "}
                              {kat.bobot_praktik ?? 50}%
                            </span>
                          </div>

                          {/* TOKEN BADGE & REFRESH (150px) */}
                          <div className="w-[150px] shrink-0 flex items-center gap-1 bg-cyan-950/30 border border-cyan-500/30 px-2 py-0.5 rounded-lg justify-between">
                            <span className="text-[10px] text-cyan-300 font-mono font-bold truncate">
                              {kat.token || `${kat.id.toUpperCase()}2026`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGenerateTokenMapel(kat.id)}
                              className="p-1 text-cyan-400 hover:text-white transition"
                              title="Generate Token Acak Baru"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 3. DURASI & AKSI (Kunci Lebar 140px Rata Kanan) */}
                        <div className="w-[140px] shrink-0 flex items-center justify-end gap-2.5 pl-2">
                          <div className="flex items-center gap-1 bg-[#0d1527] border border-cyan-400/30 px-2 py-1 rounded-xl">
                            <input
                              type="number"
                              min="5"
                              max="360"
                              value={kat.durasi || 90}
                              onChange={(e) =>
                                handleDurasiChange(
                                  kat.id,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-8 text-center font-display font-black text-cyan-400 bg-transparent text-sm focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-sans font-bold">
                              Mnt
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(kat)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                              title="Edit Mata Ujian"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteMapel(kat.id, kat.nama)
                              }
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                              title="Hapus Mata Ujian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs px-6 py-2.5 border-0 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-400/20"
                    >
                      <Save className="w-4 h-4" />{" "}
                      {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL INPUT / EDIT MATA UJIAN & BOBOT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <h3 className="font-display text-base font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />{" "}
                  {editingId ? "EDIT MATA UJIAN" : "TAMBAH MATA UJIAN"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">
                    Nama Mata Ujian
                  </label>
                  <Input
                    placeholder="Contoh: Adobe Photoshop"
                    value={formMapel.nama}
                    onChange={(e) =>
                      setFormMapel({ ...formMapel, nama: e.target.value })
                    }
                    required
                    className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">
                    Deskripsi Singkat
                  </label>
                  <Input
                    placeholder="Contoh: Desain Grafis & Manipulasi Foto"
                    value={formMapel.desc}
                    onChange={(e) =>
                      setFormMapel({ ...formMapel, desc: e.target.value })
                    }
                    className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-display font-bold text-slate-300 mb-1.5 block uppercase">
                      Durasi (Menit)
                    </label>
                    <Input
                      type="number"
                      min="5"
                      max="360"
                      value={formMapel.durasi}
                      onChange={(e) =>
                        setFormMapel({
                          ...formMapel,
                          durasi: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-display font-bold text-amber-400 mb-1.5 block uppercase flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Nilai KKM
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formMapel.kkm}
                      onChange={(e) =>
                        setFormMapel({
                          ...formMapel,
                          kkm: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold text-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-display font-bold text-cyan-400 mb-1.5 block uppercase flex items-center gap-1">
                    <Key className="w-3 h-3" /> Token Khusus Mapel
                  </label>
                  <Input
                    placeholder="Contoh: WORD2026 (Kosongkan jika auto)"
                    value={formMapel.token}
                    onChange={(e) =>
                      setFormMapel({
                        ...formMapel,
                        token: e.target.value.toUpperCase(),
                      })
                    }
                    className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-mono uppercase font-bold text-cyan-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div>
                    <label className="text-[11px] font-display font-bold text-cyan-400 mb-1 block uppercase flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Bobot PG (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formMapel.bobot_pg}
                      onChange={(e) => {
                        const pgVal = parseInt(e.target.value) || 0;
                        const prakVal = Math.max(0, 100 - pgVal);
                        setFormMapel({
                          ...formMapel,
                          bobot_pg: pgVal,
                          bobot_praktik: prakVal,
                        });
                      }}
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-display font-bold text-purple-400 mb-1 block uppercase flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Bobot Praktik (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formMapel.bobot_praktik}
                      onChange={(e) => {
                        const prakVal = parseInt(e.target.value) || 0;
                        setFormMapel({ ...formMapel, bobot_praktik: prakVal });
                      }}
                      required
                      className="bg-[#030712]/60 border-slate-800 text-sm rounded-xl font-sans text-center font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 text-xs border-0 font-sans"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Simpan Mata Ujian
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
