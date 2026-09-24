export type UserRoleType = 'ADMINISTRATOR' | 'MODERATOR' | 'USER';

export type AffiliationStatus = 'PENDING' | 'INDEPENDENT' | 'COMPANY';

export interface CurrentUserOutput {
  id: string;
  username: string;
  name: string;
  role: UserRoleType;
  affiliation: AffiliationStatus;
  email: string;
  phone: string;
  locale: string;
  pendingInvitations: number;
  pendingCompanyName: string | null;
}
