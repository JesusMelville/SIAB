const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 🔹 APLICAR MIDDLEWARE DE PROTECCIÓN Y AUTORIZACIÓN A TODAS LAS RUTAS DE ADMIN 🔹
router.use(authMiddleware.protect, authMiddleware.restrictTo('admin'));

// --- Rutas del Dashboard ---
router.get('/stats', adminController.getDashboardStats);
router.get('/activity', adminController.getRecentActivity);

// --- Rutas de Gestión de Usuarios ---
router.route('/users')
  .get(adminController.getAllUsers);

router.route('/users/:id')
  .patch(adminController.updateUser)
  .delete(adminController.deleteUser);


module.exports = router;