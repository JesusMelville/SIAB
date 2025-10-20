const express = require('express');
const thesisController = require('../controllers/thesisController');
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Proteger todas las rutas
router.use(authMiddleware.protect);

// Rutas
router.get('/', thesisController.getAllUserTheses);
router.get('/stats', thesisController.getStatistics);
router.get('/:id', thesisController.getThesisById);
router.delete('/:id', thesisController.deleteThesis);
router.get('/:id/download', thesisController.downloadThesisFile);


// Subida y análisis
router.post(
  '/analyze',
  pdfController.uploadThesisFile, // 1. Primero, se ejecuta tu middleware para procesar el archivo.
  thesisController.analyzeThesis  // 2. Si el archivo es válido, se pasa a la lógica principal.
);

module.exports = router;
