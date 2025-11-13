// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// 1) CORS: Angular corre en 4200
app.use(
  cors({
    origin: 'http://localhost:4200',
    credentials: true, // por si luego usas cookies
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

// 5) (Opcional) servir frontend en prod
if (process.env.NODE_ENV === 'production') {
  const angularDistPath = path.join(__dirname, '..', 'frontend', 'dist', 'browser');
  app.use(express.static(angularDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(angularDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Servidor de API corriendo en modo de desarrollo.');
  });
}

// 6) 404 SOLO para rutas de API (después de montar las rutas)
app.use('/api/*', (req, res) => {
  return res
    .status(404)
    .json({ message: `Ruta API no encontrada: ${req.originalUrl}` });
});

// 7) Manejador global de errores
app.use((err, req, res, next) => {
  console.error('❌ ERROR INTERNO DEL SERVIDOR:', err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

// 8) Iniciar
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
