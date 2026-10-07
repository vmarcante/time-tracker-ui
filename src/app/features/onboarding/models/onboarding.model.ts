import { AffiliationStatus, CompanyRole } from '../../auth/models';

export type { CompanyRole };

export interface OnboardingInput {
  document?: string;
  independent?: boolean;
  requestReason?: string;
}

export interface CompleteOnboardingOutput {
  affiliation: AffiliationStatus;
  companyId: string | null;
  companyName: string | null;
  membershipPending: boolean | null;
}

export interface CompanyInvitationOutput {
  membershipId: string;
  companyId: string;
  companyName: string;
  role: CompanyRole;
  createdAt: string;
}

export interface CreateCompanyInput {
  legalName: string;
  tradeName?: string;
  document: string;
}

export interface CompanyPreviewOutput {
  legalName: string;
  tradeName: string | null;
}
