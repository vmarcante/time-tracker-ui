import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../../shared/services/api/http.service';
import { ApiResponse } from '../../../../shared/types';
import { CreateUserInput, CreateUserOutput, ConfirmUserRegistrationInput, InviteInfoOutput, EmailAvailabilityOutput } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class RegisterApiService {
  private httpService = inject(HttpService);

  register(userData: CreateUserInput): ApiResponse<CreateUserOutput> {
    return this.httpService.post('/public/register', userData);
  }

  checkUsernameAvailability(username: string): ApiResponse<boolean> {
    return this.httpService.get('/public/register/username-available', {
      params: { username },
    });
  }

  getInviteInfo(token: string): ApiResponse<InviteInfoOutput> {
    return this.httpService.get('/public/register/invite', {
      params: { token },
    });
  }

  checkEmailAvailability(email: string): ApiResponse<EmailAvailabilityOutput> {
    return this.httpService.get('/public/register/email-available', {
      params: { email },
    });
  }

  confirmRegistration(input: ConfirmUserRegistrationInput): ApiResponse<void> {
    return this.httpService.patch('/public/register/confirm', input);
  }
}
