const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ML_URL = process.env.ML_URL || 'http://localhost:5000/predict';

// subo 2 niveles: services -> backend -> raíz del proyecto
const modelColsPath = path.join(
  __dirname,
  '..',        // bibliometrico-backend
  '..',        // Sistema de analisis bibliometrico
  'ml-service',
  'Static',
  'model_columns.json'
);

let MODEL_COLUMNS = [];
try {
  const raw = fs.readFileSync(modelColsPath, 'utf-8');
  MODEL_COLUMNS = JSON.parse(raw);
  console.log('✓ Columnas ML cargadas:', MODEL_COLUMNS.length);
} catch (err) {
  console.error('✗ No se pudieron cargar columnas ML:', err.message);
  MODEL_COLUMNS = [];
}

async function getPrediction(indicadores = {}) {
  const payload = {};
  MODEL_COLUMNS.forEach((col) => {
    payload[col] = indicadores[col] ?? 0;
  });

  const { data } = await axios.post(ML_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  return data.calificacion_predicha ?? null;
}

module.exports = {
  getPrediction,
  MODEL_COLUMNS,
};
