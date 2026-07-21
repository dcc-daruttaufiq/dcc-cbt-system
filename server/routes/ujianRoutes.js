const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Hubungkan ke koneksi DB lu (Sequelize / SQLite)

// Buat tabel otomatis jika belum ada
db.query(`CREATE TABLE IF NOT EXISTS sesi_ujian (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  waktu_selesai TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'berjalan',
  nilai_pg INTEGER DEFAULT 0,
  nilai_praktik INTEGER DEFAULT 0,
  nilai_akhir INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).catch(err => console.error("Gagal buat tabel sesi_ujian:", err.message));

db.query(`CREATE TABLE IF NOT EXISTS jawaban_siswa (
  user_id INTEGER NOT NULL,
  soal_id INTEGER NOT NULL,
  jawaban TEXT,
  PRIMARY KEY (user_id, soal_id)
)`).catch(err => console.error("Gagal buat tabel jawaban_siswa:", err.message));

// Fungsi pembantu untuk mengacak pilihan jawaban (Random Pilihan)
function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper untuk format dan acak opsi soal
function formatSoal(rows) {
  return rows.map(soal => {
    let opsiDiacak = [];
    if (soal.tipe === 'pg' && soal.opsi) {
      try {
        const opsiArray = typeof soal.opsi === 'string' ? JSON.parse(soal.opsi) : soal.opsi;
        opsiDiacak = shuffleArray(opsiArray);
      } catch (e) {
        opsiDiacak = [];
      }
    }
    return {
      id: soal.id,
      tipe: soal.tipe,
      pertanyaan: soal.pertanyaan,
      opsi: opsiDiacak,
      checklist: soal.tipe === 'praktik' ? (typeof soal.checklist === 'string' ? JSON.parse(soal.checklist) : soal.checklist) : null
    };
  });
}

// 1. [GET] API MULAI UJIAN, RANDOM SOAL, RANDOM PILIHAN, TIMER SERVER & RESUME EXAM
router.get('/mulai', async (req, res) => {
  const userId = req.query.userId || 1; 

  try {
    const [sesiRows] = await db.query('SELECT * FROM sesi_ujian WHERE user_id = ? AND status = "berjalan"', { replacements: [userId] });
    const sesi = sesiRows[0];

    let waktuSelesaiServer;
    let durasiMenit = 90; 

    if (sesi) {
      waktuSelesaiServer = new Date(sesi.waktu_selesai);
    } else {
      const sekarang = new Date();
      waktuSelesaiServer = new Date(sekarang.getTime() + durasiMenit * 60000);

      await db.query('INSERT INTO sesi_ujian (user_id, waktu_selesai, status) VALUES (?, ?, "berjalan")', {
        replacements: [userId, waktuSelesaiServer.toISOString()]
      });
    }

    const sisaDetik = Math.max(0, Math.floor((waktuSelesaiServer - new Date()) / 1000));

    if (sisaDetik <= 0) {
      await db.query('UPDATE sesi_ujian SET status = "selesai" WHERE user_id = ? AND status = "berjalan"', { replacements: [userId] });
      return res.status(400).json({ message: 'Waktu ujian telah habis!', sisaDetik: 0 });
    }

    try {
      const [rows] = await db.query('SELECT id, tipe, pertanyaan, opsi, checklist FROM soal ORDER BY RANDOM()');
      res.json({ sisaDetik, soal: formatSoal(rows) });
    } catch (err) {
      const [rows2] = await db.query('SELECT id, tipe, pertanyaan, opsi, checklist FROM soals ORDER BY RANDOM()');
      res.json({ sisaDetik, soal: formatSoal(rows2) });
    }

  } catch (error) {
    res.status(500).json({ message: 'Database error sesi: ' + error.message });
  }
});

// 2. [POST] API AUTOSAVE (Dipanggil saat siswa menjawab soal PG / Praktik)
router.post('/autosave', async (req, res) => {
  const { soalId, jawaban, userId = 1 } = req.body; 

  try {
    const [sesiRows] = await db.query('SELECT status FROM sesi_ujian WHERE user_id = ? AND status = "berjalan"', { replacements: [userId] });
    if (sesiRows.length === 0) return res.status(403).json({ message: 'Ujian tidak aktif.' });

    const dataJawaban = typeof jawaban === 'object' ? JSON.stringify(jawaban) : jawaban;

    await db.query(`INSERT OR REPLACE INTO jawaban_siswa (user_id, soal_id, jawaban) VALUES (?, ?, ?)`, {
      replacements: [userId, soalId, dataJawaban]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Gagal autosave: ' + err.message });
  }
});

// 3. [POST] API SUBMIT UJIAN (Instan Kalkulasi Nilai PG + Praktik saat Siswa Selesai)
router.post('/submit', async (req, res) => {
  const { userId = 1 } = req.body;
  try {
    // 1. Auto hitung jawaban PG yang tersimpan di DB
    let pgRows = [];
    try {
      const [rows] = await db.query(`
        SELECT j.jawaban, s.jawaban_benar
        FROM jawaban_siswa j
        JOIN soal s ON j.soal_id = s.id
        WHERE j.user_id = ? AND s.tipe = 'pg'
      `, { replacements: [userId] });
      pgRows = rows;
    } catch (e) {
      const [rows2] = await db.query(`
        SELECT j.jawaban, s.jawaban_benar
        FROM jawaban_siswa j
        JOIN soals s ON j.soal_id = s.id
        WHERE j.user_id = ? AND s.tipe = 'pg'
      `, { replacements: [userId] });
      pgRows = rows2;
    }

    let totalPG = pgRows.length;
    let benarPG = 0;

    pgRows.forEach(row => {
      if (row.jawaban === row.jawaban_benar) {
        benarPG++;
      }
    });

    const skorPG = totalPG > 0 ? Math.round((benarPG / totalPG) * 100) : 0;

    // 2. Ambil nilai praktik yang sudah dikoreksi Panitia sebelumnya (default 0 jika belum dikoreksi)
    const [sesiRows] = await db.query('SELECT nilai_praktik FROM sesi_ujian WHERE user_id = ?', { replacements: [userId] });
    const skorPraktik = sesiRows[0]?.nilai_praktik || 0;

    // 3. Hitung Nilai Akhir (Bobot: PG 40% + Praktik 60%)
    const bobotPG = 0.4;
    const bobotPraktik = 0.6;
    const nilaiAkhir = Math.round((skorPG * bobotPG) + (skorPraktik * bobotPraktik));

    // 4. Update status ujian menjadi 'selesai' dan simpan nilai
    await db.query(`
      UPDATE sesi_ujian 
      SET status = 'selesai', nilai_pg = ?, nilai_akhir = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, { replacements: [skorPG, nilaiAkhir, userId] });

    res.json({
      success: true,
      skorPG,
      skorPraktik,
      nilaiAkhir,
      message: 'Ujian berhasil disubmit dan nilai langsung dikalkulasi!'
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal submit ujian: ' + err.message });
  }
});

// 4. [GET] API DAFTAR PESERTA UJIAN (Menampilkan Semua Peserta untuk Panitia)
router.get('/peserta', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.user_id, s.status, s.nilai_praktik, s.nilai_akhir,
             COUNT(j.soal_id) as total_dijawab
      FROM sesi_ujian s
      LEFT JOIN jawaban_siswa j ON s.user_id = j.user_id
      GROUP BY s.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data peserta: ' + err.message });
  }
});

// 5. [GET] API DETAIL JAWABAN SISWA (Untuk Koreksi Panitia)
router.get('/peserta/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    let jawabanRows = [];
    try {
      const [rows] = await db.query(`
        SELECT j.soal_id, j.jawaban, s.pertanyaan, s.tipe, s.opsi, s.checklist, s.jawaban_benar
        FROM jawaban_siswa j
        JOIN soal s ON j.soal_id = s.id
        WHERE j.user_id = ?
      `, { replacements: [userId] });
      jawabanRows = rows;
    } catch (e) {
      const [rows2] = await db.query(`
        SELECT j.soal_id, j.jawaban, s.pertanyaan, s.tipe, s.opsi, s.checklist, s.jawaban_benar
        FROM jawaban_siswa j
        JOIN soals s ON j.soal_id = s.id
        WHERE j.user_id = ?
      `, { replacements: [userId] });
      jawabanRows = rows2;
    }

    res.json(jawabanRows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil detail jawaban.' });
  }
});

// 6. [POST] API PANITIA SIMPAN SKOR PRAKTIK (Bisa Langsung Diisi Panitia Tanpa Nunggu Submit)
router.post('/simpan-praktik', async (req, res) => {
  const { userId, skorPraktik } = req.body; 

  try {
    // Ambil nilai PG jika siswa sudah selesai, lalu update nilai akhir sekalian
    const [sesiRows] = await db.query('SELECT nilai_pg, status FROM sesi_ujian WHERE user_id = ?', { replacements: [userId] });
    const nilaiPG = sesiRows[0]?.nilai_pg || 0;
    const nilaiAkhir = Math.round((nilaiPG * 0.4) + (skorPraktik * 0.6));

    await db.query(`
      UPDATE sesi_ujian 
      SET nilai_praktik = ?, nilai_akhir = ? 
      WHERE user_id = ?
    `, { replacements: [skorPraktik, nilaiAkhir, userId] });

    res.json({
      success: true,
      skorPraktik,
      nilaiAkhir,
      message: 'Nilai praktik berhasil disimpan!'
    });

  } catch (err) {
    res.status(500).json({ message: 'Gagal menyimpan nilai praktik: ' + err.message });
  }
});

// 7. [GET] API REKAP LAPORAN, RANKING, DAN STATISTIK
router.get('/laporan', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.user_id, 
        s.nilai_pg, 
        s.nilai_praktik, 
        s.nilai_akhir, 
        s.updated_at as tanggal_selesai
      FROM sesi_ujian s
      WHERE s.status = 'selesai'
      ORDER BY s.nilai_akhir DESC
    `);

    const totalSiswa = rows.length;
    let totalNilai = 0;
    let tertinggi = 0;
    let terendah = totalSiswa > 0 ? 100 : 0;

    rows.forEach(r => {
      const skor = r.nilai_akhir || 0;
      totalNilai += skor;
      if (skor > tertinggi) tertinggi = skor;
      if (skor < terendah) terendah = skor;
    });

    const rataRata = totalSiswa > 0 ? Math.round(totalNilai / totalSiswa) : 0;

    res.json({
      statistik: {
        totalSiswa,
        rataRata,
        tertinggi,
        terendah
      },
      dataLaporan: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal memuat data laporan: ' + err.message });
  }
});

module.exports = router;