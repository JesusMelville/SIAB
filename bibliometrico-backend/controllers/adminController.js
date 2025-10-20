const User = require('../models/User');
const Thesis = require('../models/Thesis');
const mongoose = require('mongoose'); // 🔹 Importamos mongoose para usar ObjectId

// --- OBTENER ESTADÍSTICAS GLOBALES (VERSIÓN OPTIMIZADA) ---
exports.getDashboardStats = async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 🔹 Usamos $facet para ejecutar múltiples agregaciones en una sola consulta
    const statsPipeline = await Thesis.aggregate([
      {
        $facet: {
          totalThesis: [{ $count: 'count' }],
          totalThisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: 'count' }
          ],
          averageScore: [{ $group: { _id: null, avg: { $avg: '$calificacionPredicha' } } }],
          thesisByCategory: [{ $group: { _id: '$categoria', count: { $sum: 1 } } }]
        }
      }
    ]);

    const usersByRoleAgg = User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const totalUsersQuery = User.countDocuments();

    const [stats, roleCounts, totalUsers] = await Promise.all([statsPipeline, usersByRoleAgg, totalUsersQuery]);
    
    const formatCounts = (arr) => arr.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});

    const data = stats[0];

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalThesis: data.totalThesis[0]?.count || 0,
        totalThisMonth: data.totalThisMonth[0]?.count || 0,
        averageScore: data.averageScore[0]?.avg || 0,
        usersByRole: formatCounts(roleCounts),
        thesisByCategory: formatCounts(data.thesisByCategory)
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error al cargar estadísticas.', error: error.message });
  }
};

// --- GESTIÓN DE USUARIOS (Sin cambios, ya estaba bien) ---
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios.', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario.', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    // 🔹 Opcional: Eliminar las tesis del usuario también para mantener la integridad de los datos
    await Thesis.deleteMany({ user: user._id });
    res.status(200).json({ success: true, message: 'Usuario y sus tesis han sido eliminados.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario.', error: error.message });
  }
};

// --- ACTIVIDAD RECIENTE (VERSIÓN MÁS SEGURA) ---
exports.getRecentActivity = async (req, res) => {
  try {
    const recentTheses = await Thesis.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'nombre');

    const activities = recentTheses.map(t => {
      // 🔹 Añadimos una comprobación para evitar errores si el usuario fue eliminado
      const userName = t.user?.nombre || 'un usuario eliminado';
      return {
        description: `El usuario ${userName} analizó la tesis "${t.titulo}".`,
        createdAt: t.createdAt
      };
    });
    
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener actividad reciente.', error: error.message });
  }
};