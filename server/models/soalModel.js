const db = require('../config/db');

const SoalModel = {
  getAll: async () => {
    // Diganti dari db.execute menjadi db.query
    const [rows] = await db.query('SELECT * FROM bank_soal');
    return rows || [];
  },

  create: async (tipe, pertanyaan, opsi, jawabanBenar, checklist) => {
    // Diganti menjadi db.query dan kolom disesuaikan untuk SQLite
    const [result] = await db.query(
      'INSERT INTO bank_soal (tipe, pertanyaan, opsi, jawaban_benar, checklist) VALUES (?, ?, ?, ?, ?)',
      [tipe, pertanyaan, JSON.stringify(opsi), jawabanBenar, JSON.stringify(checklist)]
    );
    // Di SQLite memakai lastID, bukan insertId
    return result ? result.lastID : null;
  },

  update: async (id, tipe, pertanyaan, opsi, jawabanBenar, checklist) => {
    // Diganti dari db.execute menjadi db.query
    await db.query(
      'UPDATE bank_soal SET tipe = ?, pertanyaan = ?, opsi = ?, jawaban_benar = ?, checklist = ? WHERE id = ?',
      [tipe, pertanyaan, JSON.stringify(opsi), jawabanBenar, JSON.stringify(checklist), id]
    );
  },

  delete: async (id) => {
    // Diganti dari db.execute menjadi db.query
    await db.query('DELETE FROM bank_soal WHERE id = ?', [id]);
  }
};

module.exports = SoalModel;