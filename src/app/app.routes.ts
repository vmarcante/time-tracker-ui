import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './features/auth/guards/auth.guard';
import { translationContextGuard } from './shared/guards/translation-context.guard';
import { companyMemberGuard } from './shared/guards/company-member.guard';
import { companyRoleGuard } from './shared/guards/company-role.guard';

export const routes: Routes = [
  // LayoutWrapperComponent persists across all authenticated/landing routes.
  {
    path: '',
    loadComponent: () =>
      import('./features/main/components/layout/wrapper/layout-wrapper.component').then(
        (m) => m.LayoutWrapperComponent,
      ),
    children: [
      // Landing page
      {
        path: '',
        loadComponent: () =>
          import('./features/main/pages/landing-page/landing-page.component').then(
            (m) => m.LandingPageComponent,
          ),
        canActivate: [publicGuard],
      },
      // Settings
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/main/pages/settings-page/settings-page.component').then(
            (m) => m.SettingsPageComponent,
          ),
        canActivate: [authGuard, translationContextGuard('profile')],
      },
      // Tracker context — personal time tracking
      {
        path: 'tracker',
        loadComponent: () =>
          import('./features/tracker/layout/tracker-layout.component').then(
            (m) => m.TrackerLayoutComponent,
          ),
        canActivate: [authGuard, translationContextGuard('tracker')],
        children: [
          { path: '', redirectTo: 'entries', pathMatch: 'full' },
          {
            path: 'entries',
            loadComponent: () =>
              import('./features/tracker/pages/entries/tracker-entries-page.component').then(
                (m) => m.TrackerEntriesPageComponent,
              ),
          },
          {
            path: 'entries/:id',
            loadComponent: () =>
              import('./features/main/pages/time-entrie/time-entrie-detail-page.component').then(
                (m) => m.TimeEntrieDetailPageComponent,
              ),
            canActivate: [translationContextGuard('timeEntry')],
          },
        ],
      },
      // Workspace context — company management
      {
        path: 'workspace',
        loadComponent: () =>
          import('./features/workspace/layout/workspace-layout.component').then(
            (m) => m.WorkspaceLayoutComponent,
          ),
        canActivate: [authGuard, companyMemberGuard, translationContextGuard('workspace')],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/workspace/pages/overview/workspace-overview.component').then(
                (m) => m.WorkspaceOverviewComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
            pathMatch: 'full',
          },
          {
            path: 'members',
            loadComponent: () =>
              import('./features/main/pages/home-page/sections/members-section/members-section.component').then(
                (m) => m.MembersSectionComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN'])],
          },
          {
            path: 'requests',
            loadComponent: () =>
              import('./features/main/pages/home-page/sections/requests-section/requests-section.component').then(
                (m) => m.RequestsSectionComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
          },
          {
            path: 'teams',
            loadComponent: () =>
              import('./features/main/pages/home-page/sections/teams-section/teams-section.component').then(
                (m) => m.TeamsSectionComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
          },
          {
            path: 'teams/detail',
            loadComponent: () =>
              import('./features/workspace/pages/team-detail/team-detail-page.component').then(
                (m) => m.TeamDetailPageComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
          },
          {
            path: 'projects',
            loadComponent: () =>
              import('./features/main/pages/home-page/sections/projects-section/projects-section.component').then(
                (m) => m.ProjectsSectionComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
          },
          {
            path: 'projects/edit',
            loadComponent: () =>
              import('./features/workspace/pages/project-edit/project-edit-page.component').then(
                (m) => m.ProjectEditPageComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
          },
          {
            path: 'time-entries',
            loadComponent: () =>
              import('./features/main/pages/home-page/sections/time-entries-section/time-entries-section.component').then(
                (m) => m.TimeEntriesSectionComponent,
              ),
            canActivate: [companyRoleGuard(['OWNER', 'ADMIN', 'MANAGER'])],
          },
        ],
      },
    ],
  },

  // Standalone public routes
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
