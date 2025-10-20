// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { routes } from './app.routes';
// 🔹 Importamos los interceptors como funciones
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    importProvidersFrom(FormsModule, ReactiveFormsModule),

    // ✅ SOLUCIÓN: Esta línea registra tus interceptores para que se ejecuten en CADA petición HTTP.
    // Esta es la forma moderna y correcta de hacerlo.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ]
};