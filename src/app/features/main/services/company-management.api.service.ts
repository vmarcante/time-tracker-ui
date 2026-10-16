import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../shared/services/api/http.service';
import { ApiResponse, PageWrapper } from '../../../shared/types';
import { CompanyRole } from '../../auth/models';
import {
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
  UpdateProjectInput,
  UpdateTeamInput,
} from '../models/company-management.model';

@Injectable({
  providedIn: 'root',
})
export class CompanyManagementApiService {
  private httpService = inject(HttpService);

  listMembers(
    companyId: string,
    page = 1,
    size = 10,
  ): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members`, {
      params: { page, size },
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
    page = 1,
    size = 10,
  ): ApiResponse<PageWrapper<CompanyMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/members/pending`, {
      params: { page, size },
    });
  }

  listResolved(
    companyId: string,
    page = 1,
    size = 10,
  ): ApiResponse<PageWrapper<CompanyMemberOutput>> {
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

  listTeams(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<TeamSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams`, { params: { page, size } });
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
    page = 1,
    size = 50,
  ): ApiResponse<PageWrapper<TeamMemberOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams/${teamId}/members`, {
      params: { page, size },
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
    page = 1,
    size = 50,
  ): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams/${teamId}/projects`, {
      params: { page, size },
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
    page = 1,
    size = 100,
  ): ApiResponse<PageWrapper<TeamSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}/teams`, {
      params: { page, size },
    });
  }

  listProjects(
    companyId: string,
    page = 1,
    size = 10,
  ): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects`, { params: { page, size } });
  }

  listMyProjects(
    companyId: string,
    page = 1,
    size = 50,
  ): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects/mine`, {
      params: { page, size },
    });
  }

  findProject(companyId: string, projectId: string): ApiResponse<ProjectDetailOutput> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}`);
  }

  listProjectMembers(
    companyId: string,
    projectId: string,
    page = 1,
    size = 100,
  ): ApiResponse<PageWrapper<ProjectAssignmentOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}/members`, {
      params: { page, size },
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
    page = 1,
    size = 10,
    filters: {
      from?: string | null;
      to?: string | null;
      userIds?: string[] | null;
      projectId?: string | null;
      teamIds?: string[] | null;
    } = {},
  ): ApiResponse<PageWrapper<CompanyTimeEntryOutput>> {
    const params: Record<string, string | number> = { page, size };
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
}
