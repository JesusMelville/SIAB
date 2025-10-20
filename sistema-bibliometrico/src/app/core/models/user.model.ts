export interface User {
  _id: string;
  nombre: string;
  email: string;
  role: 'user' | 'admin';  // 🔹 Usamos "role" siempre
  token?: string;          // 🔹 necesario para AuthService
  universidad?: string;    // 🔹 se usa en AdminDashboard (opcional)
  isActive?: boolean;
  createdAt?: string;      // 🔹 llega como string desde MongoDB
}
