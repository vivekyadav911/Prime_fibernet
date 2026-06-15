import { createApi } from '@reduxjs/toolkit/query/react';

import { supabaseBaseQuery } from './supabase';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: supabaseBaseQuery,
  tagTypes: [
    'Auth',
    'Profile',
    'Plans',
    'Payments',
    'Requests',
    'Users',
    'Officers',
    'Analytics',
    'Subscriptions',
    'Settings',
    'Shifts',
    'Inventory',
    'Payslips',
    'Leave',
    'Audit',
    'Notifications',
    'Invoices',
    'Payroll',
    'Roles',
    'Reports',
    'Map',
    'Geofences',
    'Attendance',
    'Approvals',
    'ShiftDefinitions',
    'Support',
    'CollectionAssignments',
  ],
  endpoints: () => ({}),
});
