const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const soalRoutes = require('./routes/soalRoutes');
const ujianRoutes = require('./routes/ujianRoutes'); // <--- 1. Import router ujian baru
const upload = require('./middleware/uploadMiddleware');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Sajikan folder uploads statis agar berkas praktik bisa diakses lewat URL jika diperlukan
app.use('/uploads', express.static('uploads'));

// REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/soal', soalRoutes);
app.use('/api/ujian', ujianRoutes); // <--- 2. Daftarkan endpoint engine ujian ke aplikasi

// Endpoint khusus upload file jawaban praktik dari siswa
app.post('/api/upload-praktik', upload.single('file_praktik'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Gagal mengunggah berkas' });
  res.json({ message: 'Berkas berhasil diupload', filename: req.file.filename });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server DCC-CBT Secure Core berjalan di port ${PORT}`);
});