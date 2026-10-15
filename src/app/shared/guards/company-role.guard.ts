import { inject, untracked } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyRole } from '../../features/auth/models/person.model';
import { AuthTokenService } from '../../features/auth/services/auth-token.service';

/**
 * Ensures the authenticated user has one of the required company roles.
 * Users without a matching role are redirected to /tracker.
 * untracked() prevents reactive re-runs when currentUser changes.
 *
 * @param allowedRoles List of CompanyRole values that are permitted to activate the route.
 */
export function companyRoleGuard(allowedRoles: CompanyRole[]): CanActivateFn {
  return () => {
    const authTokenService = inject(AuthTokenService);
    const router = inject(Router);

    const role = untracked(() => authTokenService.currentUser()?.companyRole);

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    router.navigate(['/tracker']);
    return false;
  };
}
