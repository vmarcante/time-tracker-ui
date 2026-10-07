import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../../shared/services/api/http.service';
import { ApiResponse } from '../../../../shared/types';
import { CurrentUserOutput } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class PersonApiService {
  private httpService = inject(HttpService);

  getCurrentUser(): ApiResponse<CurrentUserOutput> {
    return this.httpService.get('/person/me');
  }

  updateLocale(locale: string): ApiResponse<void> {
    return this.httpService.patch('/person/me/locale', { locale });
  }

  updateProfile(body: { name: string; phone?: string; age?: number }): ApiResponse<void> {
    return this.httpService.patch('/person/me/profile', body);
  }
}
