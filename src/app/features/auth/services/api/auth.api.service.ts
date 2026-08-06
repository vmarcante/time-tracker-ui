import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../../shared/services/api/http.service';
import { ApiResponse } from '../../../../shared/types';
import {
  LoginInput,
  AuthenticationOutput,
  RequestPasswordResetInput,
  ResetPasswordInput,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private httpService = inject(HttpService);

  login(input: LoginInput): ApiResponse<AuthenticationOutput> {
    return this.httpService.post('/public/auth', input, {
      withCredentials: true,
    });
  }

  refreshToken(): ApiResponse<AuthenticationOutput> {
    return this.httpService.post('/public/auth/refresh', null, {
      withCredentials: true,
    });
  }

  requestPasswordReset(input: RequestPasswordResetInput): ApiResponse<void> {
    return this.httpService.post('/public/auth/request-reset', input);
  }

  resetPassword(input: ResetPasswordInput): ApiResponse<void> {
    return this.httpService.patch('/public/auth/password', input);
  }

  logout(): ApiResponse<void> {
    return this.httpService.delete('/public/auth/session', {
      withCredentials: true,
    });
  }
}
