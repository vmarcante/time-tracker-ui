import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, catchError, filter, switchMap, take, finalize } from 'rxjs';
import { AuthTokenService } from '../../features/auth/services/auth-token.service';
import { AuthApiService } from '../../features/auth/services/api/auth.api.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { AuthenticationOutput } from '../../features/auth/models';

const PUBLIC_URL_PREFIX = '/public/';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

function isPublicUrl(url: string): boolean {
  return url.includes(PUBLIC_URL_PREFIX);
}

function addTokenHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const tokenService = inject(AuthTokenService);
  const authApiService = inject(AuthApiService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const accessToken = tokenService.getAccessToken();

  req = req.clone({ withCredentials: true });

  if (accessToken && !isPublicUrl(req.url)) {
    req = addTokenHeader(req, accessToken);
  }

  return next(req).pipe(
    catchError((error): Observable<HttpEvent<unknown>> => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublicUrl(req.url)) {
        return handle401Error(req, next, tokenService, authApiService, authService, router);
      }

      return throwError(() => error);
    }),
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokenService: AuthTokenService,
  authApiService: AuthApiService,
  authService: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authApiService.refreshToken().pipe(
      switchMap((response) => {
        const tokens: AuthenticationOutput = response.data;
        tokenService.updateAccessToken(tokens.accessToken, tokens.accessTokenExpiresIn);
        authService.scheduleAccessTokenRefresh();
        refreshTokenSubject.next(tokens.accessToken);
        return next(addTokenHeader(req, tokens.accessToken));
      }),
      catchError((error) => {
        tokenService.clearTokens();
        router.navigate(['/']);
        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      }),
    );
  }

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => next(addTokenHeader(req, token))),
  );
}
