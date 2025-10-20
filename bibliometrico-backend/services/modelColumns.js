const fs = require('fs');
const path = require('path');

let columns = [];

try {
  const jsonPath = path.join(__dirname, 'model_columns.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  columns = JSON.parse(rawData);
  console.log(`✓ Columnas del ML cargadas: ${columns.length}`);
} catch (error) {
  console.error('❌ No se pudo cargar model_columns.json:', error.message);
}

module.exports = columns;
