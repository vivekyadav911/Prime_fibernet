/**
 * @deprecated Use inventoryService and hooks from @/services/inventoryService instead.
 * Kept for RTK Query cache invalidation compatibility with officer APIs.
 */
import type { InventoryAdminItem } from '@/types/api/admin';

import {
  bulkAction,
  createCategory,
  createInventoryItem,
  fetchAssignmentRequests,
  fetchCategories,
  fetchInventoryHistory,
  fetchInventoryItems,
  reviewAssignmentRequest,
} from '@/services/inventoryService';

import { baseApi } from './baseApi';

function mapToLegacyItem(item: Awaited<ReturnType<typeof fetchInventoryItems>>[number]): InventoryAdminItem {
  return {
    id: item.id,
    name: item.name,
    category: item.categoryName,
    totalQty: item.totalQuantity,
    assignedQty: item.assignedQuantity,
    availableQty: item.availableQuantity,
    condition: item.stockStatus,
  };
}

export const adminInventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminInventory: builder.query<InventoryAdminItem[], void>({
      query: () => ({
        handler: async () => {
          const items = await fetchInventoryItems();
          return items.map(mapToLegacyItem);
        },
      }),
      providesTags: ['Inventory'],
    }),

    createInventoryItem: builder.mutation<void, { name: string; category: string; quantity: number }>({
      query: (body) => ({
        handler: async (client) => {
          const cats = await fetchCategories();
          const category = cats.find((c) => c.name.toLowerCase() === body.category.toLowerCase());
          const categoryId = category?.id ?? cats[0]?.id ?? '';
          const session = await client.auth.getSession();
          const userId = session.data.session?.user.id ?? '';
          const userName = String(session.data.session?.user.user_metadata?.name ?? 'Admin');
          await createInventoryItem(
            {
              name: body.name,
              sku: `SKU-${Date.now()}`,
              description: '',
              categoryId,
              status: 'active',
              brand: '',
              model: '',
              totalQuantity: String(body.quantity),
              unitCost: '0',
              location: '',
              notes: '',
            },
            userId,
            userName,
          );
        },
      }),
      invalidatesTags: ['Inventory'],
    }),

    getAssignmentRequests: builder.query<
      { id: string; officerName: string; itemName: string; quantity: number; date: string; status: string }[],
      { status?: string }
    >({
      query: ({ status }) => ({
        handler: async () => {
          const rows = await fetchAssignmentRequests(status);
          return rows.map((row) => ({
            id: row.id,
            officerName: row.officerName,
            itemName: row.itemName,
            quantity: row.quantity,
            date: row.date.toISOString(),
            status: row.status,
          }));
        },
      }),
      providesTags: ['Inventory'],
    }),

    reviewAssignmentRequest: builder.mutation<void, { id: string; action: 'approve' | 'reject' }>({
      query: ({ id, action }) => ({
        handler: async (client) => {
          const session = await client.auth.getSession();
          const userId = session.data.session?.user.id ?? '';
          const userName = String(session.data.session?.user.user_metadata?.name ?? 'Admin');
          await reviewAssignmentRequest(id, action, userId, userName);
        },
      }),
      invalidatesTags: ['Inventory'],
    }),

    getInventoryHistory: builder.query<
      { id: string; itemName: string; action: string; officerName: string; quantity: number; date: string }[],
      void
    >({
      query: () => ({
        handler: async () => {
          const rows = await fetchInventoryHistory(
            { itemId: null, actionType: null, dateFrom: null, dateTo: null },
            200,
          );
          return rows.map((row) => ({
            id: row.id,
            itemName: row.itemName,
            action: row.actionType,
            officerName: row.performedBy,
            quantity: row.quantityDelta,
            date: row.timestamp.toISOString(),
          }));
        },
      }),
      providesTags: ['Inventory'],
    }),

    getInventoryCategories: builder.query<{ id: string; name: string }[], void>({
      query: () => ({
        handler: async () => {
          try {
            const cats = await fetchCategories();
            return cats.map((c) => ({ id: c.id, name: c.name }));
          } catch {
            return [
              { id: '1', name: 'Router' },
              { id: '2', name: 'Modem' },
              { id: '3', name: 'Cable' },
              { id: '4', name: 'Tools' },
            ];
          }
        },
      }),
      providesTags: ['Inventory'],
    }),

    createInventoryCategory: builder.mutation<void, { name: string }>({
      query: ({ name }) => ({
        handler: async () => {
          await createCategory({
            name,
            description: '',
            iconName: 'cube-outline',
            iconColor: '#3B82F6',
            iconBgColor: '#EFF6FF',
          });
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

export { bulkAction as bulkInventoryAction };
