const SoalModel = require('../models/soalModel');

const soalController = {
  getSoal: async (req, res) => {
    try {
      const data = await SoalModel.getAll();
      const formatData = data.map(item => ({
        ...item,
        opsi: typeof item.opsi === 'string' ? JSON.parse(item.opsi) : item.opsi,
        checklist: typeof item.checklist === 'string' ? JSON.parse(item.checklist) : item.checklist
      }));
      res.json(formatData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createSoal: async (req, res) => {
    const { tipe, pertanyaan, opsi, jawabanBenar, checklist } = req.body;
    try {
      const id = await SoalModel.create(tipe, pertanyaan, opsi || [], jawabanBenar || '', checklist || []);
      res.status(201).json({ message: 'Soal berhasil ditambahkan', id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateSoal: async (req, res) => {
    const { id } = req.params;
    const { tipe, pertanyaan, opsi, jawabanBenar, checklist } = req.body;
    try {
      await SoalModel.update(id, tipe, pertanyaan, opsi || [], jawabanBenar || '', checklist || []);
      res.json({ message: 'Soal berhasil diperbarui' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteSoal: async (req, res) => {
    const { id } = req.params;
    try {
      await SoalModel.delete(id);
      res.json({ message: 'Soal berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = soalController;