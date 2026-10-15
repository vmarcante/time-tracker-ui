import { CompanyRole, CurrentUserOutput } from '../../features/auth/models/person.model';

const MANAGER_ROLES: CompanyRole[] = ['OWNER', 'ADMIN', 'MANAGER'];

/**
 * Resolves the appropriate post-login route based on the user's affiliation and company role.
 *
 * - COMPANY + MANAGER role or above → /workspace
 * - COMPANY + MEMBER role          → /tracker
 * - INDEPENDENT / PENDING          → /tracker
 */
export function resolvePostLoginRoute(user: CurrentUserOutput): string {
  if (user.affiliation !== 'COMPANY') {
    return '/tracker';
  }

  if (user.companyRole && MANAGER_ROLES.includes(user.companyRole)) {
    return '/workspace';
  }

  return '/tracker';
}
