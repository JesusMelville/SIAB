const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');

// Middleware para proteger rutas (verifica que el usuario esté logueado)
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'No estás autenticado. Por favor, inicia sesión.' });
    }

    // 2) Verificar el token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Comprobar si el usuario todavía existe
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ message: 'El usuario de este token ya no existe.' });
    }

    // ¡AÑADIR EL USUARIO A LA PETICIÓN!
    // Esto es crucial para que el siguiente middleware pueda usarlo.
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

// --- NUEVO: Middleware para restringir acceso por rol ---
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles es un array, ej. ['admin'].
    // req.user viene del middleware 'protect' anterior.
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
    }
    next();
  };
};