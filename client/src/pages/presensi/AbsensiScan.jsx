import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Clock, Camera, User, ListChecks, Home, CalendarDays } from 'lucide-react';

const PRESENSI_TABLE = 'presensi_harian';

// Bunyi "BEEP" singkat sukses / gagal, tanpa perlu file audio eksternal
const playBeep = (sukses = true) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

const formatJam = (isoOrDate) => {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getTanggalHariIni = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function AbsensiScan() {
  const [statusKamera, setStatusKamera] = useState('memuat'); // memuat | aktif | error
  const [errorKamera, setErrorKamera] = useState('');
  const [hasilScan, setHasilScan] = useState(null); // { tipe, nama, techId, jam, pesan }
  const [jamBatasMasuk, setJamBatasMasuk] = useState('');
  const [logHariIni, setLogHariIni] = useState([]);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const resetTimeoutRef = useRef(null);

  // Ambil pengaturan jam batas masuk (opsional, untuk penanda status TELAT)
  const loadJamBatas = async () => {
    try {
      const { data } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'jam_masuk_absensi')
        .maybeSingle();

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setJamBatasMasuk(parsed.jam || '');
      }
    } catch (e) {
      console.warn('Gagal memuat pengaturan jam batas absensi.', e);
    }
  };

  // 📋 Ambil log presensi hari ini (urutan terbaru di atas)
  const loadLogHariIni = async () => {
    try {
      const { data } = await supabase
        .from(PRESENSI_TABLE)
        .select('*')
        .eq('tanggal', getTanggalHariIni())
        .order('waktu_masuk', { ascending: false });
      setLogHariIni(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Gagal memuat log presensi hari ini.', e);
    }
  };

  useEffect(() => {
    loadJamBatas();
    loadLogHariIni();
  }, []);

  // 📡 REALTIME: begitu ada baris baru masuk ke presensi_harian, log di sisi kanan update instan
  useEffect(() => {
    const channel = supabase
      .channel('realtime_presensi_harian')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: PRESENSI_TABLE },
        (payload) => {
          if (payload.new && payload.new.tanggal === getTanggalHariIni()) {
            setLogHariIni((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Ekstrak TechID dari hasil scan QR — mendukung QR polos berisi TechID (mis. "DCC25-0003"),
  // maupun QR berformat JSON seperti {"techId":"DCC25-0003", ...}
  const ekstrakTechId = (rawText) => {
    const trimmed = (rawText || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return (parsed.techId || parsed.tech_id || parsed.TechID || '').toString().trim();
      } catch (e) {
        return trimmed;
      }
    }
    return trimmed;
  };

  const handleScanSuccess = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const techId = ekstrakTechId(decodedText);

    if (!techId) {
      playBeep(false);
      setHasilScan({ tipe: 'tidak_ditemukan', pesan: 'QR tidak dapat dibaca / format tidak valid.' });
      scheduleReset();
      return;
    }

    try {
      // 1. Cari data santri berdasarkan TechID di tabel peserta
      const { data: pesertaData, error: errPeserta } = await supabase
        .from(TABLES.PESERTA)
        .select('*')
        .ilike('tech_id', techId)
        .maybeSingle();

      if (errPeserta) throw errPeserta;

      if (!pesertaData) {
        playBeep(false);
        setHasilScan({ tipe: 'tidak_ditemukan', pesan: `TechID Tidak Ditemukan (${techId})` });
        scheduleReset();
        return;
      }

      const namaSantri = pesertaData.nama || pesertaData.nama_lengkap || 'Santri';
      const tanggalHariIni = getTanggalHariIni();

      // 2. Cek apakah sudah absen hari ini
      const { data: existingPresensi } = await supabase
        .from(PRESENSI_TABLE)
        .select('*')
        .eq('tech_id', pesertaData.tech_id)
        .eq('tanggal', tanggalHariIni)
        .maybeSingle();

      if (existingPresensi) {
        playBeep(false);
        setHasilScan({
          tipe: 'sudah_absen',
          techId: pesertaData.tech_id,
          nama: namaSantri,
          jam: formatJam(existingPresensi.waktu_masuk)
        });
        scheduleReset();
        return;
      }

      // 3. Tentukan status HADIR / TELAT berdasarkan jam batas (jika diatur)
      let statusPresensi = 'HADIR';
      if (jamBatasMasuk) {
        const now = new Date();
        const [jamBatasH, jamBatasM] = jamBatasMasuk.split(':').map(Number);
        const batasDate = new Date();
        batasDate.setHours(jamBatasH, jamBatasM, 0, 0);
        if (now > batasDate) statusPresensi = 'TELAT';
      }

      const nowIso = new Date().toISOString();

      const { error: errInsert } = await supabase.from(PRESENSI_TABLE).insert({
        tech_id: pesertaData.tech_id,
        nama: namaSantri,
        tanggal: tanggalHariIni,
        waktu_masuk: nowIso,
        status: statusPresensi
      });

      if (errInsert) throw errInsert;

      playBeep(true);
      setHasilScan({
        tipe: statusPresensi === 'TELAT' ? 'sukses_telat' : 'sukses',
        techId: pesertaData.tech_id,
        nama: namaSantri,
        jam: formatJam(nowIso)
      });
      // Realtime subscription di atas otomatis nambahin baris ini ke logHariIni,
      // jadi tidak perlu update manual di sini.
      scheduleReset();
    } catch (err) {
      console.error('Gagal memproses presensi:', err);
      playBeep(false);
      setHasilScan({ tipe: 'tidak_ditemukan', pesan: 'Gagal menyimpan presensi. Periksa koneksi internet.' });
      scheduleReset();
    }
  };

  const scheduleReset = () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      setHasilScan(null);
      isProcessingRef.current = false;
    }, 3000);
  };

  useEffect(() => {
    const regionId = 'absensi-qr-region';
    const html5QrCode = new Html5Qrcode(regionId);
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setStatusKamera('error');
          setErrorKamera('Tidak ada kamera yang terdeteksi di perangkat ini.');
          return;
        }
        const cameraId = devices[0].id;
        html5QrCode
          .start(
            cameraId,
            { fps: 10, qrbox: { width: 280, height: 280 } },
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
          )
          .then(() => setStatusKamera('aktif'))
          .catch(() => {
            setStatusKamera('error');
            setErrorKamera('Gagal mengaktifkan kamera. Pastikan izin kamera sudah diberikan.');
          });
      })
      .catch(() => {
        setStatusKamera('error');
        setErrorKamera('Tidak dapat mengakses daftar kamera. Pastikan izin kamera diizinkan di browser.');
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => {});
      }
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamBatasMasuk]);

  const menuPresensi = [
    { label: 'Menu Utama', path: '/', icon: Home },
    { label: 'Scan Presensi', path: '/absensi-scan', icon: ScanLine },
    { label: 'Rekap Presensi', path: '/rekap-absensi', icon: CalendarDays },
  ];

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPresensi} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <ScanLine className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">SCAN PRESENSI HARIAN</h1>
              <p className="text-xs text-slate-400">Tunjukkan kartu TechID ke kamera untuk mencatat kehadiran</p>
            </div>
            <span className="ml-2 text-[10px] px-2.5 py-1 rounded-full font-display font-bold uppercase bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
              {logHariIni.length} Sudah Presensi Hari Ini
            </span>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* KIRI: AREA KAMERA (3 kolom) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative rounded-3xl overflow-hidden border-4 border-slate-800 bg-[#0d1527] aspect-square max-w-xl mx-auto shadow-2xl">
                <div id="absensi-qr-region" className="w-full h-full" />

                {statusKamera === 'memuat' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/90 gap-2">
                    <Camera className="w-10 h-10 text-slate-600 animate-pulse" />
                    <p className="text-xs text-slate-400">Mengaktifkan kamera...</p>
                  </div>
                )}

                {statusKamera === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/95 gap-2 p-6 text-center">
                    <XCircle className="w-10 h-10 text-rose-500" />
                    <p className="text-xs text-rose-400 font-bold">Kamera Bermasalah</p>
                    <p className="text-[11px] text-slate-400">{errorKamera}</p>
                  </div>
                )}

                {/* OVERLAY HASIL SCAN */}
                {hasilScan && (
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-md ${
                      hasilScan.tipe === 'sukses'
                        ? 'bg-emerald-500/90'
                        : hasilScan.tipe === 'sukses_telat'
                        ? 'bg-amber-500/90'
                        : hasilScan.tipe === 'sudah_absen'
                        ? 'bg-amber-600/90'
                        : 'bg-rose-600/90'
                    }`}
                  >
                    {hasilScan.tipe === 'sukses' && (
                      <>
                        <CheckCircle2 className="w-16 h-16 text-white" />
                        <p className="text-2xl font-display font-bold text-white">{hasilScan.nama} — HADIR 🟢</p>
                        <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                        <p className="text-sm text-white font-bold flex items-center gap-1.5"><Clock className="w-4 h-4" /> {hasilScan.jam}</p>
                      </>
                    )}
                    {hasilScan.tipe === 'sukses_telat' && (
                      <>
                        <AlertTriangle className="w-16 h-16 text-white" />
                        <p className="text-2xl font-display font-bold text-white">{hasilScan.nama} — TELAT 🟡</p>
                        <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                        <p className="text-sm text-white font-bold flex items-center gap-1.5"><Clock className="w-4 h-4" /> {hasilScan.jam}</p>
                      </>
                    )}
                    {hasilScan.tipe === 'sudah_absen' && (
                      <>
                        <AlertTriangle className="w-16 h-16 text-white" />
                        <p className="text-xl font-display font-bold text-white">{hasilScan.nama}</p>
                        <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                        <p className="text-sm text-white font-bold">Sudah Absen Hari Ini — pukul {hasilScan.jam}</p>
                      </>
                    )}
                    {hasilScan.tipe === 'tidak_ditemukan' && (
                      <>
                        <XCircle className="w-16 h-16 text-white" />
                        <p className="text-sm text-white font-bold">{hasilScan.pesan}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!hasilScan && statusKamera === 'aktif' && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5" /> Arahkan kartu TechID ke dalam kotak kamera di atas
                </div>
              )}
            </div>

            {/* KANAN: LOG PRESENSI REALTIME (2 kolom) */}
            <div className="lg:col-span-2 bg-[#0d1527]/60 border border-slate-800 rounded-2xl flex flex-col max-h-[640px]">
              <div className="p-4 border-b border-slate-800 flex items-center gap-2 shrink-0">
                <ListChecks className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">Log Presensi Hari Ini</h3>
              </div>

              <div className="overflow-y-auto flex-1">
                {logHariIni.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">Belum ada yang presensi hari ini.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0d1527]">
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px] font-display font-bold">
                        <th className="text-left p-2.5 pl-4">No</th>
                        <th className="text-left p-2.5">TechID</th>
                        <th className="text-left p-2.5">Status</th>
                        <th className="text-left p-2.5 pr-4">Jam Masuk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logHariIni.map((row, idx) => (
                        <tr key={row.id || idx} className="border-b border-slate-800/40">
                          <td className="p-2.5 pl-4 text-slate-500 font-mono">{logHariIni.length - idx}</td>
                          <td className="p-2.5">
                            <p className="font-display font-bold text-white">{row.nama || '-'}</p>
                            <p className="font-mono text-slate-500 text-[10px]">{row.tech_id}</p>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                              row.status === 'TELAT' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-2.5 pr-4 text-slate-300 font-mono">{formatJam(row.waktu_masuk)}</td>
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