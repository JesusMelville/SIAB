import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(), // ✅ Habilita el sistema de animaciones de forma asíncrona
    // Registra el interceptor para que se aplique a todas las peticiones
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
  ]
}).catch(err => console.error(err));
