const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6,
    select: false // No se enviará la contraseña en las consultas por defecto
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'docente', 'investigador'],
    default: 'user'
  },
  universidad: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, { 
  // Añade automáticamente los campos createdAt y updatedAt
  timestamps: true 
});

// Hook (middleware) que se ejecuta ANTES de que un documento se guarde en la BD
userSchema.pre('save', async function(next) {
  // Solo encripta la contraseña si ha sido modificada (o es nueva)
  if (!this.isModified('password')) return next();

  // "Hashea" la contraseña con un costo de 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método de instancia para comparar la contraseña del login
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;