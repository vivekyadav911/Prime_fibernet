import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    'Plans',
    'Payments',
    'Requests',
    'Users',
    'Officers',
    'Analytics',
    'Subscriptions',
    'Settings',
  ],
  endpoints: () => ({}),
});
