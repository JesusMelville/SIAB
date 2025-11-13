export interface User {
  _id: string;
  nombre: string;
  email: string;
  role: 'user' | 'admin';
  token?: string;
  universidad?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
