import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../shared/services/api/http.service';
import { ApiResponse, PageWrapper } from '../../../shared/types';
import { CompanyRole } from '../../auth/models';
import {
  CompanyMemberOutput,
  CompanyMenuOverviewOutput,
  CompanyTimeEntryOutput,
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
  UpdateProjectInput,
  UpdateTeamInput,
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

  listTeams(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<TeamSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/teams`, { params: { page, size } });
  }

  findTeam(companyId: string, teamId: string): ApiResponse<TeamDetailOutput> {
    return this.httpService.get(`/companies/${companyId}/teams/${teamId}`);
  }

  createTeam(companyId: string, input: CreateTeamInput): ApiResponse<CreateTeamOutput> {
    return this.httpService.post(`/companies/${companyId}/teams`, input);
  }

  updateTeam(companyId: string, teamId: string, input: UpdateTeamInput): ApiResponse<TeamDetailOutput> {
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
    return this.httpService.delete(
      `/companies/${companyId}/projects/${projectId}/teams/${teamId}`,
    );
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

  listProjects(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<ProjectSummaryOutput>> {
    return this.httpService.get(`/companies/${companyId}/projects`, { params: { page, size } });
  }

  findProject(companyId: string, projectId: string): ApiResponse<ProjectDetailOutput> {
    return this.httpService.get(`/companies/${companyId}/projects/${projectId}`);
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

  listCompanyTimeEntries(companyId: string, page = 1, size = 10): ApiResponse<PageWrapper<CompanyTimeEntryOutput>> {
    return this.httpService.get(`/companies/${companyId}/time-entries`, { params: { page, size } });
  }
}
