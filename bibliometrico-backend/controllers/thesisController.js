// controllers/thesisController.js
const path = require('path');
const pdf = require('pdf-parse');
const mongoose = require('mongoose');

const Thesis = require('../models/Thesis');
const Metrics = require('../models/Metrics');
const { getPrediction, MODEL_COLUMNS } = require('../services/mlService');

/**
 * Trata de sacar título, autor y año del PDF cuando no vienen en el body
 */
function fallbackFromPdf(text = '') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const guessTitle = lines[0] || 'Título no identificado';

  const guessAuthorLine = lines.find(l => /autor|autora|autor(es)/i.test(l));
  const guessAuthor = guessAuthorLine
    ? guessAuthorLine.replace(/autor(es)?:?/i, '').trim()
    : 'Autor no identificado';

  const yearMatch = text.match(/(20\d{2}|19\d{2})/);
  const guessYear = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  return {
    titulo: guessTitle,
    autor: guessAuthor || 'Autor no identificado',
    anio: guessYear,
  };
}

/**
 * POST /api/tesis/analyze
 */
const analyzeThesis = async (req, res) => {
  try {
    // 1. validar que llegó archivo
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No se ha subido ningún PDF.' });
    }

    // 2. leer PDF
    const data = await pdf(req.file.path).catch(err => {
      console.warn('⚠ PDF parse error:', err.message);
      return { text: '', info: {} };
    });

    const texto = data.text?.trim() || '';
    if (texto.length < 10) {
      return res
        .status(400)
        .json({ success: false, message: 'PDF vacío o ilegible.' });
    }

    // 👀 LOGS ÚTILES
    console.log('👉 BODY recibido:', req.body);
    console.log('👉 FILE recibido:', req.file?.originalname);
    console.log('👉 PDF info:', data.info);

    // 3. datos que pudo mandar el frontend
    let { titulo, autor, anio: anioStr } = req.body;

    // 3.1 intentar con metadatos del PDF si el body viene vacío
    if (!titulo) {
      titulo =
        data.info?.Title ||
        (req.file?.originalname
          ? req.file.originalname.replace(/\.[^.]+$/, '')
          : '');
    }
    if (!autor) {
      autor = data.info?.Author || '';
    }
    if (!anioStr) {
      // intenta buscar año en el texto
      const yearMatch = texto.match(/(20\d{2}|19\d{2})/);
      anioStr = yearMatch ? yearMatch[1] : '';
    }

    // 4. si todavía falta algo, uso fallback por líneas
    if (!titulo || !autor || !anioStr) {
      const fb = fallbackFromPdf(texto);
      titulo = titulo || fb.titulo;
      autor = autor || fb.autor;
      anioStr = anioStr || fb.anio;
    }

    const anio = Number(anioStr);
    if (!titulo || !autor || !anio || isNaN(anio)) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan datos esenciales (título, autor o año) y no se pudieron inferir del PDF.',
      });
    }

    const textoMinusculas = texto.toLowerCase();
    const indicadores = {};

    // 5. construir indicadores
    MODEL_COLUMNS.forEach(col => {
      const lc = col.toLowerCase();
      let valor = 0;

      // ========== CITACIÓN ==========
      if (lc.includes('antigüedad')) {
        const anioActual = new Date().getFullYear();
        const edad = anioActual - anio;
        const maxEdad = 10;
        const score = Math.max(0, 1 - Math.min(edad, maxEdad) / maxEdad);
        valor = score * 5;
      } else if (lc.includes('impacto de revistas')) {
        valor = 3.0;
      } else if (lc.includes('citas textuales')) {
        const citasTextuales = (texto.match(/"[^"]{20,}"/g) || []).length;
        const totalCitas =
          (texto.match(/\([\w\s.,&]+\d{4}\)|\[\d+\]/g) || []).length +
          citasTextuales;
        const pct = totalCitas > 0 ? citasTextuales / totalCitas : 0;
        valor = pct > 0.1 ? 2 : Math.round(pct * 10) / 2;
      } else if (lc.includes('conectores')) {
        const conectores = [
          'además',
          'por lo tanto',
          'sin embargo',
          'por consiguiente',
          'en conclusión',
        ];
        const totalPalabras = texto.split(/\s+/).length;
        const numConectores = conectores.reduce(
          (acc, c) => acc + (textoMinusculas.split(c).length - 1),
          0,
        );
        const ratio = totalPalabras > 0 ? numConectores / totalPalabras : 0;
        valor = Math.min(5, ratio * 500);
      } else if (lc.includes('parafraseo')) {
        const citasTextuales = (texto.match(/"[^"]{20,}"/g) || []).length;
        const totalCitas =
          (texto.match(/\([\w\s.,&]+\d{4}\)|\[\d+\]/g) || []).length +
          citasTextuales;
        const pct = totalCitas > 0 ? citasTextuales / totalCitas : 0;
        valor = (1 - pct) * 5;
      } else if (lc.includes('fuentes utilizadas')) {
        const seccionReferencias = textoMinusculas.split(
          /referencias|bibliograf.a|fuentes consultadas|references/,
        )[1];
        const numFuentes =
          (seccionReferencias?.match(/\[\d+\]|\d+\./g) || []).length;
        valor = Math.min(5, (numFuentes / 100) * 5);
      }

      // ========== METODOLÓGICOS ==========
      else if (lc.includes('tipo de investigación')) {
        if (
          textoMinusculas.includes('aplicada') ||
          textoMinusculas.includes('tecnológica')
        )
          valor = 5;
        else valor = 3;
      } else if (lc.includes('enfoque')) {
        if (textoMinusculas.includes('mixto')) valor = 5;
        else if (textoMinusculas.includes('cualitativo')) valor = 4;
        else valor = 3;
      } else if (lc.includes('nivel (alcance)')) {
        if (textoMinusculas.includes('aplicativo')) valor = 5;
        else if (textoMinusculas.includes('explicativo')) valor = 4;
        else if (textoMinusculas.includes('correlacional')) valor = 3;
        else if (textoMinusculas.includes('descriptivo')) valor = 2;
        else valor = 1;
      } else if (lc.includes('diseño de investigación')) {
        if (textoMinusculas.includes('experimental')) valor = 5;
        else if (textoMinusculas.includes('cuasi experimental')) valor = 4;
        else valor = 3;
      }

      // ========== INNOVACIÓN / DESARROLLO ==========
      else if (lc.includes('desarrollo de software')) {
        valor = textoMinusculas.includes('software') ? 5 : 0;
      } else if (lc.includes('tecnologías emergentes')) {
        valor =
          textoMinusculas.includes('iot') ||
          textoMinusculas.includes('blockchain') ||
          textoMinusculas.includes('inteligencia artificial')
            ? 5
            : 0;
      } else if (lc.includes('validación de modelos')) {
        valor = textoMinusculas.includes('validación') ? 5 : 0;
      } else if (lc.includes('marcos de referencias')) {
        valor = textoMinusculas.includes('marco teórico') ? 4 : 2;
      } else if (lc.includes('validación del producto')) {
        valor = textoMinusculas.includes('prueba piloto') ? 5 : 2;
      }

      // ========== TÉCNICAS / INSTRUMENTOS ==========
      else if (lc.includes('encuestas')) {
        valor = textoMinusculas.includes('encuesta') ? 5 : 0;
      } else if (lc.includes('observación / registro de datos')) {
        valor =
          textoMinusculas.includes('observación') ||
          textoMinusculas.includes('registro de datos')
            ? 5
            : 0;
      } else if (lc.includes('entrevistas')) {
        valor = textoMinusculas.includes('entrevista') ? 5 : 0;
      }

      // ========== RESULTADOS / DISCUSIÓN ==========
      else if (lc.includes('aplicación de pruebas estadísticas')) {
        valor =
          (textoMinusculas.match(
            /t-student|chi-cuadrado|anova|regresión lineal|prueba estadística/g,
          ) || []).length > 0
            ? 5
            : 0;
      } else if (lc.includes('métricas de rendimiento')) {
        valor =
          (textoMinusculas.match(/performance|rendimiento|eficiencia/g) || [])
            .length > 0
            ? 5
            : 0;
      } else if (lc.includes('relevantes y aportan')) {
        valor =
          textoMinusculas.includes('conclusiones') &&
          textoMinusculas.includes('discusión')
            ? 5
            : 3;
      }

      indicadores[col] = valor;
    });

    // 6. helpers 0..5 → 0..20
    const to20 = v => Math.max(0, Math.min(20, (v / 5) * 20));
    const calcBloque = (indicadores, keys) => {
      const vals = keys
        .map(k => (indicadores[k] !== undefined ? to20(indicadores[k]) : 0))
        .filter(n => !Number.isNaN(n));
      if (!vals.length) return 0;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Math.min(20, avg);
    };

    // 7. 5 BLOQUES
    const puntajesDesglose = {
      citacion: calcBloque(indicadores, [
        'Índice de antigüedad',
        'Índice de impacto de revistas',
        '% de citas textuales',
        '% de conectores lógicos',
        '% de parafraseo',
        '% de fuentes utilizadas',
      ]),
      metodologia: calcBloque(indicadores, [
        'Tipo de investigación',
        'Enfoque',
        'Nivel (alcance)',
        'Diseño de investigación',
      ]),
      innovacion: calcBloque(indicadores, [
        'Desarrollo de software',
        'Tecnologías emergentes',
        'Validación de modelos',
        'Marcos de referencias',
        'Validación del producto',
      ]),
      tecnicas: calcBloque(indicadores, [
        'Encuestas',
        'Observación / Registro de datos',
        'Entrevistas',
      ]),
      resultados: calcBloque(indicadores, [
        'Aplicación de pruebas estadísticas',
        'Métricas de rendimiento',
        'Relevantes y aportan a la ciencia y tecnología',
      ]),
    };

    // 8. TOTAL = suma 5 bloques → 0..100
    const puntajeTotal =
      Math.round(
        puntajesDesglose.citacion +
          puntajesDesglose.metodologia +
          puntajesDesglose.innovacion +
          puntajesDesglose.tecnicas +
          puntajesDesglose.resultados,
      );

    // 9. puntaje modelo puro (opcional)
    let puntajeModelo = 0;
    try {
      const pred = await getPrediction(indicadores);
      if (Number.isFinite(pred)) {
        puntajeModelo = pred;
      }
    } catch (_) {
      // no romper
    }

    // 10. categoría
    const categoria =
      puntajeTotal >= 75
        ? 'Excelente'
        : puntajeTotal >= 50
          ? 'Buena'
          : puntajeTotal >= 25
            ? 'Regular'
            : 'Deficiente';

    // 11. recomendaciones
    const generarRecomendaciones = (puntajes, categoriaGeneral) => {
      const recs = [];
      const umbral = 12; // 12/20 ≈ 60%

      if (categoriaGeneral === 'Excelente') {
        recs.push({
          texto: 'Mantener estructura, fuentes y metodología. Trabajo sólido.',
          categoria: 'General',
          prioridad: 'Baja',
        });
        return recs;
      }

      if (puntajes.citacion < umbral) {
        recs.push({
          texto:
            'Mejorar calidad y actualidad de las fuentes; reducir citas textuales >10%.',
          categoria: 'Citación',
          prioridad: 'Alta',
        });
      }
      if (puntajes.metodologia < umbral) {
        recs.push({
          texto: 'Detallar mejor tipo, enfoque y diseño de la investigación.',
          categoria: 'Metodología',
          prioridad: 'Alta',
        });
      }
      if (puntajes.innovacion < umbral) {
        recs.push({
          texto: 'Agregar tecnologías emergentes o marcos reconocidos.',
          categoria: 'Innovación',
          prioridad: 'Media',
        });
      }
      if (puntajes.tecnicas < umbral) {
        recs.push({
          texto:
            'Documentar mejor los instrumentos aplicados (encuesta, entrevista, observación).',
          categoria: 'Técnicas',
          prioridad: 'Media',
        });
      }
      if (puntajes.resultados < umbral) {
        recs.push({
          texto:
            'Fortalecer análisis estadístico, discusión y conclusiones finales.',
          categoria: 'Resultados',
          prioridad: 'Alta',
        });
      }

      return recs.length
        ? recs
        : [
            {
              texto: 'Buen trabajo general. Pulir los indicadores más bajos.',
              categoria: 'General',
              prioridad: 'Media',
            },
          ];
    };

    // 12. guardar tesis
    const newThesis = new Thesis({
      titulo,
      autor,
      anio,
      user: req.user.id,
      calificacionPredicha: puntajeTotal,
      categoria,
      indicadores,
      filePath: req.file.path,
      fileName: path.basename(req.file.path),
      mlScore: puntajeModelo,
    });

    // 13. guardar métricas
    const newMetrics = await Metrics.create({
      tesisId: newThesis._id,
      puntajes: {
        total: puntajeTotal,
        ...puntajesDesglose,
      },
      prediccionIA: {
        categoria,
        confianza: 0.9,
        modeloVersion: '1.2',
        mlScore: puntajeModelo,
      },
      comparativa: {},
      recomendaciones: generarRecomendaciones(puntajesDesglose, categoria),
    });

    await newThesis.save();

    // 14. responder con el ID para que el frontend pueda redirigir
    return res.status(201).json({
      success: true,
      message: 'Tesis analizada exitosamente.',
      data: {
        ...newThesis.toObject(),
        metrics: newMetrics,
      },
    });
  } catch (error) {
    console.error('❌ Error al analizar la tesis:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al analizar la tesis.',
      error: error.message,
    });
  }
};

/**
 * GET /api/tesis
 */
const getAllUserTheses = async (req, res) => {
  try {
    const theses = await Thesis.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ success: true, data: theses });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las tesis.',
      error: error.message,
    });
  }
};

/**
 * GET /api/tesis/:id
 */
const getThesisById = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id).lean();
    if (!thesis) {
      return res
        .status(404)
        .json({ success: false, message: 'Tesis no encontrada' });
    }

    if (thesis.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin permiso.' });
    }

    const metrics = await Metrics.findOne({ tesisId: thesis._id }).lean();
    return res.status(200).json({
      success: true,
      data: { ...thesis, metrics: metrics || null },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la tesis',
      error: error.message,
    });
  }
};

/**
 * GET /api/tesis/stats
 */
const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const total = await Thesis.countDocuments({ user: userId });

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const thisMonth = await Thesis.countDocuments({
      user: userId,
      createdAt: { $gte: startOfMonth },
    });

    const avgResult = await Thesis.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, promedio: { $avg: '$calificacionPredicha' } } },
    ]);

    const stats = await Thesis.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$categoria', count: { $sum: 1 } } },
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
        Deficiente: categoriasContadas['Deficiente'] || 0,
      },
      thisMonth,
    };

    return res.status(200).json({ success: true, data: statisticsData });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/tesis/:id
 */
const deleteThesis = async (req, res) => {
  try {
    const thesisId = req.params.id;
    const userId = req.user.id;

    const thesis = await Thesis.findOne({ _id: thesisId, user: userId });
    if (!thesis) {
      return res.status(404).json({
        success: false,
        message: 'Tesis no encontrada o sin permiso.',
      });
    }

    await Promise.all([
      Thesis.findByIdAndDelete(thesisId),
      Metrics.findOneAndDelete({ tesisId: thesisId }),
    ]);

    return res
      .status(200)
      .json({ success: true, message: 'Tesis eliminada correctamente.' });
  } catch (error) {
    console.error('❌ Error al eliminar la tesis:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al eliminar la tesis.',
      error: error.message,
    });
  }
};

/**
 * GET /api/tesis/:id/download
 */
const downloadThesisFile = async (req, res) => {
  try {
    const thesis = await Thesis.findById(req.params.id);
    if (!thesis || !thesis.filePath) {
      return res
        .status(404)
        .json({ success: false, message: 'Archivo no encontrado.' });
    }

    if (thesis.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Sin permiso.' });
    }

    return res.download(thesis.filePath, thesis.fileName);
  } catch (error) {
    console.error('❌ Error al descargar el archivo de la tesis:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al descargar el archivo.',
      error: error.message,
    });
  }
};

module.exports = {
  analyzeThesis,
  getAllUserTheses,
  getThesisById,
  getStatistics,
  deleteThesis,
  downloadThesisFile,
};
