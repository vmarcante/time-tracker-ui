import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, inject, provideAppInitializer } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNgxMask } from 'ngx-mask';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { pendingOnboardingInterceptor } from './core/interceptors/pending-onboarding.interceptor';
import { AuthService } from './features/auth/services/auth.service';
import { PtBrDateAdapter, PT_BR_DATE_FORMATS } from './shared/adapters/pt-br-date.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: DateAdapter, useClass: PtBrDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: PT_BR_DATE_FORMATS },
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([pendingOnboardingInterceptor, authInterceptor])),
    provideNgxMask(),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      authService.scheduleAccessTokenRefresh();
    }),
  ],
};
