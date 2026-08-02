import React, { useState, useEffect } from "react";
import { supabase, TABLES } from "../../utils/supabaseClient";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import Button from "../../components/ui/Button";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Plus,
  X,
  Save,
  QrCode,
  GraduationCap,
} from "lucide-react";

export default function DataSiswa() {
  const [activeTab, setActiveTab] = useState("siswa"); // 'siswa' atau 'kurikulum'
  const [listSiswa, setListSiswa] = useState([]);
  const [listModul, setListModul] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSemester, setFilterSemester] = useState("semua");

  // State Modal Form Siswa
  const [isModalSiswaOpen, setIsModalSiswaOpen] = useState(false);
  const [editingSiswaId, setEditingSiswaId] = useState(null);
  const [formSiswa, setFormSiswa] = useState({
    nama: "",
    tech_id: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    alamat: "",
    semester: "Semester 1",
  });

  // State Modal Form Modul/Pembelajaran
  const [isModalModulOpen, setIsModalModulOpen] = useState(false);
  const [formModul, setFormModul] = useState({
    semester: "Semester 1",
    nama_modul: "",
    deskripsi: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDataSiswa();
    loadDataModul();
  }, []);

  const loadDataSiswa = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.PESERTA || "peserta")
        .select("*")
        .order("nama", { ascending: true });

      if (error) throw error;
      setListSiswa(data || []);
    } catch (err) {
      console.error("Gagal memuat data siswa:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDataModul = async () => {
    try {
      const { data, error } = await supabase
        .from("modul_pembelajaran")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) {
        setListModul(data);
      }
    } catch (err) {
      console.warn("Tabel modul_pembelajaran belum tersedia, menggunakan data default.");
    }
  };

  // --- HANDLER SISWA ---
  const handleOpenModalSiswa = (siswa = null) => {
    if (siswa) {
      setEditingSiswaId(siswa.id);
      setFormSiswa({
        nama: siswa.nama || siswa.nama_lengkap || "",
        tech_id: siswa.tech_id || "",
        tempat_lahir: siswa.tempat_lahir || "",
        tanggal_lahir: siswa.tanggal_lahir || "",
        alamat: siswa.alamat || "",
        semester: siswa.semester || "Semester 1",
      });
    } else {
      setEditingSiswaId(null);
      setFormSiswa({
        nama: "",
        tech_id: `DCC-${Math.floor(1000 + Math.random() * 9000)}`,
        tempat_lahir: "",
        tanggal_lahir: "",
        alamat: "",
        semester: "Semester 1",
      });
    }
    setIsModalSiswaOpen(true);
  };

  const handleSaveSiswa = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        nama: formSiswa.nama,
        nama_lengkap: formSiswa.nama,
        tech_id: formSiswa.tech_id,
        tempat_lahir: formSiswa.tempat_lahir,
        tanggal_lahir: formSiswa.tanggal_lahir || null,
        alamat: formSiswa.alamat,
        semester: formSiswa.semester,
        kategori: "Siswa",
      };

      if (editingSiswaId) {
        const { error } = await supabase
          .from(TABLES.PESERTA || "peserta")
          .update(payload)
          .eq("id", editingSiswaId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLES.PESERTA || "peserta")
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalSiswaOpen(false);
      loadDataSiswa();
    } catch (err) {
      alert("Gagal menyimpan data siswa: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSiswa = async (id, nama) => {
    if (!window.confirm(`Yakin hapus data siswa ${nama}?`)) return;
    try {
      const { error } = await supabase
        .from(TABLES.PESERTA || "peserta")
        .delete()
        .eq("id", id);
      if (error) throw error;
      loadDataSiswa();
    } catch (err) {
      alert("Gagal menghapus data.");
    }
  };

  // --- HANDLER MODUL PEMBELAJARAN ---
  const handleSaveModul = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("modul_pembelajaran")
        .insert([formModul]);

      if (error) throw error;
      setIsModalModulOpen(false);
      setFormModul({ semester: "Semester 1", nama_modul: "", deskripsi: "" });
      loadDataModul();
    } catch (err) {
      alert("Gagal menyimpan materi pembelajaran.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModul = async (id) => {
    if (!window.confirm("Hapus materi ini?")) return;
    try {
      await supabase.from("modul_pembelajaran").delete().eq("id", id);
      loadDataModul();
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  // Filter Data Siswa
  const siswaTerfilter = listSiswa.filter((s) => {
    const matchSem = filterSemester === "semua" || s.semester === filterSemester;
    const q = searchQuery.toLowerCase();
    const nama = (s.nama || s.nama_lengkap || "").toLowerCase();
    const techId = (s.tech_id || "").toLowerCase();
    return matchSem && (nama.includes(q) || techId.includes(q));
  });

  const daftarSemester = [
    "Semester 1",
    "Semester 2",
    "Semester 3",
    "Semester 4",
    "Semester 5",
    "Semester 6",
  ];

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <Users className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">
                DATA SISWA &amp; KURIKULUM SEMESTER
              </h1>
              <p className="text-xs text-slate-400">
                Kelola master identitas siswa, TechID QR, dan materi pembelajaran tiap semester
              </p>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
          {/* TAB NAVIGASI */}
          <div className="flex border-b border-slate-800 gap-4">
            <button
              onClick={() => setActiveTab("siswa")}
              className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "siswa"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" /> Master Data Siswa ({listSiswa.length})
            </button>
            <button
              onClick={() => setActiveTab("kurikulum")}
              className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "kurikulum"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Kurikulum &amp; Pembelajaran Semester
            </button>
          </div>

          {/* TAB 1: MASTER DATA SISWA */}
          {activeTab === "siswa" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1527]/70 p-4 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari Nama atau TechID..."
                      className="w-full bg-[#030712] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="semua">Semua Semester</option>
                    {daftarSemester.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => handleOpenModalSiswa()}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold border-0 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Tambah Siswa Baru
                </Button>
              </div>

              <div className="bg-[#0d1527]/60 border border-slate-800 rounded-2xl overflow-hidden">
                {isLoading ? (
                  <div className="p-10 text-center text-xs text-slate-500">
                    Memuat data siswa...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold bg-[#0a101d]">
                          <th className="p-3.5">Nama Siswa</th>
                          <th className="p-3.5">TechID (QR)</th>
                          <th className="p-3.5">Tingkat Semester</th>
                          <th className="p-3.5">TTL</th>
                          <th className="p-3.5">Alamat Domisili</th>
                          <th className="p-3.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {siswaTerfilter.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-500">
                              Tidak ada data siswa ditemukan.
                            </td>
                          </tr>
                        ) : (
                          siswaTerfilter.map((s) => (
                            <tr
                              key={s.id}
                              className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all"
                            >
                              <td className="p-3.5 font-bold text-white">
                                {s.nama || s.nama_lengkap || "-"}
                              </td>
                              <td className="p-3.5 font-mono text-cyan-400 flex items-center gap-1.5">
                                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                                {s.tech_id || "-"}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                                  {s.semester || "Semester 1"}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-300">
                                {s.tempat_lahir || "-"}
                                {s.tanggal_lahir ? `, ${s.tanggal_lahir}` : ""}
                              </td>
                              <td className="p-3.5 text-slate-400 max-w-xs truncate">
                                {s.alamat || "-"}
                              </td>
                              <td className="p-3.5 text-right space-x-2">
                                <button
                                  onClick={() => handleOpenModalSiswa(s)}
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSiswa(s.id, s.nama || s.nama_lengkap)
                                  }
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KURIKULUM PEMBELAJARAN SEMESTER */}
          {activeTab === "kurikulum" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#0d1527]/70 p-4 border border-slate-800 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    Peta Pembelajaran per Semester
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Modul/mata pelajaran ini menjadi acuan pembuatan soal dan penilaian
                  </p>
                </div>
                <Button
                  onClick={() => setIsModalModulOpen(true)}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold border-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Tambah Modul Materi
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {daftarSemester.map((sem) => {
                  const modulSem = listModul.filter((m) => m.semester === sem);
                  return (
                    <div
                      key={sem}
                      className="bg-[#0d1527]/60 border border-slate-800 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          {sem}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                          {modulSem.length} Materi
                        </span>
                      </div>

                      {modulSem.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic py-2">
                          Belum ada materi terdaftar untuk semester ini.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {modulSem.map((m) => (
                            <li
                              key={m.id}
                              className="p-2.5 rounded-xl bg-[#030712] border border-slate-800/80 flex items-center justify-between text-xs group"
                            >
                              <div>
                                <p className="font-bold text-white">{m.nama_modul}</p>
                                {m.deskripsi && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {m.deskripsi}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteModul(m.id)}
                                className="text-slate-600 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL FORM SISWA */}
      {isModalSiswaOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingSiswaId ? "Edit Identitas Siswa" : "Tambah Siswa Baru"}
              </h3>
              <button
                onClick={() => setIsModalSiswaOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSiswa} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formSiswa.nama}
                  onChange={(e) => setFormSiswa({ ...formSiswa, nama: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    TechID (Kode Unik QR) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSiswa.tech_id}
                    onChange={(e) => setFormSiswa({ ...formSiswa, tech_id: e.target.value })}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Tingkat Semester *
                  </label>
                  <select
                    value={formSiswa.semester}
                    onChange={(e) => setFormSiswa({ ...formSiswa, semester: e.target.value })}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {daftarSemester.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formSiswa.tempat_lahir}
                    onChange={(e) => setFormSiswa({ ...formSiswa, tempat_lahir: e.target.value })}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formSiswa.tanggal_lahir}
                    onChange={(e) => setFormSiswa({ ...formSiswa, tanggal_lahir: e.target.value })}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Alamat Tempat Tinggal
                </label>
                <textarea
                  rows="2"
                  value={formSiswa.alamat}
                  onChange={(e) => setFormSiswa({ ...formSiswa, alamat: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setIsModalSiswaOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs border-0"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs border-0 flex items-center gap-1.5"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? "Menyimpan..." : "Simpan Data"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM PEMBELAJARAN MODUL */}
      {isModalModulOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Tambah Modul / Materi Pembelajaran
              </h3>
              <button
                onClick={() => setIsModalModulOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModul} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Semester Target *
                </label>
                <select
                  value={formModul.semester}
                  onChange={(e) => setFormModul({ ...formModul, semester: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  {daftarSemester.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Nama Mata Pelajaran / Modul *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Microsoft Office & Excel"
                  value={formModul.nama_modul}
                  onChange={(e) => setFormModul({ ...formModul, nama_modul: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Deskripsi / Keterangan Singkat
                </label>
                <textarea
                  rows="2"
                  placeholder="Penjelasan ringkas materi..."
                  value={formModul.deskripsi}
                  onChange={(e) => setFormModul({ ...formModul, deskripsi: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setIsModalModulOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs border-0"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs border-0 flex items-center gap-1.5"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? "Menyimpan..." : "Simpan Materi"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}