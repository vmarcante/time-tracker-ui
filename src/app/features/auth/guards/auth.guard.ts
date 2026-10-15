import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../services/auth-token.service';
import { resolvePostLoginRoute } from '../../../shared/utils/role-redirect.util';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(AuthTokenService);
  const router = inject(Router);

  if (tokenService.isAuthenticated()) {
    return true;
  }

  tokenService.setReturnUrl(state.url);
  router.navigate(['/']);
  return false;
};

export const publicGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(AuthTokenService);
  const router = inject(Router);

  if (!tokenService.isAuthenticated()) {
    return true;
  }

  const returnUrl = tokenService.getReturnUrl();
  if (returnUrl) {
    tokenService.clearReturnUrl();
    router.navigate([returnUrl]);
    return false;
  }

  const user = tokenService.currentUser();
  router.navigate([user ? resolvePostLoginRoute(user) : '/tracker']);
  return false;
};
