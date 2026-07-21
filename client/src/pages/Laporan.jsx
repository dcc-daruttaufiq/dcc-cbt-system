import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
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
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-body">
      {/* SIDEBAR CLEAN */}
      <Sidebar userRole="Panitia" />

      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-cyan-400 w-5 h-5" />
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">LAPORAN & RANKING UJIAN</h1>
                <p className="text-[11px] text-slate-400">Analitik Hasil Ujian & Unduh Rekapitulasi Data</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleExportExcel} className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border-0">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
              </Button>
              <Button onClick={handleExportPDF} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs border-0 shadow-lg shadow-cyan-400/20">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Export PDF
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* GRID STATISTIK BORDERLESS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-cyan-400/10 text-cyan-400 rounded-xl"><Users className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Peserta</p>
                  <h3 className="text-lg font-bold text-white font-mono">{laporan.statistik.totalSiswa} Siswa</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Rata-Rata Nilai</p>
                  <h3 className="text-lg font-bold text-white font-mono">{laporan.statistik.rataRata}</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Trophy className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Nilai Tertinggi</p>
                  <h3 className="text-lg font-bold text-emerald-400 font-mono">{laporan.statistik.tertinggi}</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl"><Award className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Nilai Terendah</p>
                  <h3 className="text-lg font-bold text-rose-400 font-mono">{laporan.statistik.terendah}</h3>
                </div>
              </div>
            </div>

            {/* TABEL RANKING BORDERLESS LIST */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tabel Peringkat Hasil Ujian</h2>
              </div>

              {laporan.dataLaporan.map((row, idx) => {
                const isLulus = (row.nilai_akhir || 0) >= 75;

                return (
                  <div
                    key={idx}
                    className="p-5 bg-[#0d1527]/60 backdrop-blur-md rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#0d1527] transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-xl shrink-0">
                        #{idx + 1}
                      </span>

                      <div>
                        <h3 className="text-sm font-semibold text-white">Peserta #{row.user_id}</h3>
                        <div className="mt-1">
                          <Badge variant={isLulus ? 'primary' : 'secondary'} className="text-[10px] px-2 py-0.5 rounded-md uppercase">
                            {isLulus ? 'LULUS' : 'REMIDI'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase">Nilai PG</p>
                        <p className="text-xs font-mono font-semibold text-slate-200">{row.nilai_pg || 0}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase">Nilai Praktik</p>
                        <p className="text-xs font-mono font-semibold text-slate-200">{row.nilai_praktik || 0}</p>
                      </div>

                      <div className="text-right pl-3 border-l border-slate-800/60">
                        <p className="text-[10px] text-cyan-400 uppercase font-bold">Nilai Akhir</p>
                        <p className="text-base font-mono font-bold text-emerald-400">{row.nilai_akhir || 0}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}