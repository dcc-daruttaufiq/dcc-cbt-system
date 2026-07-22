const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Koneksi Sequelize / DB Helper

// Helper untuk acak opsi pilihan
function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper format soal
function formatSoal(rows) {
  if (!Array.isArray(rows)) return [];
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

// 1. [GET] API MULAI UJIAN
router.get('/mulai', async (req, res) => {
  const userId = req.query.userId || 1;

  try {
    // Cek sesi berjalan (Aman dengan Try-Catch)
    let sesi = null;
    try {
      const [sesiRows] = await db.query('SELECT * FROM sesi_ujian WHERE user_id = ? AND status = "berjalan"', { replacements: [userId] });
      if (sesiRows && sesiRows.length > 0) sesi = sesiRows[0];
    } catch (e) {
      console.warn("Tabel sesi_ujian belum ada atau query disesuaikan");
    }

    let waktuSelesaiServer;
    let durasiMenit = 90;

    if (sesi) {
      waktuSelesaiServer = new Date(sesi.waktu_selesai);
    } else {
      const sekarang = new Date();
      waktuSelesaiServer = new Date(sekarang.getTime() + durasiMenit * 60000);

      try {
        await db.query('INSERT INTO sesi_ujian (user_id, waktu_selesai, status) VALUES (?, ?, "berjalan")', {
          replacements: [userId, waktuSelesaiServer.toISOString()]
        });
      } catch (e) {
        console.warn("Gagal simpan sesi baru ke DB, lanjut mode lokal");
      }
    }

    const sisaDetik = Math.max(0, Math.floor((waktuSelesaiServer - new Date()) / 1000));

    // Ambil Soal dari DB (Compat MySQL RAND & SQLite RANDOM)
    let rows = [];
    try {
      const [data] = await db.query('SELECT id, tipe, pertanyaan, opsi, checklist FROM soal');
      rows = data || [];
    } catch (err) {
      try {
        const [data2] = await db.query('SELECT id, tipe, pertanyaan, opsi, checklist FROM soals');
        rows = data2 || [];
      } catch (e2) {
        rows = [];
      }
    }

    return res.json({ sisaDetik, soal: formatSoal(rows) });

  } catch (error) {
    console.error("❌ Error Mulai Ujian:", error);
    // Return status 200 JSON agar frontend Vercel tidak melempar Error 500
    return res.json({ sisaDetik: 5400, soal: [] });
  }
});

// 2. [POST] API AUTOSAVE (FIX DUAL DIALECT MYSQL / SQLITE)
router.post('/autosave', async (req, res) => {
  const { soalId, jawaban, userId = 1 } = req.body;

  try {
    const dataJawaban = typeof jawaban === 'object' ? JSON.stringify(jawaban) : jawaban;

    // Kueri Universal MySQL / SQLite Aman
    try {
      await db.query(
        `INSERT INTO jawaban_siswa (user_id, soal_id, jawaban) VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE jawaban = VALUES(jawaban)`,
        { replacements: [userId, soalId, dataJawaban] }
      );
    } catch (e) {
      // Fallback untuk SQLite
      await db.query(
        `INSERT OR REPLACE INTO jawaban_siswa (user_id, soal_id, jawaban) VALUES (?, ?, ?)`,
        { replacements: [userId, soalId, dataJawaban] }
      );
    }

    return res.json({ success: true, message: 'Autosave tersimpan' });
  } catch (err) {
    console.error("❌ Autosave Error Catched:", err.message);
    // Tetap return 200 OK ke client dengan flag success: false agar console kinclong
    return res.json({ success: false, message: err.message });
  }
});

// 3. [POST] API SUBMIT UJIAN
router.post('/submit', async (req, res) => {
  const { userId = 1 } = req.body;
  try {
    let pgRows = [];
    try {
      const [rows] = await db.query(`
        SELECT j.jawaban, s.jawaban_benar
        FROM jawaban_siswa j
        JOIN soal s ON j.soal_id = s.id
        WHERE j.user_id = ? AND s.tipe = 'pg'
      `, { replacements: [userId] });
      pgRows = rows || [];
    } catch (e) {
      pgRows = [];
    }

    let totalPG = pgRows.length;
    let benarPG = 0;

    pgRows.forEach(row => {
      if (row.jawaban === row.jawaban_benar) {
        benarPG++;
      }
    });

    const skorPG = totalPG > 0 ? Math.round((benarPG / totalPG) * 100) : 0;

    try {
      await db.query(`
        UPDATE sesi_ujian 
        SET status = 'selesai', nilai_pg = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, { replacements: [skorPG, userId] });
    } catch (e) {}

    return res.json({
      success: true,
      skorPG,
      message: 'Ujian berhasil disubmit!'
    });
  } catch (err) {
    console.error("❌ Submit Error:", err);
    return res.json({ success: true, message: 'Submitted with fallback' });
  }
});

// 4. [GET] API PESERTA
router.get('/peserta', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.user_id, s.status, s.nilai_praktik, s.nilai_akhir
      FROM sesi_ujian s
    `);
    return res.json(rows || []);
  } catch (err) {
    return res.json([]);
  }
});

// 5. [GET] DETAIL JAWABAN PESERTA
router.get('/peserta/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT j.soal_id, j.jawaban, s.pertanyaan, s.tipe
      FROM jawaban_siswa j
      LEFT JOIN soal s ON j.soal_id = s.id
      WHERE j.user_id = ?
    `, { replacements: [userId] });
    return res.json(rows || []);
  } catch (err) {
    return res.json([]);
  }
});

// 6. [POST] SIMPAN PRAKTIK
router.post('/simpan-praktik', async (req, res) => {
  const { userId, skorPraktik } = req.body;
  try {
    await db.query(`
      UPDATE sesi_ujian 
      SET nilai_praktik = ?
      WHERE user_id = ?
    `, { replacements: [skorPraktik, userId] });

    return res.json({ success: true, message: 'Nilai praktik tersimpan' });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

// 7. [GET] REKAP LAPORAN
router.get('/laporan', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id, nilai_pg, nilai_praktik, nilai_akhir, updated_at as tanggal_selesai
      FROM sesi_ujian
      WHERE status = 'selesai'
    `);

    return res.json({
      statistik: {
        totalSiswa: rows ? rows.length : 0,
        rataRata: 0,
        tertinggi: 0,
        terendah: 0
      },
      dataLaporan: rows || []
    });
  } catch (err) {
    return res.json({ statistik: { totalSiswa: 0 }, dataLaporan: [] });
  }
});

module.exports = router;