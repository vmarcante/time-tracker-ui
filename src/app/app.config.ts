import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, inject, provideAppInitializer } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNgxMask } from 'ngx-mask';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './features/auth/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideNgxMask(),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      authService.scheduleAccessTokenRefresh();
    }),
  ],
};
