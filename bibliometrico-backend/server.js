const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// --- 1. CONFIGURACIÓN INICIAL ---
dotenv.config();
connectDB();
const app = express();

// --- 2. MIDDLEWARES ---

// ✅ Configuración de CORS más limpia y segura
// Permite peticiones solo desde el origen de tu frontend.
const corsOptions = {
  origin: 'http://localhost:4200',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middlewares estándar
app.use(express.json()); // Para parsear el body de las peticiones JSON
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Para servir archivos subidos

// --- 3. RUTAS DE LA API ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tesis', require('./routes/thesisRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// --- 4. SERVIR EL FRONTEND EN PRODUCCIÓN ---
// Este bloque solo se ejecuta si el servidor está en modo 'production'
if (process.env.NODE_ENV === 'production') {
  // Define la ruta a la carpeta de build de Angular
  const angularDistPath = path.join(__dirname, '..', 'frontend', 'dist', 'browser'); // Ajusta la ruta a tu build de Angular 17+

  // Sirve los archivos estáticos de Angular (js, css, etc.)
  app.use(express.static(angularDistPath));

  // Para cualquier otra ruta que no sea de la API, devuelve el index.html de Angular.
  // Esto permite que el enrutador de Angular maneje la navegación.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(angularDistPath, 'index.html'));
  });
} else {
  // En desarrollo, simplemente confirmamos que el servidor está corriendo.
  app.get('/', (req, res) => {
    res.send('Servidor de API corriendo en modo de desarrollo.');
  });
}

// --- 5. MANEJO DE ERRORES (debe ir al final) ---
// Captura rutas API no encontradas
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: `Ruta API no encontrada: ${req.originalUrl}` });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('❌ ERROR INTERNO DEL SERVIDOR:', err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor.' });
});

// --- 6. INICIAR EL SERVIDOR ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});