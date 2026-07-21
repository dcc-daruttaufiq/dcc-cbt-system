const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) {
    return res.status(403).json({ message: 'Akses ditolak, token tidak ditemukan!' });
  }

  try {
    const secretKey = process.env.JWT_SECRET || 'SUPER_RAHASIA_CBT_DCC';
    const verified = jwt.verify(token, secretKey);
    req.user = verified; // Menyimpan data user (id, role, name) ke request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa!' });
  }
};

// Middleware opsional untuk batasi hak akses role tertentu
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk menu ini!' });
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRoles };