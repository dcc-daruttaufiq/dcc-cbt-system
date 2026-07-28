import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, TABLES } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Clock, Camera, User } from 'lucide-react';

const ABSENSI_TABLE = 'absensi_harian';

// Bunyi "ting" sukses / "tut" gagal, tanpa perlu file audio eksternal
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

const formatJamSekarang = () => {
  const d = new Date();
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
  const [hasilScan, setHasilScan] = useState(null); // { tipe: 'sukses'|'sudah_absen'|'tidak_ditemukan', nama, techId, jam }
  const [jamBatasMasuk, setJamBatasMasuk] = useState('');
  const [totalAbsenHariIni, setTotalAbsenHariIni] = useState(0);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const resetTimeoutRef = useRef(null);

  // Ambil pengaturan jam batas masuk (opsional, untuk penanda status "Telat")
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

  const loadTotalAbsenHariIni = async () => {
    try {
      const { count } = await supabase
        .from(ABSENSI_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('tanggal', getTanggalHariIni());
      setTotalAbsenHariIni(count || 0);
    } catch (e) {}
  };

  useEffect(() => {
    loadJamBatas();
    loadTotalAbsenHariIni();
  }, []);

  // Ekstrak TechID dari hasil scan QR — mendukung QR polos berisi TechID,
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
      setHasilScan({ tipe: 'tidak_ditemukan', techId: '-', pesan: 'QR tidak dapat dibaca / format tidak valid.' });
      scheduleReset();
      return;
    }

    try {
      // 1. Cari data peserta berdasarkan TechID
      const { data: pesertaData, error: errPeserta } = await supabase
        .from(TABLES.PESERTA)
        .select('*')
        .ilike('tech_id', techId)
        .maybeSingle();

      if (errPeserta) throw errPeserta;

      if (!pesertaData) {
        playBeep(false);
        setHasilScan({ tipe: 'tidak_ditemukan', techId, pesan: `TechID "${techId}" tidak ditemukan di data peserta.` });
        scheduleReset();
        return;
      }

      const namaPeserta = pesertaData.nama || pesertaData.nama_lengkap || 'Peserta';
      const tanggalHariIni = getTanggalHariIni();

      // 2. Cek apakah sudah absen hari ini
      const { data: existingAbsen } = await supabase
        .from(ABSENSI_TABLE)
        .select('*')
        .eq('tech_id', pesertaData.tech_id)
        .eq('tanggal', tanggalHariIni)
        .maybeSingle();

      if (existingAbsen) {
        playBeep(false);
        const jamSudahAbsen = new Date(existingAbsen.waktu_absen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setHasilScan({ tipe: 'sudah_absen', techId: pesertaData.tech_id, nama: namaPeserta, jam: jamSudahAbsen });
        scheduleReset();
        return;
      }

      // 3. Tentukan status Hadir / Telat berdasarkan jam batas (jika diatur)
      let statusAbsen = 'Hadir';
      if (jamBatasMasuk) {
        const now = new Date();
        const [jamBatasH, jamBatasM] = jamBatasMasuk.split(':').map(Number);
        const batasDate = new Date();
        batasDate.setHours(jamBatasH, jamBatasM, 0, 0);
        if (now > batasDate) statusAbsen = 'Telat';
      }

      const nowIso = new Date().toISOString();

      const { error: errInsert } = await supabase.from(ABSENSI_TABLE).insert({
        tech_id: pesertaData.tech_id,
        nama: namaPeserta,
        tanggal: tanggalHariIni,
        waktu_absen: nowIso,
        status: statusAbsen
      });

      if (errInsert) throw errInsert;

      playBeep(true);
      setHasilScan({
        tipe: statusAbsen === 'Telat' ? 'sukses_telat' : 'sukses',
        techId: pesertaData.tech_id,
        nama: namaPeserta,
        jam: formatJamSekarang()
      });
      setTotalAbsenHariIni(prev => prev + 1);
      scheduleReset();
    } catch (err) {
      console.error('Gagal memproses absensi:', err);
      playBeep(false);
      setHasilScan({ tipe: 'tidak_ditemukan', techId, pesan: 'Gagal menyimpan absensi. Periksa koneksi internet.' });
      scheduleReset();
    }
  };

  const scheduleReset = () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      setHasilScan(null);
      isProcessingRef.current = false;
    }, 2500);
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
          .catch((err) => {
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

  const menuPengawas = [
    { label: 'Koreksi Ujian', path: '/dashboard-Pengawas', icon: '📊' },
    { label: 'Repositori Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Pengaturan Ujian', path: '/pengaturan-ujian', icon: '⚙️' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
    { label: 'Scan Absensi', path: '/absensi-scan', icon: '📷' },
    { label: 'Rekap Absensi', path: '/rekap-absensi', icon: '🗓️' },
  ];

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPengawas} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex items-center gap-3">
            <ScanLine className="text-cyan-400 w-6 h-6" />
            <div>
              <h1 className="text-base font-display font-bold text-white tracking-wide">SCAN ABSENSI HARIAN</h1>
              <p className="text-xs text-slate-400">Tunjukkan kartu TechID ke kamera untuk mencatat kehadiran</p>
            </div>
            <span className="ml-2 text-[10px] px-2.5 py-1 rounded-full font-display font-bold uppercase bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
              {totalAbsenHariIni} Sudah Absen Hari Ini
            </span>
          </div>
        </Navbar>

        <main className="p-6 md:p-10 flex-1 overflow-y-auto flex items-center justify-center">
          <div className="w-full max-w-xl space-y-5">

            {/* AREA KAMERA */}
            <div className="relative rounded-3xl overflow-hidden border-4 border-slate-800 bg-[#0d1527] aspect-square shadow-2xl">
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
                      <p className="text-2xl font-display font-bold text-white">{hasilScan.nama}</p>
                      <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                      <p className="text-sm text-white font-bold flex items-center gap-1.5"><Clock className="w-4 h-4" /> Hadir — {hasilScan.jam}</p>
                    </>
                  )}
                  {hasilScan.tipe === 'sukses_telat' && (
                    <>
                      <AlertTriangle className="w-16 h-16 text-white" />
                      <p className="text-2xl font-display font-bold text-white">{hasilScan.nama}</p>
                      <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                      <p className="text-sm text-white font-bold flex items-center gap-1.5"><Clock className="w-4 h-4" /> Tercatat TELAT — {hasilScan.jam}</p>
                    </>
                  )}
                  {hasilScan.tipe === 'sudah_absen' && (
                    <>
                      <AlertTriangle className="w-16 h-16 text-white" />
                      <p className="text-xl font-display font-bold text-white">{hasilScan.nama}</p>
                      <p className="text-sm text-white/90 font-mono">{hasilScan.techId}</p>
                      <p className="text-sm text-white font-bold">Sudah absen hari ini pukul {hasilScan.jam}</p>
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
        </main>
      </div>
    </div>
  );
}
