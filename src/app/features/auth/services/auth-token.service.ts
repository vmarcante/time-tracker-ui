import { Injectable, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { AuthenticationOutput, CurrentUserOutput } from '../models';
import { PersonApiService } from './api/person.api.service';
import { ApiAdapterService } from '../../../shared/services/api/api-adapter.service';

const ACCESS_TOKEN_KEY = 'access_token';
const ACCESS_TOKEN_EXPIRES_IN_KEY = 'access_token_expires_in';
const REFRESH_TOKEN_EXPIRES_IN_KEY = 'refresh_token_expires_in';
const TOKEN_TYPE_KEY = 'token_type';
const RETURN_URL_KEY = 'return_url';

interface JwtPayload {
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthTokenService {
  private accessToken = signal<string | null>(this.getStoredItem(ACCESS_TOKEN_KEY));
  private personApiService = inject(PersonApiService);
  private apiAdapterService = inject(ApiAdapterService);
  private destroyRef = inject(DestroyRef);

  private userLoadPromise: Promise<CurrentUserOutput | null> | null = null;

  readonly isAuthenticated = computed(() => !!this.accessToken() && !this.isAccessTokenExpired());
  readonly currentUser = signal<CurrentUserOutput | null>(null);
  readonly currentUserLoading = signal(false);

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && !this.currentUser() && !this.currentUserLoading()) {
        this.loadCurrentUser();
      }
    });
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getAccessTokenExpiration(): number | null {
    const token = this.accessToken();
    if (!token) {
      return null;
    }

    return this.extractTokenExpiration(token);
  }

  isAccessTokenExpired(): boolean {
    const expiration = this.getAccessTokenExpiration();
    if (!expiration) {
      return false;
    }

    return Date.now() >= expiration * 1000;
  }

  setTokens(tokens: AuthenticationOutput): void {
    this.accessToken.set(tokens.accessToken);
    this.setStoredItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    this.setStoredItem(ACCESS_TOKEN_EXPIRES_IN_KEY, String(tokens.accessTokenExpiresIn));
    this.setStoredItem(REFRESH_TOKEN_EXPIRES_IN_KEY, String(tokens.refreshTokenExpiresIn));
    this.setStoredItem(TOKEN_TYPE_KEY, tokens.tokenType);
    this.loadCurrentUser();
  }

  /**
   * Waits for the in-flight /me request or returns the already-loaded user.
   * Use this when you need currentUser to be populated (e.g., post-login routing).
   * For forcing a fresh fetch, use reloadCurrentUser().
   */
  loadCurrentUser(): Promise<CurrentUserOutput | null> {
    const existing = this.currentUser();
    if (existing) return Promise.resolve(existing);
    return this.userLoadPromise ?? this.fetchCurrentUser();
  }

  /**
   * Forces a fresh /me request regardless of current state.
   * Use when user data may have changed server-side (e.g., after onboarding, profile save).
   */
  reloadCurrentUser(): Promise<CurrentUserOutput | null> {
    return this.fetchCurrentUser();
  }

  private fetchCurrentUser(): Promise<CurrentUserOutput | null> {
    this.currentUserLoading.set(true);

    const promise = new Promise<CurrentUserOutput | null>((resolve) => {
      const request = this.personApiService.getCurrentUser();
      const subscription = this.apiAdapterService.executeRequest(request, {
        ignoreLoading: true,
        onSuccess: (response) => {
          this.currentUser.set(response.data);
          this.currentUserLoading.set(false);
          if (this.userLoadPromise === promise) this.userLoadPromise = null;
          resolve(response.data);
        },
        onError: () => {
          this.currentUser.set(null);
          this.currentUserLoading.set(false);
          if (this.userLoadPromise === promise) this.userLoadPromise = null;
          resolve(null);
        },
      });
      this.destroyRef.onDestroy(() => subscription.unsubscribe());
    });

    this.userLoadPromise = promise;
    return promise;
  }

  updateAccessToken(accessToken: string, accessTokenExpiresIn: number): void {
    this.accessToken.set(accessToken);
    this.setStoredItem(ACCESS_TOKEN_KEY, accessToken);
    this.setStoredItem(ACCESS_TOKEN_EXPIRES_IN_KEY, String(accessTokenExpiresIn));
  }

  clearTokens(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.currentUserLoading.set(false);
    this.removeStoredItem(ACCESS_TOKEN_KEY);
    this.removeStoredItem(ACCESS_TOKEN_EXPIRES_IN_KEY);
    this.removeStoredItem(REFRESH_TOKEN_EXPIRES_IN_KEY);
    this.removeStoredItem(TOKEN_TYPE_KEY);
  }

  setReturnUrl(url: string): void {
    this.setStoredItem(RETURN_URL_KEY, url);
  }

  getReturnUrl(): string | null {
    return this.getStoredItem(RETURN_URL_KEY);
  }

  clearReturnUrl(): void {
    this.removeStoredItem(RETURN_URL_KEY);
  }

  private extractTokenExpiration(token: string): number | null {
    try {
      const base64Payload = token.split('.')[1];
      if (!base64Payload) {
        return null;
      }

      const jsonPayload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
      const payload: JwtPayload = JSON.parse(jsonPayload);
      return payload.exp ?? null;
    } catch {
      return null;
    }
  }

  private getStoredItem(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  private setStoredItem(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  private removeStoredItem(key: string): void {
    sessionStorage.removeItem(key);
  }
}
