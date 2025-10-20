const User = require('../models/User');
const jwt = require('jsonwebtoken');

// =============================================
// 🔹 FUNCIONES AUXILIARES 🔹
// =============================================

/**
 * Firma un token JWT con el ID del usuario.
 */
const signToken = id => {
  return jwt.sign({ id, role: 'user' /* Opcional: añade el rol si lo necesitas */ }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

/**
 * Crea un token, lo envía en la respuesta y limpia los datos del usuario.
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Eliminamos la contraseña del objeto de usuario antes de enviarlo
  const { password, ...userData } = user.toObject();

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: userData
    }
  });
};


// =============================================
// 🔹 CONTROLADORES PRINCIPALES 🔹
// =============================================

/**
 * Registra un nuevo usuario.
 */
exports.register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    // ✅ REFINAMIENTO: Pasamos la contraseña en texto plano.
    // El modelo 'User.js' (con su hook pre-save) se encargará de hashearla automáticamente.
    const newUser = await User.create({
      nombre,
      email,
      password // Pasamos la contraseña sin hashear
    });

    createSendToken(newUser, 201, res);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }
    console.error('Error en register:', error);
    res.status(500).json({ success: false, message: 'Ocurrió un error en el servidor.' });
  }
};

/**
 * Inicia la sesión de un usuario existente.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Por favor, proporciona email y contraseña.' });
    }

    const user = await User.findOne({ email }).select('+password');

    // ✅ REFINAMIENTO: Usamos el método del modelo 'correctPassword' para encapsular la comparación.
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos.' });
    }

    createSendToken(user, 200, res);

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor.', error: error.message });
  }
};