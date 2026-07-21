const db = require('../config/db');

const UserModel = {
  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows && rows.length > 0 ? rows[0] : null;
  }
};

module.exports = UserModel;