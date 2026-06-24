import { createApi } from '@reduxjs/toolkit/query/react';

import { supabaseBaseQuery } from './supabase';

const api = createApi({
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
    'PortalNotifications',
    'CustomerTickets',
    'PlanChangeRequests',
    'CustomerDashboard',
    'EmploymentContracts',
    'EmploymentContractVersions',
    'PayslipSettings',
  ],
  endpoints: () => ({}),
});

const injectEndpoints = api.injectEndpoints.bind(api);

api.injectEndpoints = ((definition) =>
  injectEndpoints({
    ...definition,
    overrideExisting:
      definition.overrideExisting ?? process.env.NODE_ENV !== 'production',
  })) as typeof api.injectEndpoints;

export const baseApi = api;
