import { Injectable, inject, DestroyRef, DOCUMENT } from '@angular/core';
import { Observable, Subject, of, tap } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthTokenService } from './auth-token.service';
import { AuthApiService } from './api/auth.api.service';
import { ApiResponse } from '../../../shared/types';
import { AuthenticationOutput, LoginInput } from '../models';

const REFRESH_THRESHOLD_MS = 60_000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenService = inject(AuthTokenService);
  private authApiService = inject(AuthApiService);
  private router = inject(Router);
  private matDialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private refreshTimeoutId: number | null = null;

  private readonly _sessionEnded$ = new Subject<void>();

  readonly sessionEnded$ = this._sessionEnded$.asObservable();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearRefreshTimeout());
    this.listenVisibilityChanges();
  }

  login(input: LoginInput): ApiResponse<AuthenticationOutput> {
    return this.authApiService.login(input).pipe(
      tap((response) => {
        this.tokenService.setTokens(response.data);
        this.scheduleAccessTokenRefresh();
      }),
    );
  }

  logout(): ApiResponse<void> {
    this.clearRefreshTimeout();
    this.terminateSession();
    return this.authApiService.logout().pipe(tap(() => this.tokenService.clearTokens()));
  }

  scheduleAccessTokenRefresh(): void {
    this.clearRefreshTimeout();

    const expiration = this.tokenService.getAccessTokenExpiration();
    if (!expiration) {
      return;
    }

    const refreshAt = expiration * 1000 - REFRESH_THRESHOLD_MS;
    const delay = Math.max(0, refreshAt - Date.now());

    this.refreshTimeoutId = window.setTimeout(() => {
      this.refreshAccessToken();
    }, delay);
  }

  private refreshAccessToken(): void {
    this.authApiService.refreshToken().subscribe({
      next: (response) => {
        this.tokenService.updateAccessToken(response.data.accessToken, response.data.accessTokenExpiresIn);
        this.scheduleAccessTokenRefresh();
      },
      error: () => {
        this.terminateSession();
        this.tokenService.clearTokens();
        this.router.navigate(['/']);
      },
    });
  }

  private terminateSession(): void {
    this._sessionEnded$.next();
    this.matDialog.closeAll();
  }

  private clearRefreshTimeout(): void {
    if (this.refreshTimeoutId !== null) {
      window.clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }

  private listenVisibilityChanges(): void {
    if (!this.document.defaultView) {
      return;
    }

    const handler = (): void => {
      if (this.document.hidden) {
        return;
      }

      const expiration = this.tokenService.getAccessTokenExpiration();
      if (!expiration) {
        return;
      }

      const expiresInMs = expiration * 1000 - Date.now();
      if (expiresInMs <= REFRESH_THRESHOLD_MS) {
        this.refreshAccessToken();
      }
    };

    this.document.addEventListener('visibilitychange', handler);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', handler));
  }

  getAuthStatus(): Observable<boolean> {
    return of(this.tokenService.isAuthenticated());
  }

  isLoggedIn(): boolean {
    return this.tokenService.isAuthenticated();
  }
}
