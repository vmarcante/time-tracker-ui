export type UserRoleType = 'ADMINISTRATOR' | 'MODERATOR' | 'USER';

export type AffiliationStatus = 'PENDING' | 'INDEPENDENT' | 'COMPANY';

export type CompanyRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface CurrentUserOutput {
  id: string;
  username: string;
  name: string;
  role: UserRoleType;
  affiliation: AffiliationStatus;
  email: string;
  phone: string;
  locale: string;
  age: number | null;
  pendingInvitations: number;
  pendingCompanyName: string | null;
  companyId: string | null;
  companyRole: CompanyRole | null;
}
