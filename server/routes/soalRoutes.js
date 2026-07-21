const express = require('express');
const router = express.Router();
const soalController = require('../controllers/soalController');

// Pastikan memanggil getSoal, BUKAN getAllSoal
router.get('/', soalController.getSoal); 
router.post('/', soalController.createSoal);
router.put('/:id', soalController.updateSoal);
router.delete('/:id', soalController.deleteSoal);

module.exports = router;