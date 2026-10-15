import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../../features/auth/services/auth-token.service';

/**
 * Ensures the authenticated user belongs to a company (affiliation === 'COMPANY').
 * INDEPENDENT and PENDING users are redirected to /tracker.
 */
export const companyMemberGuard: CanActivateFn = () => {
  const authTokenService = inject(AuthTokenService);
  const router = inject(Router);

  const user = authTokenService.currentUser();

  if (user?.affiliation === 'COMPANY') {
    return true;
  }

  router.navigate(['/tracker']);
  return false;
};
