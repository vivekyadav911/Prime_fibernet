import type { Officer as PrimeOfficer } from '@prime/types';

import {
  fetchActivitiesForRequest,
  fetchPlanMap,
  loadAdminRequestBoard,
} from '@/services/api/adminRequestsBoardApi';
import { requestsApi } from '@/services/api/requestsApi';
import { triggerAutoNotification } from '@/services/broadcastNotificationService';
import { getSupabase } from '@/services/supabase';
import { store } from '@/store/store';
import type { Officer, RequestFilters, ServiceRequest } from '@/types/requests';
import {
  mapDbRowToServiceRequest,
  mapSupportViewRowToServiceRequest,
  officerInitials,
} from '@/utils/requestViewMappers';
import { toDbRequestType } from '@/constants/requestTypes';
import { insertOfficerPortalNotification } from '@/utils/officerPortalNotification';
import { resolveOfficerName } from '@/utils/resolveOfficerName';

export async function fetchRequests(_filters?: Partial<RequestFilters>): Promise<ServiceRequest[]> {
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    throw new Error('Please sign in to view requests.');
  }
  return loadAdminRequestBoard(client);
}

export async function fetchRequestById(id: string): Promise<ServiceRequest> {
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    throw new Error('Please sign in to view requests.');
  }

  const [requestResult, viewResult] = await Promise.all([
    client.from('service_requests').select('*').eq('id', id).maybeSingle(),
    client.from('support_items_view').select('*').eq('request_id', id).maybeSingle(),
  ]);

  if (requestResult.error) throw requestResult.error;
  if (!requestResult.data) throw new Error('Request not found');

  const activities = await fetchActivitiesForRequest(client, id);
  const row = requestResult.data as Record<string, unknown>;

  if (viewResult.data) {
    return mapSupportViewRowToServiceRequest(
      viewResult.data as Record<string, unknown>,
      row,
      activities,
    );
  }

  const planMap = await fetchPlanMap(client);
  return mapDbRowToServiceRequest(row, activities, planMap);
}

export async function fetchOfficers(): Promise<Officer[]> {
  const client = getSupabase();
  const { data, error } = await client.from('officers').select('id, full_name, region, email, user_id');
  if (error) throw error;

  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id).filter(Boolean) as string[];
  const nameByUserId = new Map<string, string>();

  if (userIds.length) {
    const { data: users } = await client.from('users').select('id, name').in('id', userIds);
    for (const user of users ?? []) {
      nameByUserId.set(String(user.id), String(user.name));
    }
  }

  return rows.map((row) => {
    const userId = row.user_id ? String(row.user_id) : null;
    const userName = userId ? nameByUserId.get(userId) : null;
    const name =
      resolveOfficerName(String(row.id), {
        fullName: row.full_name ? String(row.full_name) : null,
        userName,
        email: String(row.email ?? ''),
        context: 'fetchOfficers',
      }) ?? 'Officer';
    const region = String(row.region ?? 'Unassigned area');
    return {
      id: String(row.id),
      name,
      role: 'Field Technician',
      area: region,
      avatarInitials: officerInitials(name),
    };
  });
}

export async function assignOfficer(
  requestId: string,
  officer: Officer,
  adminName: string,
): Promise<void> {
  await store
    .dispatch(
      requestsApi.endpoints.assignRequest.initiate({
        id: requestId,
        officerId: officer.id,
        officerName: officer.name,
      }),
    )
    .unwrap();

  try {
    const client = getSupabase();
    const request = await fetchRequestById(requestId);
    if (request.customerId) {
      await triggerAutoNotification('request_update', {
        audience: { type: 'specific_users', userIds: [request.customerId] },
        templateVars: {
          message: `${officer.name} has been assigned to handle your ${request.type} request.`,
        },
        title: 'Officer assigned to your request',
        message: `${officer.name} has been assigned to handle your ${request.type} request.`,
        linkedRequestId: requestId,
        deepLinkUrl: `primefiber://requests/${requestId}`,
      });
    }
    await insertOfficerPortalNotification(client, {
      officerId: officer.id,
      type: 'request_assigned',
      title: 'New service request assigned',
      body: `A ${request.type} service request has been assigned to you by ${adminName}.`,
      data: { requestId },
      category: 'ticket',
    });
  } catch {
    /* non-blocking */
  }
}

export async function reassignOfficer(
  requestId: string,
  officer: Officer,
  adminName: string,
): Promise<void> {
  await store
    .dispatch(
      requestsApi.endpoints.assignRequest.initiate({
        id: requestId,
        officerId: officer.id,
        officerName: officer.name,
      }),
    )
    .unwrap();

  try {
    const client = getSupabase();
    const request = await fetchRequestById(requestId);
    if (request.customerId) {
      await triggerAutoNotification('request_update', {
        audience: { type: 'specific_users', userIds: [request.customerId] },
        templateVars: {
          message: `${officer.name} has been assigned to handle your ${request.type} request.`,
        },
        title: 'Officer assigned to your request',
        message: `${officer.name} has been assigned to handle your ${request.type} request.`,
        linkedRequestId: requestId,
      });
    }
    await insertOfficerPortalNotification(client, {
      officerId: officer.id,
      type: 'request_assigned',
      title: 'Service request reassigned to you',
      body: `A ${request.type} service request has been reassigned to you by ${adminName}.`,
      data: { requestId },
      category: 'ticket',
    });
  } catch {
    /* non-blocking */
  }
}

export async function updateRequestStatusWithNotification(
  id: string,
  status: string,
  note?: string,
  officerName?: string,
): Promise<void> {
  await store
    .dispatch(requestsApi.endpoints.updateRequestStatus.initiate({ id, status, note, officerName }))
    .unwrap();

  if (status.toLowerCase() !== 'resolved') return;

  try {
    const request = await fetchRequestById(id);
    if (request.customerId) {
      await triggerAutoNotification('request_update', {
        audience: { type: 'specific_users', userIds: [request.customerId] },
        templateVars: {
          message: `Your ${request.type} request has been resolved by our team.`,
        },
        title: 'Your request has been completed',
        message: `Your ${request.type} request has been resolved by our team.`,
        linkedRequestId: id,
        deepLinkUrl: `primefiber://requests/${id}`,
      });
    }
  } catch {
    /* non-blocking */
  }
}

export async function addNote(requestId: string, note: string, authorName: string): Promise<void> {
  await store
    .dispatch(
      requestsApi.endpoints.addRequestActivity.initiate({
        requestId,
        action: 'Note added',
        officerName: authorName,
        notes: note,
      }),
    )
    .unwrap();
}

export async function createRequest(
  data: Omit<ServiceRequest, 'id' | 'requestNumber' | 'createdAt' | 'activityTimeline'>,
): Promise<ServiceRequest> {
  const client = getSupabase();
  const now = new Date().toISOString();
  const insertData: Record<string, unknown> = {
    user_id: data.customerId || null,
    request_type: toDbRequestType(data.type),
    type: toDbRequestType(data.type),
    status: 'pending',
    user_name: data.customerName,
    user_email: data.customerEmail,
    user_phone: data.customerPhone,
    address: data.customerAddress,
    location_address: data.customerAddress,
    plan_id: data.planId,
    officer_id: data.assignedOfficerId,
    source: data.source,
    notes: data.notes.join('\n'),
    created_at: now,
    updated_at: now,
  };

  if (data.source === 'admin') {
    const session = await client.auth.getSession();
    insertData.created_by_admin_id = session.data.session?.user?.id ?? null;
  }

  const { data: row, error } = await client.from('service_requests').insert(insertData).select().single();
  if (error) throw error;

  return fetchRequestById(String(row.id));
}

export function mapPrimeOfficer(o: PrimeOfficer): Officer {
  return {
    id: o.id,
    name: o.name,
    role: 'Field Technician',
    area: o.region ?? 'Unassigned area',
    avatarInitials: officerInitials(o.name),
  };
}
