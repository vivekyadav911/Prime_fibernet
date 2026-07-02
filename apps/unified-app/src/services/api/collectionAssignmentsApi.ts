import type {
  CollectionAssignmentRow,
  CollectionAssignmentsParams,
  CollectionAssignmentsResponse,
} from '@/types/api/admin';

import type { SupabaseClient } from '@supabase/supabase-js';

import { buildUserSearchOrFilter } from '@/utils/searchQuery';
import { insertOfficerPortalNotification } from '@/utils/officerPortalNotification';

import { baseApi } from './baseApi';
import { fetchOfficerNameMap } from './mappers';

async function persistCollectionAssignments(
  client: SupabaseClient,
  customerIds: string[],
  officerId: string | null,
): Promise<{ updatedCount: number }> {
  const { data, error } = await client.rpc('bulk_assign_collection_officer', {
    p_customer_ids: customerIds,
    p_officer_id: officerId,
  });

  let updatedCount = 0;

  if (!error) {
    const result = data as { updated_count?: number };
    updatedCount = Number(result?.updated_count ?? 0);
  } else if (!error.message?.includes('Admin access required')) {
    throw error;
  }

  if (updatedCount === 0) {
    const { data: rows, error: updateError } = await client
      .from('users')
      .update({
        assigned_officer_id: officerId,
        claimed_by_officer_id: null,
        claimed_at: null,
        collection_status: officerId ? 'assigned' : 'open',
        collection_updated_at: new Date().toISOString(),
      })
      .eq('role', 'customer')
      .in('id', customerIds)
      .select('id');

    if (updateError) throw updateError;
    updatedCount = rows?.length ?? 0;
  }

  // Notify the assigned officer in-app when accounts are being assigned (not unassigned).
  if (officerId && updatedCount > 0) {
    const { data: sessionData } = await client.auth.getSession();
    const adminName = sessionData?.session?.user?.email ?? 'Admin';
    await insertOfficerPortalNotification(client, {
      officerId,
      type: 'collection_assigned',
      title: 'New collection assignments',
      body: `${updatedCount} customer account${updatedCount > 1 ? 's have' : ' has'} been assigned to you for collection by ${adminName}.`,
      data: { count: updatedCount },
      category: 'collection',
    });
  }

  return { updatedCount };
}

function mapAssignmentRow(
  row: Record<string, unknown>,
  officerNameById: Map<string, string>,
): CollectionAssignmentRow {
  const officerId = (row.assigned_officer_id as string) ?? null;
  const claimedId = (row.claimed_by_officer_id as string) ?? null;
  return {
    id: row.id as string,
    name: row.name as string,
    customerId: (row.customer_id as string) ?? '',
    phone: (row.phone as string) ?? null,
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    nextDueDate: row.next_due_date != null ? String(row.next_due_date) : null,
    paymentStatus: (row.payment_status as string) ?? null,
    collectionStatus: (row.collection_status as string) ?? null,
    assignedOfficerId: officerId,
    assignedOfficerName: officerId ? officerNameById.get(officerId) ?? null : null,
    claimedByOfficerId: claimedId,
    claimedByOfficerName: claimedId ? officerNameById.get(claimedId) ?? null : null,
  };
}

export const collectionAssignmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCollectionAssignments: builder.query<CollectionAssignmentsResponse, CollectionAssignmentsParams>({
      query: (filters) => ({
        handler: async (client) => {
          const page = filters.page ?? 1;
          const limit = filters.limit ?? 25;
          const offset = (page - 1) * limit;

          let query = client
            .from('users')
            .select(
              'id, name, customer_id, phone, outstanding_amount, next_due_date, payment_status, assigned_officer_id, collection_status, claimed_by_officer_id',
              { count: 'exact' },
            )
            .eq('role', 'customer');

          const search = filters.search?.trim();
          if (search) {
            query = query.or(buildUserSearchOrFilter(search));
          }

          if (filters.officerFilter === 'open_pool' || filters.officerFilter === 'unassigned') {
            query = query
              .is('assigned_officer_id', null)
              .is('claimed_by_officer_id', null)
              .eq('collection_status', 'open');
          } else if (filters.officerFilter && filters.officerFilter !== 'all') {
            query = query.eq('assigned_officer_id', filters.officerFilter);
          }

          if (filters.dueForCollectionOnly) {
            query = query
              .gt('outstanding_amount', 0)
              .not('payment_status', 'eq', 'suspended')
              .in('collection_status', ['open', 'assigned', 'claimed']);
          }

          if (filters.paymentStatus && filters.paymentStatus !== 'all') {
            query = query.eq('payment_status', filters.paymentStatus);
          }

          if (filters.collectionStatus && filters.collectionStatus !== 'all') {
            query = query.eq('collection_status', filters.collectionStatus);
          }

          if (filters.claimFilter === 'claimed') {
            query = query.not('claimed_by_officer_id', 'is', null);
          } else if (filters.claimFilter === 'unclaimed') {
            query = query.is('claimed_by_officer_id', null);
          }

          if (filters.outstandingOnly) {
            query = query.gt('outstanding_amount', 0);
          }

          const sortBy = filters.sortBy ?? 'due_date';
          const ascending = (filters.sortDir ?? 'asc') === 'asc';

          if (sortBy === 'name') {
            query = query.order('name', { ascending }).order('id', { ascending: true });
          } else if (sortBy === 'outstanding') {
            query = query.order('outstanding_amount', { ascending }).order('id', { ascending: true });
          } else if (sortBy === 'collection_status') {
            query = query.order('collection_status', { ascending }).order('name', { ascending: true });
          } else {
            query = query
              .order('next_due_date', { ascending, nullsFirst: false })
              .order('name', { ascending: true });
          }

          const { data, error, count } = await query.range(offset, offset + limit - 1);
          if (error) throw error;

          const officerIds = [
            ...new Set(
              (data ?? [])
                .flatMap((row) => [
                  row.assigned_officer_id as string | null,
                  row.claimed_by_officer_id as string | null,
                ])
                .filter((id): id is string => Boolean(id)),
            ),
          ];

          const officerNameById = await fetchOfficerNameMap(client, officerIds);

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

    getCustomerCollectionDetail: builder.query<CollectionAssignmentRow, string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('users')
            .select(
              'id, name, customer_id, phone, outstanding_amount, next_due_date, payment_status, assigned_officer_id, collection_status, claimed_by_officer_id',
            )
            .eq('id', customerId)
            .single();
          if (error) throw error;

          const officerIds = [
            data.assigned_officer_id as string | null,
            data.claimed_by_officer_id as string | null,
          ].filter((id): id is string => Boolean(id));

          const officerNameById = await fetchOfficerNameMap(client, officerIds);

          return mapAssignmentRow(data as Record<string, unknown>, officerNameById);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'CollectionAssignments', id }],
    }),

    bulkAssignCollectionOfficer: builder.mutation<
      { updatedCount: number },
      { customerIds: string[]; officerId: string | null }
    >({
      query: ({ customerIds, officerId }) => ({
        handler: async (client) => persistCollectionAssignments(client, customerIds, officerId),
      }),
      invalidatesTags: ['CollectionAssignments', 'Users', 'Payments'],
    }),

    assignCollectionOfficer: builder.mutation<
      { updatedCount: number },
      { customerId: string; officerId: string | null }
    >({
      query: ({ customerId, officerId }) => ({
        handler: async (client) =>
          persistCollectionAssignments(client, [customerId], officerId),
      }),
      invalidatesTags: ['CollectionAssignments', 'Users', 'Payments'],
    }),

    releaseCollectionClaim: builder.mutation<{ customerId: string; released: boolean }, string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('release_collection_claim', {
            p_customer_id: customerId,
          });
          if (error) throw error;
          const result = data as { customer_id?: string; released?: boolean };
          return {
            customerId: String(result.customer_id ?? customerId),
            released: Boolean(result.released),
          };
        },
      }),
      invalidatesTags: ['CollectionAssignments', 'Users', 'Payments'],
    }),
  }),
});

export const {
  useGetCollectionAssignmentsQuery,
  useGetCustomerCollectionDetailQuery,
  useBulkAssignCollectionOfficerMutation,
  useAssignCollectionOfficerMutation,
  useReleaseCollectionClaimMutation,
} = collectionAssignmentsApi;
