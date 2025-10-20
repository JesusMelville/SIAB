// src/app/app.routes.ts
import { Routes } from '@angular/router';

// -------------------
// Componentes
// -------------------
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UploadComponent } from './features/upload/upload.component';
import { DiagnosticComponent } from './features/diagnostic/diagnostic.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';

// -------------------
// Guardianes de Rutas
// -------------------
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard'; // 🔹 Importamos el guardián de admin

export const routes: Routes = [
  // =============================================
  // Rutas Públicas (para usuarios no autenticados)
  // =============================================
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // =============================================
  // Rutas Protegidas (requieren inicio de sesión)
  // =============================================
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard] // Solo usuarios logueados pueden acceder
  },
  {
    path: 'upload',
    component: UploadComponent,
    canActivate: [AuthGuard]
  },
  {
    // ✅ CORRECCIÓN: La ruta de diagnóstico necesita un parámetro ':id' para saber qué tesis mostrar.
    path: 'diagnostic/:id',
    component: DiagnosticComponent,
    canActivate: [AuthGuard]
  },

  // =============================================
  // Ruta de Administración (requiere rol de 'admin')
  // =============================================
  {
    // ✅ CORRECCIÓN: La ruta es más clara como 'admin-dashboard'.
    path: 'admin-dashboard',
    component: AdminDashboardComponent, // Usamos carga directa en lugar de lazy-loading por simplicidad
    // ✅ MEJORA: Se protege con AMBOS guardianes. Primero verifica el login, luego el rol de admin.
    canActivate: [AuthGuard, AdminGuard]
  },

  // =============================================
  // Redirecciones
  // =============================================
  {
    path: '',
    redirectTo: '/dashboard', // La ruta por defecto para un usuario logueado
    pathMatch: 'full'
  },
  {
    path: '**', // "Catch-all" para cualquier ruta no encontrada
    redirectTo: '/dashboard' // Redirige al dashboard para evitar errores 404
  }
];