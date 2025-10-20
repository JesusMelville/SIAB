const mongoose = require('mongoose');

const thesisSchema = new mongoose.Schema({
  // Datos básicos
  titulo: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true
  },
  autor: {
    type: String,
    required: [true, 'El autor es obligatorio'],
    trim: true
  },
  anio: {
    type: Number,
    required: [true, 'El año es obligatorio']
  },
  universidad: {
    type: String,
    trim: true
  },
  // Relación con el usuario que la subió
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // Crea una referencia al modelo User
    required: true
  },
  // Resultados del análisis
  calificacionPredicha: {
    type: Number,
    required: true
  },
  categoria: {
    type: String, // 'Excelente', 'Buena', etc.
    required: true
  },
  // Guardamos todos los indicadores calculados para futuras visualizaciones
  indicadores: {
    type: Map,
    of: Number
  },
  // Ruta al archivo PDF guardado (opcional)
  filePath: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Para mejorar el rendimiento de las búsquedas
thesisSchema.index({ user: 1, anio: -1 });

const Thesis = mongoose.model('Thesis', thesisSchema);

module.exports = Thesis;