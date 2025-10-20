const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sub-esquema para las recomendaciones
const recommendationSchema = new Schema({
  prioridad: {
    type: String,
    enum: ['Alta', 'Media', 'Baja'],
    required: true
  },
  categoria: {
    type: String,
    required: true
  },
  texto: {
    type: String,
    required: true
  }
}, { _id: false });


const metricsSchema = new Schema({
  // Vínculo con el documento principal de la tesis
  tesisId: {
    type: Schema.Types.ObjectId,
    ref: 'Thesis', // Crea una referencia al modelo Thesis
    required: true,
    unique: true // Solo un documento de métricas por tesis
  },
  fechaAnalisis: {
    type: Date,
    default: Date.now
  },
  // Objeto para los puntajes calculados
  puntajes: {
    citacion: { type: Number, default: 0 },
    metodologia: { type: Number, default: 0 },
    innovacion: { type: Number, default: 0 },
    tecnicas: { type: Number, default: 0 },
    resultados: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 }
  },
  // Objeto para los resultados de la predicción
  prediccionIA: {
    categoria: {
      type: String,
      enum: ['Excelente', 'Buena', 'Regular', 'Deficiente'],
      required: true
    },
    confianza: { type: Number, default: 0 },
    modeloVersion: { type: String, default: '1.0' }
  },
  // Objeto para datos comparativos
  comparativa: {
    promedioUniversidad: { type: Number, default: 0 },
    promedioNacional: { type: Number, default: 0 },
    rankingUniversidad: { type: Number, default: 0 }
  },
  // Arreglo de recomendaciones
  recomendaciones: [recommendationSchema]
});

const Metrics = mongoose.model('Metrics', metricsSchema);

module.exports = Metrics;