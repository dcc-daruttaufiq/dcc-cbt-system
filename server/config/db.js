const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const path = require('path');

let db;
let dbReadyPromise;

function initDB() {
  dbReadyPromise = (async () => {
    try {
      db = await open({
        filename: path.join(__dirname, '../database.db'),
        driver: sqlite3.Database
      });

      // Aktifkan fitur FOREIGN KEY di SQLite
      await db.run('PRAGMA foreign_keys = ON');

      // 1. Tabel users (Akun Induk)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'committee', 'participant')) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Tabel admins
      await db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 3. Tabel participants (Peserta / Siswa)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          nisn TEXT UNIQUE,
          name TEXT NOT NULL,
          class TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 4. Tabel committees (Panitia)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS committees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          position TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 5. Tabel questions (Bank Soal)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT CHECK(type IN ('multiple_choice', 'checklist', 'essay')) NOT NULL,
          text TEXT NOT NULL,
          correct_answer TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 6. Tabel choices (Pilihan Ganda Soal)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS choices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL,
          label TEXT NOT NULL,
          text TEXT NOT NULL,
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        );
      `);

      // 7. Tabel answers (Jawaban Ujian Utama)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_id INTEGER NOT NULL,
          question_id INTEGER NOT NULL,
          choice_id INTEGER,
          essay_text TEXT,
          is_correct INTEGER CHECK(is_correct IN (0, 1)),
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
          FOREIGN KEY (choice_id) REFERENCES choices(id) ON DELETE SET NULL
        );
      `);

      // 8. Tabel practice_answers (Jawaban Latihan)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS practice_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_id INTEGER NOT NULL,
          question_id INTEGER NOT NULL,
          choice_id INTEGER,
          essay_text TEXT,
          is_correct INTEGER CHECK(is_correct IN (0, 1)),
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
          FOREIGN KEY (choice_id) REFERENCES choices(id) ON DELETE SET NULL
        );
      `);

      // 9. Tabel practice_checklists (Jawaban Multi-select Latihan)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS practice_checklists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          practice_answer_id INTEGER NOT NULL,
          choice_id INTEGER NOT NULL,
          FOREIGN KEY (practice_answer_id) REFERENCES practice_answers(id) ON DELETE CASCADE,
          FOREIGN KEY (choice_id) REFERENCES choices(id) ON DELETE CASCADE
        );
      `);

      // 10. Tabel scores (Nilai Akhir)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_id INTEGER NOT NULL,
          total_score REAL NOT NULL,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
        );
      `);

      // 11. Tabel uploads (Log File Multer)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS uploads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          filename TEXT NOT NULL,
          filepath TEXT NOT NULL,
          filetype TEXT NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // 12. Tabel logs (Audit Sistem)
      await db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // ==================== SEEDER OTOMATIS ====================
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // 1. Insert Akun ke tabel users
      const resAdmin = await db.run(`
        INSERT OR IGNORE INTO users (username, password, role)
        VALUES ('admin', ?, 'admin')
      `, [hashedPassword]);

      // 2. Jika akun admin baru dibuat (bukan ignore), buat profilnya di tabel admins
      if (resAdmin.lastID) {
        await db.run(`
          INSERT INTO admins (user_id, name)
          VALUES (?, 'Super Admin DCC')
        `, [resAdmin.lastID]);
      }

      console.log('✨ [DATABASE] Ke-12 tabel & data default berhasil dimigrasi!');
    } catch (err) {
      console.error('❌ Gagal Inisialisasi Database:', err.message);
    }
  })();
}

initDB();

const dbWrapper = {
  query: async (sql, params = []) => {
    await dbReadyPromise;
    if (sql.trim().toUpperCase().startsWith('USE')) return [[]];
    
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      const rows = await db.all(sql, params);
      return [rows || []];
    } else {
      const result = await db.run(sql, params);
      return [result || {}];
    }
  }
};

module.exports = dbWrapper;