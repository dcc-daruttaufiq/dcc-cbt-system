import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../utils/supabaseClient';
import { normalizeKategori, getLabelKategori } from '../utils/examCategories';
import { STORAGE_KEYS } from '../utils/storageKeys';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { BarChart3, Download, FileText, Trophy, Users, Award, TrendingUp, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Laporan() {
  const [laporan, setLaporan] = useState({
    statistik: { totalSiswa: 0, rataRata: 0, tertinggi: 0, terendah: 0 },
    dataLaporan: []
  });
  const [katalogMapel, setKatalogMapel] = useState([]);

  const menuPengawas = [
    { label: 'Koreksi Ujian', path: '/dashboard-Pengawas', icon: '📊' },
    { label: 'Repositori Soal', path: '/bank-soal', icon: '📚' },
    { label: 'Pengaturan Ujian', path: '/pengaturan-ujian', icon: '⚙️' },
    { label: 'Laporan Nilai', path: '/laporan', icon: '📈' },
  ];

  // Helper Ambil KKM Dinamis per Mata Ujian (Fallback Default: 75)
  const getKkmMataUjian = (katId, katalogList) => {
    const cleanKat = normalizeKategori(katId);
    const matchedKat = katalogList.find(m => m.id === cleanKat);
    return matchedKat?.kkm !== undefined && matchedKat?.kkm !== null ? Number(matchedKat.kkm) : 75;
  };

  // Helper Hitung Nilai Akhir Sesuai Bobot Katalog
  const calculateNilaiAkhirSmart = (pesertaItem, katalogList) => {
    const katId = normalizeKategori(pesertaItem.kategori);
    const matchedKat = katalogList.find(m => m.id === katId);

    const nilaiPG = pesertaItem.nilai_pg !== undefined && pesertaItem.nilai_pg !== null ? Number(pesertaItem.nilai_pg) : 0;
    const nilaiPraktik = pesertaItem.nilai_praktik !== undefined && pesertaItem.nilai_praktik !== null ? Number(pesertaItem.nilai_praktik) : null;

    // Jika nilai_akhir sudah tersimpan dari proses koreksi, prioritaskan nilai tersebut
    if (pesertaItem.nilai_akhir !== undefined && pesertaItem.nilai_akhir !== null && Number(pesertaItem.nilai_akhir) > 0) {
      return Number(pesertaItem.nilai_akhir);
    }

    // Jika belum dikoreksi praktiknya, gunakan 100% Nilai PG sebagai nilai sementara
    if (nilaiPraktik === null) {
      return nilaiPG;
    }

    // Hitung berdasarkan bobot katalog jika ada nilai praktik
    const bobotPG = matchedKat?.bobot_pg !== undefined ? Number(matchedKat.bobot_pg) : 50;
    const bobotPraktik = matchedKat?.bobot_praktik !== undefined ? Number(matchedKat.bobot_praktik) : 50;

    return Math.round((nilaiPG * (bobotPG / 100)) + (nilaiPraktik * (bobotPraktik / 100)));
  };

  const fetchLaporan = async () => {
    let dataReal = [];
    let currentKatalog = [];

    // 1. Fetch Katalog Pengaturan Bobot & KKM
    try {
      const { data: dataKat } = await supabase
        .from(TABLES.PENGATURAN_UJIAN || 'pengaturan_ujian')
        .select('*')
        .eq('key', 'katalog_mata_ujian')
        .maybeSingle();

      if (dataKat && dataKat.value) {
        const parsed = typeof dataKat.value === 'string' ? JSON.parse(dataKat.value) : dataKat.value;
        if (Array.isArray(parsed)) {
          currentKatalog = parsed;
          setKatalogMapel(parsed);
        }
      }
    } catch (e) {
      const localKatalog = localStorage.getItem('dcc_katalog_mapel');
      if (localKatalog) {
        try {
          currentKatalog = JSON.parse(localKatalog);
          setKatalogMapel(currentKatalog);
        } catch (err) {}
      }
    }

    // 2. Fetch Data Peserta
    try {
      const { data, error } = await supabase
        .from(TABLES.PESERTA)
        .select('*');

      if (!error && data && data.length > 0) {
        dataReal = data.filter(p => p.status === 'selesai' || Number(p.nilai_akhir) > 0 || Number(p.nilai_pg) > 0);
      }
    } catch (err) {
      console.warn('Gagal fetch dari Supabase Cloud, membaca storage lokal...');
    }

    if (dataReal.length === 0) {
      const localSesi = localStorage.getItem(STORAGE_KEYS.PESERTA) || localStorage.getItem('dcc_sesi_peserta');
      if (localSesi) {
        try {
          const parsed = JSON.parse(localSesi);
          if (Array.isArray(parsed)) {
            dataReal = parsed.filter(p => p.status === 'selesai' || Number(p.nilai_akhir) > 0 || Number(p.nilai_pg) > 0);
          }
        } catch (e) {}
      }
    }

    // Urutkan berdasarkan Nilai Akhir tertinggi ke terendah
    dataReal.sort((a, b) => {
      const skorA = calculateNilaiAkhirSmart(a, currentKatalog);
      const skorB = calculateNilaiAkhirSmart(b, currentKatalog);
      return skorB - skorA;
    });

    const totalSiswa = dataReal.length;
    const totalNilai = dataReal.reduce((acc, curr) => acc + calculateNilaiAkhirSmart(curr, currentKatalog), 0);
    const rataRata = totalSiswa > 0 ? Math.round(totalNilai / totalSiswa) : 0;
    const nilaiList = dataReal.map(d => calculateNilaiAkhirSmart(d, currentKatalog));

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

    const dataExcel = laporan.dataLaporan.map((item, index) => {
      const finalScore = calculateNilaiAkhirSmart(item, katalogMapel);
      const kkmReal = getKkmMataUjian(item.kategori, katalogMapel);
      return {
        'Ranking': index + 1,
        'TechID': item.tech_id || `DCC25-000${item.user_id || index}`,
        'Nama Lengkap': item.nama || item.nama_lengkap || `Peserta #${index + 1}`,
        'Mata Ujian': getLabelKategori(item.kategori),
        'KKM': kkmReal,
        'Nilai PG': item.nilai_pg || 0,
        'Nilai Praktik': item.nilai_praktik !== null && item.nilai_praktik !== undefined ? item.nilai_praktik : 'Belum Dikoreksi',
        'Nilai Akhir': finalScore,
        'Status': finalScore >= kkmReal ? 'LULUS' : 'TIDAK LULUS'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Ujian");
    XLSX.writeFile(workbook, "Rekap_Nilai_CBT_Real.xlsx");
  };

  const handleExportPDF = () => {
    if (laporan.dataLaporan.length === 0) return alert('Belum ada data nilai peserta untuk diexport!');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up diblokir oleh browser. Izinkan pop-up untuk mengunduh PDF.');
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>Laporan Rekapitulasi Hasil Ujian DCC</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; color: #0f172a; }
            p { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #06b6d4; color: #ffffff; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .status-lulus { color: #10b981; font-weight: bold; }
            .status-tidaklulus { color: #f43f5e; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>LAPORAN REKAPITULASI HASIL UJIAN DCC</h2>
          <p>daruttaufiq computer centre</p>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>TechID</th>
                <th>Nama Lengkap</th>
                <th>Mata Ujian</th>
                <th>KKM</th>
                <th>Nilai PG</th>
                <th>Nilai Praktik</th>
                <th>Nilai Akhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;

    laporan.dataLaporan.forEach((item, index) => {
      const skorAkhir = calculateNilaiAkhirSmart(item, katalogMapel);
      const kkmReal = getKkmMataUjian(item.kategori, katalogMapel);
      const isLulus = skorAkhir >= kkmReal;

      htmlContent += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.tech_id || '-'}</td>
          <td>${item.nama || item.nama_lengkap || 'Peserta'}</td>
          <td>${getLabelKategori(item.kategori)}</td>
          <td>${kkmReal}</td>
          <td>${item.nilai_pg || 0}</td>
          <td>${item.nilai_praktik !== null && item.nilai_praktik !== undefined ? item.nilai_praktik : '-'}</td>
          <td><b>${skorAkhir}</b></td>
          <td class="${isLulus ? 'status-lulus' : 'status-tidaklulus'}">${isLulus ? 'LULUS' : 'TIDAK LULUS'}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-sans">
      <Sidebar links={menuPengawas} userRole="Pengawas" />

      <div className="flex-1 flex flex-col min-w-0 font-sans">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-cyan-400 w-5 h-5" />
              <div>
                <h1 className="text-sm font-display font-bold text-white tracking-wide">LAPORAN & RANKING UJIAN</h1>
                <p className="text-[11px] text-slate-400 font-sans">Analitik Realtime Hasil Ujian Peserta</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleExportExcel} className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border-0 font-sans">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
              </Button>
              <Button onClick={handleExportPDF} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs border-0">
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
                  <p className="text-[11px] text-slate-400 uppercase font-semibold font-sans">Total Peserta Selesai</p>
                  <h3 className="text-lg font-display font-bold text-white">{laporan.statistik.totalSiswa} Siswa</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold font-sans">Rata-Rata Nilai</p>
                  <h3 className="text-lg font-display font-bold text-white">{laporan.statistik.rataRata}</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Trophy className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold font-sans">Nilai Tertinggi</p>
                  <h3 className="text-lg font-display font-bold text-emerald-400">{laporan.statistik.tertinggi}</h3>
                </div>
              </div>

              <div className="p-4 bg-[#0d1527]/60 border border-slate-800/60 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl"><Award className="w-5 h-5" /></div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold font-sans">Nilai Terendah</p>
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
                <div className="p-12 text-center text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800 text-xs font-sans">
                  Belum ada peserta yang menyelesaikan ujian.
                </div>
              ) : (
                laporan.dataLaporan.map((row, idx) => {
                  const nilaiAkhir = calculateNilaiAkhirSmart(row, katalogMapel);
                  const kkmReal = getKkmMataUjian(row.kategori, katalogMapel);
                  const isLulus = nilaiAkhir >= kkmReal;

                  const namaSiswa = row.nama || row.nama_lengkap || `Peserta #${idx + 1}`;
                  const techId = row.tech_id || `-`;

                  return (
                    <div key={idx} className="p-5 bg-[#0d1527]/60 border border-slate-800/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="text-xs font-display font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-xl shrink-0">
                          {idx + 1}
                        </span>

                        <div className="space-y-1 min-w-[200px]">
                          <h3 className="text-sm font-display font-bold text-white truncate">{namaSiswa}</h3>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
                            <CreditCard className="w-3 h-3 text-cyan-400 inline" /> TechID: <span className="text-slate-200 font-semibold font-display">{techId}</span>
                          </p>
                        </div>

                        <div className="w-32 shrink-0 hidden sm:block">
                          <Badge className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-md uppercase text-center w-full block border ${
                            isLulus 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}>
                            {isLulus ? 'LULUS' : 'TIDAK LULUS'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/40">
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] text-amber-400 font-display uppercase font-bold">KKM</p>
                            <p className="text-xs font-display font-bold text-amber-400">{kkmReal}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-display uppercase">Nilai PG</p>
                            <p className="text-xs font-display font-bold text-slate-200">{row.nilai_pg || 0}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-display uppercase">Nilai Praktik</p>
                            <p className="text-xs font-display font-bold text-slate-200">
                              {row.nilai_praktik !== null && row.nilai_praktik !== undefined ? row.nilai_praktik : '-'}
                            </p>
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