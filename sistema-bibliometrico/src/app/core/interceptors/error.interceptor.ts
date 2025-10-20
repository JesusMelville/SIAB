// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError(err => {
      // Si el error es 401 (No autorizado), cerramos la sesión.
      if (err.status === 401) {
        authService.logout();
      }

      const error = err.error?.message || err.statusText;
      return throwError(() => new Error(error));
    })
  );
};