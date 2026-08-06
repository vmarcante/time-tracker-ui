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
}
