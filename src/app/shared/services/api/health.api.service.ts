import { Injectable, inject } from '@angular/core';
import { HttpService } from './http.service';
import { ApiResponse } from '../../types';

@Injectable({
  providedIn: 'root',
})
export class HealthApiService {
  private httpService = inject(HttpService);

  checkHealth(): ApiResponse<Record<string, string>> {
    return this.httpService.get('/health');
  }
}
