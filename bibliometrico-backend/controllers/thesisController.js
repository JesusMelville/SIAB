const Thesis = require('../models/Thesis');
const Metrics = require('../models/Metrics');
const { getPrediction } = require('../services/mlService');
const pdf = require('pdf-parse');
const mongoose = require('mongoose');
const modelColumns = require('../services/modelColumns'); // columnas para ML

/**
 * Analiza una tesis: extrae metadatos, genera indicadores y llama a ML.
 */
const analyzeThesis = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No se ha subido ningún PDF.' });

    // Extraer texto y metadatos del PDF desde el archivo guardado
    const data = await pdf(req.file.path).catch(err => {
      console.warn('⚠ Advertencia al parsear PDF:', err.message);
      return { text: '', info: {} };
    });

    const texto = data.text?.trim() || '';
    if (texto.length < 10)
      return res.status(400).json({ success: false, message: 'PDF vacío o ilegible.' });

    // 1. Usar los datos del formulario como fuente principal de verdad.
    // El usuario ya los ha verificado en el frontend.
    const { titulo, autor, anio: anioStr } = req.body;
    const anio = Number(anioStr);
    if (!titulo || !autor || !anio || isNaN(anio)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos esenciales (título, autor o año) en la petición.'
      });
    }

    // 2. Generar indicadores para ML (lógica mejorada)
    const indicadores = {};
    const textoMinusculas = texto.toLowerCase();
    modelColumns.forEach(col => {
      const lc = col.toLowerCase();
      let valor = 0; // Valor por defecto

      // --- Lógica de cálculo basada en tu rúbrica ---

      // Indicadores de Citación
      if (lc.includes('antigüedad')) {
        const anioActual = new Date().getFullYear();
        valor = anioActual > 0 ? (anioActual - anio) / anioActual : 0;
      } else if (lc.includes('impacto de revistas')) {
        // Imposible de calcular sin una API externa. Usamos un placeholder.
        valor = 3.0; // Valor promedio/neutro (equivalente a Q3/Q4)
      } else if (lc.includes('citas textuales')) {
        const citasTextuales = (texto.match(/"[^"]{20,}"/g) || []).length; // Citas entre comillas
        const totalCitas = (texto.match(/\([\w\s.,&]+\d{4}\)|\[\d+\]/g) || []).length + citasTextuales;
        valor = totalCitas > 0 ? (citasTextuales / totalCitas) : 0; // PCT = (n° citas textuales) / (n° total de citas)
      } else if (lc.includes('conectores')) {
        const conectores = ['además','por lo tanto','sin embargo','por consiguiente','en conclusión'];
        const totalPalabras = texto.split(/\s+/).length;
        const numConectores = conectores.reduce((acc, c) => acc + (textoMinusculas.split(c).length - 1), 0);
        valor = totalPalabras > 0 ? (numConectores / totalPalabras) : 0; // PCL = (n° conectores) / (n° palabras)
      } else if (lc.includes('parafraseo')) {
        const citasTextuales = (texto.match(/"[^"]{20,}"/g) || []).length;
        const totalCitas = (texto.match(/\([\w\s.,&]+\d{4}\)|\[\d+\]/g) || []).length + citasTextuales;
        const pct = totalCitas > 0 ? (citasTextuales / totalCitas) : 0;
        valor = 1 - pct; // Heurística: % Parafraseo = 1 - % Citas Textuales
      } else if (lc.includes('fuentes')) {
        const seccionReferencias = textoMinusculas.split(/referencias|bibliograf.a|fuentes consultadas|references/)[1];
        const numFuentes = (seccionReferencias?.match(/\[\d+\]|\d+\./g) || []).length;
        // Normalizamos el conteo a un valor entre 0 y 1. Asumimos 100 fuentes como un máximo razonable.
        valor = Math.min(1, numFuentes / 100);

      // Indicadores Metodológicos (búsqueda de palabras clave)
      } else if (lc.includes('tipo de investigación')) {
        if (textoMinusculas.includes('aplicada') || textoMinusculas.includes('tecnológica')) valor = 2; else valor = 1;
      } else if (lc.includes('enfoque')) {
        if (textoMinusculas.includes('mixto')) valor = 3; else if (textoMinusculas.includes('cualitativo')) valor = 2; else valor = 1;
      } else if (lc.includes('nivel (alcance)')) {
        if (textoMinusculas.includes('aplicativo')) valor = 6; else if (textoMinusculas.includes('predictivo')) valor = 5; else if (textoMinusculas.includes('explicativo')) valor = 4; else if (textoMinusculas.includes('correlacional')) valor = 3; else if (textoMinusculas.includes('descriptivo')) valor = 2; else valor = 1;
      } else if (lc.includes('diseño de investigación')) {
        if (textoMinusculas.includes('experimental')) valor = 2; else valor = 1;

      // Otros Indicadores (presencia/ausencia de palabras clave)
      } else if (lc.includes('métricas de rendimiento')) {
        valor = (textoMinusculas.match(/performance|rendimiento|eficiencia/g) || []).length > 0 ? 1 : 0;
      } else if (lc.includes('pruebas estadísticas')) {
        // Busca palabras clave relacionadas con pruebas estadísticas
        valor = (textoMinusculas.match(/t-student|chi-cuadrado|anova|regresión lineal|prueba estadística/g) || []).length > 0 ? 1 : 0;
      } else if (lc.includes('relevantes y aportan')) {
        valor = textoMinusculas.includes('conclusiones') && textoMinusculas.includes('discusión') ? 8 : 4;
      } else if (lc.includes('desarrollo de software') || lc.includes('tecnologías emergentes') || lc.includes('validación de modelos') || lc.includes('marcos de referencias') || lc.includes('validación del producto') || lc.includes('encuestas') || lc.includes('observación') || lc.includes('entrevistas')) {
        const keywords = lc.split(' ')[0].replace(/%/g, '');
        valor = textoMinusculas.includes(keywords) ? 1 : 0;
      }

      indicadores[col] = valor;
    });

    // Predicción ML
    const prediccion = await getPrediction(indicadores);
    if (prediccion === undefined || prediccion === null || isNaN(prediccion))
      throw new Error('Predicción del ML inválida o no recibida.');

    // 3. Agrupar y calcular puntajes por categoría para el desglose
    // Esta función AHORA normaliza los indicadores de entrada (features) a una escala 0-100 para VISUALIZACIÓN.
    // No calcula la nota, solo representa los datos que el modelo usó.
    const calcularPuntajeCategoria = (indicadores, claves) => {
      const puntajesNormalizados = claves.map(clave => {
        const valor = indicadores[clave] || 0;
        // Si el valor es un porcentaje (0-1), lo escala a 0-100.
        if (valor >= 0 && valor <= 1 && clave.includes('%')) {
          return valor * 100;
        }
        // Para otros valores (ej. Nivel 1-8), los escala a un rango de 0-100.
        // Esto es solo para visualización, no afecta la predicción.
        // Usamos 8 como un máximo común para valores no porcentuales de tu rúbrica.
        const maxValorPosible = 8;
        return Math.min(100, (valor / maxValorPosible) * 100);
      });
      // Devuelve el promedio de los indicadores normalizados para esa categoría.
      const puntajesValidos = puntajesNormalizados.filter(isFinite);
      if (puntajesValidos.length === 0) {
        return 0; // Si no hay indicadores válidos, el puntaje es 0.
      }
      const suma = puntajesValidos.reduce((acc, val) => acc + val, 0);
      return suma / puntajesValidos.length;
    };

    const puntajesDesglose = {
      citacion: calcularPuntajeCategoria(indicadores, ['Índice de antigüedad', 'Índice de impacto de revistas', '% de citas textuales', '% de conectores lógicos', '% de parafraseo', '% de fuentes utilizadas']),
      metodologia: calcularPuntajeCategoria(indicadores, ['Tipo de investigación', 'Enfoque', 'Nivel (alcance)', 'Diseño de investigación']),
      innovacion: calcularPuntajeCategoria(indicadores, ['Desarrollo de software', 'Tecnologías emergentes', 'Validación de modelos', 'Marcos de referencias', 'Validación del producto']),
      tecnicas: calcularPuntajeCategoria(indicadores, ['Encuestas', 'Observación / Registro de datos', 'Entrevistas']),
      resultados: calcularPuntajeCategoria(indicadores, ['Aplicación de pruebas estadísticas', 'Métricas de rendimiento', 'Relevantes y aportan a la ciencia y tecnología'])
    };

    // Categoría
    const puntajeTotal = prediccion; // La predicción del modelo YA está en la escala correcta (0-100)
    const categoria = puntajeTotal >= 75 ? 'Excelente'
                     : puntajeTotal >= 50 ? 'Buena'
                     : puntajeTotal >= 25 ? 'Regular'
                     : 'Deficiente';

    // Guardar tesis
    const newThesis = new Thesis({
      titulo, autor, anio,
      user: req.user.id,
      calificacionPredicha: puntajeTotal,
      categoria, indicadores,
      filePath: req.file.path,
      fileName: req.file.filename
    });

    // 4. Generar recomendaciones específicas basadas en el desglose de puntajes
    const generarRecomendaciones = (puntajes, categoriaGeneral) => {
      const recomendaciones = [];
      const umbralMejora = 60; // Puntajes por debajo de esto generan una recomendación

      if (categoriaGeneral === 'Excelente') {
        recomendaciones.push({ texto: 'El trabajo demuestra una calidad excepcional en todas las áreas. Mantener el rigor y la claridad en futuras investigaciones.', categoria: 'General', prioridad: 'Baja' });
        return recomendaciones;
      }

      if (puntajes.citacion < umbralMejora) {
        recomendaciones.push({ texto: 'Revisar y diversificar las fuentes citadas. Asegurar que el índice de antigüedad y el impacto de las revistas sean óptimos.', categoria: 'Citación', prioridad: 'Alta' });
      }
      if (puntajes.metodologia < umbralMejora) {
        recomendaciones.push({ texto: 'Reforzar la sección de metodología. Detallar con mayor claridad el tipo de investigación, el diseño y el alcance del estudio.', categoria: 'Metodología', prioridad: 'Alta' });
      }
      if (puntajes.innovacion < umbralMejora) {
        recomendaciones.push({ texto: 'Explorar la inclusión de tecnologías más emergentes o marcos de referencia actualizados para aumentar el componente innovador.', categoria: 'Innovación', prioridad: 'Media' });
      }
      if (puntajes.resultados < umbralMejora) {
        recomendaciones.push({ texto: 'Fortalecer la sección de resultados y discusión. Asegurar que las conclusiones sean relevantes y aporten valor a la ciencia y tecnología.', categoria: 'Resultados', prioridad: 'Alta' });
      }

      return recomendaciones.length > 0 ? recomendaciones : [{ texto: 'Buen trabajo general. Considerar pulir los aspectos con menor puntaje para alcanzar la excelencia.', categoria: 'General', prioridad: 'Media' }];
    };

    // Guardar métricas
    const newMetrics = await Metrics.create({
      tesisId: newThesis._id,
      puntajes: { 
        total: puntajeTotal,
        ...puntajesDesglose
      },
      prediccionIA: { categoria, confianza: 0.9, modeloVersion: '1.1' },
      comparativa: {},
      recomendaciones: generarRecomendaciones(puntajesDesglose, categoria)
    });

    await newThesis.save();
    res.status(201).json({
      success: true,
      message: 'Tesis analizada exitosamente.',
      data: { ...newThesis.toObject(), metrics: newMetrics }
    });

  } catch (error) {
    console.error('❌ Error al analizar la tesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al analizar la tesis.',
      error: error.message
    });
  }
};

/**
 * Obtener todas las tesis del usuario
 */
const getAllUserTheses = async (req, res) => {
  try {
    const theses = await Thesis.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: theses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener las tesis.', error: error.message });
  }
};

/**
 * Obtener una tesis por ID
 */
const getThesisById = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id).lean();
    if (!thesis) return res.status(404).json({ success: false, message: 'Tesis no encontrada' });

    const metrics = await Metrics.findOne({ tesisId: thesis._id }).lean();
    res.status(200).json({ success: true, data: { ...thesis, metrics: metrics || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener la tesis', error: error.message });
  }
};

/**
 * Estadísticas del usuario
 */
const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const total = await Thesis.countDocuments({ user: userId });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonth = await Thesis.countDocuments({ user: userId, createdAt: { $gte: startOfMonth } });

    const avgResult = await Thesis.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, promedio: { $avg: '$calificacionPredicha' } } }
    ]);

    const stats = await Thesis.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$categoria', count: { $sum: 1 } } }
    ]);

    const categoriasContadas = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const statisticsData = {
      total,
      promedio: avgResult[0]?.promedio || 0,
      categorias: {
        Excelente: categoriasContadas['Excelente'] || 0,
        Buena: categoriasContadas['Buena'] || 0,
        Regular: categoriasContadas['Regular'] || 0,
        Deficiente: categoriasContadas['Deficiente'] || 0
      },
      thisMonth
    };

    res.status(200).json({ success: true, data: statisticsData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas.', error: error.message });
  }
};

/**
 * Elimina una tesis y sus métricas asociadas.
 */
const deleteThesis = async (req, res) => {
  try {
    const thesisId = req.params.id;
    const userId = req.user.id;

    // 1. Buscar la tesis para asegurarse de que pertenece al usuario.
    const thesis = await Thesis.findOne({ _id: thesisId, user: userId });

    if (!thesis) {
      return res.status(404).json({ success: false, message: 'Tesis no encontrada o no tienes permiso para eliminarla.' });
    }

    // 2. Eliminar la tesis y las métricas asociadas en paralelo para mayor eficiencia.
    await Promise.all([
      Thesis.findByIdAndDelete(thesisId),
      Metrics.findOneAndDelete({ tesisId: thesisId })
    ]);

    res.status(200).json({ success: true, message: 'Tesis eliminada correctamente.' });

  } catch (error) {
    console.error('❌ Error al eliminar la tesis:', error);
    res.status(500).json({ success: false, message: 'Error interno al eliminar la tesis.', error: error.message });
  }
};

/**
 * Descarga el archivo PDF de una tesis.
 */
const downloadThesisFile = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id);
    if (!thesis || !thesis.filePath) {
      return res.status(404).json({ success: false, message: 'Archivo de tesis no encontrado.' });
    }

    // Seguridad: Asegurarse de que el usuario que descarga es el dueño de la tesis
    if (thesis.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para descargar este archivo.' });
    }

    res.download(thesis.filePath, thesis.fileName); // Envía el archivo para su descarga
  } catch (error) {
    console.error('❌ Error al descargar el archivo de la tesis:', error);
    res.status(500).json({ success: false, message: 'Error interno al descargar el archivo.' });
  }
};

// Exportar
module.exports = {
  analyzeThesis,
  getAllUserTheses,
  getThesisById,
  getStatistics,
  deleteThesis,
  downloadThesisFile
};
