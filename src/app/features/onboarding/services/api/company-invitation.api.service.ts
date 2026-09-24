import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../../shared/services/api/http.service';
import { ApiResponse, PageWrapper } from '../../../../shared/types';
import { CompanyInvitationOutput } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class CompanyInvitationApiService {
  private httpService = inject(HttpService);

  listMyInvitations(page = 1, size = 10): ApiResponse<PageWrapper<CompanyInvitationOutput>> {
    return this.httpService.get('/companies/invitations', {
      params: { page, size },
    });
  }

  accept(companyId: string): ApiResponse<unknown> {
    return this.httpService.post(`/companies/${companyId}/invitation/accept`, {});
  }

  decline(companyId: string): ApiResponse<void> {
    return this.httpService.post(`/companies/${companyId}/invitation/decline`, {});
  }
}
