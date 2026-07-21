const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const db = require('../config/db'); // Import koneksi untuk switch database

const authController = {
  login: async (req, res) => {
    const { username, password } = req.body;
    
    console.log("📩 DATA LOGIN MASUK:", { username, password });

    try {
      // Pastikan backend menggunakan database dcc_cbt sebelum query running
      await db.query(`USE \`${process.env.DB_NAME}\`;`);

      const user = await UserModel.findByUsername(username);
      if (!user) {
        console.log("❌ USER TIDAK DITEMUKAN DI DB");
        return res.status(404).json({ message: 'User tidak ditemukan' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log("❌ PASSWORD SALAH");
        return res.status(401).json({ message: 'Password salah' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, nama: user.nama },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      console.log("✅ LOGIN SUKSES:", user.nama);
      res.json({ token, role: user.role, nama: user.nama });
    } catch (error) {
      // Ini akan memuntahkan error asli ke terminal backend kamu!
      console.error("🔥 ERROR DATABASE KETEMU:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;