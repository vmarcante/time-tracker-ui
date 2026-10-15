import { inject, untracked } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../services/auth-token.service';
import { resolvePostLoginRoute } from '../../../shared/utils/role-redirect.util';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(AuthTokenService);
  const router = inject(Router);

  if (untracked(() => tokenService.isAuthenticated())) {
    return true;
  }

  tokenService.setReturnUrl(state.url);
  router.navigate(['/']);
  return false;
};

export const publicGuard: CanActivateFn = () => {
  const tokenService = inject(AuthTokenService);
  const router = inject(Router);

  if (!untracked(() => tokenService.isAuthenticated())) {
    return true;
  }

  const returnUrl = tokenService.getReturnUrl();
  if (returnUrl) {
    tokenService.clearReturnUrl();
    return router.createUrlTree([returnUrl]);
  }

  const user = untracked(() => tokenService.currentUser());
  return router.createUrlTree([user ? resolvePostLoginRoute(user) : '/tracker']);
};
