import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import API from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Progress from '../components/ui/Progress';
import Textarea from '../components/ui/Textarea';
import { Clock, Flag, ChevronLeft, ChevronRight, Save, Upload, FileText } from 'lucide-react';

// Data Dummy Cadangan (Dipakai otomatis jika database di backend masih kosong)
const dummyBackupSoal = [
  {
    id: 1,
    tipe: 'pg',
    pertanyaan: 'Manakah di bawah ini yang merupakan keuntungan utama menggunakan arsitektur frontend berbasis komponen seperti React?',
    opsi: [
      'Mempercepat waktu rendering database backend secara langsung.',
      'Mempermudah penggunaan kembali kode (reusability) dan mempercepat pengembangan.',
      'Menghilangkan kebutuhan akan bahasa pemrograman CSS sepenuhnya.',
      'Membuat aplikasi otomatis aman dari serangan siber tanpa konfigurasi.'
    ]
  },
  {
    id: 2,
    tipe: 'pg',
    pertanyaan: 'Fungsi utama dari modifikator "class" pada konfigurasi darkMode di Tailwind CSS adalah untuk...',
    opsi: [
      'Mengaktifkan tema gelap secara otomatis berdasarkan jam sistem operasi.',
      'Memungkinkan kendali manual tema gelap dengan memicu class "dark" pada elemen HTML/Body.',
      'Mengubah seluruh warna teks menjadi hitam secara paksa.',
      'Mempercepat load data gambar pada malam hari.'
    ]
  },
  {
    id: 3,
    tipe: 'praktik',
    pertanyaan: 'TUGAS PRAKTIK: Buatlah sebuah fungsi utilitas sederhana menggunakan JavaScript/React untuk menggabungkan class Tailwind secara dinamis. Tuliskan kode jawaban Anda dan unggah berkas screenshot hasil ujinya di bawah ini.',
    placeholder: 'Tuliskan kode jawaban Anda di sini...'
  }
];

export default function RuangUjian() {
  useDocumentTitle('Sesi Ujian Berjalan');
  const navigate = useNavigate();
  
  // States Manajemen Ujian Live DB
  const [listSoal, setListSoal] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({}); 
  const [flags, setFlags] = useState({}); 
  const [isSaving, setIsSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(7200); // Default 2 jam jika timer server gagal
  const timerRef = useRef(null);

  // 1. Ambil data paket soal dari server (Gunakan fallback dummy jika database kosong)
  useEffect(() => {
    const startExam = async () => {
      try {
        const res = await API.get('/ujian/mulai?userId=1');
        
        if (res.data && res.data.soal && res.data.soal.length > 0) {
          setListSoal(res.data.soal);
          setTimeLeft(res.data.sisaDetik);
        } else {
          // DATABASE KOSONG: Aktifkan data dummy agar tidak mental
          console.warn('⚠️ Database soal kosong. Menggunakan data dummy cadangan.');
          setListSoal(dummyBackupSoal);
        }
      } catch (err) {
        console.error('❌ Gagal terhubung ke API Ujian. Menggunakan mode lokal dummy.', err);
        setListSoal(dummyBackupSoal);
      }
    };
    startExam();
  }, []);

  // 2. Logic Hitung Mundur Timer Terpusat Server & Auto Submit jika Waktu Habis
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  // Format Detik ke Jam:Menit:Detik
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // 3. Fungsi AUTOSAVE Latar Belakang (Mengirim Data ke Database Server)
  const executeAutosave = async (soalId, dataJawaban) => {
    setIsSaving(true);
    try {
      await API.post('/ujian/autosave', { soalId, jawaban: dataJawaban, userId: 1 });
    } catch (err) {
      console.error('Gagal melakukan autosave ke backend:', err);
    } finally {
      setTimeout(() => setIsSaving(false), 600);
    }
  };

  // Pilihan PG disimpan fleksibel (mengakomodasi huruf A/B/C maupun teks opsi)
  const handleSelectPG = (opsiTeks, labelHuruf) => {
    const nilaiSimpan = labelHuruf || opsiTeks;
    setJawaban((prev) => ({ ...prev, [soalAktif.id]: nilaiSimpan }));
    executeAutosave(soalAktif.id, nilaiSimpan);
  };

  const handleTextareaPraktik = (val) => {
    const dataLama = jawaban[soalAktif.id] || { teks: '', fileName: '' };
    const dataBaru = { ...dataLama, teks: val };
    setJawaban({ ...jawaban, [soalAktif.id]: dataBaru });
    executeAutosave(soalAktif.id, dataBaru);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file_praktik', file);

    setIsSaving(true);
    try {
      const uploadRes = await API.post('/upload-praktik', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const dataLama = jawaban[soalAktif.id] || { teks: '', fileName: '' };
      const dataBaru = { ...dataLama, fileName: uploadRes.data.filename };
      
      setJawaban({ ...jawaban, [soalAktif.id]: dataBaru });
      await API.post('/ujian/autosave', { soalId: soalAktif.id, jawaban: dataBaru, userId: 1 });
    } catch (err) {
      console.error('Gagal mengunggah berkas praktik:', err);
      // Fallback lokal jika API upload belum dikonfigurasi sempurna
      const dataLama = jawaban[soalAktif.id] || { teks: '', fileName: '' };
      setJawaban({ ...jawaban, [soalAktif.id]: { ...dataLama, fileName: file.name } });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFlag = () => {
    setFlags({ ...flags, [soalAktif.id]: !flags[soalAktif.id] });
  };

  // 4. Fungsi Kunci & Submit Ujian Permanen (Auto / Manual)
  const handleAutoSubmit = async () => {
    clearInterval(timerRef.current);
    try {
      await API.post('/ujian/submit', { userId: 1 });
      alert('Sesi ujian telah berakhir! Lembar jawaban Anda berhasil dikumpulkan.');
      navigate('/dashboard-peserta');
    } catch (err) {
      console.warn('Gagal submit ke server, mengalihkan halaman secara lokal.');
      navigate('/dashboard-peserta');
    }
  };

  if (listSoal.length === 0) {
    return <div className="text-white p-10 text-center font-display font-medium">Menghubungkan ke Central Core Ujian...</div>;
  }

  const soalAktif = listSoal[currentIdx];
  const totalSoalTerjawab = Object.keys(jawaban).length;
  const progressPersen = (totalSoalTerjawab / listSoal.length) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-white p-6">
      
      {/* AREA KIRI & TENGAH: PERTANYAAN & PILIHAN */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Header Informasi Ruang Ujian */}
        <Card className="border-customBorder bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Badge variant="primary" className="text-sm px-3 py-1 font-display">SOAL NO. {currentIdx + 1}</Badge>
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-secondary flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-ping" /> Menyimpan ke server...
                </motion.span>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-sans">
                  <Save className="w-3.5 h-3.5" /> Autosave Aktif Terpusat
                </span>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2 bg-background border border-customBorder/40 px-3 py-1.5 rounded-lg text-primary font-mono font-bold text-lg shadow-inner">
            <Clock className="w-5 h-5 text-secondary animate-pulse" />
            {formatTime(timeLeft)}
          </div>
        </Card>

        {/* Kotak Utama Butir Pertanyaan */}
        <Card className="border-customBorder bg-surface/90 min-h-[300px] p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-base md:text-lg font-sans leading-relaxed text-slate-100">
              {soalAktif.pertanyaan}
            </p>

            {/* Antarmuka Sesuai Tipe Soal */}
            <div className="mt-4">
              {soalAktif.tipe === 'pg' ? (
                <div className="grid grid-cols-1 gap-3">
                  {soalAktif.opsi.map((opsiTeks, idx) => {
                    const teksPilihan = typeof opsiTeks === 'object' ? opsiTeks.teks : opsiTeks;
                    const labelHuruf = String.fromCharCode(65 + idx); 
                    
                    const isSelected = jawaban[soalAktif.id] === labelHuruf || jawaban[soalAktif.id] === teksPilihan;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectPG(teksPilihan, labelHuruf)}
                        className={`w-full text-left p-4 rounded-xl border font-sans text-sm transition-all duration-200 flex items-start gap-4 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5'
                            : 'bg-background/40 border-customBorder/50 text-slate-300 hover:border-customBorder hover:bg-background/80'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg border flex items-center justify-center font-display font-bold text-xs shrink-0 transition-colors ${
                          isSelected ? 'bg-primary text-darkBg border-primary' : 'border-slate-500 bg-surface'
                        }`}>
                          {labelHuruf}
                        </span>
                        <span className="pt-0.5">{teksPilihan}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder={soalAktif.placeholder || "Tulis jawaban esai atau instruksi pengerjaan praktik Anda di sini..."}
                    value={jawaban[soalAktif.id]?.teks || ''}
                    onChange={(e) => handleTextareaPraktik(e.target.value)}
                    className="bg-background/40 border-customBorder/60 focus:border-primary text-sm min-h-[160px]"
                  />
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-background/30 border border-customBorder/30 rounded-xl">
                    <label className="relative flex items-center justify-center gap-2 bg-surface hover:bg-surface/80 border border-customBorder px-4 py-2 rounded-lg cursor-pointer transition text-sm font-medium font-sans">
                      <Upload className="w-4 h-4 text-secondary" />
                      <span>Unggah File Praktik</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.zip,.png,.jpg,.jpeg" />
                    </label>
                    
                    {jawaban[soalAktif.id]?.fileName ? (
                      <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
                        <FileText className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">{jawaban[soalAktif.id].fileName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-sans">Belum ada file diunggah (Format: .pdf, .zip, .png)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigasi Footer Ujian */}
          <div className="flex items-center justify-between border-t border-customBorder/30 pt-4 mt-8 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(currentIdx - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
            </Button>

            <Button
              onClick={toggleFlag}
              className={`border font-sans font-medium text-xs transition-colors ${
                flags[soalAktif.id]
                  ? 'bg-amber-500 text-darkBg border-amber-500 hover:bg-amber-400 font-semibold'
                  : 'border-amber-500/40 bg-transparent text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <Flag className="w-3.5 h-3.5 mr-1.5" /> {flags[soalAktif.id] ? 'Ragu-Ragu Aktif' : 'Tandai Ragu-Ragu'}
            </Button>

            <Button
              variant={currentIdx === listSoal.length - 1 ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                if (currentIdx < listSoal.length - 1) {
                  setCurrentIdx(currentIdx + 1);
                } else {
                  if (confirm('Apakah Anda yakin ingin mengakhiri ujian dan mengumpulkan semua lembar jawaban?')) {
                    handleAutoSubmit();
                  }
                }
              }}
            >
              {currentIdx === listSoal.length - 1 ? 'Selesai Ujian' : 'Berikutnya'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </div>

      {/* AREA KANAN: SIDEBAR NOMOR SOAL & PROGRESS */}
      <div className="space-y-4">
        <Card className="border-customBorder bg-surface p-4">
          <div className="flex justify-between text-xs font-sans text-slate-400 mb-2">
            <span>Progress Pengisian</span>
            <span className="text-white font-medium">{totalSoalTerjawab} dari {listSoal.length} Soal</span>
          </div>
          <Progress value={progressPersen} max={100} />
        </Card>

        {/* Panel Kisi Grid Nomor Soal */}
        <Card className="border-customBorder bg-surface p-4 flex flex-col justify-between min-h-[340px]">
          <div>
            <h3 className="text-sm font-display font-bold tracking-wider mb-4 text-slate-300 uppercase">Navigasi Nomor Soal</h3>
            <div className="grid grid-cols-5 gap-2">
              {listSoal.map((item, index) => {
                const isCurrent = index === currentIdx;
                const isFlagged = flags[item.id];
                const isAnswered = jawaban[item.id] !== undefined && (typeof jawaban[item.id] === 'string' ? jawaban[item.id] !== '' : jawaban[item.id]?.teks !== '' || jawaban[item.id]?.fileName !== '');

                let nodeStyles = "border-customBorder/40 bg-background/40 text-slate-400";
                if (isAnswered) nodeStyles = "bg-primary/20 border-primary text-primary font-semibold";
                if (isFlagged) nodeStyles = "bg-amber-500 border-amber-600 text-darkBg font-semibold shadow-md shadow-amber-500/10";
                if (isCurrent) nodeStyles = "bg-primary border-primary text-darkBg font-bold shadow-lg shadow-primary/20 scale-105 ring-2 ring-primary/30";

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIdx(index)}
                    className={`h-10 rounded-lg border text-xs font-display flex items-center justify-center transition-all duration-150 ${nodeStyles}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend Indikator Warna */}
          <div className="border-t border-customBorder/20 pt-4 mt-6 space-y-2 text-xs font-sans text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Soal Aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
              <span>Sudah Dijawab / Terisi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>Ditandai Ragu-Ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-background/40 border border-customBorder/40" />
              <span>Belum Dijawab / Kosong</span>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}