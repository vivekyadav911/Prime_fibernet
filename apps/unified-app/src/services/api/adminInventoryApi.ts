import type { InventoryAdminItem } from '@/types/api/admin';

import { baseApi } from './baseApi';

export const adminInventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminInventory: builder.query<InventoryAdminItem[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('inventory_items').select('*').order('name');
          if (error) throw error;

          const items = await Promise.all(
            (data ?? []).map(async (row) => {
              const { count } = await client
                .from('inventory_assignments')
                .select('id', { count: 'exact', head: true })
                .eq('item_id', row.id)
                .eq('status', 'assigned');
              const total = Number(row.quantity ?? 0);
              const assigned = count ?? 0;
              return {
                id: row.id as string,
                name: row.name as string,
                category: (row.category as string) ?? 'General',
                totalQty: total,
                assignedQty: assigned,
                availableQty: Math.max(0, total - assigned),
                condition: (row.condition as string) ?? 'good',
              };
            }),
          );
          return items;
        },
      }),
      providesTags: ['Inventory'],
    }),

    createInventoryItem: builder.mutation<void, { name: string; category: string; quantity: number }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.from('inventory_items').insert({
            name: body.name,
            category: body.category,
            quantity: body.quantity,
            status: 'available',
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Inventory'],
    }),

    getAssignmentRequests: builder.query<
      { id: string; officerName: string; itemName: string; quantity: number; date: string; status: string }[],
      { status?: string }
    >({
      query: ({ status }) => ({
        handler: async (client) => {
          let query = client
            .from('inventory_requests')
            .select('*, officers(name), inventory_items(name)')
            .order('created_at', { ascending: false });
          if (status) query = query.eq('status', status);
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            officerName: (row.officers as { name?: string })?.name ?? 'Officer',
            itemName: (row.inventory_items as { name?: string })?.name ?? 'Item',
            quantity: Number(row.quantity ?? 1),
            date: row.created_at as string,
            status: row.status as string,
          }));
        },
      }),
      providesTags: ['Inventory'],
    }),

    reviewAssignmentRequest: builder.mutation<void, { id: string; action: 'approve' | 'reject' }>({
      query: ({ id, action }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('inventory_requests')
            .update({ status: action === 'approve' ? 'approved' : 'rejected' })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Inventory'],
    }),

    getInventoryHistory: builder.query<
      { id: string; itemName: string; action: string; officerName: string; quantity: number; date: string }[],
      void
    >({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('inventory_history')
            .select('*, inventory_items(name), officers(name)')
            .order('created_at', { ascending: false })
            .limit(200);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            itemName: (row.inventory_items as { name?: string })?.name ?? 'Item',
            action: row.action as string,
            officerName: (row.officers as { name?: string })?.name ?? '—',
            quantity: Number(row.quantity ?? 0),
            date: row.created_at as string,
          }));
        },
      }),
      providesTags: ['Inventory'],
    }),

    getInventoryCategories: builder.query<{ id: string; name: string }[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('inventory_categories').select('*').order('name');
          if (error) {
            return [
              { id: '1', name: 'Router' },
              { id: '2', name: 'Modem' },
              { id: '3', name: 'Cable' },
              { id: '4', name: 'Tools' },
            ];
          }
          return (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string }));
        },
      }),
      providesTags: ['Inventory'],
    }),

    createInventoryCategory: builder.mutation<void, { name: string }>({
      query: ({ name }) => ({
        handler: async (client) => {
          const { error } = await client.from('inventory_categories').insert({ name });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Inventory'],
    }),

    bulkImportInventory: builder.mutation<void, { csvData: string }>({
      query: ({ csvData }) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('inventory-bulk-import', { body: { csvData } });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Inventory'],
    }),
  }),
});

export const {
  useGetAdminInventoryQuery,
  useCreateInventoryItemMutation,
  useGetAssignmentRequestsQuery,
  useReviewAssignmentRequestMutation,
  useGetInventoryHistoryQuery,
  useGetInventoryCategoriesQuery,
  useCreateInventoryCategoryMutation,
  useBulkImportInventoryMutation,
} = adminInventoryApi;
