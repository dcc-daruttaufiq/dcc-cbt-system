import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Progress from '../components/ui/Progress';
import Button from '../components/ui/Button';
import { Clock, BookOpen, AlertCircle, Play } from 'lucide-react';

export default function DashboardPeserta() {
  useDocumentTitle('Dashboard Peserta');
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl text-white font-display font-bold">DASHBOARD PESERTA</h1>
        <p className="text-slate-400 text-sm">Selamat datang, Ahmad Pengguna. Silakan periksa jadwal ujian Anda.</p>
      </div>

      {/* Statistik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 border-customBorder bg-surface">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-sans">Sisa Waktu Sesi</p>
            <h3 className="text-2xl font-display font-bold text-white">120 Menit</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-customBorder bg-surface">
          <div className="p-3 rounded-lg bg-secondary/10 text-secondary">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-sans">Total Ujian Hari Ini</p>
            <h3 className="text-2xl font-display font-bold text-white">2 Ujian</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-customBorder bg-surface">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-sans">Status Verifikasi</p>
            <h3 className="text-xl font-display font-bold text-amber-400 uppercase">Terverifikasi</h3>
          </div>
        </Card>
      </div>

      {/* Daftar Ujian Aktif */}
      <Card className="border-customBorder bg-surface">
        <h2 className="text-xl font-display font-bold mb-4 text-white">Mata Ujian Tersedia</h2>
        <div className="divide-y divide-customBorder/40">
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-base font-bold text-white">Matematika Sains (Sesi 1)</h4>
                <Badge variant="primary">Aktif</Badge>
              </div>
              <p className="text-xs text-slate-400">40 Soal • Pilihan Ganda • KKM: 75</p>
            </div>
            <div className="w-full sm:w-48">
              <p className="text-xs text-slate-400 mb-1">Waktu: Jam 08:00 - 10:00</p>
              <Progress value={0} max={100} />
            </div>
            
            {/* Navigasi Mulai Ujian Ditambahkan di sini */}
            <Button 
              variant="primary" 
              size="sm" 
              className="shrink-0"
              onClick={() => navigate('/ruang-ujian')}
            >
              <Play className="w-4 h-4 mr-1.5" /> Mulai Ujian
            </Button>
          </div>

          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-base font-bold text-slate-300">Bahasa Inggris (Sesi 2)</h4>
                <Badge variant="outline">Belum Dimulai</Badge>
              </div>
              <p className="text-xs text-slate-500">50 Soal • Pilihan Ganda + Esai</p>
            </div>
            <div className="w-full sm:w-48">
              <p className="text-xs text-slate-500 mb-1">Waktu: Jam 10:30 - 12:00</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" disabled>
              Terkunci
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}