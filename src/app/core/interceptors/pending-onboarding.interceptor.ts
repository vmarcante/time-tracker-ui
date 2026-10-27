import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthTokenService } from '../../features/auth/services/auth-token.service';

// Endpoints permitidos enquanto o onboarding está pendente — espelha o
// @AuthSecure(allowPendingOnboarding = true) do SecurityInterceptor no backend.
const PENDING_ALLOWED_PREFIXES = [
  '/public/',
  '/auth/',
  '/person/me',
  '/companies/invitations',
  '/onboarding',
];

const PENDING_ALLOWED_PATTERNS = [/invitation\/(accept|decline)/];

function isAllowedForPending(url: string): boolean {
  return (
    PENDING_ALLOWED_PREFIXES.some((prefix) => url.includes(prefix)) ||
    PENDING_ALLOWED_PATTERNS.some((pattern) => pattern.test(url))
  );
}

export const pendingOnboardingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tokenService = inject(AuthTokenService);
  const user = tokenService.currentUser();

  if (user?.affiliation !== 'PENDING' || isAllowedForPending(req.url)) {
    return next(req);
  }

  return throwError(
    () =>
      new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        url: req.url,
        error: {
          key: 'user.onboarding.pending',
          message: 'Onboarding pendente',
        },
      }),
  );
};
