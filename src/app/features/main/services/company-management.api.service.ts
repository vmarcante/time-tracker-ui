import { Injectable, inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/api/http.service';
import { ApiResponse, PageWrapper } from '../../../shared/types';
import { CompanyRole } from '../../auth/models';
import {
  CompanyDetailOutput,
  CompanyMemberOutput,
  CompanyMenuOverviewOutput,
  CompanyOverviewOutput,
  CompanyTimeEntryOutput,
  CompanyTimeEntryStatsOutput,
  CreateProjectInput,
  CreateProjectOutput,
  CreateTeamInput,
  CreateTeamOutput,
  PersonInviteLookupOutput,
  PreRegisterAndInviteInput,
  ProjectAssignmentOutput,
  ProjectDetailOutput,
  ProjectSummaryOutput,
  TeamDetailOutput,
  TeamMemberOutput,
  TeamSummaryOutput,
  TeamWithMembersOutput,
  MembershipOrigin,
  UpdateCompanyInput,
  UpdateProjectInput,
  UpdateTeamInput,
} from '../models/company-management.model';

@Injectable({
  providedIn: 'root',
})
export class CompanyManagementApiService {
  private httpService = inject(HttpService);

  getCompany(companyId: string): ApiResponse<CompanyDetailOutput> {
    return this.httpService.get(`/companies/${companyId}`);
  }

  updateCompany(companyId: string, input: UpdateCompanyInput): ApiResponse<CompanyDetailOutput> {
    return this.httpService.put(`/companies/${companyId}`, input);
  }

  listMembers(
    companyId: string,
    pageNumber = 1,
    pageSize = 10,
  ): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members`, {
      params: { pageNumber, pageSize },
    });
  }

  menuOverview(companyId: string): ApiResponse<CompanyMenuOverviewOutput> {
    return this.httpService.get(`/companies/${companyId}/menu-overview`);
  }

  overview(companyId: string): ApiResponse<CompanyOverviewOutput> {
    return this.httpService.get(`/companies/${companyId}/overview`);
  }

  listPending(
    companyId: string,
    pageNumber = 1,
    pageSize = 10,
    origin?: MembershipOrigin,
  ): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members/pending`, {
      params: { pageNumber, pageSize, ...(origin ? { origin } : {}) },
    });
  }

  cancelInvite(companyId: string, membershipId: string): ApiResponse<void> {
    return this.httpService.post(`/companies/${companyId}/members/${membershipId}/cancel-invite`, {});
  }

  listResolved(
    companyId: string,
    pageNumber = 1,
    pageSize = 10,
  ): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members/resolved`, {
      params: { pageNumber, pageSize },
    });
  }

  resendInvite(companyId: string, membershipId: string): ApiResponse<CompanyMemberOutput> {
    return this.httpService.post(`/companies/${companyId}/members/${membershipId}/resend-invite`, {});
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

  listTeams(companyId: string, pageNumber = 1, pageSize = 10): ApiResponse<PageWrapper<TeamSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams`, { params: { pageNumber, pageSize } });
  }

  listTeamsWithMembers(companyId: string): ApiResponse<TeamWithMembersOutput[]> {
    return this.httpService.get(`/companies/${companyId}/teams/with-members`);
  }

  findTeam(companyId: string, teamId: string): ApiResponse<TeamDetailOutput> {
    return this.httpService.get(`/companies/${companyId}/teams/${teamId}`);
  }

  createTeam(companyId: string, input: CreateTeamInput): ApiResponse<CreateTeamOutput> {
    return this.httpService.post(`/companies/${companyId}/teams`, input);
  }

  updateTeam(
    companyId: string,
    teamId: string,
    input: UpdateTeamInput,
  ): ApiResponse<TeamDetailOutput> {
    return this.httpService.put(`/companies/${companyId}/teams/${teamId}`, input);
  }

  listTeamMembers(
    companyId: string,
    teamId: string,
    pageNumber = 1,
    pageSize = 50,
  ): ApiResponse<PageWrapper<TeamMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams/${teamId}/members`, {
      params: { pageNumber, pageSize },
    });
  }

  addTeamMember(companyId: string, teamId: string, email: string): ApiResponse<TeamMemberOutput> {
    return this.httpService.post(`/companies/${companyId}/teams/${teamId}/members`, { email });
  }

  removeTeamMember(companyId: string, teamId: string, membershipId: string): ApiResponse<void> {
    return this.httpService.delete(
      `/companies/${companyId}/teams/${teamId}/members/${membershipId}`,
    );
  }

  teamMemberRemovalImpact(
    companyId: string,
    teamId: string,
    membershipId: string,
  ): ApiResponse<ProjectAssignmentOutput[]> {
    return this.httpService.get(
      `/companies/${companyId}/teams/${teamId}/members/${membershipId}/removal-impact`,
    );
  }

  assignTeamLead(companyId: string, teamId: string, email: string): ApiResponse<TeamMemberOutput> {
    return this.httpService.put(`/companies/${companyId}/teams/${teamId}/lead`, { email });
  }

  leaveTeam(companyId: string, teamId: string): ApiResponse<void> {
    return this.httpService.post(`/companies/${companyId}/teams/${teamId}/leave`, {});
  }

  listTeamProjects(
    companyId: string,
    teamId: string,
    pageNumber = 1,
    pageSize = 50,
  ): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams/${teamId}/projects`, {
      params: { pageNumber, pageSize },
    });
  }

  linkProjectToTeam(companyId: string, projectId: string, teamId: string): ApiResponse<void> {
    return this.httpService.post(
      `/companies/${companyId}/projects/${projectId}/teams/${teamId}`,
      {},
    );
  }

  unlinkProjectFromTeam(companyId: string, projectId: string, teamId: string): ApiResponse<void> {
    return this.httpService.delete(`/companies/${companyId}/projects/${projectId}/teams/${teamId}`);
  }

  projectUnlinkImpact(
    companyId: string,
    projectId: string,
    teamId: string,
  ): ApiResponse<ProjectAssignmentOutput[]> {
    return this.httpService.get(
      `/companies/${companyId}/projects/${projectId}/teams/${teamId}/unlink-impact`,
    );
  }

  listProjectTeams(
    companyId: string,
    projectId: string,
    pageNumber = 1,
    pageSize = 100,
  ): ApiResponse<PageWrapper<TeamSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}/teams`, {
      params: { pageNumber, pageSize },
    });
  }

  listProjects(
    companyId: string,
    pageNumber = 1,
    pageSize = 10,
  ): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects`, { params: { pageNumber, pageSize } });
  }

  listMyProjects(
    companyId: string,
    pageNumber = 1,
    pageSize = 50,
  ): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects/mine`, {
      params: { pageNumber, pageSize },
    });
  }

  findProject(companyId: string, projectId: string): ApiResponse<ProjectDetailOutput> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}`);
  }

  listProjectMembers(
    companyId: string,
    projectId: string,
    pageNumber = 1,
    pageSize = 100,
  ): ApiResponse<PageWrapper<ProjectAssignmentOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}/members`, {
      params: { pageNumber, pageSize },
    });
  }

  createProject(companyId: string, input: CreateProjectInput): ApiResponse<CreateProjectOutput> {
    return this.httpService.post(`/companies/${companyId}/projects`, input);
  }

  updateProject(
    companyId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): ApiResponse<ProjectDetailOutput> {
    return this.httpService.put(`/companies/${companyId}/projects/${projectId}`, input);
  }

  listCompanyTimeEntries(
    companyId: string,
    pageNumber = 1,
    pageSize = 10,
    filters: {
      from?: string | null;
      to?: string | null;
      userIds?: string[] | null;
      projectId?: string | null;
      teamIds?: string[] | null;
    } = {},
  ): ApiResponse<PageWrapper<CompanyTimeEntryOutput>> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    if (filters.userIds?.length) params['userIds'] = filters.userIds.join(',');
    if (filters.projectId) params['projectId'] = filters.projectId;
    if (filters.teamIds?.length) params['teamIds'] = filters.teamIds.join(',');
    return this.httpService.get(`/companies/${companyId}/time-entries`, { params });
  }

  listCompanyTimeEntryStats(
    companyId: string,
    filters: {
      from?: string | null;
      to?: string | null;
      userIds?: string[] | null;
      projectId?: string | null;
      teamIds?: string[] | null;
    } = {},
  ): ApiResponse<CompanyTimeEntryStatsOutput> {
    const params: Record<string, string | number> = {};
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    if (filters.userIds?.length) params['userIds'] = filters.userIds.join(',');
    if (filters.projectId) params['projectId'] = filters.projectId;
    if (filters.teamIds?.length) params['teamIds'] = filters.teamIds.join(',');
    return this.httpService.get(`/companies/${companyId}/time-entries/stats`, { params });
  }

  downloadCompanyReportPdf(
    companyId: string,
    filters: { from?: string | null; to?: string | null } = {},
  ): Observable<HttpResponse<Blob>> {
    const params: Record<string, string | number> = {};
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    return this.httpService.getFile(`/companies/${companyId}/reports/pdf`, { params });
  }
}
