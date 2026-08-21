import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './features/auth/guards/auth.guard';
import { translationContextGuard } from './shared/guards/translation-context.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/main/components/layout/wrapper/layout-wrapper.component').then(
        (m) => m.LayoutWrapperComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/main/pages/landing-page/landing-page.component').then(
            (m) => m.LandingPageComponent,
          ),
        canActivate: [publicGuard],
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/main/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
        canActivate: [authGuard, translationContextGuard('home')],
      },
      {
        path: 'entries/:id',
        loadComponent: () =>
          import('./features/main/pages/time-entrie/time-entrie-detail-page.component').then(
            (m) => m.TimeEntrieDetailPageComponent,
          ),
        canActivate: [authGuard, translationContextGuard('timeEntry')],
      },
    ],
  },
  {
    path: 'confirm-registration/:token',
    loadComponent: () =>
      import('./features/auth/components/register/confirmation/register-confirmation.component').then(
        (m) => m.RegisterConfirmationComponent,
      ),
    canActivate: [publicGuard],
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./features/auth/components/password-reset/confirmation/password-reset-confirmation.component').then(
        (m) => m.PasswordResetConfirmationComponent,
      ),
    canActivate: [publicGuard],
  },
];
