import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../../shared/services/api/http.service';
import { ApiResponse } from '../../../../shared/types';
import { CompleteOnboardingOutput, OnboardingInput } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class OnboardingApiService {
  private httpService = inject(HttpService);

  complete(input: OnboardingInput): ApiResponse<CompleteOnboardingOutput> {
    return this.httpService.post('/onboarding', input);
  }
}
