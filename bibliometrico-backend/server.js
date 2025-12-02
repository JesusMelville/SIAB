// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();

// 🔹 Conexión a MongoDB (usa process.env.MONGO_URI)
connectDB();

const app = express();

// 1) CORS: permitir frontend local y frontend en Render
const FRONTEND_URL = process.env.FRONTEND_URL; // ej: https://siab-frontend.onrender.com

const allowedOrigins = [
  'http://localhost:4200', // Angular en tu PC
];

if (FRONTEND_URL) {
  allowedOrigins.push(FRONTEND_URL);
  console.log('✅ FRONTEND_URL permitido en CORS:', FRONTEND_URL);
} else {
  console.warn('⚠️ FRONTEND_URL no definido. Solo se permite http://localhost:4200 en CORS.');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // permitir herramientas tipo Postman (sin origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn('🚫 Origen no permitido por CORS:', origin);
      return callback(new Error('Origen no permitido por CORS: ' + origin), false);
    },
    credentials: true,
  })
);

// 2) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) Archivos subidos (PDF de tesis)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4) Rutas API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tesis', require('./routes/thesisRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 5) Ruta raíz simple (ya NO sirve frontend aquí)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'API SIAB funcionando 🚀',
    env: process.env.NODE_ENV || 'development',
  });
});

// 6) 404 SOLO para rutas de API (después de montar las rutas)
app.use('/api/*', (req, res) => {
  return res
    .status(404)
    .json({ message: `Ruta API no encontrada: ${req.originalUrl}` });
});

// 7) Manejador global de errores
app.use((err, req, res, next) => {
  console.error('❌ ERROR INTERNO DEL SERVIDOR:', err.stack || err);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

// 8) Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
