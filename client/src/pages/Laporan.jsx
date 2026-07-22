import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { BarChart3, Download, FileText, Trophy, Users, Award, TrendingUp, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Laporan() {
  const [laporan, setLaporan] = useState({
    statistik: { totalSiswa: 0, rataRata: 0, tertinggi: 0, terendah: 0 },
    dataLaporan: []
  });

  const menuPanitia = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: '📊' },
    { label: 'Bank Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  const fetchLaporan = async () => {
    let dataReal = [];
    try {
      const res = await API.get('/ujian/laporan');
      if (res.data && res.data.dataLaporan && res.data.dataLaporan.length > 0) {
        setLaporan(res.data);
        return;
      }
    } catch (err) {
      console.warn('Gagal fetch laporan server, menggunakan storage lokal');
    }

    // Fallback: Membaca Sesi Peserta Asli dari LocalStorage
    const localSesi = localStorage.getItem('dcc_sesi_peserta');
    if (localSesi) {
      dataReal = JSON.parse(localSesi).filter(p => p.status === 'selesai' || p.nilai_akhir > 0 || p.nilai_pg > 0);
    }

    const totalSiswa = dataReal.length;
    const totalNilai = dataReal.reduce((acc, curr) => acc + (curr.nilai_akhir || curr.nilai_pg || 0), 0);
    const rataRata = totalSiswa > 0 ? Math.round(totalNilai / totalSiswa) : 0;
    const nilaiList = dataReal.map(d => d.nilai_akhir || d.nilai_pg || 0);

    setLaporan({
      statistik: {
        totalSiswa,
        rataRata,
        tertinggi: nilaiList.length > 0 ? Math.max(...nilaiList) : 0,
        terendah: nilaiList.length > 0 ? Math.min(...nilaiList) : 0
      },
      dataLaporan: dataReal
    });
  };

  useEffect(() => {
    fetchLaporan();
  }, []);

  const handleExportExcel = () => {
    if (laporan.dataLaporan.length === 0) return alert('Belum ada data nilai peserta untuk diexport!');

    const dataExcel = laporan.dataLaporan.map((item, index) => ({
      'Ranking': index + 1,
      'TechID': item.tech_id || `DCC25-000${item.user_id}`,
      'Nama Lengkap': item.nama || item.nama_lengkap || `Peserta #${item.user_id}`,
      'Nilai PG': item.nilai_pg || 0,
      'Nilai Praktik': item.nilai_praktik || 0,
      'Nilai Akhir': item.nilai_akhir || item.nilai_pg || 0,
      'Status': (item.nilai_akhir || item.nilai_pg || 0) >= 75 ? 'LULUS' : 'TIDAK LULUS'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Ujian");
    XLSX.writeFile(workbook, "Rekap_Nilai_CBT_Real.xlsx");
  };

  const handleExportPDF = () => {
    if (laporan.dataLaporan.length === 0) return alert('Belum ada data nilai peserta untuk diexport!');

    const doc = new jsPDF();
    doc.text("LAPORAN REKAPITULASI HASIL UJIAN DCC-CBT", 14, 15);
    
    const tableColumn = ["Rank", "TechID", "Nama Lengkap", "Nilai PG", "Nilai Praktik", "Nilai Akhir", "Status"];
    const tableRows = [];

    laporan.dataLaporan.forEach((item, index) => {
      const rowData = [
        index + 1,
        item.tech_id || `DCC25-000${item.user_id}`,
        item.nama || item.nama_lengkap || `Peserta #${item.user_id}`,
        item.nilai_pg || 0,
        item.nilai_praktik || 0,
        item.nilai_akhir || item.nilai_pg || 0,
        (item.nilai_akhir || item.nilai_pg || 0) >= 75 ? 'LULUS' : 'REMIDI'
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

    doc.save("Rekap_Nilai_CBT_Real.pdf");
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPanitia} userRole="Panitia" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-cyan-400 w-5 h-5" />
              <div>
                <h1 className="text-sm font-display font-bold text-white tracking-wide">LAPORAN & RANKING UJIAN</h1>
                <p className="text-[11px] text-slate-400">Analitik Realtime Hasil Ujian Peserta</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleExportExcel} className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border-0">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
              </Button>
              <Button onClick={handleExportPDF} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0 shadow-lg shadow-cyan-400/20">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Export PDF
              </Button>
            </div>
          </div>
        </Navbar>

        <main className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* GRID STATISTIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-cyan-400/10 text-cyan-400 rounded-xl"><Users className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Peserta Selesai</p>
                  <h3 className="text-lg font-display font-bold text-white">{laporan.statistik.totalSiswa} Siswa</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Rata-Rata Nilai</p>
                  <h3 className="text-lg font-display font-bold text-white">{laporan.statistik.rataRata}</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Trophy className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Nilai Tertinggi</p>
                  <h3 className="text-lg font-display font-bold text-emerald-400">{laporan.statistik.tertinggi}</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl"><Award className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Nilai Terendah</p>
                  <h3 className="text-lg font-display font-bold text-rose-400">{laporan.statistik.terendah}</h3>
                </div>
              </div>
            </div>

            {/* TABEL RANKING REAL */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">Peringkat Ujian Realtime</h2>
              </div>

              {laporan.dataLaporan.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs">
                  Belum ada peserta yang menyelesaikan ujian.
                </div>
              ) : (
                laporan.dataLaporan.map((row, idx) => {
                  const nilaiAkhir = row.nilai_akhir || row.nilai_pg || 0;
                  const isLulus = nilaiAkhir >= 75;
                  const namaSiswa = row.nama || row.nama_lengkap || `Peserta #${row.user_id}`;
                  const techId = row.tech_id || `DCC25-000${row.user_id}`;

                  return (
                    <div key={idx} className="p-5 bg-[#0d1527]/60 border border-slate-800/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="text-xs font-display font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-xl shrink-0">
                          #{idx + 1}
                        </span>

                        <div className="space-y-1 min-w-[200px]">
                          <h3 className="text-sm font-display font-bold text-white truncate">{namaSiswa}</h3>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-cyan-400 inline" /> TechID: <span className="text-slate-200 font-semibold">{techId}</span>
                          </p>
                        </div>

                        <div className="w-24 shrink-0 hidden sm:block">
                          <Badge variant={isLulus ? 'primary' : 'secondary'} className="text-[10px] font-display font-bold px-2.5 py-1 rounded-md uppercase text-center w-full block">
                            {isLulus ? 'LULUS' : 'REMIDI'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/40">
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-display uppercase">Nilai PG</p>
                            <p className="text-xs font-display font-bold text-slate-200">{row.nilai_pg || 0}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-display uppercase">Nilai Praktik</p>
                            <p className="text-xs font-display font-bold text-slate-200">{row.nilai_praktik || 0}</p>
                          </div>

                          <div className="text-right pl-4 border-l border-slate-800/60">
                            <p className="text-[10px] text-cyan-400 font-display uppercase font-bold">Nilai Akhir</p>
                            <p className="text-base font-display font-bold text-emerald-400">{nilaiAkhir}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}