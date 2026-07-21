import React from 'react';
import { motion } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Database, FileText, Settings, Plus, LayoutGrid } from 'lucide-react';

export default function DashboardAdmin() {
  useDocumentTitle('Master Administrator');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white font-display font-bold">CORE CENTRAL ADMIN</h1>
          <p className="text-slate-400 text-sm">Pusat kendali bank data, pembuatan token, dan konfigurasi master ujian.</p>
        </div>
        <Button variant="primary" className="shrink-0 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-1.5" /> Buat Paket Soal Baru
        </Button>
      </div>

      {/* Sistem Card Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-customBorder bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-sans">Total Soal Terupload</span>
            <Database className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-3xl font-display font-bold text-white">1,420</h3>
        </Card>

        <Card className="border-customBorder bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-sans">Paket Ujian Aktif</span>
            <FileText className="w-5 h-5 text-secondary" />
          </div>
          <h3 className="text-3xl font-display font-bold text-white">12 Paket</h3>
        </Card>

        <Card className="border-customBorder bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-sans">Total Institusi</span>
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-3xl font-display font-bold text-white">4 Node</h3>
        </Card>

        <Card className="border-customBorder bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-sans">Server Cluster</span>
            <Settings className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-display font-bold text-emerald-400">AWS-CORE</h3>
        </Card>
      </div>

      {/* Quick Action Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-customBorder bg-surface/50 p-6">
          <h3 className="text-lg font-display font-bold mb-3 text-white">Sistem Log Terakhir</h3>
          <div className="text-xs font-mono space-y-2 text-slate-400 bg-background/50 p-4 rounded-lg border border-customBorder/20">
            <p className="text-emerald-400">[08:00:12] - Server Room A Sync Token Success.</p>
            <p className="text-primary">[08:15:32] - User TECH-001 started Matematika Sains.</p>
            <p className="text-red-400">[08:22:01] - Security Alert: User TECH-003 Multi-window Tab detected.</p>
          </div>
        </Card>

        <Card className="border-customBorder bg-surface/50 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-display font-bold mb-2 text-white">Backup Database Otomatis</h3>
            <p className="text-sm text-slate-400">Sistem melakukan pencadangan otomatis berkala setiap 30 menit demi keamanan data integritas lembar jawaban siswa.</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="w-full">Unduh SQL</Button>
            <Button variant="secondary" size="sm" className="w-full">Cek Storage</Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}