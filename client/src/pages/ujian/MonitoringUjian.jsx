import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, TABLES } from "../../utils/supabaseClient"; // ✅ Ubah ke ../../
import { normalizeKategori } from "../../utils/examCategories"; // ✅ Ubah ke ../../
import { STORAGE_KEYS, jawabanLocalKey } from "../../utils/storageKeys"; // ✅ Ubah ke ../../
import Button from "../../components/ui/Button"; // ✅ Ubah ke ../../
import Badge from "../../components/ui/Badge"; // ✅ Ubah ke ../../
import Sidebar from "../../components/ui/Sidebar"; // ✅ Ubah ke ../../
import Navbar from "../../components/ui/Navbar"; // ✅ Ubah ke ../../
import {
  CheckSquare,
  Square,
  Award,
  ClipboardList,
  User,
  FileCode,
  CheckCircle2,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Trash2,
  Trash,
  WifiOff,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Key,
  Download,
  Eye,
  BarChart3,
  X,
  Activity,
  Unlock,
  CreditCard,
  Home,
  Database,
  Sliders,
  FileBarChart,
  MonitorCheck,
  LogIn,
  Clock,
} from "lucide-react";

const AKUN_SESSION_KEY = "dcc_akun_session";
const PRESENSI_STAFF_TABLE = "presensi_staff";
const BATAS_KUNCI_PINDAH_TAB = 3; // Samakan dengan MAX_VIOLATION_LIMIT di RuangUjian.jsx

const getTanggalHariIni = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Helper Generator Token Random Unik Siswa
const generateRandomTokenSiswa = (prefix = "TS") => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
};

// ✅ Sesudah:
export default function MonitoringUjian() {
  const navigate = useNavigate();
  const [sesiStaff, setSesiStaff] = useState(null);
  const [isCheckingSesi, setIsCheckingSesi] = useState(true);
  const [sudahPresensiHariIni, setSudahPresensiHariIni] = useState(false);
  const [isPresensiLoading, setIsPresensiLoading] = useState(false);

  const [peserta, setPeserta] = useState([]);
  const [bankSoalAll, setBankSoalAll] = useState([]);
  const [katalogMapel, setKatalogMapel] = useState([]);
  const [modeToken, setModeToken] = useState("mapel"); // 'mapel' | 'siswa'
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [soalPraktikList, setSoalPraktikList] = useState([]);
  const [checklistPraktik, setChecklistPraktik] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoadingPeriksa, setIsLoadingPeriksa] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // State Checkbox Bulk Delete
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter Status (6 Tab Utama)
  const [filterPeserta, setFilterPeserta] = useState("semua");
  const [filterTipeJawaban, setFilterTipeJawaban] = useState("semua");

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("terbaru");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const sortOptions = [
    { value: "terbaru", label: "Urutkan: Terbaru" },
    { value: "nama", label: "Urutkan: Nama (A-Z)" },
    { value: "pelanggaran", label: "Urutkan: Pelanggaran Terbanyak" },
    { value: "nilai", label: "Urutkan: Nilai Tertinggi" },
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // State Analisis Butir Soal
  const [showAnalisisModal, setShowAnalisisModal] = useState(false);
  const [isLoadingAnalisis, setIsLoadingAnalisis] = useState(false);
  const [analisisData, setAnalisisData] = useState([]);

  // State Modal Aktivitas Pindah Tab
  const [showPindahTabModal, setShowPindahTabModal] = useState(false);

  const pesertaFileInputRef = useRef(null);
  const isLeadInstruktur = sesiStaff?.tipe === "admin";
  const roleLabel = isLeadInstruktur ? "Lead Instruktur" : "Pengawas";
  const audioAlertRef = useRef(null);

  const playAlertSound = () => {
    try {
      if (!audioAlertRef.current) {
        audioAlertRef.current = new Audio(
          "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
        );
      }
      audioAlertRef.current.currentTime = 0;
      audioAlertRef.current.play().catch(() => {});
    } catch (e) {}
  };

  // 🔔 Sistem Toast Notification (pengganti alert() browser)
  const showToast = (message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const logAudit = async (aksi, detail = "") => {
    try {
      await supabase.from("audit_log").insert({
        username: sesiStaff?.username || "unknown",
        aksi,
        detail,
      });
    } catch (e) {
      console.warn("Gagal mencatat audit log:", e);
    }
  };

  // Menu Sidebar
  const menuPengawas = [
    { label: "Menu Utama", path: "/", icon: Home },
    { label: "Koreksi Ujian", path: "/dashboard-anggota", icon: CheckSquare },
    { label: "Repositori Soal", path: "/bank-soal", icon: Database },
    { label: "Pengaturan Ujian", path: "/pengaturan-ujian", icon: Sliders },
    { label: "Laporan Nilai", path: "/laporan", icon: FileBarChart },
    { label: "Fasilitas DCC", path: "/fasilitas-dcc", icon: MonitorCheck },
  ];

  // Load Katalog Mata Ujian & Mode Token
  const loadKatalogPengaturan = async () => {
    try {
      const { data } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "katalog_mata_ujian")
        .maybeSingle();

      if (data && data.value) {
        const parsed =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) {
          setKatalogMapel(parsed);
          localStorage.setItem("dcc_katalog_mapel", JSON.stringify(parsed));
        }
      }

      // Fetch Mode Token Global dari Cloud
      const { data: dataMode } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "mode_token_ujian")
        .maybeSingle();

      if (dataMode && dataMode.value) {
        const mt =
          typeof dataMode.value === "string"
            ? JSON.parse(dataMode.value)
            : dataMode.value;
        setModeToken(mt.mode || "mapel");
        localStorage.setItem("dcc_mode_token", mt.mode || "mapel");
      }
    } catch (e) {
      console.warn("Gagal memuat katalog pengaturan dari cloud...", e);
      const localKatalog = localStorage.getItem("dcc_katalog_mapel");
      if (localKatalog) {
        try {
          setKatalogMapel(JSON.parse(localKatalog));
        } catch (e) {}
      }
      const localMode = localStorage.getItem("dcc_mode_token");
      if (localMode) setModeToken(localMode);
    }
  };

  const loadPeserta = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PESERTA)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let rows = Array.isArray(data) ? data : [];

      // Kalau ada peserta yang belum punya token di Supabase, buatkan & simpan ke Supabase
      // (WAJIB tersimpan di Supabase supaya laptop peserta manapun bisa membacanya)
      const belumPunyaToken = rows.filter((p) => !p.token);
      for (const p of belumPunyaToken) {
        const generated = generateRandomTokenSiswa();
        p.token = generated;
        try {
          await supabase
            .from(TABLES.PESERTA)
            .update({ token: generated })
            .eq("id", p.id);
        } catch (e) {
          console.warn(
            "Gagal menyimpan token baru ke Cloud untuk",
            p.tech_id,
            e,
          );
        }
      }

      rows = rows.map((p) => ({ ...p, token_peserta: p.token }));

      setPeserta(rows);
      setIsOffline(false);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(rows));
    } catch (err) {
      console.warn(
        "Gagal terhubung ke Cloud (peserta), menggunakan cache lokal.",
        err,
      );
      setIsOffline(true);
      const localSesi = localStorage.getItem(STORAGE_KEYS.PESERTA);
      if (localSesi) {
        try {
          setPeserta(JSON.parse(localSesi));
        } catch (e) {
          setPeserta([]);
        }
      }
    }
  };

  const loadBankSoal = async () => {
    try {
      const { data, error } = await supabase.from(TABLES.BANK_SOAL).select("*");
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setBankSoalAll(rows);
      localStorage.setItem(STORAGE_KEYS.BANK_SOAL, JSON.stringify(rows));
    } catch (err) {
      console.warn(
        "Gagal memuat Repositori Soal dari Cloud, menggunakan cache lokal.",
        err,
      );
      const cached = localStorage.getItem(STORAGE_KEYS.BANK_SOAL);
      if (cached) {
        try {
          setBankSoalAll(JSON.parse(cached));
        } catch (e) {
          setBankSoalAll([]);
        }
      }
    }
  };

  // 🔐 Proteksi halaman — cuma yang login lewat /akun-login (anggota/admin) yang boleh masuk
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

  // 📋 Cek apakah staff ini sudah presensi hari ini
  const cekPresensiHariIni = async (username) => {
    try {
      const { data } = await supabase
        .from(PRESENSI_STAFF_TABLE)
        .select("*")
        .eq("username", username)
        .eq("tanggal", getTanggalHariIni())
        .maybeSingle();
      setSudahPresensiHariIni(!!data);
    } catch (e) {
      console.warn("Gagal cek presensi staff:", e);
    }
  };

  const handlePresensiStaff = async () => {
    if (!sesiStaff) return;
    setIsPresensiLoading(true);
    try {
      const { error } = await supabase.from(PRESENSI_STAFF_TABLE).insert({
        username: sesiStaff.username,
        nama: sesiStaff.nama,
        tanggal: getTanggalHariIni(),
        waktu_masuk: new Date().toISOString(),
        status: "HADIR",
      });
      if (error) throw error;
      setSudahPresensiHariIni(true);
    } catch (e) {
      showToast(
        "Gagal mencatat presensi. Mungkin sudah tercatat hari ini.",
        "error",
      );
      setSudahPresensiHariIni(true);
    } finally {
      setIsPresensiLoading(false);
    }
  };

  useEffect(() => {
    if (sesiStaff?.username) cekPresensiHariIni(sesiStaff.username);
  }, [sesiStaff]);

  useEffect(() => {
    if (!sesiStaff) return;
    loadPeserta();
    loadBankSoal();
    loadKatalogPengaturan();

    const interval = setInterval(() => {
      loadPeserta();
    }, 4000);

    return () => clearInterval(interval);
  }, [sesiStaff]);

  // 📡 REALTIME: update kartu peserta INSTAN begitu ada perubahan di Supabase
  // (progress soal, status, jumlah pindah tab, dll) — tanpa perlu menunggu polling atau refresh manual.
  useEffect(() => {
    const channel = supabase
      .channel("realtime_progress_peserta")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: TABLES.PESERTA },
        (payload) => {
          if (!payload.new) return;
          setPeserta((prev) => {
            const before = prev.find((p) => p.id === payload.new.id);
            const before_tab = before?.jumlah_pindah_tab ?? 0;
            const after_tab = payload.new.jumlah_pindah_tab ?? 0;
            if (after_tab > before_tab) {
              playAlertSound();
              showToast(
                `⚠️ ${payload.new.nama || payload.new.nama_lengkap || "Peserta"} pindah tab! (${after_tab}x)`,
                "warning",
              );
            }
            return prev.map((p) =>
              p.id === payload.new.id
                ? {
                    ...p,
                    ...payload.new,
                    token_peserta: payload.new.token || p.token_peserta,
                  }
                : p,
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeserta, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Impor Peserta Tanpa Kolom Token (Supabase Aman Bebas Error 400)
  const handleImportPesertaExcelCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== "");
      const importedPesertaArr = [];

      const existingTechIds = new Set(
        peserta.map((p) => (p.tech_id || "").toLowerCase().trim()),
      );

      let duplicateCount = 0;
      let invalidKategoriCount = 0;

      let savedTokenMap = {};
      try {
        savedTokenMap = JSON.parse(
          localStorage.getItem("dcc_persistent_tokens") || "{}",
        );
      } catch (e) {}

      lines.forEach((line, index) => {
        if (
          index === 0 &&
          (line.toLowerCase().includes("nama") ||
            line.toLowerCase().includes("techid"))
        ) {
          return;
        }

        let delimiter = ",";
        if (line.includes(";")) delimiter = ";";
        else if (line.includes("\t")) delimiter = "\t";

        const regex = new RegExp(
          `${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`,
        );
        const cols = line
          .split(regex)
          .map((c) => c.replace(/^"|"$/g, "").trim());

        if (cols.length >= 2) {
          const nama = cols[0] || `Peserta #${index + 1}`;
          const techId =
            cols[1] || `DCC25-${String(index + 1).padStart(3, "0")}`;
          const cleanTechId = techId.toLowerCase().trim();

          if (existingTechIds.has(cleanTechId)) {
            duplicateCount++;
            return;
          }

          const finalKat = normalizeKategori(cols[2]);
          if (!finalKat) {
            invalidKategoriCount++;
            return;
          }

          const uniqueTokenSiswa = generateRandomTokenSiswa();
          savedTokenMap[techId] = uniqueTokenSiswa;

          if (nama && !nama.toLowerCase().includes("nama lengkap")) {
            existingTechIds.add(cleanTechId);
            importedPesertaArr.push({
              nama: nama,
              nama_lengkap: nama,
              tech_id: techId,
              kategori: finalKat,
              token: uniqueTokenSiswa,
              status: "belum_mulai",
              status_koreksi: "belum_dikoreksi",
              nilai_pg: 0,
              nilai_praktik: 0,
              nilai_akhir: 0,
            });
          }
        }
      });

      localStorage.setItem(
        "dcc_persistent_tokens",
        JSON.stringify(savedTokenMap),
      );

      if (importedPesertaArr.length === 0) {
        if (duplicateCount > 0)
          showToast(
            `Semua data (${duplicateCount}) sudah terdaftar!`,
            "warning",
          );
        else if (invalidKategoriCount > 0)
          showToast(`Gagal impor. Kategori mata ujian tidak valid.`, "error");
        else showToast("Format file tidak sesuai!", "error");
        e.target.value = "";
        return;
      }

      // Token ikut disimpan ke Supabase supaya bisa dibaca dari laptop peserta manapun
      const payloadToSupabase = importedPesertaArr;

      try {
        const { error } = await supabase
          .from(TABLES.PESERTA)
          .insert(payloadToSupabase);
        if (error) throw error;

        await loadPeserta();
        showToast(
          `Berhasil mengimpor ${importedPesertaArr.length} peserta! Token unik siswa telah dibuat permanen.`,
          "success",
        );
      } catch (err) {
        console.error("Gagal impor peserta:", err);
        const mergedWithToken = [...importedPesertaArr, ...peserta];
        setPeserta(mergedWithToken);
        localStorage.setItem(
          STORAGE_KEYS.PESERTA,
          JSON.stringify(mergedWithToken),
        );
        showToast(
          "Tersimpan di lokal. Token unik siswa berhasil dibuat.",
          "warning",
        );
      } finally {
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  // Fitur Download Data Peserta Lengkap Beserta Token Uniknya
  const handleDownloadPesertaToken = () => {
    if (peserta.length === 0)
      return showToast("Belum ada data peserta untuk diunduh!", "warning");
    let csvContent =
      "data:text/csv;charset=utf-8,Nama Lengkap,TechID,Kategori,Token Peserta\n";
    peserta.forEach((p) => {
      const nama = p.nama || p.nama_lengkap || "-";
      const techId = p.tech_id || "-";
      const kat = p.kategori || "-";
      const token = p.token || p.token_peserta || generateRandomTokenSiswa();
      csvContent += `"${nama}","${techId}","${kat}","${token}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Daftar_Peserta_Dan_Token_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 📈 Fitur Analisis Butir Soal — hitung persentase peserta yang menjawab benar per soal PG
  const handleAnalisisSoal = async () => {
    setShowAnalisisModal(true);
    setIsLoadingAnalisis(true);

    try {
      const { data: semuaJawaban, error } = await supabase
        .from(TABLES.JAWABAN_PESERTA)
        .select("soal_id, jawaban");

      if (error) throw error;

      const soalPGList = bankSoalAll.filter(
        (s) => (s.tipe || "").toLowerCase() === "pg",
      );

      const hasil = soalPGList
        .map((s) => {
          const kunciHuruf = (s.jawaban_benar || s.jawabanBenar || "A")
            .toString()
            .toUpperCase()
            .trim();
          const kunciIdx = kunciHuruf.charCodeAt(0) - 65;
          const kunciTeks =
            (Array.isArray(s.opsi) ? s.opsi[kunciIdx] : "") || "";

          const jawabanUntukSoalIni = (semuaJawaban || []).filter(
            (j) => String(j.soal_id).trim() === String(s.id).trim(),
          );

          let benar = 0;
          jawabanUntukSoalIni.forEach((j) => {
            const jwbTeks = (j.jawaban || "").toString().trim().toLowerCase();
            if (
              jwbTeks &&
              jwbTeks === kunciTeks.toString().trim().toLowerCase()
            )
              benar++;
          });

          const totalDijawab = jawabanUntukSoalIni.length;
          const persentaseBenar =
            totalDijawab > 0 ? Math.round((benar / totalDijawab) * 100) : null;

          return {
            soalId: s.id,
            pertanyaan: s.pertanyaan || `Soal #${s.id}`,
            kategori: s.kategori,
            totalDijawab,
            benar,
            salah: totalDijawab - benar,
            persentaseBenar,
          };
        })
        .sort(
          (a, b) => (a.persentaseBenar ?? 999) - (b.persentaseBenar ?? 999),
        );

      setAnalisisData(hasil);
    } catch (err) {
      console.error("Gagal memuat analisis soal:", err);
      showToast("Gagal memuat data analisis butir soal.", "error");
    } finally {
      setIsLoadingAnalisis(false);
    }
  };

  // 🪪 Cetak Kartu ID + QR Code untuk semua peserta (langsung dari TechID, tanpa perlu generate/simpan gambar terpisah)
  const handleCetakKartuID = () => {
    if (filteredPeserta.length === 0)
      return showToast("Tidak ada peserta untuk dicetak kartunya!", "warning");

    const win = window.open("", "_blank");
    const kartuHtml = filteredPeserta
      .map((p) => {
        const nama = p.nama || p.nama_lengkap || "-";
        const techId = p.tech_id || "-";
        const kategori = (p.kategori || "-").toUpperCase();
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(techId)}`;

        return `
        <div class="kartu">
          <div class="kartu-header">
            <span class="logo-text">DCC</span>
            <span class="judul">DARUTTAUFIQ COMPUTER CENTRE</span>
          </div>
          <div class="kartu-body">
            <div class="info">
              <p class="nama">${nama}</p>
              <p class="techid">${techId}</p>
              <p class="kategori">${kategori}</p>
            </div>
            <img class="qr" src="${qrUrl}" alt="QR ${techId}" />
          </div>
          <div class="kartu-footer">Kartu Identitas & Presensi Digital</div>
        </div>
      `;
      })
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Kartu ID Peserta</title>
        <style>
          @page { margin: 12mm; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f1f5f9; }
          .grid { display: flex; flex-wrap: wrap; gap: 14px; padding: 14px; }
          .kartu {
            width: 300px; border: 2px solid #0891b2; border-radius: 14px; overflow: hidden;
            background: #ffffff; break-inside: avoid; page-break-inside: avoid;
          }
          .kartu-header {
            background: #0891b2; color: #fff; padding: 8px 12px; display: flex; align-items: center; gap: 8px;
          }
          .logo-text { font-weight: bold; font-size: 14px; letter-spacing: 1px; }
          .judul { font-size: 9px; font-weight: bold; letter-spacing: 0.5px; }
          .kartu-body { display: flex; align-items: center; justify-content: space-between; padding: 14px; gap: 10px; }
          .info { flex: 1; min-width: 0; }
          .nama { font-size: 15px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; }
          .techid { font-size: 13px; font-weight: bold; color: #0891b2; margin: 0 0 4px 0; font-family: monospace; }
          .kategori { font-size: 10px; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .qr { width: 80px; height: 80px; shrink: 0; }
          .kartu-footer { background: #f1f5f9; color: #64748b; font-size: 8px; text-align: center; padding: 4px; letter-spacing: 0.5px; }
          @media print {
            body { background: #fff; }
            .kartu { break-inside: avoid; }
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="grid">${kartuHtml}</div>
      </body>
      </html>
    `);
    win.document.close();
  };
  // 📤 Export Daftar Pelanggaran (Pindah Tab) ke CSV
  const handleExportPelanggaran = () => {
    const dataPelanggaran = peserta.filter((p) => (p.jumlah_pindah_tab ?? 0) > 0);
    if (dataPelanggaran.length === 0) {
      return showToast("Tidak ada data pelanggaran untuk diekspor!", "warning");
    }
    let csvContent =
      "data:text/csv;charset=utf-8,Nama,TechID,Kategori,Jumlah Pindah Tab,Status\n";
    dataPelanggaran
      .sort((a, b) => (b.jumlah_pindah_tab ?? 0) - (a.jumlah_pindah_tab ?? 0))
      .forEach((p) => {
        const nama = p.nama || p.nama_lengkap || "-";
        csvContent += `"${nama}","${p.tech_id || "-"}","${p.kategori || "-"}","${p.jumlah_pindah_tab}","${p.status || "-"}"\n`;
      });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Pelanggaran_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ⚡ REMOTE UNLOCK 1-CLICK — kirim sinyal buka kunci ke laptop peserta via Supabase Realtime
  const handleRemoteUnlock = async (pesertaId, nama) => {
    try {
      const { error } = await supabase
        .from(TABLES.PESERTA)
        .update({ unlock_signal: new Date().toISOString() })
        .eq("id", pesertaId);

      if (error) throw error;
      logAudit("REMOTE_UNLOCK", `Membuka kunci layar peserta: ${nama}`);
      showToast(
        `Sinyal Buka Kunci berhasil dikirim ke laptop ${nama}!`,
        "success",
      );
    } catch (err) {
      showToast(
        `Gagal melakukan remote unlock untuk ${nama}: ` + err.message,
        "error",
      );
    }
  };
  const handleRegenerateTokenSiswa = async (pesertaId, techId) => {
    const newToken = generateRandomTokenSiswa();
    try {
      await supabase
        .from(TABLES.PESERTA)
        .update({ token: newToken })
        .eq("id", pesertaId);

      let savedTokenMap = {};
      try {
        savedTokenMap = JSON.parse(
          localStorage.getItem("dcc_persistent_tokens") || "{}",
        );
      } catch (e) {}

      savedTokenMap[techId] = newToken;
      localStorage.setItem(
        "dcc_persistent_tokens",
        JSON.stringify(savedTokenMap),
      );

      const updated = peserta.map((p) =>
        p.id === pesertaId
          ? { ...p, token: newToken, token_peserta: newToken }
          : p,
      );
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      logAudit("RESET_TOKEN", `Reset token untuk TechID: ${techId}`);
      showToast(`Token baru untuk TechID ${techId}: ${newToken}`, "success");
    } catch (e) {
      showToast("Gagal mereset token peserta.", "error");
    }
  };

  const handleDeleteSingle = async (pesertaId, nama) => {
    if (!confirm(`Hapus data peserta "${nama}"?`)) return;

    try {
      const targetPeserta = peserta.find((p) => p.id === pesertaId);
      const { error } = await supabase
        .from(TABLES.PESERTA)
        .delete()
        .eq("id", pesertaId);
      if (error) throw error;

      if (targetPeserta?.tech_id) {
        try {
          await supabase
            .from(TABLES.JAWABAN_PESERTA)
            .delete()
            .eq("tech_id", targetPeserta.tech_id);
        } catch (e) {
          console.warn("Gagal menghapus jawaban terkait peserta ini.", e);
        }
      }

      const updated = peserta.filter((p) => p.id !== pesertaId);
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      if (selectedSiswa === pesertaId) setSelectedSiswa(null);
      logAudit("HAPUS_PESERTA", `Menghapus peserta: ${nama}`);
    } catch (err) {
      showToast("Gagal menghapus peserta.", "error");
    }
  };

  const handleDeleteSelected = async () => {
    if (!isLeadInstruktur) {
      return showToast("Hanya Lead Instruktur yang boleh menghapus peserta!", "error");
    }
    if (selectedIds.length === 0)
      return showToast("Pilih minimal satu peserta!", "warning");
    if (!confirm(`Hapus ${selectedIds.length} peserta terpilih?`)) return;

    try {
      const targetTechIds = peserta
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => p.tech_id)
        .filter(Boolean);
      const { error } = await supabase
        .from(TABLES.PESERTA)
        .delete()
        .in("id", selectedIds);
      if (error) throw error;

      if (targetTechIds.length > 0) {
        try {
          await supabase
            .from(TABLES.JAWABAN_PESERTA)
            .delete()
            .in("tech_id", targetTechIds);
        } catch (e) {
          console.warn("Gagal menghapus jawaban terkait peserta terpilih.", e);
        }
      }

      const updated = peserta.filter((p) => !selectedIds.includes(p.id));
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      setSelectedIds([]);
      if (selectedIds.includes(selectedSiswa)) setSelectedSiswa(null);
    } catch (err) {
      showToast("Gagal menghapus peserta terpilih.", "error");
    }
  };

  const handleDeleteAll = async () => {
    if (!isLeadInstruktur) {
      return showToast("Hanya Lead Instruktur yang boleh menghapus semua data!", "error");
    }
    if (!confirm("HAPUS SEMUA PESERTA?")) return;
    if (
      !confirm(
        `Konfirmasi terakhir: ${peserta.length} data peserta akan dihapus PERMANEN.`,
      )
    )
      return;

    try {
      const idsToDelete = peserta.map((p) => p.id).filter(Boolean);
      const techIdsToDelete = peserta.map((p) => p.tech_id).filter(Boolean);
      if (idsToDelete.length > 0) {
        await supabase.from(TABLES.PESERTA).delete().in("id", idsToDelete);
      }
      if (techIdsToDelete.length > 0) {
        try {
          await supabase
            .from(TABLES.JAWABAN_PESERTA)
            .delete()
            .in("tech_id", techIdsToDelete);
        } catch (e) {
          console.warn("Gagal menghapus jawaban terkait semua peserta.", e);
        }
      }
      setPeserta([]);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify([]));
      localStorage.removeItem("dcc_persistent_tokens");
      setSelectedSiswa(null);
      setSelectedIds([]);
    } catch (err) {
      showToast("Gagal mereset data peserta.", "error");
    }
  };

  const toggleSelectPeserta = (pesertaId) => {
    setSelectedIds((prev) =>
      prev.includes(pesertaId)
        ? prev.filter((id) => id !== pesertaId)
        : [...prev, pesertaId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPeserta.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPeserta.map((p) => p.id));
    }
  };

  const handlePeriksa = async (pesertaId) => {
    setSelectedSiswa(pesertaId);
    setIsSaved(false);
    setIsLoadingPeriksa(true);

    const targetUser = peserta.find((p) => p.id === pesertaId);
    if (!targetUser) {
      setIsLoadingPeriksa(false);
      return;
    }

    const cleanTechId = (targetUser.tech_id || "").trim();
    let detailJawaban = [];

    try {
      const { data: jawabanRows, error } = await supabase
        .from(TABLES.JAWABAN_PESERTA)
        .select("*")
        .ilike("tech_id", cleanTechId);

      if (error) throw error;

      if (jawabanRows && jawabanRows.length > 0) {
        detailJawaban = jawabanRows.map((row) => {
          const matchedSoal =
            bankSoalAll.find(
              (s) => String(s.id).trim() === String(row.soal_id).trim(),
            ) || {};

          let parsedJwb = row.jawaban;
          if (typeof row.jawaban === "string") {
            try {
              const trimmed = row.jawaban.trim();
              if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                parsedJwb = JSON.parse(trimmed);
              }
            } catch (e) {
              parsedJwb = row.jawaban;
            }
          }

          const isObj = typeof parsedJwb === "object" && parsedJwb !== null;
          const rawTipe = (matchedSoal.tipe || "").toLowerCase();
          const tipeFinal =
            rawTipe.includes("prak") || rawTipe.includes("essay") || isObj
              ? "praktik"
              : "pg";

          return {
            soal_id: row.soal_id,
            tipe: tipeFinal,
            pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${row.soal_id}`,
            jawaban: parsedJwb,
            ragu_ragu: !!row.ragu_ragu,
            checklist:
              tipeFinal === "praktik"
                ? matchedSoal.checklist || [
                    "Instruksi pengerjaan terpenuhi",
                    "Format berkas valid",
                  ]
                : null,
          };
        });
      }
    } catch (err) {
      console.warn(
        "Gagal fetch dari Cloud, membaca fallback LocalStorage...",
        err,
      );
    }

    if (detailJawaban.length === 0) {
      const savedJawabanStr =
        localStorage.getItem(jawabanLocalKey(cleanTechId)) ||
        localStorage.getItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY);

      if (savedJawabanStr) {
        try {
          const parsedJwb = JSON.parse(savedJawabanStr);
          detailJawaban = Object.keys(parsedJwb).map((soalId) => {
            const matchedSoal =
              bankSoalAll.find(
                (s) => String(s.id).trim() === String(soalId).trim(),
              ) || {};
            const entry = parsedJwb[soalId];
            const isWrapped =
              entry && typeof entry === "object" && "jawaban" in entry;
            const actualJwb = isWrapped ? entry.jawaban : entry;

            const rawTipeLokal = (matchedSoal.tipe || "").toLowerCase();
            const isObjLokal = actualJwb && typeof actualJwb === "object";
            const tipeFinalLokal =
              rawTipeLokal.includes("prak") ||
              rawTipeLokal.includes("essay") ||
              isObjLokal
                ? "praktik"
                : "pg";

            return {
              soal_id: soalId,
              tipe: tipeFinalLokal,
              pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${soalId}`,
              jawaban: actualJwb,
              ragu_ragu: isWrapped ? !!entry.ragu_ragu : false,
              checklist:
                tipeFinalLokal === "praktik"
                  ? matchedSoal.checklist || [
                      "Instruksi pengerjaan terpenuhi",
                      "Format berkas valid",
                    ]
                  : null,
            };
          });
        } catch (e) {
          detailJawaban = [];
        }
      }
    }

    setFilterTipeJawaban("semua");
    setSoalPraktikList(detailJawaban);
    initChecklistData(detailJawaban);
    setIsLoadingPeriksa(false);
  };

  const initChecklistData = (data) => {
    const initChecklist = {};
    data.forEach((j) => {
      if (j.checklist) {
        const kriteriaArr =
          typeof j.checklist === "string"
            ? JSON.parse(j.checklist)
            : j.checklist;
        if (Array.isArray(kriteriaArr)) {
          kriteriaArr.forEach((_, idx) => {
            initChecklist[`${j.soal_id}-${idx}`] = true;
          });
        }
      }
    });
    setChecklistPraktik(initChecklist);
  };

  const toggleChecklist = (key) => {
    setChecklistPraktik((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hitungSkorPraktikLokal = () => {
    const keys = Object.keys(checklistPraktik);
    if (keys.length === 0) return 90;
    const dicentang = keys.filter((k) => checklistPraktik[k] === true).length;
    return Math.round((dicentang / keys.length) * 100);
  };

  // Perhitungan Nilai Akhir dengan Bobot Dinamis & Fallback Soal PG Saja
  const submitSimpanNilaiPraktik = async () => {
    const targetUser = peserta.find((p) => p.id === selectedSiswa);
    if (!targetUser) return;

    const katId = normalizeKategori(targetUser.kategori);
    const matchedKat = katalogMapel.find((m) => m.id === katId);

    const adaSoalPraktikInBank = bankSoalAll.some((s) => {
      const sKat = normalizeKategori(s.kategori);
      const sTipe = (s.tipe || "").toLowerCase();
      return (
        sKat === katId && (sTipe.includes("prak") || sTipe.includes("essay"))
      );
    });

    let bobotPG =
      matchedKat?.bobot_pg !== undefined ? Number(matchedKat.bobot_pg) : 50;
    let bobotPraktik =
      matchedKat?.bobot_praktik !== undefined
        ? Number(matchedKat.bobot_praktik)
        : 50;

    if (!adaSoalPraktikInBank) {
      bobotPG = 100;
      bobotPraktik = 0;
    }

    const skorPraktikTotal = hitungSkorPraktikLokal();
    const pg =
      targetUser?.nilai_pg !== undefined && targetUser?.nilai_pg !== null
        ? Number(targetUser.nilai_pg)
        : 0;

    const nilaiAkhirBaru = Math.round(
      pg * (bobotPG / 100) + skorPraktikTotal * (bobotPraktik / 100),
    );

    try {
      const { error } = await supabase
        .from(TABLES.PESERTA)
        .update({
          nilai_praktik: skorPraktikTotal,
          nilai_akhir: nilaiAkhirBaru,
          status_koreksi: "dikoreksi",
          status: "selesai",
        })
        .eq("id", selectedSiswa);

      if (error) throw error;

      const updatedPeserta = peserta.map((p) => {
        if (p.id === selectedSiswa) {
          return {
            ...p,
            nilai_praktik: skorPraktikTotal,
            nilai_akhir: nilaiAkhirBaru,
            status_koreksi: "dikoreksi",
            status: "selesai",
          };
        }
        return p;
      });

      setPeserta(updatedPeserta);
      localStorage.setItem(
        STORAGE_KEYS.PESERTA,
        JSON.stringify(updatedPeserta),
      );
      setIsSaved(true);
      showToast(
        `Nilai tersimpan!\nPG (${bobotPG}%): ${pg} • Praktik (${bobotPraktik}%): ${skorPraktikTotal} • Total: ${nilaiAkhirBaru}`,
        "success",
      );
    } catch (err) {
      showToast("Gagal menyimpan nilai.", "error");
    }
  };

  // Filter Peserta
  const filteredPeserta = peserta.filter((p) => {
    const statusP = p.status || "belum_mulai";
    const isDikoreksi =
      p.status_koreksi === "dikoreksi" || p.status_koreksi === "SELESAI";

    let statusMatch = true;
    if (filterPeserta === "belum_mulai")
      statusMatch = statusP === "belum_mulai";
    else if (filterPeserta === "berjalan") statusMatch = statusP === "berjalan";
    else if (filterPeserta === "perlu_dikoreksi")
      statusMatch = statusP === "selesai" && !isDikoreksi;
    else if (filterPeserta === "selesai_dikoreksi")
      statusMatch = statusP === "selesai" && isDikoreksi;
    else if (filterPeserta === "selesai_ujian")
      statusMatch = statusP === "selesai";

    if (!statusMatch) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nama = (p.nama || p.nama_lengkap || "").toLowerCase();
      const techId = (p.tech_id || "").toLowerCase();
      const tokenVal = (p.token || p.token_peserta || "").toLowerCase();
      return nama.includes(q) || techId.includes(q) || tokenVal.includes(q);
    }

    return true;
  });

  const countBelumUjian = peserta.filter(
    (p) => (p.status || "belum_mulai") === "belum_mulai",
  ).length;
  const countSedangUjian = peserta.filter(
    (p) => p.status === "berjalan",
  ).length;
  const countPerluDikoreksi = peserta.filter(
    (p) =>
      p.status === "selesai" &&
      p.status_koreksi !== "dikoreksi" &&
      p.status_koreksi !== "SELESAI",
  ).length;
  const countSelesaiDikoreksi = peserta.filter(
    (p) =>
      p.status === "selesai" &&
      (p.status_koreksi === "dikoreksi" || p.status_koreksi === "SELESAI"),
  ).length;
  const countSelesaiUjian = peserta.filter(
    (p) => p.status === "selesai",
  ).length;

  const sortedPeserta = [...filteredPeserta].sort((a, b) => {
    if (sortBy === "nama") {
      return (a.nama || a.nama_lengkap || "").localeCompare(
        b.nama || b.nama_lengkap || "",
      );
    }
    if (sortBy === "pelanggaran") {
      return (b.jumlah_pindah_tab ?? 0) - (a.jumlah_pindah_tab ?? 0);
    }
    if (sortBy === "nilai") {
      return (b.nilai_akhir ?? 0) - (a.nilai_akhir ?? 0);
    }
    return 0; // "terbaru" = urutan default dari database
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedPeserta.length / ITEMS_PER_PAGE),
  );
  const paginatedPeserta = sortedPeserta.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const filteredJawabanList = soalPraktikList.filter((j) => {
    if (filterTipeJawaban === "praktik")
      return j.tipe === "praktik" || typeof j.jawaban === "object";
    if (filterTipeJawaban === "pg")
      return j.tipe === "pg" && typeof j.jawaban !== "object";
    return true;
  });

  const getBadgeStatus = (p) => {
    if (
      p.status === "selesai" &&
      (p.status_koreksi === "dikoreksi" || p.status_koreksi === "SELESAI")
    ) {
      return { text: "Selesai Dikoreksi", variant: "success" };
    }
    if (p.status === "selesai") {
      return { text: "Perlu Dikoreksi", variant: "warning" };
    }
    if (p.status === "berjalan") {
      return { text: "Sedang Ujian", variant: "primary" };
    }
    return { text: "Belum Ujian", variant: "secondary" };
  };

  const infoSiswaTerpilih = peserta.find((p) => p.id === selectedSiswa);
  // 📡 REALTIME JAWABAN PESERTA — lembar jawaban Pengawas auto-update begitu peserta submit/ubah jawaban
  useEffect(() => {
    if (!selectedSiswa || !infoSiswaTerpilih?.tech_id) return;

    const techIdTerpilih = infoSiswaTerpilih.tech_id;

    const channel = supabase
      .channel(`jawaban_realtime_${selectedSiswa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.JAWABAN_PESERTA,
          filter: `tech_id=eq.${techIdTerpilih}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          const matchedSoal =
            bankSoalAll.find(
              (s) => String(s.id).trim() === String(row.soal_id).trim(),
            ) || {};

          let parsedJwb = row.jawaban;
          if (typeof row.jawaban === "string") {
            try {
              const trimmed = row.jawaban.trim();
              if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                parsedJwb = JSON.parse(trimmed);
              }
            } catch (e) {
              parsedJwb = row.jawaban;
            }
          }

          const isObj = typeof parsedJwb === "object" && parsedJwb !== null;
          const rawTipe = (matchedSoal.tipe || "").toLowerCase();
          const tipeFinal =
            rawTipe.includes("prak") || rawTipe.includes("essay") || isObj
              ? "praktik"
              : "pg";

          const entryBaru = {
            soal_id: row.soal_id,
            tipe: tipeFinal,
            pertanyaan: matchedSoal.pertanyaan || `Butir Soal #${row.soal_id}`,
            jawaban: parsedJwb,
            ragu_ragu: !!row.ragu_ragu,
            checklist:
              tipeFinal === "praktik"
                ? matchedSoal.checklist || [
                    "Instruksi pengerjaan terpenuhi",
                    "Format berkas valid",
                  ]
                : null,
          };

          setSoalPraktikList((prev) => {
            const idx = prev.findIndex(
              (j) => String(j.soal_id).trim() === String(row.soal_id).trim(),
            );
            if (idx === -1) return [...prev, entryBaru];
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...entryBaru };
            return updated;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSiswa, infoSiswaTerpilih?.tech_id, bankSoalAll]);

  if (isCheckingSesi) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-400 text-xs">
        Memeriksa sesi login...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      {/* 🔔 TOAST NOTIFICATION (pengganti alert()) */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100]">
          <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm max-w-sm text-xs font-medium transition-all ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : toast.type === "error"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                  : toast.type === "warning"
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
            }`}
          >
            {(toast.type === "success" ||
              toast.type === "error" ||
              toast.type === "warning") &&
              (toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ))}
            <span className="whitespace-pre-line leading-relaxed">
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <Sidebar links={menuPengawas} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-cyan-400 w-6 h-6" />
              <div>
                <h1 className="text-base font-display font-bold text-white tracking-wide">
                  PANEL KOREKSI UJIAN & PRAKTIK
                </h1>
                <p className="text-xs text-slate-400">
                  Pemeriksaan Realtime Hasil Pengerjaan Siswa
                </p>
              </div>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-lg">
                  <WifiOff className="w-3 h-3" /> Mode Offline
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {sesiStaff &&
                (sudahPresensiHariIni ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-display font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Presensi Hari
                    Ini
                  </span>
                ) : (
                  <Button
                    onClick={handlePresensiStaff}
                    disabled={isPresensiLoading}
                    className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0 flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />{" "}
                    {isPresensiLoading
                      ? "Mencatat..."
                      : "Presensi Masuk Hari Ini"}
                  </Button>
                ))}
              <input
                type="file"
                ref={pesertaFileInputRef}
                onChange={handleImportPesertaExcelCSV}
                accept=".csv,.xlsx"
                className="hidden"
              />

              <Button
                onClick={() => pesertaFileInputRef.current.click()}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold border-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import Data
                Peserta
              </Button>

              {peserta.length > 0 && (
                <Button
                  onClick={handleDownloadPesertaToken}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 border-0 p-2"
                  title="Download Token Peserta"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}

              {peserta.length > 0 && (
                <Button
                  onClick={handleCetakKartuID}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-0 p-2"
                  title="Cetak Kartu ID + QR Peserta"
                >
                  <CreditCard className="w-4 h-4" />
                </Button>
              )}

              {peserta.some((p) => (p.jumlah_pindah_tab ?? 0) > 0) && (
                <Button
                  onClick={() => setShowPindahTabModal(true)}
                  className="bg-red-600 hover:bg-red-500 text-white border-0 p-2"
                  title="Aktivitas Pindah Tab"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}

              {bankSoalAll.length > 0 && (
                <Button
                  onClick={handleAnalisisSoal}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 border-0 p-2"
                  title="Analisis Soal"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              )}

              {peserta.length > 0 && isLeadInstruktur && (
                <Button
                  onClick={handleDeleteAll}
                  className="bg-rose-500/20 hover:bg-rose-500 text-rose-300 border border-rose-500/30 p-2"
                  title="Reset All (khusus Lead Instruktur)"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={async () => {
                  setIsRefreshing(true);
                  await loadPeserta();
                  setTimeout(() => setIsRefreshing(false), 500);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-xs border-0 text-slate-300 p-2"
                title="Refresh Status"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 📊 SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-[#0d1527]/70 border border-slate-800 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase">Total Peserta</p>
                <p className="text-2xl font-display font-bold text-white mt-1">{peserta.length}</p>
              </div>
              <div className="p-4 bg-[#0d1527]/70 border border-slate-800 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase">Sedang Ujian</p>
                <p className="text-2xl font-display font-bold text-cyan-400 mt-1">{countSedangUjian}</p>
              </div>
              <div className="p-4 bg-[#0d1527]/70 border border-slate-800 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase">Perlu Dikoreksi</p>
                <p className="text-2xl font-display font-bold text-amber-400 mt-1">{countPerluDikoreksi}</p>
              </div>
              <div className="p-4 bg-[#0d1527]/70 border border-slate-800 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-display font-bold uppercase">Pelanggaran (Pindah Tab)</p>
                <p className="text-2xl font-display font-bold text-rose-400 mt-1">
                  {peserta.filter((p) => (p.jumlah_pindah_tab ?? 0) > 0).length}
                </p>
              </div>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* BILAH KIRI: ANTREAN PESERTA (4 KOLOM GRID) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="flex flex-col gap-2 px-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                      Daftar Peserta ({filteredPeserta.length})
                    </h2>
                    <span className="text-[9px] px-2 py-0.5 rounded font-display font-bold uppercase bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                      {modeToken === "siswa"
                        ? "Mode: Token Siswa"
                        : "Mode: Token Mapel"}
                    </span>
                  </div>

                  {filteredPeserta.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSelectAll}
                        className="text-[11px] text-cyan-400 hover:underline font-mono"
                      >
                        {selectedIds.length === filteredPeserta.length
                          ? "Batal Pilih"
                          : "Pilih Semua"}
                      </button>

                      {selectedIds.length > 0 && isLeadInstruktur && (
                        <button
                          onClick={handleDeleteSelected}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-500/40 transition"
                        >
                          <Trash className="w-3 h-3" /> Hapus (
                          {selectedIds.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, TechID, atau token..."
                    className="w-full bg-[#0d1527] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="relative" ref={sortDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between bg-[#0d1527] border rounded-xl px-3 py-2 text-xs text-slate-200 transition-colors ${
                      sortDropdownOpen ? "border-cyan-400" : "border-slate-800"
                    }`}
                  >
                    <span>
                      {sortOptions.find((o) => o.value === sortBy)?.label}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                        sortDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {sortDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-[#0d1527] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                      {sortOptions.map((opt) => {
                        const isActive = opt.value === sortBy;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => {
                              setSortBy(opt.value);
                              setSortDropdownOpen(false);
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                              isActive
                                ? "bg-cyan-400 text-slate-950 font-bold"
                                : "text-slate-200 hover:bg-cyan-400 hover:text-slate-950"
                            }`}
                          >
                            {opt.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-[#0d1527] p-2 rounded-xl border border-slate-800 text-xs font-display font-bold">
                  <button
                    onClick={() => setFilterPeserta("semua")}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === "semua"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semua ({peserta.length})
                  </button>

                  <button
                    onClick={() => setFilterPeserta("belum_mulai")}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === "belum_mulai"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Belum ({countBelumUjian})
                  </button>

                  <button
                    onClick={() => setFilterPeserta("berjalan")}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === "berjalan"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sedang ({countSedangUjian})
                  </button>

                  <button
                    onClick={() => setFilterPeserta("perlu_dikoreksi")}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === "perlu_dikoreksi"
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Perlu Koreksi ({countPerluDikoreksi})
                  </button>

                  <button
                    onClick={() => setFilterPeserta("selesai_dikoreksi")}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === "selesai_dikoreksi"
                        ? "bg-emerald-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Terkoreksi ({countSelesaiDikoreksi})
                  </button>

                  <button
                    onClick={() => setFilterPeserta("selesai_ujian")}
                    className={`py-1.5 px-2 rounded-lg text-left transition-all ${
                      filterPeserta === "selesai_ujian"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Selesai ({countSelesaiUjian})
                  </button>
                </div>
              </div>

              {/* DAFTAR CARD PESERTA */}
              {filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Tidak ada peserta pada status ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedPeserta.map((p, idx) => {
                    const statusInfo = getBadgeStatus(p);
                    const isSelected = selectedSiswa === p.id;
                    const isChecked = selectedIds.includes(p.id);
                    const nilaiDisplay =
                      p.nilai_akhir !== undefined && p.nilai_akhir !== null
                        ? p.nilai_akhir
                        : p.nilai_praktik || p.nilai_pg || "-";

                    const tokenSiswaReal =
                      p.token || p.token_peserta || generateRandomTokenSiswa();
                    const isSedangUjian = p.status === "berjalan";
                    const progressSoal = p.soal_terakhir || 0;
                    const totalSoalUjian = p.total_soal_ujian || 0;
                    const progressPercent =
                      totalSoalUjian > 0
                        ? Math.min(
                            100,
                            Math.round((progressSoal / totalSoalUjian) * 100),
                          )
                        : 0;

                    return (
                      <div
                        key={p.id || idx}
                        className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                          isSelected
                            ? "bg-cyan-950/30 border-cyan-400"
                            : "bg-[#0d1527]/70 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/50 pb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleSelectPeserta(p.id)}
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isChecked
                                  ? "bg-cyan-400 border-cyan-400"
                                  : "bg-transparent border-slate-700"
                              }`}
                            >
                              {isChecked && (
                                <CheckCircle2
                                  className="w-3 h-3 text-slate-950"
                                  strokeWidth={3}
                                />
                              )}
                            </button>

                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
                              {(p.nama || p.nama_lengkap || "P")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4
                                className="font-display font-bold text-xs text-white truncate"
                                title={p.nama || p.nama_lengkap}
                              >
                                {p.nama || p.nama_lengkap || `Peserta #${p.id}`}
                              </h4>
                              <p className="text-[10px] font-mono text-slate-400 truncate">
                                {p.tech_id || `DCC25-000${p.id}`}
                              </p>
                            </div>
                          </div>

                          {isLeadInstruktur && (
                            <button
                              onClick={() =>
                                handleDeleteSingle(p.id, p.nama || p.nama_lengkap)
                              }
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Hapus Peserta (khusus Lead Instruktur)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* ROW TOKEN UNIK SISWA (DIJAMIN STABIL PERMANEN) */}
                        {modeToken === "siswa" && (
                          <div className="flex items-center justify-between bg-[#030712] px-2.5 py-1 rounded-lg border border-purple-500/30 text-[10px]">
                            <span className="text-purple-300 font-display font-bold flex items-center gap-1">
                              <Key className="w-3 h-3 text-purple-400" /> TOKEN
                              PESERTA:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white tracking-widest">
                                {tokenSiswaReal}
                              </span>
                              {isLeadInstruktur && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRegenerateTokenSiswa(p.id, p.tech_id)
                                  }
                                  className="p-0.5 text-slate-400 hover:text-cyan-400 transition"
                                  title="Reset / Buat Token Baru (khusus Lead Instruktur)"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 📡 LIVE MONITORING PROGRESS SAAT PESERTA SEDANG UJIAN */}
                        {isSedangUjian && totalSoalUjian > 0 && (
                          <div className="space-y-1 bg-[#030712] px-2.5 py-2 rounded-lg border border-cyan-500/20">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-cyan-300 font-display font-bold flex items-center gap-1">
                                <Activity className="w-3 h-3 text-cyan-400" />{" "}
                                Sedang di soal {progressSoal} / {totalSoalUjian}
                              </span>
                              <span className="text-cyan-400 font-mono font-bold">
                                {progressPercent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant={statusInfo.variant}
                              className="text-[9px] px-2 py-0.5 rounded-md font-sans"
                            >
                              {statusInfo.text}
                            </Badge>
                            {(p.jumlah_pindah_tab ?? 0) > 0 && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/15 border border-red-500/40 px-1.5 py-0.5 rounded-md">
                                <Eye className="w-2.5 h-2.5" />{" "}
                                {p.jumlah_pindah_tab}x
                              </span>
                            )}
                            {Number(p.jumlah_pindah_tab ?? 0) >=
                              BATAS_KUNCI_PINDAH_TAB &&
                              p.status !== "selesai" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleRemoteUnlock(
                                      p.id,
                                      p.nama || p.nama_lengkap,
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] border-0 flex items-center gap-1 animate-pulse"
                                  title="Buka kunci layar peserta ini dari jarak jauh"
                                >
                                  <Unlock className="w-3 h-3" /> Buka Kunci
                                </Button>
                              )}
                          </div>

                          <div className="flex items-center gap-2">
                            {p.jumlah_benar !== undefined &&
                              p.jumlah_benar !== null && (
                                <div className="flex items-center gap-1.5 bg-[#030712] px-2 py-0.5 rounded border border-slate-800 text-[9px] font-mono font-bold">
                                  <span className="text-emerald-400">
                                    ✓{p.jumlah_benar}
                                  </span>
                                  <span className="text-rose-400">
                                    ✗{p.jumlah_salah ?? 0}
                                  </span>
                                </div>
                              )}
                            <div className="flex items-center gap-1 bg-[#030712] px-2 py-0.5 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 font-bold">
                                NILAI:
                              </span>
                              <span className="text-xs font-bold font-mono text-cyan-400">
                                {nilaiDisplay}
                              </span>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handlePeriksa(p.id)}
                              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] border-0"
                            >
                              Periksa
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredPeserta.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-[#0d1527] border border-slate-800 text-xs text-slate-300 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Halaman {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg bg-[#0d1527] border border-slate-800 text-xs text-slate-300 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BILAH KANAN: LEMBAR KOREKSI JAWABAN REALTIME */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {selectedSiswa ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-800/60 pb-3">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="text-cyan-400 w-4 h-4" /> LEMBAR
                      JAWABAN PESERTA #{selectedSiswa}
                      {infoSiswaTerpilih?.jumlah_benar !== undefined &&
                        infoSiswaTerpilih?.jumlah_benar !== null && (
                          <span className="text-[10px] font-mono font-bold normal-case tracking-normal">
                            (
                            <span className="text-emerald-400">
                              {infoSiswaTerpilih.jumlah_benar} benar
                            </span>{" "}
                            /{" "}
                            <span className="text-rose-400">
                              {infoSiswaTerpilih.jumlah_salah ?? 0} salah
                            </span>
                            )
                          </span>
                        )}
                    </h2>

                    <div className="flex gap-1.5 bg-[#0d1527] p-1.5 rounded-xl border border-slate-800 text-xs font-display font-bold">
                      <button
                        onClick={() => setFilterTipeJawaban("semua")}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          filterTipeJawaban === "semua"
                            ? "bg-cyan-400 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setFilterTipeJawaban("praktik")}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          filterTipeJawaban === "praktik"
                            ? "bg-cyan-400 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Praktik
                      </button>
                      <button
                        onClick={() => setFilterTipeJawaban("pg")}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          filterTipeJawaban === "pg"
                            ? "bg-cyan-400 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        PG
                      </button>
                    </div>
                  </div>

                  {isLoadingPeriksa ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-4 animate-pulse"
                        >
                          <div className="h-3 w-24 bg-slate-800 rounded" />
                          <div className="h-4 w-3/4 bg-slate-800 rounded" />
                          <div className="h-16 w-full bg-slate-800/60 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : filteredJawabanList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Peserta belum mengisikan jawaban untuk kategori ini.
                    </div>
                  ) : (
                    filteredJawabanList.map((j, idx) => {
                      const isPraktikObj =
                        typeof j.jawaban === "object" && j.jawaban !== null;
                      const isPGString = typeof j.jawaban === "string";

                      const teksJawaban = isPraktikObj
                        ? j.jawaban.teks
                        : isPGString && j.jawaban.startsWith("{")
                          ? JSON.parse(j.jawaban).teks
                          : j.jawaban;

                      const fileAttachmentName = isPraktikObj
                        ? j.jawaban.fileName
                        : isPGString && j.jawaban.includes("fileName")
                          ? JSON.parse(j.jawaban).fileName
                          : null;

                      const fileAttachmentUrl = isPraktikObj
                        ? j.jawaban.fileUrl
                        : isPGString && j.jawaban.includes("fileUrl")
                          ? JSON.parse(j.jawaban).fileUrl
                          : null;

                      return (
                        <div
                          key={idx}
                          className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-cyan-400/10 text-cyan-400 text-[10px] uppercase font-bold">
                              SOAL #{idx + 1} (
                              {j.tipe === "pg" ? "PILIHAN GANDA" : "PRAKTIK"})
                            </Badge>
                            {j.ragu_ragu && (
                              <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-[10px] uppercase font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Ragu-ragu
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-200 font-medium leading-relaxed">
                            {j.pertanyaan}
                          </p>

                          <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-3">
                            <p className="text-xs text-slate-400 font-display font-bold uppercase tracking-wider">
                              Jawaban Peserta:
                            </p>

                            <div className="text-emerald-400 font-mono text-xs break-words bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {teksJawaban ||
                                (isPGString
                                  ? `Opsi Terpilih: ${j.jawaban}`
                                  : "Belum ada teks dimasukkan.")}
                            </div>

                            {fileAttachmentName && (
                              <div className="pt-2 flex items-center justify-between gap-2 text-xs text-cyan-400 font-mono bg-cyan-400/10 p-3 rounded-lg border border-cyan-400/20">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="truncate">
                                    {fileAttachmentName}
                                  </span>
                                </div>
                                {fileAttachmentUrl ? (
                                  <a
                                    href={fileAttachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 bg-cyan-400 text-slate-950 px-3 py-1 rounded-md font-bold text-xs shrink-0 hover:bg-cyan-300 transition"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />{" "}
                                    Buka / Unduh Berkas
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">
                                    Berkas terlampir
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {j.checklist && (
                            <div className="p-4 bg-[#030712]/40 border border-slate-800 rounded-xl space-y-3">
                              <p className="text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">
                                Checklist Penilaian:
                              </p>
                              <div className="space-y-2">
                                {(typeof j.checklist === "string"
                                  ? JSON.parse(j.checklist)
                                  : j.checklist
                                ).map((kriteria, kIdx) => {
                                  const key = `${j.soal_id}-${kIdx}`;
                                  const isChecked = checklistPraktik[key];
                                  return (
                                    <div
                                      key={kIdx}
                                      onClick={() => toggleChecklist(key)}
                                      className="flex items-center gap-3 p-3 bg-[#0d1527]/40 border border-slate-800/40 rounded-xl cursor-pointer hover:bg-slate-800/50 transition text-sm select-none"
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-5 h-5 text-cyan-400 shrink-0" />
                                      ) : (
                                        <Square className="w-5 h-5 text-slate-600 shrink-0" />
                                      )}
                                      <span
                                        className={
                                          isChecked
                                            ? "text-slate-200 font-medium"
                                            : "text-slate-500"
                                        }
                                      >
                                        {kriteria}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  <div className="p-6 bg-gradient-to-r from-cyan-950/40 to-[#0d1527] border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-base flex items-center gap-2 text-white">
                        <Award className="text-cyan-400 w-5 h-5" /> Estimasi
                        Skor Praktik:
                        <span className="text-emerald-400 font-mono text-xl">
                          {hitungSkorPraktikLokal()} / 100
                        </span>
                      </h3>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={submitSimpanNilaiPraktik}
                      className="w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold border-0"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />{" "}
                      {isSaved ? "Tersimpan!" : "Simpan Nilai Ujian"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800">
                  <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-xs font-sans">
                    Pilih peserta di sebelah kiri untuk memeriksa lembar
                    pengerjaannya.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        </main>
      </div>

      {/* 📈 MODAL ANALISIS BUTIR SOAL */}
      {showAnalisisModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-display font-bold text-amber-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Analisis Butir Soal (Pilihan
                Ganda)
              </h3>
              <button
                onClick={() => setShowAnalisisModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {isLoadingAnalisis ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Menghitung statistik jawaban peserta...
                </p>
              ) : analisisData.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Belum ada data jawaban PG untuk dianalisis.
                </p>
              ) : (
                analisisData.map((item) => (
                  <div
                    key={item.soalId}
                    className="p-3 bg-[#030712]/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs text-slate-200 truncate"
                        title={item.pertanyaan}
                      >
                        {item.pertanyaan}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Kategori: {item.kategori} • Dijawab {item.totalDijawab}{" "}
                        peserta
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.persentaseBenar === null ? (
                        <span className="text-[10px] text-slate-500">
                          Belum ada data
                        </span>
                      ) : (
                        <>
                          <span
                            className={`text-lg font-display font-bold ${item.persentaseBenar < 50 ? "text-rose-400" : item.persentaseBenar < 75 ? "text-amber-400" : "text-emerald-400"}`}
                          >
                            {item.persentaseBenar}%
                          </span>
                          <p className="text-[9px] text-slate-500">
                            benar dari total dijawab
                          </p>
                          {item.persentaseBenar >= 95 && (
                            <p className="text-[9px] text-amber-400 font-bold mt-0.5">
                              ⚠️ Terlalu mudah, pertimbangkan revisi
                            </p>
                          )}
                          {item.persentaseBenar < 20 && (
                            <p className="text-[9px] text-rose-400 font-bold mt-0.5">
                              ⚠️ Terlalu sulit, cek validitas soal/kunci jawaban
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👁 MODAL AKTIVITAS PINDAH TAB — daftar peserta yang terdeteksi berpindah tab/aplikasi lain */}
      {showPindahTabModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-display font-bold text-red-500 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aktivitas Pindah Tab / Aplikasi Lain
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPelanggaran}
                  className="flex items-center gap-1 text-[10px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-lg hover:bg-cyan-400/20 transition"
                >
                  <Download className="w-3 h-3" /> Export CSV
                </button>
                <button
                  onClick={() => setShowPindahTabModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {peserta.filter((p) => (p.jumlah_pindah_tab ?? 0) > 0).length ===
              0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Belum ada peserta yang terdeteksi pindah tab.
                </p>
              ) : (
                peserta
                  .filter((p) => (p.jumlah_pindah_tab ?? 0) > 0)
                  .sort(
                    (a, b) =>
                      (b.jumlah_pindah_tab ?? 0) - (a.jumlah_pindah_tab ?? 0),
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-[#030712]/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-display font-bold text-white truncate">
                          {p.nama || p.nama_lengkap || `Peserta #${p.id}`}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {p.tech_id} • {p.kategori}
                        </p>
                      </div>
                      <span className="text-lg font-display font-bold text-red-500 shrink-0">
                        {p.jumlah_pindah_tab}x
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
