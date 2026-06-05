/** Role sent when creating office staff (backend StandardUser only). */
export type CreateUserRoleValue = 'StandardUser';

export type PermissionRoleKey = 'TenantAdmin' | 'StandardUser';

export interface PermissionRow {
  id: string;
  label: string;
}

export const USER_PERMISSION_ROWS: PermissionRow[] = [
  { id: 'claims', label: 'Claims' },
  { id: 'patients', label: 'Patients' },
  { id: 'payments', label: 'Payments' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'reports', label: 'Reports' },
  { id: 'manageUsers', label: 'User Management' },
  { id: 'programSetup', label: 'Program Setup' },
];

const PERMISSIONS_BY_ROLE: Record<PermissionRoleKey, Record<string, boolean>> = {
  TenantAdmin: {
    claims: true,
    patients: true,
    payments: true,
    eligibility: true,
    reports: true,
    manageUsers: true,
    programSetup: true,
  },
  StandardUser: {
    claims: true,
    patients: true,
    payments: false,
    eligibility: true,
    reports: false,
    manageUsers: false,
    programSetup: false,
  },
};

export function permissionsForRole(role: PermissionRoleKey): Record<string, boolean> {
  return { ...PERMISSIONS_BY_ROLE[role] };
}

export function resolvePermissionRole(
  role: string | null | undefined,
  isAdmin?: boolean
): PermissionRoleKey {
  const r = (role ?? '').trim();
  if (r === 'TenantAdmin' || (isAdmin && r !== 'StandardUser' && r !== 'FacilityAdmin')) {
    return 'TenantAdmin';
  }
  return 'StandardUser';
}

export function roleDisplayLabel(role: string | null | undefined, isAdmin?: boolean): string {
  return resolvePermissionRole(role, isAdmin) === 'TenantAdmin'
    ? 'Practice Administrator'
    : 'Office Staff';
}
