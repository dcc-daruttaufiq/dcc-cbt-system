import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { BarChart3, Download, FileText, Trophy, Users, Award, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const dummyLaporan = {
  statistik: { totalSiswa: 1, rataRata: 91, tertinggi: 91, terendah: 91 },
  dataLaporan: [
    { user_id: 1, nilai_pg: 100, nilai_praktik: 85, nilai_akhir: 91 }
  ]
};

export default function Laporan() {
  const [laporan, setLaporan] = useState(dummyLaporan);

  useEffect(() => {
    fetchLaporan();
  }, []);

  const fetchLaporan = async () => {
    try {
      const res = await API.get('/ujian/laporan');
      if (res.data && res.data.dataLaporan && res.data.dataLaporan.length > 0) {
        setLaporan(res.data);
      } else {
        setLaporan(dummyLaporan);
      }
    } catch (err) {
      setLaporan(dummyLaporan);
    }
  };

  const handleExportExcel = () => {
    const dataExcel = laporan.dataLaporan.map((item, index) => ({
      'Ranking': index + 1,
      'ID Peserta': item.user_id,
      'Nilai PG': item.nilai_pg || 0,
      'Nilai Praktik': item.nilai_praktik || 0,
      'Nilai Akhir': item.nilai_akhir || 0,
      'Status': (item.nilai_akhir || 0) >= 75 ? 'LULUS' : 'TIDAK LULUS'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Ujian");
    XLSX.writeFile(workbook, "Rekap_Nilai_CBT.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("LAPORAN REKAPITULASI HASIL UJIAN DCC-CBT", 14, 15);
    
    const tableColumn = ["Rank", "ID Peserta", "Nilai PG", "Nilai Praktik", "Nilai Akhir", "Status"];
    const tableRows = [];

    laporan.dataLaporan.forEach((item, index) => {
      const rowData = [
        index + 1,
        item.user_id,
        item.nilai_pg || 0,
        item.nilai_praktik || 0,
        item.nilai_akhir || 0,
        (item.nilai_akhir || 0) >= 75 ? 'LULUS' : 'REMIDI'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [0, 217, 255], textColor: [7, 20, 38] }
    });

    doc.save("Rekap_Nilai_CBT.pdf");
  };

  return (
    <div className="p-6 text-white max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCustom pb-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="text-primary w-8 h-8" /> LAPORAN & RANKING UJIAN
          </h1>
          <p className="text-xs text-slate-400">Analitik hasil ujian, urutan peringkat nasional, dan unduh rekapitulasi.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-1.5" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-borderCustom bg-surface flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400">Total Peserta</p>
            <h3 className="text-xl font-display font-bold">{laporan.statistik.totalSiswa} Siswa</h3>
          </div>
        </Card>

        <Card className="p-4 border-borderCustom bg-surface flex items-center gap-4">
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400">Rata-Rata Nilai</p>
            <h3 className="text-xl font-display font-bold">{laporan.statistik.rataRata}</h3>
          </div>
        </Card>

        <Card className="p-4 border-borderCustom bg-surface flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-400 rounded-xl"><Trophy className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400">Nilai Tertinggi</p>
            <h3 className="text-xl font-display font-bold text-green-400">{laporan.statistik.tertinggi}</h3>
          </div>
        </Card>

        <Card className="p-4 border-borderCustom bg-surface flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl"><Award className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400">Nilai Terendah</p>
            <h3 className="text-xl font-display font-bold text-red-400">{laporan.statistik.terendah}</h3>
          </div>
        </Card>
      </div>

      <Card className="border-borderCustom bg-surface p-6 space-y-4">
        <h2 className="text-lg font-display font-bold text-primary">TABEL PERINGKAT & RIWAYAT HASIL UJIAN</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="bg-background text-xs uppercase font-display text-primary border-b border-borderCustom">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">ID Peserta</th>
                <th className="px-4 py-3">Nilai PG</th>
                <th className="px-4 py-3">Nilai Praktik</th>
                <th className="px-4 py-3">Nilai Akhir</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCustom/40 font-sans">
              {laporan.dataLaporan.map((row, idx) => (
                <tr key={idx} className="hover:bg-background/40 transition">
                  <td className="px-4 py-3 font-bold font-mono text-secondary">#{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">Peserta #{row.user_id}</td>
                  <td className="px-4 py-3 font-mono">{row.nilai_pg || 0}</td>
                  <td className="px-4 py-3 font-mono">{row.nilai_praktik || 0}</td>
                  <td className="px-4 py-3 font-mono text-base font-bold text-primary">{row.nilai_akhir || 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={(row.nilai_akhir || 0) >= 75 ? 'primary' : 'secondary'}>
                      {(row.nilai_akhir || 0) >= 75 ? 'LULUS' : 'REMIDI'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}