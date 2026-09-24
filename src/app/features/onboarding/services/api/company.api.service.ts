import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../../shared/services/api/http.service';
import { ApiResponse } from '../../../../shared/types';
import { CompanyPreviewOutput, CompleteOnboardingOutput, CreateCompanyInput } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class CompanyApiService {
  private httpService = inject(HttpService);

  create(input: CreateCompanyInput): ApiResponse<CompleteOnboardingOutput> {
    return this.httpService.post('/onboarding/company', input);
  }

  getByDocument(document: string): ApiResponse<CompanyPreviewOutput> {
    const digits = document.replace(/\D/g, '');
    return this.httpService.get(`/onboarding/company-preview/${digits}`);
  }
}
