import type {
  CollectionAssignmentRow,
  CollectionAssignmentsParams,
  CollectionAssignmentsResponse,
} from '@/types/api/admin';

import { buildUserSearchOrFilter } from '@/utils/searchQuery';

import { baseApi } from './baseApi';

function mapAssignmentRow(
  row: Record<string, unknown>,
  officerNameById: Map<string, string>,
): CollectionAssignmentRow {
  const officerId = (row.assigned_officer_id as string) ?? null;
  return {
    id: row.id as string,
    name: row.name as string,
    customerId: (row.customer_id as string) ?? '',
    phone: (row.phone as string) ?? null,
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    nextDueDate: row.next_due_date != null ? String(row.next_due_date) : null,
    paymentStatus: (row.payment_status as string) ?? null,
    assignedOfficerId: officerId,
    assignedOfficerName: officerId ? officerNameById.get(officerId) ?? null : null,
  };
}

export const collectionAssignmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCollectionAssignments: builder.query<CollectionAssignmentsResponse, CollectionAssignmentsParams>({
      query: (filters) => ({
        handler: async (client) => {
          const page = filters.page ?? 1;
          const limit = filters.limit ?? 50;
          const offset = (page - 1) * limit;

          let query = client
            .from('users')
            .select(
              'id, name, customer_id, phone, outstanding_amount, next_due_date, payment_status, assigned_officer_id',
              { count: 'exact' },
            )
            .or('role.eq.customer,role.is.null')
            .not('role', 'eq', 'admin')
            .not('role', 'eq', 'officer');

          const search = filters.search?.trim();
          if (search) {
            query = query.or(buildUserSearchOrFilter(search));
          }

          if (filters.officerFilter === 'unassigned') {
            query = query.is('assigned_officer_id', null);
          } else if (filters.officerFilter && filters.officerFilter !== 'all') {
            query = query.eq('assigned_officer_id', filters.officerFilter);
          }

          if (filters.paymentStatus && filters.paymentStatus !== 'all') {
            query = query.eq('payment_status', filters.paymentStatus);
          }

          if (filters.outstandingOnly) {
            query = query.gt('outstanding_amount', 0);
          }

          query = query
            .order('next_due_date', { ascending: true, nullsFirst: false })
            .order('name', { ascending: true });

          const { data, error, count } = await query.range(offset, offset + limit - 1);
          if (error) throw error;

          const officerIds = [
            ...new Set(
              (data ?? [])
                .map((row) => row.assigned_officer_id as string | null)
                .filter((id): id is string => Boolean(id)),
            ),
          ];

          const officerNameById = new Map<string, string>();
          if (officerIds.length > 0) {
            const { data: officers, error: officersError } = await client
              .from('officers')
              .select('id, full_name')
              .in('id', officerIds);
            if (officersError) throw officersError;
            for (const officer of officers ?? []) {
              officerNameById.set(officer.id as string, (officer.full_name as string) ?? 'Officer');
            }
          }

          return {
            items: (data ?? []).map((row) => mapAssignmentRow(row, officerNameById)),
            total: count ?? 0,
            page,
            limit,
          };
        },
      }),
      providesTags: ['CollectionAssignments'],
    }),

    bulkAssignCollectionOfficer: builder.mutation<
      { updatedCount: number },
      { customerIds: string[]; officerId: string | null }
    >({
      query: ({ customerIds, officerId }) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('bulk_assign_collection_officer', {
            p_customer_ids: customerIds,
            p_officer_id: officerId,
          });
          if (error) throw error;
          const result = data as { updated_count?: number };
          return { updatedCount: Number(result?.updated_count ?? 0) };
        },
      }),
      invalidatesTags: ['CollectionAssignments', 'Users', 'Payments'],
    }),

    assignCollectionOfficer: builder.mutation<
      { updatedCount: number },
      { customerId: string; officerId: string | null }
    >({
      query: ({ customerId, officerId }) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('bulk_assign_collection_officer', {
            p_customer_ids: [customerId],
            p_officer_id: officerId,
          });
          if (error) throw error;
          const result = data as { updated_count?: number };
          return { updatedCount: Number(result?.updated_count ?? 0) };
        },
      }),
      invalidatesTags: ['CollectionAssignments', 'Users', 'Payments'],
    }),
  }),
});

export const {
  useGetCollectionAssignmentsQuery,
  useBulkAssignCollectionOfficerMutation,
  useAssignCollectionOfficerMutation,
} = collectionAssignmentsApi;
