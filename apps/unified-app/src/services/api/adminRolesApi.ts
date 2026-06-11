import type { AdminRoleEntry } from '@/types/api/admin';

import { baseApi } from './baseApi';

const DEFAULT_ROLES: AdminRoleEntry[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    permissions: {
      users: { view: true, create: true, edit: true, delete: true },
      officers: { view: true, create: true, edit: true, delete: true },
      requests: { view: true, create: true, edit: true, delete: true },
      plans: { view: true, create: true, edit: true, delete: true },
      payments: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true },
    },
  },
  {
    id: 'admin',
    name: 'Admin',
    permissions: {
      users: { view: true, create: true, edit: true, delete: true },
      officers: { view: true, create: true, edit: true, delete: false },
      requests: { view: true, create: true, edit: true, delete: false },
      plans: { view: true, create: true, edit: true, delete: false },
      payments: { view: true, create: false, edit: true, delete: false },
      settings: { view: true, create: false, edit: true, delete: false },
    },
  },
  {
    id: 'manager',
    name: 'Manager',
    permissions: {
      users: { view: true, create: false, edit: true, delete: false },
      officers: { view: true, create: false, edit: true, delete: false },
      requests: { view: true, create: false, edit: true, delete: false },
      plans: { view: true, create: false, edit: false, delete: false },
      payments: { view: true, create: false, edit: false, delete: false },
      settings: { view: true, create: false, edit: false, delete: false },
    },
  },
  {
    id: 'viewer',
    name: 'Viewer',
    permissions: {
      users: { view: true, create: false, edit: false, delete: false },
      officers: { view: true, create: false, edit: false, delete: false },
      requests: { view: true, create: false, edit: false, delete: false },
      plans: { view: true, create: false, edit: false, delete: false },
      payments: { view: true, create: false, edit: false, delete: false },
      settings: { view: true, create: false, edit: false, delete: false },
    },
  },
];

export const adminRolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminRoles: builder.query<AdminRoleEntry[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('admin_roles').select('*');
          if (error || !data?.length) return DEFAULT_ROLES;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            name: row.name as string,
            permissions: (row.permissions as Record<string, Record<string, boolean>>) ?? {},
          }));
        },
      }),
      providesTags: ['Roles'],
    }),

    updateRolePermissions: builder.mutation<void, { roleId: string; permissions: Record<string, Record<string, boolean>> }>({
      query: ({ roleId, permissions }) => ({
        handler: async (client) => {
          const { error } = await client.from('admin_roles').upsert({
            id: roleId,
            permissions,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Roles'],
    }),
  }),
});

export const { useGetAdminRolesQuery, useUpdateRolePermissionsMutation } = adminRolesApi;
