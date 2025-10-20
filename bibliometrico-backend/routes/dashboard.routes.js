// src/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // middleware JWT
const User = require('../models/user.model');

// Ruta protegida: obtener datos del dashboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    // req.user viene del middleware (id y rol)
    const user = await User.findById(req.user.id).select('-password'); // excluye contraseña
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      message: `Bienvenido ${user.nombre}`,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error('Error al obtener datos del dashboard:', err);
    res.status(500).json({ message: 'Error al obtener datos del dashboard' });
  }
});

module.exports = router;
