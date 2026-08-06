export type UserRoleType = 'ADMINISTRATOR' | 'MODERATOR' | 'USER';

export interface CurrentUserOutput {
  id: string;
  username: string;
  name: string;
  role: UserRoleType;
  email: string;
  phone: string;
  locale: string;
}
