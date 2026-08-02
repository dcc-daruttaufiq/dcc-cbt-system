import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase, TABLES } from "../../utils/supabaseClient";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Camera,
  CameraOff,
  User,
  ListChecks,
  Volume2,
  VolumeX,
  Keyboard,
} from "lucide-react";

const PRESENSI_TABLE = "presensi_siswa";

const formatJam = (isoOrDate) => {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getTanggalHariIni = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function AbsensiScan() {
  const [statusKamera, setStatusKamera] = useState("matikan"); // 'memuat' | 'aktif' | 'matikan' | 'error'
  const [isKameraOn, setIsKameraOn] = useState(true); // Toggle On/Off Kamera
  const [errorKamera, setErrorKamera] = useState("");
  const [hasilScan, setHasilScan] = useState(null);
  const [jamBatasMasuk, setJamBatasMasuk] = useState("07:30");
  const [logHariIni, setLogHariIni] = useState([]);
  const [isBeepEnabled, setIsBeepEnabled] = useState(true);
  const [manualTechId, setManualTechId] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const resetTimeoutRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Ref untuk cegah kamera flicker/restart saat jam_batas direfetch
  const jamBatasRef = useRef("07:30");
  useEffect(() => {
    jamBatasRef.current = jamBatasMasuk;
  }, [jamBatasMasuk]);

  // Audio Context Ref (Hemat Memori)
  const playBeep = (sukses = true) => {
    if (!isBeepEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = sukses ? 880 : 260;
      gain.gain.value = 0.16;
      osc.start();
      osc.stop(ctx.currentTime + (sukses ? 0.15 : 0.25));
    } catch (e) {}
  };

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
      console.warn("Gagal memuat pengaturan jam batas absensi.", e);
    }
  };

  const loadLogHariIni = async () => {
    try {
      const { data } = await supabase
        .from(PRESENSI_TABLE)
        .select("*, peserta(nama, nama_lengkap)")
        .eq("tanggal", getTanggalHariIni())
        .order("waktu_masuk", { ascending: false });
      setLogHariIni(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Gagal memuat log presensi hari ini.", e);
    }
  };

  useEffect(() => {
    loadJamBatas();
    loadLogHariIni();
  }, []);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("realtime_presensi_siswa")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: PRESENSI_TABLE },
        () => {
          loadLogHariIni();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ekstrakTechId = (rawText) => {
    const trimmed = (rawText || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return (parsed.techId || parsed.tech_id || parsed.TechID || "")
          .toString()
          .trim();
      } catch (e) {
        return trimmed;
      }
    }
    return trimmed;
  };

  const scheduleReset = () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      setHasilScan(null);
      isProcessingRef.current = false;
    }, 2500);
  };

  // FUNGSI UTAMA PEMROSESAN PRESENSI
  const handleScanSuccess = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log("📷 RAW QR Code Terbaca:", decodedText);

    const techId = ekstrakTechId(decodedText);

    if (!techId) {
      playBeep(false);
      setHasilScan({
        tipe: "tidak_ditemukan",
        pesan: "Format QR tidak dapat dibaca.",
      });
      scheduleReset();
      return;
    }

    try {
      const cleanTechId = techId.trim().toUpperCase();

      // 🛑 Menggunakan .eq() presisi (Aman dari Wildcard Attack)
      const { data: pesertaData, error: errPeserta } = await supabase
        .from(TABLES.PESERTA || "peserta")
        .select("*")
        .eq("tech_id", cleanTechId)
        .maybeSingle();

      if (errPeserta) throw errPeserta;

      if (!pesertaData) {
        playBeep(false);
        setHasilScan({
          tipe: "tidak_ditemukan",
          pesan: `TechID "${cleanTechId}" Tidak Ditemukan`,
        });
        scheduleReset();
        return;
      }

      const namaSiswa =
        pesertaData.nama || pesertaData.nama_lengkap || "Siswa";
      const tanggalHariIni = getTanggalHariIni();

      // Hitung Status Terlambat
      let statusPresensi = "HADIR";
      if (jamBatasRef.current) {
        const now = new Date();
        const [jamBatasH, jamBatasM] = jamBatasRef.current.split(":").map(Number);
        const batasDate = new Date();
        batasDate.setHours(jamBatasH, jamBatasM, 0, 0);
        if (now > batasDate) statusPresensi = "TERLAMBAT";
      }

      const nowIso = new Date().toISOString();

      // 🚀 UPSERT ATOMIC AT SERVER-SIDE (Anti Race Condition & Double-Scan)
      const { data: insertedData, error: errInsert } = await supabase
        .from(PRESENSI_TABLE)
        .upsert(
          {
            tech_id: pesertaData.tech_id,
            tanggal: tanggalHariIni,
            waktu_masuk: nowIso,
            status: statusPresensi,
            metode: "SCAN_QR",
            pencatat: "SCANNER_KAMERA",
          },
          { onConflict: "tech_id,tanggal", ignoreDuplicates: true }
        )
        .select();

      if (errInsert) throw errInsert;

      // Jika data abaikan/kosong karena sudah absen
      if (!insertedData || insertedData.length === 0) {
        // Cek data lama untuk ditampilkan di UI
        const { data: existingPresensi } = await supabase
          .from(PRESENSI_TABLE)
          .select("*")
          .eq("tech_id", pesertaData.tech_id)
          .eq("tanggal", tanggalHariIni)
          .maybeSingle();

        playBeep(false);
        setHasilScan({
          tipe: "sudah_absen",
          techId: pesertaData.tech_id,
          nama: namaSiswa,
          jam: formatJam(existingPresensi?.waktu_masuk || nowIso),
        });
        scheduleReset();
        return;
      }

      // Berhasil Absen Baru
      playBeep(true);
      setHasilScan({
        tipe: statusPresensi === "TERLAMBAT" ? "sukses_telat" : "sukses",
        techId: pesertaData.tech_id,
        nama: namaSiswa,
        jam: formatJam(nowIso),
      });
      loadLogHariIni();
      scheduleReset();
    } catch (err) {
      console.error("Gagal memproses presensi:", err);
      playBeep(false);
      setHasilScan({
        tipe: "tidak_ditemukan",
        pesan: "Gagal menyimpan presensi ke database.",
      });
      scheduleReset();
    }
  };

  // EFFEK KONTROL AKTIF/MATI KAMERA
  useEffect(() => {
    if (!isKameraOn) {
      stopKamera();
      setStatusKamera("matikan");
      return;
    }

    startKamera();

    return () => {
      stopKamera();
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, [isKameraOn]);

  const startKamera = () => {
    setStatusKamera("memuat");
    setErrorKamera("");

    const regionId = "absensi-qr-region";
    const html5QrCode = new Html5Qrcode(regionId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      )
      .then(() => setStatusKamera("aktif"))
      .catch(() => {
        Html5Qrcode.getCameras()
          .then((devices) => {
            if (!devices || devices.length === 0) {
              setStatusKamera("error");
              setErrorKamera("Tidak ada kamera terdeteksi.");
              return;
            }
            html5QrCode
              .start(
                devices[0].id,
                config,
                (decodedText) => handleScanSuccess(decodedText),
                () => {}
              )
              .then(() => setStatusKamera("aktif"))
              .catch(() => {
                setStatusKamera("error");
                setErrorKamera("Gagal mengaktifkan kamera.");
              });
          })
          .catch(() => {
            setStatusKamera("error");
            setErrorKamera("Izin akses kamera ditolak.");
          });
      });
  };

  const stopKamera = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        }
      } catch (e) {}
      scannerRef.current = null;
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualTechId.trim()) return;
    handleScanSuccess(manualTechId);
    setManualTechId("");
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <ScanLine className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">
                SCAN PRESENSI HARIAN
              </h1>
              <p className="text-xs text-slate-400">
                Tunjukkan Kartu ID ke kamera untuk mencatat presensi
              </p>
            </div>
            <span className="ml-2 text-[10px] px-2.5 py-1 rounded-full font-display font-bold uppercase bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
              {logHariIni.length} Sudah Absen Hari Ini
            </span>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* PANELS KAMERA (3 COL) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative rounded-3xl overflow-hidden border-4 border-slate-800 bg-[#0d1527] aspect-square max-w-xl mx-auto shadow-2xl flex flex-col justify-between">
                
                {/* TOOLBAR KAMERA (ON/OFF & AUDIO BEEP) */}
                <div className="p-3 bg-[#0a101d]/90 border-b border-slate-800 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsKameraOn(!isKameraOn)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isKameraOn
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      }`}
                    >
                      {isKameraOn ? (
                        <>
                          <CameraOff className="w-3.5 h-3.5" /> Matikan Kamera
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" /> Nyalakan Kamera
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-bold">
                      Batas: <span className="text-cyan-400 font-mono">{jamBatasMasuk}</span>
                    </span>
                    <button
                      onClick={() => setIsBeepEnabled(!isBeepEnabled)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isBeepEnabled
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                          : "bg-slate-800 border-slate-700 text-slate-500"
                      }`}
                      title={isBeepEnabled ? "Matikan Beep" : "Nyalakan Beep"}
                    >
                      {isBeepEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* AREA SCANNER */}
                <div className="relative flex-1 w-full h-full bg-[#030712] flex items-center justify-center overflow-hidden">
                  <div id="absensi-qr-region" className="w-full h-full" />

                  {!isKameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/95 gap-2 p-6 text-center z-10">
                      <CameraOff className="w-12 h-12 text-slate-600" />
                      <p className="text-xs font-bold text-slate-400">Kamera Non-Aktif</p>
                      <p className="text-[11px] text-slate-500">
                        Klik tombol "Nyalakan Kamera" atau gunakan Input Manual di bawah.
                      </p>
                    </div>
                  )}

                  {isKameraOn && statusKamera === "memuat" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/90 gap-2 z-10">
                      <Camera className="w-10 h-10 text-slate-600 animate-pulse" />
                      <p className="text-xs text-slate-400">Mengaktifkan kamera...</p>
                    </div>
                  )}

                  {isKameraOn && statusKamera === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/95 gap-2 p-6 text-center z-10">
                      <XCircle className="w-10 h-10 text-rose-500" />
                      <p className="text-xs text-rose-400 font-bold">Kamera Bermasalah</p>
                      <p className="text-[11px] text-slate-400">{errorKamera}</p>
                    </div>
                  )}

                  {/* OVERLAY FEEDBACK SCAN */}
                  {hasilScan && (
                    <div
                      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-md ${
                        hasilScan.tipe === "sukses"
                          ? "bg-emerald-500/90"
                          : hasilScan.tipe === "sukses_telat"
                            ? "bg-amber-500/90"
                            : hasilScan.tipe === "sudah_absen"
                              ? "bg-amber-600/90"
                              : "bg-rose-600/90"
                      }`}
                    >
                      {hasilScan.tipe === "sukses" && (
                        <>
                          <CheckCircle2 className="w-16 h-16 text-white" />
                          <p className="text-2xl font-display font-bold text-white">
                            {hasilScan.nama} — HADIR 🟢
                          </p>
                          <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                          <p className="text-sm text-white font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> {hasilScan.jam}
                          </p>
                        </>
                      )}
                      {hasilScan.tipe === "sukses_telat" && (
                        <>
                          <AlertTriangle className="w-16 h-16 text-white" />
                          <p className="text-2xl font-display font-bold text-white">
                            {hasilScan.nama} — TERLAMBAT 🟡
                          </p>
                          <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                          <p className="text-sm text-white font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> {hasilScan.jam}
                          </p>
                        </>
                      )}
                      {hasilScan.tipe === "sudah_absen" && (
                        <>
                          <AlertTriangle className="w-16 h-16 text-white" />
                          <p className="text-xl font-display font-bold text-white">{hasilScan.nama}</p>
                          <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                          <p className="text-sm text-white font-bold">
                            Sudah Absen Hari Ini — {hasilScan.jam}
                          </p>
                        </>
                      )}
                      {hasilScan.tipe === "tidak_ditemukan" && (
                        <>
                          <XCircle className="w-16 h-16 text-white" />
                          <p className="text-sm text-white font-bold">{hasilScan.pesan}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* FOOTER CAMERA INFO */}
                {!hasilScan && isKameraOn && statusKamera === "aktif" && (
                  <div className="p-2 bg-[#0a101d] border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Arahkan QR Code Kartu ID ke kamera
                  </div>
                )}
              </div>

              {/* FALLBACK INPUT MANUAL TECHID */}
              <form onSubmit={handleManualSubmit} className="p-3 bg-[#0d1527]/80 border border-slate-800 rounded-2xl flex gap-2 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Input Manual TechID (Misal: DCC-1001)..."
                    value={manualTechId}
                    onChange={(e) => setManualTechId(e.target.value.toUpperCase())}
                    className="w-full bg-[#030712] border border-slate-800 text-xs py-2 pl-8 pr-3 text-cyan-400 font-mono uppercase rounded-xl focus:outline-none focus:border-cyan-400"
                  />
                  <Keyboard className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs px-4 rounded-xl transition-all"
                >
                  Scan
                </button>
              </form>
            </div>

            {/* LIVE LOG TABEL (2 COL) */}
            <div className="lg:col-span-2 bg-[#0d1527]/60 border border-slate-800 rounded-2xl flex flex-col max-h-[640px]">
              <div className="p-4 border-b border-slate-800 flex items-center gap-2 shrink-0">
                <ListChecks className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">
                  Log Presensi Realtime
                </h3>
              </div>

              <div className="overflow-y-auto flex-1">
                {logHariIni.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">
                    Belum ada siswa yang absen hari ini.
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0d1527] z-10">
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px] font-display font-bold">
                        <th className="text-left p-2.5 pl-4">No</th>
                        <th className="text-left p-2.5">Siswa</th>
                        <th className="text-left p-2.5">Status</th>
                        <th className="text-left p-2.5 pr-4">Jam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logHariIni.map((row, idx) => (
                        <tr key={row.id || idx} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                          <td className="p-2.5 pl-4 text-slate-500 font-mono">
                            {logHariIni.length - idx}
                          </td>
                          <td className="p-2.5">
                            <p className="font-display font-bold text-white">
                              {row.peserta?.nama || row.peserta?.nama_lengkap || row.tech_id}
                            </p>
                            <p className="font-mono text-slate-500 text-[10px]">{row.tech_id}</p>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                row.status === "TERLAMBAT"
                                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                                  : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="p-2.5 pr-4 text-slate-300 font-mono">
                            {formatJam(row.waktu_masuk)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}