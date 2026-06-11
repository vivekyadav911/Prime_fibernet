export type AdminPermission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'officers.view'
  | 'officers.create'
  | 'officers.edit'
  | 'officers.delete'
  | 'requests.view'
  | 'requests.edit'
  | 'plans.view'
  | 'plans.create'
  | 'plans.edit'
  | 'plans.delete'
  | 'payments.view'
  | 'payments.edit'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.edit'
  | 'notifications.view'
  | 'notifications.create'
  | 'attendance.view'
  | 'attendance.edit'
  | 'payroll.view'
  | 'payroll.edit'
  | 'inventory.view'
  | 'inventory.edit'
  | 'reports.view'
  | 'settings.view'
  | 'settings.edit'
  | 'roles.view'
  | 'roles.edit'
  | 'map.view';

export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'viewer';

const SUPER_ADMIN_PERMISSIONS: AdminPermission[] = [
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'officers.view', 'officers.create', 'officers.edit', 'officers.delete',
  'requests.view', 'requests.edit',
  'plans.view', 'plans.create', 'plans.edit', 'plans.delete',
  'payments.view', 'payments.edit',
  'invoices.view', 'invoices.create', 'invoices.edit',
  'notifications.view', 'notifications.create',
  'attendance.view', 'attendance.edit',
  'payroll.view', 'payroll.edit',
  'inventory.view', 'inventory.edit',
  'reports.view',
  'settings.view', 'settings.edit',
  'roles.view', 'roles.edit',
  'map.view',
];

const VIEWER_PERMISSIONS: AdminPermission[] = [
  'users.view', 'officers.view', 'requests.view', 'plans.view',
  'payments.view', 'invoices.view', 'notifications.view',
  'attendance.view', 'payroll.view', 'inventory.view',
  'reports.view', 'settings.view', 'map.view',
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  admin: SUPER_ADMIN_PERMISSIONS,
  manager: SUPER_ADMIN_PERMISSIONS.filter((p) => !p.endsWith('.delete')),
  viewer: VIEWER_PERMISSIONS,
};

export function resolveAdminRole(role?: string): AdminRole {
  if (role === 'viewer' || role === 'manager') return role;
  return 'admin';
}

export function hasPermission(adminRole: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[adminRole].includes(permission);
}

export function canWrite(adminRole: AdminRole, module: string): boolean {
  return hasPermission(adminRole, `${module}.edit` as AdminPermission)
    || hasPermission(adminRole, `${module}.create` as AdminPermission);
}
