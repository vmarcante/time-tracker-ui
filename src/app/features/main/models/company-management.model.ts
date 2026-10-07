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

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectSummaryOutput {
  id: string;
  name: string;
  clientName: string | null;
  status: ProjectStatus;
  teamCount: number;
  memberCount: number;
}

export interface TagOutput {
  id: string;
  name: string;
  color: string;
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
