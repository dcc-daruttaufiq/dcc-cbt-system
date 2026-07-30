import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, TABLES } from "../../utils/supabaseClient";
import { normalizeKategori } from "../../utils/examCategories";
import { STORAGE_KEYS, jawabanLocalKey } from "../../utils/storageKeys";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
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
  WifiOff,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Key,
  Download,
  Eye,
  BarChart3,
  X,
  CreditCard,
  Home,
  Database,
  Sliders,
  FileBarChart,
  MonitorCheck,
  Clock,
  Unlock,
  Lock,
} from "lucide-react";

const AKUN_SESSION_KEY = "dcc_akun_session";
const PRESENSI_STAFF_TABLE = "presensi_staff";

const getTanggalHariIni = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const generateRandomTokenSiswa = (prefix = "TS") => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
};

export default function DashboardAnggota() {
  const navigate = useNavigate();
  const [sesiStaff, setSesiStaff] = useState(null);
  const [isCheckingSesi, setIsCheckingSesi] = useState(true);
  const [sudahPresensiHariIni, setSudahPresensiHariIni] = useState(false);
  const [isPresensiLoading, setIsPresensiLoading] = useState(false);

  const [peserta, setPeserta] = useState([]);
  const [bankSoalAll, setBankSoalAll] = useState([]);
  const [katalogMapel, setKatalogMapel] = useState([]);
  const [modeToken, setModeToken] = useState("mapel");
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [soalPraktikList, setSoalPraktikList] = useState([]);
  const [checklistPraktik, setChecklistPraktik] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoadingPeriksa, setIsLoadingPeriksa] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [filterPeserta, setFilterPeserta] = useState("semua");
  const [filterTipeJawaban, setFilterTipeJawaban] = useState("semua");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [showAnalisisModal, setShowAnalisisModal] = useState(false);
  const [isLoadingAnalisis, setIsLoadingAnalisis] = useState(false);
  const [analisisData, setAnalisisData] = useState([]);
  const [showPindahTabModal, setShowPindahTabModal] = useState(false);

  const pesertaFileInputRef = useRef(null);

  const menuPengawas = [
    { label: "Menu Utama", path: "/", icon: Home },
    { label: "Koreksi Ujian", path: "/dashboard-anggota", icon: CheckSquare },
    { label: "Repositori Soal", path: "/bank-soal", icon: Database },
    { label: "Pengaturan Ujian", path: "/pengaturan-ujian", icon: Sliders },
    { label: "Laporan Nilai", path: "/laporan", icon: FileBarChart },
    { label: "Fasilitas DCC", path: "/fasilitas-dcc", icon: MonitorCheck },
  ];

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
      const belumPunyaToken = rows.filter((p) => !p.token);
      for (const p of belumPunyaToken) {
        const generated = generateRandomTokenSiswa();
        p.token = generated;
        try {
          await supabase
            .from(TABLES.PESERTA)
            .update({ token: generated })
            .eq("id", p.id);
        } catch (e) {}
      }

      rows = rows.map((p) => ({ ...p, token_peserta: p.token }));
      setPeserta(rows);
      setIsOffline(false);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(rows));
    } catch (err) {
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

  const cekPresensiHariIni = async (username) => {
    try {
      const { data } = await supabase
        .from(PRESENSI_STAFF_TABLE)
        .select("*")
        .eq("username", username)
        .eq("tanggal", getTanggalHariIni())
        .maybeSingle();
      setSudahPresensiHariIni(!!data);
    } catch (e) {}
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
      alert("Gagal mencatat presensi. Mungkin sudah tercatat hari ini.");
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

  useEffect(() => {
    const channel = supabase
      .channel("realtime_progress_peserta")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: TABLES.PESERTA },
        (payload) => {
          if (!payload.new) return;
          setPeserta((prev) =>
            prev.map((p) =>
              p.id === payload.new.id
                ? {
                    ...p,
                    ...payload.new,
                    token_peserta: payload.new.token || p.token_peserta,
                  }
                : p,
            ),
          );
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

  // 🔓 FITUR REMOTE UNLOCK 1-CLICK DARI PENGAWAS
  const handleRemoteUnlock = async (techId) => {
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from(TABLES.PESERTA || "peserta")
        .update({ unlock_signal: nowIso })
        .eq("tech_id", techId);

      if (error) throw error;
    } catch (err) {
      alert("Gagal melakukan remote unlock: " + err.message);
    }
  };

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

          if (existingTechIds.has(cleanTechId)) return;

          const finalKat = normalizeKategori(cols[2]);
          if (!finalKat) return;

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
        alert("Format file tidak sesuai atau data sudah ada!");
        e.target.value = "";
        return;
      }

      try {
        const { error } = await supabase
          .from(TABLES.PESERTA)
          .insert(importedPesertaArr);
        if (error) throw error;

        await loadPeserta();
        alert(`Berhasil mengimpor ${importedPesertaArr.length} peserta!`);
      } catch (err) {
        const mergedWithToken = [...importedPesertaArr, ...peserta];
        setPeserta(mergedWithToken);
        localStorage.setItem(
          STORAGE_KEYS.PESERTA,
          JSON.stringify(mergedWithToken),
        );
        alert("Tersimpan di lokal.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadPesertaToken = () => {
    if (peserta.length === 0)
      return alert("Belum ada data peserta untuk diunduh!");
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
      const hasil = soalPGList.map((s) => {
        const kunciHuruf = (s.jawaban_benar || s.jawabanBenar || "A")
          .toString()
          .toUpperCase()
          .trim();
        const kunciIdx = kunciHuruf.charCodeAt(0) - 65;
        const kunciTeks = (Array.isArray(s.opsi) ? s.opsi[kunciIdx] : "") || "";
        const jawabanUntukSoalIni = (semuaJawaban || []).filter(
          (j) => String(j.soal_id).trim() === String(s.id).trim(),
        );
        let benar = 0;
        jawabanUntukSoalIni.forEach((j) => {
          const jwbTeks = (j.jawaban || "").toString().trim().toLowerCase();
          if (jwbTeks && jwbTeks === kunciTeks.toString().trim().toLowerCase())
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
      });
      setAnalisisData(hasil);
    } catch (err) {
      alert("Gagal memuat data analisis butir soal.");
    } finally {
      setIsLoadingAnalisis(false);
    }
  };

  const handleCetakKartuID = () => {
    if (filteredPeserta.length === 0)
      return alert("Tidak ada peserta untuk dicetak kartunya!");
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
          .kartu { width: 300px; border: 2px solid #0891b2; border-radius: 14px; overflow: hidden; background: #ffffff; break-inside: avoid; }
          .kartu-header { background: #0891b2; color: #fff; padding: 8px 12px; display: flex; align-items: center; gap: 8px; }
          .logo-text { font-weight: bold; font-size: 14px; }
          .judul { font-size: 9px; font-weight: bold; }
          .kartu-body { display: flex; align-items: center; justify-content: space-between; padding: 14px; gap: 10px; }
          .info { flex: 1; }
          .nama { font-size: 15px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; }
          .techid { font-size: 13px; font-weight: bold; color: #0891b2; margin: 0 0 4px 0; font-family: monospace; }
          .kategori { font-size: 10px; color: #64748b; margin: 0; text-transform: uppercase; }
          .qr { width: 80px; height: 80px; }
          .kartu-footer { background: #f1f5f9; color: #64748b; font-size: 8px; text-align: center; padding: 4px; }
        </style>
      </head>
      <body onload="window.print()"><div class="grid">${kartuHtml}</div></body>
      </html>
    `);
    win.document.close();
  };

  const handleDeleteSingle = async (pesertaId, nama) => {
    if (!confirm(`Hapus data peserta "${nama}"?`)) return;
    try {
      const targetPeserta = peserta.find((p) => p.id === pesertaId);
      await supabase.from(TABLES.PESERTA).delete().eq("id", pesertaId);
      if (targetPeserta?.tech_id) {
        await supabase
          .from(TABLES.JAWABAN_PESERTA)
          .delete()
          .eq("tech_id", targetPeserta.tech_id);
      }
      const updated = peserta.filter((p) => p.id !== pesertaId);
      setPeserta(updated);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
      if (selectedSiswa === pesertaId) setSelectedSiswa(null);
    } catch (err) {
      alert("Gagal menghapus peserta.");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("HAPUS SEMUA PESERTA?")) return;
    try {
      const idsToDelete = peserta.map((p) => p.id).filter(Boolean);
      const techIdsToDelete = peserta.map((p) => p.tech_id).filter(Boolean);
      if (idsToDelete.length > 0)
        await supabase.from(TABLES.PESERTA).delete().in("id", idsToDelete);
      if (techIdsToDelete.length > 0)
        await supabase
          .from(TABLES.JAWABAN_PESERTA)
          .delete()
          .in("tech_id", techIdsToDelete);
      setPeserta([]);
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify([]));
      setSelectedSiswa(null);
    } catch (err) {
      alert("Gagal mereset data peserta.");
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
      const { data: jawabanRows } = await supabase
        .from(TABLES.JAWABAN_PESERTA)
        .select("*")
        .ilike("tech_id", cleanTechId);

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
            } catch (e) {}
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
    } catch (err) {}

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
      alert(
        `Nilai Berhasil Disimpan!\n\nPG (${bobotPG}%): ${pg}\nPraktik (${bobotPraktik}%): ${skorPraktikTotal}\nNilai Akhir Total: ${nilaiAkhirBaru}`,
      );
    } catch (err) {
      alert("Gagal menyimpan nilai.");
    }
  };

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPeserta.length / ITEMS_PER_PAGE),
  );
  const paginatedPeserta = filteredPeserta.slice(
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
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Import
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

              {peserta.length > 0 && (
                <Button
                  onClick={handleDeleteAll}
                  className="bg-rose-500/20 hover:bg-rose-500 text-rose-300 border border-rose-500/30 p-2"
                  title="Reset All"
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
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* BILAH KIRI: ANTREAN PESERTA */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="flex flex-col gap-2 px-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Peserta ({filteredPeserta.length})
                  </h2>
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
                    Koreksi ({countPerluDikoreksi})
                  </button>
                </div>
              </div>

              {filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Tidak ada peserta pada status ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedPeserta.map((p, idx) => {
                    const statusInfo = getBadgeStatus(p);
                    const isSelected = selectedSiswa === p.id;
                    const nilaiDisplay =
                      p.nilai_akhir !== undefined && p.nilai_akhir !== null
                        ? p.nilai_akhir
                        : p.nilai_praktik || p.nilai_pg || "-";

                    const isTerkunci =
                      (p.jumlah_pindah_tab ?? 0) >= 3 && p.status !== "selesai";
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
                          isTerkunci
                            ? "bg-red-950/20 border-red-500/60 shadow-md shadow-red-500/10"
                            : isSelected
                              ? "bg-cyan-950/30 border-cyan-400"
                              : "bg-[#0d1527]/70 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/50 pb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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

                          <button
                            onClick={() =>
                              handleDeleteSingle(p.id, p.nama || p.nama_lengkap)
                            }
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Hapus Peserta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {modeToken === "siswa" && (
                          <div className="flex items-center justify-between bg-[#030712] px-2.5 py-1 rounded-lg border border-purple-500/30 text-[10px]">
                            <span className="text-purple-300 font-display font-bold flex items-center gap-1">
                              <Key className="w-3 h-3 text-purple-400" /> TOKEN:
                            </span>
                            <span className="font-mono font-bold text-white tracking-widest">
                              {p.token || p.token_peserta || "-"}
                            </span>
                          </div>
                        )}

                        {p.status === "berjalan" && totalSoalUjian > 0 && (
                          <div className="space-y-1 bg-[#030712] px-2.5 py-2 rounded-lg border border-cyan-500/20">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-cyan-300 font-bold">
                                Soal {progressSoal} / {totalSoalUjian}
                              </span>
                              <span className="text-cyan-400 font-mono font-bold">
                                {progressPercent}%
                              </span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isTerkunci ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[9px] px-2 py-0.5 font-bold flex items-center gap-1 animate-pulse">
                                <Lock className="w-3 h-3" /> TERKUNCI
                              </Badge>
                            ) : (
                              <Badge
                                variant={statusInfo.variant}
                                className="text-[9px] px-2 py-0.5 rounded-md font-sans"
                              >
                                {statusInfo.text}
                              </Badge>
                            )}

                            {(p.jumlah_pindah_tab ?? 0) > 0 && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/15 border border-red-500/40 px-1.5 py-0.5 rounded-md">
                                <Eye className="w-2.5 h-2.5" />{" "}
                                {p.jumlah_pindah_tab}x
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-[#030712] px-2 py-0.5 rounded border border-slate-800">
                              <span className="text-[9px] text-slate-500 font-bold">
                                SKOR:
                              </span>
                              <span className="text-xs font-bold font-mono text-cyan-400">
                                {nilaiDisplay}
                              </span>
                            </div>

                            {/* 🔓 TOMBOL REMOTE UNLOCK 1-CLICK */}
                            {isTerkunci ? (
                              <Button
                                size="sm"
                                onClick={() => handleRemoteUnlock(p.tech_id)}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] border-0 flex items-center gap-1"
                              >
                                <Unlock className="w-3 h-3" /> Buka Kunci
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handlePeriksa(p.id)}
                                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] border-0"
                              >
                                Periksa
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BILAH KANAN: LEMBAR KOREKSI JAWABAN */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {selectedSiswa ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-800/60 pb-3">
                    <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="text-cyan-400 w-4 h-4" /> LEMBAR
                      JAWABAN PESERTA #{selectedSiswa}
                    </h2>
                  </div>

                  {isLoadingPeriksa ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Memuat jawaban peserta dari Supabase Cloud...
                    </div>
                  ) : filteredJawabanList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                      Peserta belum mengisikan jawaban untuk kategori ini.
                    </div>
                  ) : (
                    filteredJawabanList.map((j, idx) => (
                      <div
                        key={idx}
                        className="p-6 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl space-y-5"
                      >
                        <p className="text-sm text-slate-200 font-medium leading-relaxed">
                          {j.pertanyaan}
                        </p>
                        <div className="p-4 bg-[#030712]/80 border border-slate-800 rounded-xl text-sm space-y-3">
                          <p className="text-xs text-slate-400 font-display font-bold uppercase tracking-wider">
                            Jawaban Peserta:
                          </p>
                          <div className="text-emerald-400 font-mono text-xs break-words bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {typeof j.jawaban === "object"
                              ? j.jawaban.teks
                              : j.jawaban}
                          </div>
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
                    ))
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
        </main>
      </div>

      {/* MODAL ANALISIS SOAL */}
      {showAnalisisModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-display font-bold text-amber-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Analisis Butir Soal (PG)
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
                  Menghitung statistik...
                </p>
              ) : (
                analisisData.map((item) => (
                  <div
                    key={item.soalId}
                    className="p-3 bg-[#030712]/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-slate-200">
                        {item.pertanyaan}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Benar: {item.benar} dari {item.totalDijawab} peserta
                      </p>
                    </div>
                    <span className="text-lg font-bold text-emerald-400">
                      {item.persentaseBenar ?? 0}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PINDAH TAB */}
      {showPindahTabModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-display font-bold text-red-500 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Aktivitas Pindah Tab Peserta
              </h3>
              <button
                onClick={() => setShowPindahTabModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {peserta.filter((p) => (p.jumlah_pindah_tab ?? 0) > 0).length ===
              0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Tidak ada catatan pindah tab.
                </p>
              ) : (
                peserta
                  .filter((p) => (p.jumlah_pindah_tab ?? 0) > 0)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-[#030712]/60 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">
                          {p.nama || p.nama_lengkap}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {p.tech_id}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-red-500">
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
