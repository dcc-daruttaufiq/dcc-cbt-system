import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
  supabase,
  TABLES,
  BUCKET_LAMPIRAN_PRAKTIK,
} from "../../utils/supabaseClient";
import {
  normalizeKategori,
  getLabelKategori,
} from "../../utils/examCategories";
import { STORAGE_KEYS, jawabanLocalKey } from "../../utils/storageKeys";
import { LOGO_URL } from "../../config/brand";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  HelpCircle,
  Paperclip,
  FileCheck,
  CheckCircle,
  Eye,
  Lock,
  WifiOff,
  Cloud,
  RefreshCw,
} from "lucide-react";

// Pengacak Deterministik (Seeded Shuffle)
const seededShuffle = (array, seedStr) => {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function RuangUjian() {
  useDocumentTitle("Ruang Ujian Berjalan - DCC CBT");
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [techId, setTechId] = useState("");
  const [listSoal, setListSoal] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [raguRagu, setRaguRagu] = useState({});
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // 🟢 Status Sinkronisasi Server ('synced' | 'saving' | 'offline')
  const [syncStatus, setSyncStatus] = useState("synced");

  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerReady, setIsTimerReady] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [errorState, setErrorState] = useState("");
  const [examKategori, setExamKategori] = useState("");
  const [logoGagalDimuat, setLogoGagalDimuat] = useState(false);

  // 🔒 State & Modal Deteksi Pindah Tab / Auto-Lock Faktual
  const [jumlahPindahTab, setJumlahPindahTab] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [supervisorPinInput, setSupervisorPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const SUPERVISOR_PIN = "123456"; // PIN Default Pengawas
  const MAX_VIOLATION_LIMIT = 3; // Batas Maksimal Awal Pindah Tab
  const [unlockThreshold, setUnlockThreshold] = useState(MAX_VIOLATION_LIMIT);

  const timerRef = useRef(null);
  const fileInputPraktikRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const techIdRef = useRef("");
  const timeWarningShownRef = useRef(false);
  const isExamFinishedRef = useRef(false);

  // Ref untuk menyimpan state jawaban terbaru agar bisa dibaca di handler Realtime/AutoSubmit
  const jawabanRef = useRef(jawaban);
  const listSoalRef = useRef(listSoal);

  useEffect(() => {
    jawabanRef.current = jawaban;
  }, [jawaban]);

  useEffect(() => {
    listSoalRef.current = listSoal;
  }, [listSoal]);

  const currentUser = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "{}",
  );

  // 🌐 1. DETEKSI STATUS KONEKSI INTERNET BROWSER SECARA REAL-TIME
  useEffect(() => {
    const handleOnline = () => setSyncStatus("synced");
    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setSyncStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 🚨 2. PROTEKSI ANTI-REFRESH / CLOSE BROWSER (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isExamFinishedRef.current) {
        e.preventDefault();
        e.returnValue =
          "Ujian sedang berlangsung! Yakin ingin meninggalkan halaman?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // 🔒 3. ANTI-LOGIN GANDA / SINGLE SESSION OVERWRITE (REALTIME SUPABASE)
  useEffect(() => {
    if (!techId) return;

    const currentLocalToken = localStorage.getItem("dcc_session_token");

    const sessionChannel = supabase
      .channel(`session_check_${techId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: TABLES.PESERTA || "peserta",
          filter: `tech_id=eq.${techId}`,
        },
        (payload) => {
          const newServerToken = payload.new?.session_token;
          if (
            newServerToken &&
            currentLocalToken &&
            newServerToken !== currentLocalToken
          ) {
            alert(
              "⚠️ SESI DIALIHKAN!\n\nSesi akun ini telah dipindahkan ke perangkat lain. Kamu akan dikeluarkan dari ujian.",
            );
            isExamFinishedRef.current = true;
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            navigate("/");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [techId, navigate]);

  const fetchDurasiUjianMenit = async (katId) => {
    let defaultDurasiMap = {
      word: 90,
      excel: 90,
      powerpoint: 90,
      desain: 90,
      pemrograman: 120,
    };
    let targetMenit = defaultDurasiMap[katId] || 90;

    try {
      const { data, error } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
        .select("*")
        .eq("key", "katalog_mata_ujian")
        .maybeSingle();

      if (!error && data && data.value) {
        const parsed =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) {
          const found = parsed.find((m) => m.id === katId);
          if (found && found.durasi) {
            targetMenit = Number(found.durasi);
            return targetMenit * 60;
          }
        }
      }
    } catch (err) {
      console.warn("Gagal membaca katalog durasi dari Supabase Cloud...", err);
    }

    const localKatalog = localStorage.getItem("dcc_katalog_mapel");
    if (localKatalog) {
      try {
        const parsedLocal = JSON.parse(localKatalog);
        if (Array.isArray(parsedLocal)) {
          const foundLocal = parsedLocal.find((m) => m.id === katId);
          if (foundLocal && foundLocal.durasi) {
            targetMenit = Number(foundLocal.durasi);
          }
        }
      } catch (e) {}
    }

    return targetMenit * 60;
  };

  useEffect(() => {
    const initRuangUjian = async () => {
      const realName =
        currentUser.nama ||
        currentUser.nama_lengkap ||
        localStorage.getItem(STORAGE_KEYS.USER_NAME) ||
        "Peserta Ujian";
      const realTechId =
        currentUser.tech_id ||
        localStorage.getItem(STORAGE_KEYS.USER_TECH_ID) ||
        "";

      setUserName(realName);
      setTechId(realTechId);
      techIdRef.current = realTechId;

      // 🔒 MEMBACA HITUNGAN PINDAH TAB DARI LOCALSTORAGE & SUPABASE
      const localViolations =
        Number(localStorage.getItem(`violations_${realTechId}`)) || 0;
      const dbViolations = Number(currentUser.jumlah_pindah_tab) || 0;
      const maxViolations = Math.max(localViolations, dbViolations);

      setJumlahPindahTab(maxViolations);

      if (maxViolations >= MAX_VIOLATION_LIMIT) {
        setIsLocked(true);
        setUnlockThreshold(maxViolations);
      }

      if (!realTechId) {
        setErrorState(
          "Sesi login tidak valid (TechID tidak ditemukan). Silakan login ulang.",
        );
        return;
      }

      // VERIFIKASI AWAL STATUS SESI UJIAN GLOBAL
      try {
        const { data: dataStatus } = await supabase
          .from(TABLES.PENGATURAN_UJIAN || "pengaturan_ujian")
          .select("*")
          .eq("key", "status_sesi_ujian")
          .maybeSingle();

        const st = dataStatus?.value
          ? typeof dataStatus.value === "string"
            ? JSON.parse(dataStatus.value)
            : dataStatus.value
          : null;
        const statusSesi =
          st?.status || localStorage.getItem("dcc_status_sesi") || "DITUTUP";

        if (statusSesi !== "DIBUKA") {
          setErrorState(
            "AKSES DITUTUP: Sesi ujian saat ini sedang DITUTUP/DIKUNCI oleh Pengawas.",
          );
          return;
        }
      } catch (err) {
        console.warn("Gagal verifikasi status sesi ujian...", err);
      }

      const rawExamId =
        localStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY) ||
        sessionStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY) ||
        currentUser.kategori ||
        "";

      const storedExamId = normalizeKategori(rawExamId);

      if (!storedExamId) {
        setErrorState(
          `Kategori ujian Anda tidak valid ("${rawExamId || "-"}"). Silakan hubungi Pengawas.`,
        );
        return;
      }

      setExamKategori(storedExamId);

      // FETCH DURASI
      const totalDetikKategori = await fetchDurasiUjianMenit(storedExamId);
      const wMulaiStr =
        currentUser?.waktu_mulai ||
        localStorage.getItem(`startTime_${realTechId}`);
      if (wMulaiStr) {
        const tMulai = new Date(wMulaiStr).getTime();
        const tSekarang = Date.now();
        if (!isNaN(tMulai)) {
          const detikBerlalu = Math.floor((tSekarang - tMulai) / 1000);
          const sisaDetikReal = Math.max(0, totalDetikKategori - detikBerlalu);
          setTimeLeft(sisaDetikReal);
        } else {
          setTimeLeft(totalDetikKategori);
        }
      } else {
        setTimeLeft(totalDetikKategori);
      }

      setIsTimerReady(true);

      // 🛡️ AMBIL REPOSITORI SOAL DARI VIEW 'bank_soal_ujian' (TANPA KOLOM JAWABAN_BENAR)
      let bankSoalImpor = [];
      try {
        const { data, error } = await supabase
          .from("bank_soal_ujian")
          .select("*");
        if (error) throw error;
        bankSoalImpor = Array.isArray(data) ? data : [];
        localStorage.setItem(
          STORAGE_KEYS.BANK_SOAL,
          JSON.stringify(bankSoalImpor),
        );
      } catch (err) {
        try {
          bankSoalImpor = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.BANK_SOAL) || "[]",
          );
        } catch (e) {
          bankSoalImpor = [];
        }
      }

      if (!Array.isArray(bankSoalImpor) || bankSoalImpor.length === 0) {
        setErrorState("EMPTY_BANK_SOAL");
        return;
      }

      const filteredSoal = bankSoalImpor.filter(
        (s) => normalizeKategori(s.kategori) === storedExamId,
      );

      if (filteredSoal.length === 0) {
        setErrorState("EMPTY_KATEGORI");
        return;
      }

      // 🔀 ACAK OPSI PG PER SISWA
      const soalDenganOpsiTeracak = filteredSoal.map((s) => {
        if (s.tipe === "pg" && Array.isArray(s.opsi) && s.opsi.length > 0) {
          const opsiTeracak = seededShuffle(
            s.opsi,
            `${realTechId}-opsi-${s.id}`,
          );
          return { ...s, opsi: opsiTeracak };
        }
        return s;
      });

      // 🔀 ACAK URUTAN SOAL PER SISWA
      const soalUrutanFinal = seededShuffle(
        soalDenganOpsiTeracak,
        `${realTechId}-soal`,
      );

      setListSoal(soalUrutanFinal);

      // RESTORE JAWABAN
      try {
        const { data: jawabanRows, error: jawabanErr } = await supabase
          .from(TABLES.JAWABAN_PESERTA)
          .select("*")
          .eq("tech_id", realTechId);

        if (jawabanErr) throw jawabanErr;

        const restoredJawaban = {};
        const restoredRagu = {};
        (jawabanRows || []).forEach((row) => {
          let parsedVal = row.jawaban;
          if (
            typeof row.jawaban === "string" &&
            (row.jawaban.startsWith("{") || row.jawaban.startsWith("["))
          ) {
            try {
              parsedVal = JSON.parse(row.jawaban);
            } catch (e) {}
          }
          restoredJawaban[row.soal_id] = parsedVal;
          restoredRagu[row.soal_id] = !!row.ragu_ragu;
        });
        setJawaban(restoredJawaban);
        setRaguRagu(restoredRagu);
        if (navigator.onLine) setSyncStatus("synced");
      } catch (err) {
        const savedJwbStr =
          localStorage.getItem(jawabanLocalKey(realTechId)) ||
          localStorage.getItem(STORAGE_KEYS.JAWABAN_LOCAL_LEGACY);
        if (savedJwbStr) {
          try {
            const parsed = JSON.parse(savedJwbStr);
            const restoredJawaban = {};
            const restoredRagu = {};
            Object.keys(parsed).forEach((soalId) => {
              const entry = parsed[soalId];
              const isWrapped =
                entry && typeof entry === "object" && "jawaban" in entry;
              restoredJawaban[soalId] = isWrapped ? entry.jawaban : entry;
              restoredRagu[soalId] = isWrapped ? !!entry.ragu_ragu : false;
            });
            setJawaban(restoredJawaban);
            setRaguRagu(restoredRagu);
          } catch (e) {}
        }
        setSyncStatus("offline");
      }
    };

    initRuangUjian();
  }, []);

  // REALTIME SUBSCRIPTION (DETEKSI PENUTUPAN SESI SECARA LIVE)
  useEffect(() => {
    const channel = supabase
      .channel("realtime_status_sesi")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.PENGATURAN_UJIAN || "pengaturan_ujian",
          filter: "key=eq.status_sesi_ujian",
        },
        (payload) => {
          if (payload.new && payload.new.value) {
            const val =
              typeof payload.new.value === "string"
                ? JSON.parse(payload.new.value)
                : payload.new.value;
            if (val.status === "DITUTUP") {
              handleAutoSubmit();
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [techId]);

  // 🕵️ DETEKSI PINDAH TAB & AUTO-LOCK FAKTUAL PERSISTEN
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && techIdRef.current && !isExamFinishedRef.current) {
        setJumlahPindahTab((prev) => {
          const next = prev + 1;

          // 1. Simpan Persisten Angka Riil di LocalStorage
          localStorage.setItem(`violations_${techIdRef.current}`, next);

          // 2. Kirim Angka Riil ke Supabase Cloud
          supabase
            .from(TABLES.PESERTA || "peserta")
            .update({ jumlah_pindah_tab: next })
            .eq("tech_id", techIdRef.current)
            .then(() => {})
            .catch(() => {});

          // 3. Auto-Lock jika mencapai / melebihi threshold aktif
          if (next >= unlockThreshold) {
            setIsLocked(true);
            setShowTabWarning(false);
          } else {
            setShowTabWarning(true);
          }
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [unlockThreshold]);

  // TIMER
  useEffect(() => {
    if (isTimerReady && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerReady]);

  // PERINGATAN SISA WAKTU 5 MENIT
  useEffect(() => {
    if (timeLeft === 300 && !timeWarningShownRef.current) {
      timeWarningShownRef.current = true;
      setShowTimeWarning(true);
    }
  }, [timeLeft]);

  // ⚡ THROTTLED MONITORING PROGRESS
  const progressThrottleRef = useRef(null);

  useEffect(() => {
    if (techIdRef.current && listSoal.length > 0) {
      if (progressThrottleRef.current)
        clearTimeout(progressThrottleRef.current);

      progressThrottleRef.current = setTimeout(() => {
        supabase
          .from(TABLES.PESERTA || "peserta")
          .update({
            soal_terakhir: currentIdx + 1,
            total_soal_ujian: listSoal.length,
          })
          .eq("tech_id", techIdRef.current)
          .then(() => {})
          .catch(() => {});
      }, 5000);
    }

    return () => {
      if (progressThrottleRef.current)
        clearTimeout(progressThrottleRef.current);
    };
  }, [currentIdx, listSoal.length]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // 🟢 PERSIST JAWABAN DENGAN STATUS SINKRONISASI JUJUR
  const persistJawaban = async (soalId, jawabanValue, raguValue) => {
    setSyncStatus("saving");

    try {
      const savedLocal = JSON.parse(
        localStorage.getItem(jawabanLocalKey(techId)) || "{}",
      );
      savedLocal[soalId] = { jawaban: jawabanValue, ragu_ragu: raguValue };
      localStorage.setItem(jawabanLocalKey(techId), JSON.stringify(savedLocal));
    } catch (e) {}

    if (!navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    try {
      const dbJawabanPayload =
        typeof jawabanValue === "object" && jawabanValue !== null
          ? JSON.stringify(jawabanValue)
          : jawabanValue;

      const { error } = await supabase.from(TABLES.JAWABAN_PESERTA).upsert(
        {
          tech_id: techId,
          soal_id: soalId,
          jawaban: dbJawabanPayload,
          ragu_ragu: raguValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tech_id,soal_id" },
      );

      if (error) throw error;

      setSyncStatus("synced");
    } catch (err) {
      console.warn("⚠️ Gagal sinkronisasi ke cloud, tersimpan di lokal:", err);
      setSyncStatus("offline");
    }
  };

  const handleSelectPG = (opsiTeks) => {
    const updated = { ...jawaban, [soalAktif.id]: opsiTeks };
    setJawaban(updated);
    persistJawaban(soalAktif.id, opsiTeks, raguRagu[soalAktif.id] || false);
  };

  const handleTextareaPraktik = (val) => {
    const dataLama =
      typeof jawaban[soalAktif.id] === "object" &&
      jawaban[soalAktif.id] !== null
        ? jawaban[soalAktif.id]
        : { teks: "", fileName: "", fileUrl: "" };

    const dataBaru = { ...dataLama, teks: val };
    const updated = { ...jawaban, [soalAktif.id]: dataBaru };
    setJawaban(updated);

    const soalIdSaatIni = soalAktif.id;
    const raguSaatIni = raguRagu[soalIdSaatIni] || false;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      persistJawaban(soalIdSaatIni, dataBaru, raguSaatIni);
    }, 1000);
  };

  const toggleRaguRagu = () => {
    if (!soalAktif) return;
    const soalId = soalAktif.id;
    const newRaguValue = !raguRagu[soalId];
    const updated = { ...raguRagu, [soalId]: newRaguValue };
    setRaguRagu(updated);
    persistJawaban(
      soalId,
      jawaban[soalId] !== undefined ? jawaban[soalId] : null,
      newRaguValue,
    );
  };

  const handleFileLampiranChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExt = [".docx", ".xlsx", ".pdf"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExt.includes(ext)) {
      alert("Format file tidak didukung!");
      e.target.value = "";
      return;
    }

    setIsUploadingFile(true);
    setSyncStatus("saving");

    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${techId}/${soalAktif.id}_${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_LAMPIRAN_PRAKTIK || "lampiran_praktik")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET_LAMPIRAN_PRAKTIK || "lampiran_praktik")
        .getPublicUrl(path);

      const dataLama =
        typeof jawaban[soalAktif.id] === "object" &&
        jawaban[soalAktif.id] !== null
          ? jawaban[soalAktif.id]
          : { teks: "", fileName: "", fileUrl: "" };

      const dataBaru = {
        ...dataLama,
        fileName: file.name,
        fileUrl: urlData?.publicUrl || "",
      };
      const updated = { ...jawaban, [soalAktif.id]: dataBaru };
      setJawaban(updated);

      await persistJawaban(
        soalAktif.id,
        dataBaru,
        raguRagu[soalAktif.id] || false,
      );
    } catch (err) {
      alert("Gagal mengunggah lampiran praktik.");
      setSyncStatus("offline");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  // 🔓 FUNGSI BUKA KUNCI UJIAN OLEH PENGAWAS (FAKTUAL & TANPA MERESET ANGKA)
  const handleUnlockExam = (e) => {
    e.preventDefault();
    if (supervisorPinInput === SUPERVISOR_PIN) {
      setIsLocked(false);
      setSupervisorPinInput("");
      setPinError("");

      // Batas threshold naik ke (angka saat ini + 1). Misal terkunci di 3x -> Pindah 1x lagi (4x) LANGSUNG TERKUNCI LAGI!
      setUnlockThreshold(jumlahPindahTab + 1);
    } else {
      setPinError("PIN Pengawas salah! Hubungi pengawas ruangan Anda.");
    }
  };

  // 🛡️ PROSES SUBMIT OTOMATIS (SERVER-SIDE GRADING VIA SUPABASE RPC)
  const handleAutoSubmit = async () => {
    isExamFinishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const nowIso = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.IS_EXAM_FINISHED, "true");
    localStorage.setItem(`endTime_${techId}`, nowIso);

    try {
      const { data, error } = await supabase.rpc("submit_ujian", {
        p_tech_id: techId,
      });

      if (error) {
        console.warn(
          "⚠️ Gagal submit via RPC server, status tetap diset lokal:",
          error,
        );
      }
    } catch (err) {
      console.warn("Gagal eksekusi RPC submit_ujian:", err);
    }

    let listSesiLokal = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.PESERTA) || "[]",
    );
    listSesiLokal = listSesiLokal.map((p) => {
      if (p.tech_id?.toLowerCase().trim() === techId.toLowerCase().trim()) {
        return {
          ...p,
          status: "selesai",
          status_koreksi: "belum_dikoreksi",
          waktu_selesai: nowIso,
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(listSesiLokal));

    const currentUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (currentUserStr) {
      try {
        const cu = JSON.parse(currentUserStr);
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify({
            ...cu,
            status: "selesai",
            status_koreksi: "belum_dikoreksi",
            waktu_selesai: nowIso,
          }),
        );
      } catch (e) {}
    }

    navigate("/dashboard-peserta");
  };

  const totalTerjawab = Object.keys(jawaban).filter((soalId) => {
    const val = jawaban[soalId];
    if (!val) return false;
    if (typeof val === "object") return !!(val.teks || val.fileName);
    return true;
  }).length;

  if (errorState) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center font-sans">
        <p className="text-sm font-bold text-cyan-400">
          Ruang Ujian Tidak Dapat Dibuka
        </p>
        <p className="text-xs text-slate-400 max-w-md">{errorState}</p>
        <Button
          onClick={() => navigate("/dashboard-peserta")}
          className="mt-2 bg-slate-800 text-xs text-slate-300 font-sans"
        >
          ← Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  if (listSoal.length === 0) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-3 p-4 text-center font-sans">
        <p className="text-sm font-bold text-cyan-400">Memuat soal ujian...</p>
      </div>
    );
  }

  const soalAktif = listSoal[currentIdx] || listSoal[0];
  const isSoalAktifRagu = !!raguRagu[soalAktif?.id];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col select-none">
      <header className="border-b border-slate-800 bg-[#0d1527]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="flex justify-between items-center w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {!logoGagalDimuat ? (
              <img
                src={LOGO_URL}
                alt="Logo DCC"
                onError={() => setLogoGagalDimuat(true)}
                className="h-10 w-auto object-contain drop-shadow-md"
              />
            ) : (
              <span className="text-cyan-400 font-display font-bold text-lg">
                DCC
              </span>
            )}
            <div>
              <h1 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                {getLabelKategori(examKategori)}
              </h1>
              <p className="text-[11px] text-slate-300">
                {userName} • TechID: {techId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {jumlahPindahTab > 0 && (
              <div className="p-2 px-3 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-red-500" />
                <span className="font-bold text-[11px] text-red-500">
                  Pindah Tab: {jumlahPindahTab}x
                </span>
              </div>
            )}
            <div className="p-2 px-4 rounded-xl bg-[#030712] border border-slate-800 flex items-center gap-2">
              <Clock
                className={`w-4 h-4 animate-pulse ${timeLeft <= 300 ? "text-red-500" : "text-cyan-400"}`}
              />
              <span
                className={`font-bold text-sm tracking-wider font-display ${timeLeft <= 300 ? "text-red-500" : "text-emerald-400"}`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-y-auto">
        <div className="lg:col-span-3 space-y-5">
          <div className="p-4 rounded-2xl bg-[#0d1527]/50 border border-slate-800/50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" className="text-xs px-3 py-1 font-bold">
                SOAL NO. {currentIdx + 1}
              </Badge>
              {isSoalAktifRagu && (
                <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/50 text-xs px-3 py-1 font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> RAGU-RAGU
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-3 py-1.5 rounded-xl">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>
                Terjawab {totalTerjawab} dari {listSoal.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800 bg-[#030712]/80">
              {syncStatus === "synced" && (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  Tersinkron ke Server
                </span>
              )}
              {syncStatus === "saving" && (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  Menyimpan...
                </span>
              )}
              {syncStatus === "offline" && (
                <span
                  className="text-rose-400 flex items-center gap-1.5"
                  title="Koneksi terputus. Jawaban tersimpan aman di perangkat ini."
                >
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  Tersimpan di Perangkat (Offline)
                </span>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 min-h-[340px] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <p className="text-base md:text-lg leading-relaxed text-slate-100 whitespace-pre-wrap">
                {soalAktif?.pertanyaan}
              </p>

              {soalAktif?.tipe === "pg" ? (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {soalAktif?.opsi &&
                    soalAktif.opsi.map((opsiTeks, idx) => {
                      const labelHuruf = String.fromCharCode(65 + idx);
                      const isSelected = jawaban[soalAktif.id] === opsiTeks;

                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectPG(opsiTeks)}
                          className={`p-4 rounded-xl border cursor-pointer flex items-start gap-4 ${
                            isSelected
                              ? "bg-[#0d1527] border-cyan-400 text-white shadow-md"
                              : "bg-[#030712]/60 border-slate-800 text-slate-300 hover:bg-[#0d1527]/60"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${isSelected ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}
                          >
                            {labelHuruf}
                          </span>
                          <span className="text-sm pt-0.5">
                            {typeof opsiTeks === "string"
                              ? opsiTeks.replace(/^[A-D]\.\s*/, "")
                              : opsiTeks}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={5}
                    placeholder="Tuliskan jawaban praktik Anda di sini..."
                    value={
                      (typeof jawaban[soalAktif?.id] === "object"
                        ? jawaban[soalAktif?.id]?.teks
                        : jawaban[soalAktif?.id]) || ""
                    }
                    onChange={(e) => handleTextareaPraktik(e.target.value)}
                    className="w-full p-4 bg-[#030712]/80 border border-slate-800 focus:border-cyan-400 text-xs text-white rounded-xl focus:outline-none font-sans"
                  />

                  <input
                    type="file"
                    ref={fileInputPraktikRef}
                    onChange={handleFileLampiranChange}
                    accept=".docx,.xlsx,.pdf"
                    className="hidden"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        fileInputPraktikRef.current &&
                        fileInputPraktikRef.current.click()
                      }
                      disabled={isUploadingFile}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border-0 flex items-center gap-2 w-fit"
                    >
                      <Paperclip className="w-3.5 h-3.5" />{" "}
                      {isUploadingFile
                        ? "Mengunggah Lampiran..."
                        : "Unggah Lampiran Praktik (.docx/.xlsx/.pdf)"}
                    </Button>
                    {typeof jawaban[soalAktif?.id] === "object" &&
                      jawaban[soalAktif?.id]?.fileName && (
                        <span className="text-xs text-emerald-400 font-sans flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg break-all">
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />{" "}
                          {jawaban[soalAktif.id].fileName}
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/40 pt-5 gap-2 flex-wrap">
              <Button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="bg-slate-800 text-slate-300 text-xs border-0"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>

              <Button
                type="button"
                onClick={toggleRaguRagu}
                className={`text-xs border-0 font-bold flex items-center gap-1.5 ${
                  isSoalAktifRagu
                    ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                    : "bg-slate-800 text-amber-400 hover:bg-slate-700"
                }`}
              >
                <HelpCircle className="w-4 h-4" />{" "}
                {isSoalAktifRagu ? "Batal Ragu-ragu" : "Tandai Ragu-ragu"}
              </Button>

              <Button
                onClick={() => {
                  if (currentIdx < listSoal.length - 1)
                    setCurrentIdx(currentIdx + 1);
                  else setShowSubmitModal(true);
                }}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs border-0"
              >
                {currentIdx === listSoal.length - 1
                  ? "Selesai Ujian"
                  : "Berikutnya"}{" "}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* SIDEBAR NAVIGASI SOAL */}
        <div className="p-6 rounded-2xl bg-[#0d1527]/40 border border-slate-800/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              NAVIGASI SOAL
            </h3>
            <span className="text-[10px] font-bold text-cyan-400">
              {totalTerjawab}/{listSoal.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {listSoal.map((item, index) => {
              const isCurrent = index === currentIdx;
              const isAnswered =
                jawaban[item.id] !== undefined &&
                jawaban[item.id] !== null &&
                jawaban[item.id] !== "";
              const isRagu = !!raguRagu[item.id];

              return (
                <button
                  key={index}
                  onClick={() => setCurrentIdx(index)}
                  title={isRagu ? "Ditandai Ragu-ragu" : undefined}
                  className={`h-10 rounded-xl font-bold text-xs border transition-all ${
                    isCurrent
                      ? "ring-2 ring-cyan-400 bg-cyan-400 text-slate-950"
                      : isRagu
                        ? "bg-amber-400 text-slate-950 border-amber-300 font-bold"
                        : isAnswered
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                          : "bg-[#030712] text-slate-400 border-slate-800"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />{" "}
              Terjawab
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />{" "}
              Ragu-ragu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />{" "}
              Belum Dijawab
            </span>
          </div>

          <Button
            onClick={() => setShowSubmitModal(true)}
            className="w-full mt-4 py-3 bg-cyan-400 text-slate-950 font-bold text-xs border-0 rounded-xl flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" /> SUBMIT SELESAI
          </Button>
        </div>
      </main>

      {/* MODAL KONFIRMASI SUBMIT */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Konfirmasi
              Selesai Ujian
            </h3>
            <p className="text-xs text-slate-300">
              Apakah Anda yakin ingin menyelesaikan ujian ini?
            </p>
            {Object.values(raguRagu).some(Boolean) && (
              <p className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" /> Anda masih
                memiliki soal yang ditandai Ragu-ragu.
              </p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 bg-slate-800 text-xs border-0"
              >
                Batal
              </Button>
              <Button
                onClick={handleAutoSubmit}
                className="flex-1 bg-cyan-400 text-slate-950 font-bold text-xs border-0"
              >
                Ya, Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN SISA WAKTU 5 MENIT */}
      {showTimeWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-red-500/50 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <Clock className="w-10 h-10 text-red-500 mx-auto animate-pulse" />
            <h3 className="text-sm font-bold text-white">
              Waktu Tersisa 5 Menit!
            </h3>
            <p className="text-xs text-slate-300">
              Segera selesaikan dan periksa kembali jawaban Anda sebelum waktu
              habis.
            </p>
            <Button
              onClick={() => setShowTimeWarning(false)}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs border-0"
            >
              Mengerti
            </Button>
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN PINDAH TAB */}
      {showTabWarning && !isLocked && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-red-500/50 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <Eye className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              Perpindahan Tab Terdeteksi ({jumlahPindahTab}/{unlockThreshold})
            </h3>
            <p className="text-xs text-slate-300">
              Aktivitas berpindah tab/aplikasi lain telah tercatat. Jika
              mencapai{" "}
              <strong className="text-red-400">{unlockThreshold}x</strong>,
              ujian akan terkunci otomatis!
            </p>
            <Button
              onClick={() => setShowTabWarning(false)}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs border-0"
            >
              Kembali Mengerjakan
            </Button>
          </div>
        </div>
      )}

      {/* 🔒 MODAL AUTO-LOCK LAYAR TERKUNCI TOTAL */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1527] border border-red-500/50 p-6 md:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl border border-red-500/30">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Ujian Terkunci Otomatis!
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Kamu terdeteksi meninggalkan halaman ujian sebanyak{" "}
                <strong className="text-red-400 font-bold">
                  {jumlahPindahTab} kali
                </strong>
                . Silakan panggil Pengawas Ruangan untuk membuka kunci.
              </p>
            </div>

            <form onSubmit={handleUnlockExam} className="space-y-3 pt-2">
              <input
                type="password"
                placeholder="Masukkan PIN Pengawas"
                value={supervisorPinInput}
                onChange={(e) => setSupervisorPinInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-bold p-3 bg-[#030712] border border-slate-700 text-white rounded-xl focus:border-red-500 outline-none"
              />
              {pinError && (
                <p className="text-xs text-red-400 font-semibold">{pinError}</p>
              )}
              <Button
                type="submit"
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs border-0 rounded-xl"
              >
                Buka Kunci Ujian
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
