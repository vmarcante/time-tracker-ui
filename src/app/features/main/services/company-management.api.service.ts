import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../shared/services/api/http.service';
import { ApiResponse, PageWrapper } from '../../../shared/types';
import { CompanyRole } from '../../auth/models';
import {
  CompanyMemberOutput,
  CompanyMenuOverviewOutput,
  CompanyTimeEntryOutput,
  PersonInviteLookupOutput,
  PreRegisterAndInviteInput,
  ProjectSummaryOutput,
  TeamSummaryOutput,
} from '../models/company-management.model';

@Injectable({
  providedIn: 'root',
})
export class CompanyManagementApiService {
  private httpService = inject(HttpService);

  listMembers(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members`, {
      params: { page, size },
    });
  }

  menuOverview(companyId: string): ApiResponse<CompanyMenuOverviewOutput> {
    return this.httpService.get(`/companies/${companyId}/menu-overview`);
  }

  listPending(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members/pending`, {
      params: { page, size },
    });
  }

  listResolved(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members/resolved`, {
      params: { page, size },
    });
  }

  approveMembership(companyId: string, membershipId: string): ApiResponse<CompanyMemberOutput> {
    return this.httpService.post(`/companies/${companyId}/members/${membershipId}/approve`, {});
  }

  rejectMembership(
    companyId: string,
    membershipId: string,
    rejectionReason: string | null = null,
  ): ApiResponse<void> {
    return this.httpService.post(`/companies/${companyId}/members/${membershipId}/reject`, {
      rejectionReason,
    });
  }

  changeMemberRole(
    companyId: string,
    membershipId: string,
    role: CompanyRole,
  ): ApiResponse<CompanyMemberOutput> {
    return this.httpService.patch(`/companies/${companyId}/members/${membershipId}/role`, { role });
  }

  removeMember(companyId: string, membershipId: string): ApiResponse<void> {
    return this.httpService.delete(`/companies/${companyId}/members/${membershipId}`);
  }

  lookupPersonForInvite(companyId: string, email: string): ApiResponse<PersonInviteLookupOutput> {
    return this.httpService.get(`/companies/${companyId}/members/lookup`, {
      params: { email },
    });
  }

  inviteMember(
    companyId: string,
    input: { email: string; role: CompanyRole },
  ): ApiResponse<CompanyMemberOutput> {
    return this.httpService.post(`/companies/${companyId}/members/invite`, input);
  }

  preRegisterAndInvite(
    companyId: string,
    input: PreRegisterAndInviteInput,
  ): ApiResponse<CompanyMemberOutput> {
    return this.httpService.post(`/companies/${companyId}/members/pre-register-and-invite`, input);
  }

  listTeams(page = 1, size = 10): ApiResponse<PageWrapper<TeamSummaryOutput>> {
    return this.httpService.get('/teams', { params: { page, size } });
  }

  listProjects(page = 1, size = 10): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get('/projects', { params: { page, size } });
  }

  listCompanyTimeEntries(page = 1, size = 10): ApiResponse<PageWrapper<CompanyTimeEntryOutput>> {
    return this.httpService.get('/company-time-entries', { params: { page, size } });
  }
}
