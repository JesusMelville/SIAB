// services/mlService.js
const axios = require('axios');

const ML_API_URL = process.env.ML_URL || 'http://localhost:5000/predict';

exports.getPrediction = async (data) => {
  try {
    console.log("🚀 Enviando datos al servicio de ML...");

    // Enviamos al Flask solo los datos que importan (seguridad + consistencia)
    const response = await axios.post(ML_API_URL, data, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      timeout: 10000, // 10 segundos de timeout
    });

    // Verificamos el contenido de la respuesta
    if (!response.data) {
      console.warn("⚠️ Respuesta vacía desde el modelo ML.");
      return null;
    }

    // Soportamos ambos nombres por compatibilidad
    const calificacion =
      response.data.calificacion_predicha ??
      response.data.calificacion ??
      null;

    if (calificacion === null || isNaN(parseFloat(calificacion))) {
      console.warn("⚠️ El modelo ML no devolvió una calificación válida:", response.data);
      return null;
    }

    const valorNumerico = parseFloat(calificacion);
    console.log("🎯 Calificación recibida desde el modelo ML:", valorNumerico);

    return valorNumerico;
  } catch (error) {
    console.error("❌ Error al obtener predicción del modelo ML:", error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error("🚫 No se pudo conectar con el servicio Flask en:", ML_API_URL);
    } else if (error.response) {
      console.error("📡 Respuesta del servidor Flask:", error.response.data);
    } else if (error.request) {
      console.error("⏳ No hubo respuesta del servidor Flask (timeout o conexión).");
    }

    return null;
  }
};
