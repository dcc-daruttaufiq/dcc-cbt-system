import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CheckCircle2, AlertCircle } from "lucide-react";

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const html5QrCodeRef = useRef(null);

  // Audio Beep Feedback (Web Audio API)
  const playBeep = (freq = 880, duration = 150) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, duration);
    } catch (e) { }
  };

  useEffect(() => {
    if (!isOpen) return;

    setScanResult(null);
    setCameraError("");

    const qrRegionId = "reader-qr-region";
    const html5QrCode = new Html5Qrcode(qrRegionId);
    html5QrCodeRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          playBeep(880, 150); // Beep Sukses
          setScanResult(decodedText);

          if (onScanSuccess) {
            onScanSuccess(decodedText.trim());
          }

          html5QrCode.pause(true);
          setTimeout(() => {
            try {
              html5QrCode.resume();
              setScanResult(null);
            } catch (e) { }
          }, 2000);
        },
        () => { }
      )
      .catch(() => {
        setCameraError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
      });

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch(() => { });
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-display font-bold text-cyan-400 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" /> Scanner QR Absensi Presensi
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black/60 border border-slate-800 min-h-[260px] flex items-center justify-center">
          <div id="reader-qr-region" className="w-full h-full"></div>

          {cameraError && (
            <div className="p-4 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              {cameraError}
            </div>
          )}
        </div>

        {scanResult && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-emerald-400 uppercase font-bold">
                QR Terdeteksi:
              </p>
              <p className="text-xs font-mono font-bold text-white truncate">
                {scanResult}
              </p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center font-sans">
          Arahkan QR Code Kartu ID Siswa ke dalam kotak kamera.
        </p>
      </div>
    </div>
  );
}