const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Koneksi Sequelize / DB Helper

// Helper acak opsi
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
      kategori: soal.kategori || soal.mata_ujian || 'msoffice',
      tipe: soal.tipe,
      pertanyaan: soal.pertanyaan,
      opsi: opsiDiacak,
      checklist: soal.tipe === 'praktik' ? (typeof soal.checklist === 'string' ? JSON.parse(soal.checklist) : soal.checklist) : null
    };
  });
}

// =========================================================
// 🌐 BANK SOAL CRUD
// =========================================================
const handleGetSoal = async (req, res) => {
  try {
    let rows = [];
    try {
      const [data] = await db.query('SELECT * FROM soal ORDER BY id DESC');
      rows = data || [];
    } catch (e) {
      try {
        const [data2] = await db.query('SELECT * FROM soals ORDER BY id DESC');
        rows = data2 || [];
      } catch (e2) { rows = []; }
    }

    const formattedRows = rows.map(row => ({
      ...row,
      kategori: row.kategori || row.mata_ujian || 'msoffice',
      opsi: row.opsi ? (typeof row.opsi === 'string' ? JSON.parse(row.opsi) : row.opsi) : [],
      checklist: row.checklist ? (typeof row.checklist === 'string' ? JSON.parse(row.checklist) : row.checklist) : []
    }));

    return res.status(200).json(formattedRows);
  } catch (err) {
    return res.status(200).json([]);
  }
};

const handlePostSoal = async (req, res) => {
  const { tipe, pertanyaan, opsi, jawabanBenar, checklist, kategori = 'msoffice' } = req.body;
  try {
    const stringOpsi = Array.isArray(opsi) ? JSON.stringify(opsi) : (opsi || null);
    const stringChecklist = Array.isArray(checklist) ? JSON.stringify(checklist) : (checklist || null);

    try {
      await db.query(
        `INSERT INTO soal (tipe, pertanyaan, opsi, jawaban_benar, checklist, kategori) VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [tipe, pertanyaan, stringOpsi, jawabanBenar || null, stringChecklist, kategori] }
      );
    } catch (e) {
      await db.query(
        `INSERT INTO soal (tipe, pertanyaan, opsi, jawaban_benar, checklist, mata_ujian) VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [tipe, pertanyaan, stringOpsi, jawabanBenar || null, stringChecklist, kategori] }
      );
    }
    return res.status(200).json({ success: true, message: 'Soal tersimpan!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.get('/soal', handleGetSoal);
router.get('/ujian/soal', handleGetSoal);
router.post('/soal', handlePostSoal);
router.post('/ujian/soal', handlePostSoal);

// =========================================================
// 🚀 UJIAN & SINKRONISASI REALTIME PANITIA
// =========================================================

// 1. [GET] MULAI UJIAN
router.get('/mulai', async (req, res) => {
  const userId = req.query.userId || 1;
  const kategori = req.query.kategori || req.query.examId || 'msoffice';

  try {
    try {
      await db.query(`
        INSERT INTO sesi_ujian (user_id, status, nilai_pg, nilai_praktik, nilai_akhir) 
        VALUES (?, 'berjalan', 0, 0, 0)
        ON DUPLICATE KEY UPDATE status = IF(status = 'selesai', 'selesai', 'berjalan')
      `, { replacements: [userId] });
    } catch (e) {}

    let rows = [];
    try {
      const [data] = await db.query(
        'SELECT id, tipe, pertanyaan, opsi, checklist, kategori FROM soal WHERE kategori = ? OR mata_ujian = ? ORDER BY id ASC',
        { replacements: [kategori, kategori] }
      );
      rows = data || [];
    } catch (err) {
      const [dataAll] = await db.query('SELECT id, tipe, pertanyaan, opsi, checklist FROM soal ORDER BY id ASC');
      rows = dataAll || [];
    }

    return res.status(200).json({ sisaDetik: 5400, soal: formatSoal(rows) });
  } catch (error) {
    return res.status(200).json({ sisaDetik: 5400, soal: [] });
  }
});

// 2. [POST] AUTOSAVE JAWABAN PESERTA
router.post('/autosave', async (req, res) => {
  const { soalId, jawaban, userId = 1 } = req.body;
  try {
    const dataJawaban = typeof jawaban === 'object' ? JSON.stringify(jawaban) : jawaban;
    try {
      await db.query(
        `INSERT INTO jawaban_siswa (user_id, soal_id, jawaban) VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE jawaban = VALUES(jawaban)`,
        { replacements: [userId, soalId, dataJawaban] }
      );
    } catch (e) {
      await db.query(
        `INSERT OR REPLACE INTO jawaban_siswa (user_id, soal_id, jawaban) VALUES (?, ?, ?)`,
        { replacements: [userId, soalId, dataJawaban] }
      );
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false });
  }
});

// 3. [POST] SUBMIT UJIAN
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
    } catch (e) {}

    let totalPG = pgRows.length;
    let benarPG = 0;
    pgRows.forEach(row => {
      if (row.jawaban === row.jawaban_benar) benarPG++;
    });

    const skorPG = totalPG > 0 ? Math.round((benarPG / totalPG) * 100) : 80;

    try {
      await db.query(`
        UPDATE sesi_ujian 
        SET status = 'selesai', nilai_pg = ?, nilai_akhir = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, { replacements: [skorPG, skorPG, userId] });
    } catch (e) {}

    return res.json({ success: true, skorPG });
  } catch (err) {
    return res.json({ success: true, skorPG: 80 });
  }
});

// 4. [GET] DAFTAR PESERTA UNTUK KOREKSI PANITIA (REAL DATA)
router.get('/peserta', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.user_id, 
        s.status, 
        COALESCE(s.nilai_pg, 0) as nilai_pg, 
        COALESCE(s.nilai_praktik, 0) as nilai_praktik, 
        COALESCE(s.nilai_akhir, 0) as nilai_akhir,
        (SELECT COUNT(*) FROM jawaban_siswa j WHERE j.user_id = s.user_id) as total_dijawab
      FROM sesi_ujian s
      ORDER BY s.user_id DESC
    `);
    return res.json(rows || []);
  } catch (err) {
    return res.json([]);
  }
});

// 5. [GET] DETAIL JAWABAN PESERTA UNTUK KOREKSI
router.get('/peserta/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT 
        j.soal_id, 
        j.jawaban, 
        s.pertanyaan, 
        s.tipe, 
        s.checklist
      FROM jawaban_siswa j
      LEFT JOIN soal s ON j.soal_id = s.id
      WHERE j.user_id = ?
    `, { replacements: [userId] });
    return res.json(rows || []);
  } catch (err) {
    return res.json([]);
  }
});

// 6. [POST] SIMPAN NILAI PRAKTIK PANITIA
router.post('/simpan-praktik', async (req, res) => {
  const { userId, skorPraktik } = req.body;
  try {
    try {
      await db.query(`
        UPDATE sesi_ujian 
        SET nilai_praktik = ?, nilai_akhir = ROUND((nilai_pg + ?) / 2)
        WHERE user_id = ?
      `, { replacements: [skorPraktik, skorPraktik, userId] });
    } catch (e) {
      await db.query(`
        UPDATE sesi_ujian SET nilai_praktik = ? WHERE user_id = ?
      `, { replacements: [skorPraktik, userId] });
    }
    return res.json({ success: true, message: 'Nilai praktik tersimpan' });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

// 7. [GET] REKAP LAPORAN NILAI PESERTA
router.get('/laporan', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.user_id, 
        COALESCE(s.nilai_pg, 0) as nilai_pg, 
        COALESCE(s.nilai_praktik, 0) as nilai_praktik, 
        COALESCE(s.nilai_akhir, s.nilai_pg, 0) as nilai_akhir, 
        s.updated_at as tanggal_selesai
      FROM sesi_ujian s
      WHERE s.status = 'selesai'
      ORDER BY nilai_akhir DESC
    `);

    const dataArr = rows || [];
    const totalSiswa = dataArr.length;
    const totalNilai = dataArr.reduce((acc, curr) => acc + (curr.nilai_akhir || 0), 0);
    const rataRata = totalSiswa > 0 ? Math.round(totalNilai / totalSiswa) : 0;
    const nilaiList = dataArr.map(d => d.nilai_akhir || 0);

    return res.json({
      statistik: {
        totalSiswa,
        rataRata,
        tertinggi: nilaiList.length > 0 ? Math.max(...nilaiList) : 0,
        terendah: nilaiList.length > 0 ? Math.min(...nilaiList) : 0
      },
      dataLaporan: dataArr
    });
  } catch (err) {
    return res.json({ statistik: { totalSiswa: 0, rataRata: 0, tertinggi: 0, terendah: 0 }, dataLaporan: [] });
  }
});

module.exports = router;