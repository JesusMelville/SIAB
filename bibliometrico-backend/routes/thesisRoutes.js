// routes/thesisRoutes.js
const express = require('express');
const router = express.Router();

const {
  analyzeThesis,
  getAllUserTheses,
  getThesisById,
  getStatistics,
  deleteThesis,
  downloadThesisFile,
} = require('../controllers/thesisController');

const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// carpeta uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

// ANALIZAR (con PDF)  👉 el front envía `file`
router.post('/analyze', protect, upload.single('file'), analyzeThesis);

// LISTAR MIS TESIS
router.get('/mine', protect, getAllUserTheses);

// UNA TESIS
router.get('/:id', protect, getThesisById);

// ESTADÍSTICAS
router.get('/me/stats', protect, getStatistics);

// DESCARGAR PDF
router.get('/:id/download', protect, downloadThesisFile);

// ELIMINAR
router.delete('/:id', protect, deleteThesis);

module.exports = router;
