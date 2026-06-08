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
  ],
  endpoints: () => ({}),
});
