import { CompanyRole } from '../../auth/models';

export type MembershipOrigin = 'INVITE' | 'REQUEST';

export interface CompanyMemberOutput {
  membershipId: string;
  userId: string;
  name: string;
  email: string | null;
  age: number | null;
  role: CompanyRole;
  origin: MembershipOrigin;
  approved: boolean;
  active: boolean;
  requestReason: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSummaryOutput {
  id: string;
  name: string;
  leadName: string | null;
  memberCount: number;
}

export interface TeamDetailOutput {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  leadUserId: string | null;
  leadName: string | null;
  memberCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamInput {
  name: string;
  description: string | null;
}

export interface UpdateTeamInput {
  name: string;
  description: string | null;
}

export interface CreateTeamOutput {
  id: string;
  name: string;
  description: string | null;
}

export type TeamRole = 'LEAD' | 'MEMBER';

export interface TeamMemberOutput {
  membershipId: string;
  userId: string;
  name: string;
  role: TeamRole;
  createdAt: string;
}

export interface ProjectAssignmentOutput {
  assignmentId: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  teamId: string;
  createdAt: string;
}

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectSummaryOutput {
  id: string;
  name: string;
  clientName: string | null;
  status: ProjectStatus;
  teamCount: number;
  memberCount: number;
}

export interface ProjectDetailOutput {
  id: string;
  companyId: string;
  name: string;
  clientName: string | null;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  teamCount: number;
  memberCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithMembersOutput {
  id: string;
  name: string;
  members: TeamMemberOutput[];
}

export interface ProjectTeamMembersInput {
  teamId: string;
  memberIds: string[];
}

export interface CreateProjectInput {
  name: string;
  clientName: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  teams?: ProjectTeamMembersInput[];
}

export interface UpdateProjectInput {
  name: string;
  clientName: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  teams?: ProjectTeamMembersInput[];
}

export interface CreateProjectOutput {
  id: string;
  companyId: string;
  name: string;
  clientName: string | null;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface TagOutput {
  id: string;
  name: string;
  color: string;
}

export interface CompanyMemberStatsOutput {
  userId: string;
  userName: string;
  seconds: number;
  entryCount: number;
}

export interface CompanyProjectStatsOutput {
  projectId: string;
  projectName: string;
  clientName: string | null;
  seconds: number;
  entryCount: number;
}

export interface CompanyDayStatsOutput {
  date: string;
  seconds: number;
}

export interface CompanyProjectDayStatsOutput {
  projectId: string;
  date: string;
  seconds: number;
}

export interface CompanyRunningMemberOutput {
  userId: string;
  userName: string;
  entryId: string;
  entryName: string;
  startedAt: string;
}

export interface CompanyTimeEntryStatsOutput {
  totalSeconds: number;
  entryCount: number;
  runningCount: number;
  memberCount: number;
  previousTotalSeconds: number;
  previousEntryCount: number;
  members: CompanyMemberStatsOutput[];
  projects: CompanyProjectStatsOutput[];
  days: CompanyDayStatsOutput[];
  projectDays: CompanyProjectDayStatsOutput[];
  running: CompanyRunningMemberOutput[];
}

export interface CompanyTimeEntryOutput {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string | null;
  projectId: string;
  projectName: string;
  clientName: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  running: boolean;
  tags: TagOutput[];
}

export interface CompanyOverviewCounts {
  members: number;
  pending: number;
  teams: number;
  projects: number;
}

export interface CompanyMenuOverviewOutput {
  pendingMembershipsCount: number;
}

export interface CompanyOverviewOutput {
  membersCount: number;
  pendingMembershipsCount: number;
  teamsCount: number;
  projectsCount: number;
  recentMembers: CompanyMemberOutput[];
  pendingRequests: CompanyMemberOutput[];
  recentProjects: ProjectSummaryOutput[];
}

export type PersonInviteLookupStatus = 'NOT_FOUND' | 'AVAILABLE' | 'IN_THIS_COMPANY' | 'IN_ANOTHER_COMPANY';

export interface PersonInviteLookupOutput {
  status: PersonInviteLookupStatus;
  personId: string | null;
  name: string | null;
  email: string | null;
}

export interface PreRegisterAndInviteInput {
  name: string;
  email: string;
  phone: string | null;
  age: number | null;
  role: CompanyRole;
}

export interface CompanyDetailOutput {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string;
  description: string | null;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateCompanyInput {
  legalName: string;
  tradeName: string | null;
  description: string | null;
}
