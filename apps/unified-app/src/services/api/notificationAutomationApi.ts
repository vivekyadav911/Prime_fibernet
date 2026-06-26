import type {
  AutomationChannels,
  AutomationRule,
  RecurringSchedule,
} from '@/services/broadcastNotificationService';
import type { AudienceConfig, EventType, NotificationPriority } from '@/types/notifications';

import { baseApi } from './baseApi';

function mapAutomationRule(row: Record<string, unknown>): AutomationRule {
  return {
    id: String(row.id),
    eventKey: String(row.event_key),
    label: String(row.label),
    description: row.description ? String(row.description) : null,
    enabled: Boolean(row.enabled),
    channels: (row.channels as AutomationChannels) ?? {
      push: true,
      in_app: true,
      email: false,
      sms: false,
    },
    titleTemplate: String(row.title_template),
    messageTemplate: String(row.message_template),
    priority: String(row.priority ?? 'Normal') as NotificationPriority,
    audienceType: String(row.audience_type ?? 'specific_users') as AudienceConfig['type'],
    eventType: String(row.event_type ?? 'none') as EventType,
    updatedAt: new Date(String(row.updated_at ?? Date.now())),
  };
}

function mapRecurringSchedule(row: Record<string, unknown>): RecurringSchedule {
  return {
    id: String(row.id),
    name: String(row.name),
    title: String(row.title),
    message: String(row.message),
    priority: String(row.priority ?? 'Normal') as NotificationPriority,
    eventType: String(row.event_type ?? 'none') as EventType,
    audience: {
      type: String(row.audience_type ?? 'active_users') as AudienceConfig['type'],
      planId: row.audience_plan_id ? String(row.audience_plan_id) : undefined,
      planName: row.audience_plan_name ? String(row.audience_plan_name) : undefined,
      area: row.audience_area ? String(row.audience_area) : undefined,
      userIds: Array.isArray(row.audience_user_ids)
        ? (row.audience_user_ids as string[]).map(String)
        : undefined,
      userNames: Array.isArray(row.audience_user_names)
        ? (row.audience_user_names as string[]).map(String)
        : undefined,
    },
    frequency: String(row.frequency ?? 'weekly') as RecurringSchedule['frequency'],
    timeOfDay: String(row.time_of_day ?? '09:00'),
    dayOfWeek: row.day_of_week != null ? Number(row.day_of_week) : null,
    timezone: String(row.timezone ?? 'Asia/Kolkata'),
    enabled: Boolean(row.enabled),
    lastRunAt: row.last_run_at ? new Date(String(row.last_run_at)) : null,
    nextRunAt: row.next_run_at ? new Date(String(row.next_run_at)) : null,
    createdById: String(row.created_by_id),
    createdByName: String(row.created_by_name),
  };
}

function computeNextRunAt(
  frequency: RecurringSchedule['frequency'],
  timeOfDay: string,
  dayOfWeek: number | null,
): string {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0);

  if (frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
  if (frequency === 'weekly') {
    const targetDow = dayOfWeek ?? 1;
    const currentDow = next.getDay();
    let daysUntil = (targetDow - currentDow + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
    return next.toISOString();
  }
  const targetDay = dayOfWeek ?? 1;
  next.setDate(targetDay);
  if (next <= now) next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export const notificationAutomationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAutomationRules: builder.query<AutomationRule[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('notification_automation_rules')
            .select('*')
            .order('label', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapAutomationRule(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Notifications'],
    }),

    updateAutomationRule: builder.mutation<
      AutomationRule,
      {
        id: string;
        enabled?: boolean;
        channels?: AutomationChannels;
        titleTemplate?: string;
        messageTemplate?: string;
        priority?: NotificationPriority;
      }
    >({
      query: ({ id, ...patch }) => ({
        handler: async (client) => {
          const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (patch.enabled !== undefined) payload.enabled = patch.enabled;
          if (patch.channels !== undefined) payload.channels = patch.channels;
          if (patch.titleTemplate !== undefined) payload.title_template = patch.titleTemplate;
          if (patch.messageTemplate !== undefined) payload.message_template = patch.messageTemplate;
          if (patch.priority !== undefined) payload.priority = patch.priority;

          const { data, error } = await client
            .from('notification_automation_rules')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();
          if (error) throw error;
          return mapAutomationRule(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Notifications'],
    }),

    getRecurringSchedules: builder.query<RecurringSchedule[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('notification_recurring_schedules')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapRecurringSchedule(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Notifications'],
    }),

    createRecurringSchedule: builder.mutation<
      RecurringSchedule,
      {
        name: string;
        title: string;
        message: string;
        priority: NotificationPriority;
        eventType: EventType;
        audience: Omit<AudienceConfig, 'estimatedCount' | 'resolvedAt'>;
        frequency: RecurringSchedule['frequency'];
        timeOfDay: string;
        dayOfWeek: number | null;
        timezone: string;
        enabled: boolean;
        createdBy: { id: string; name: string };
      }
    >({
      query: (input) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('notification_recurring_schedules')
            .insert({
              name: input.name,
              title: input.title,
              message: input.message,
              priority: input.priority,
              event_type: input.eventType,
              audience_type: input.audience.type,
              audience_plan_id: input.audience.planId ?? null,
              audience_plan_name: input.audience.planName ?? null,
              audience_area: input.audience.area ?? null,
              audience_user_ids: input.audience.userIds ?? null,
              audience_user_names: input.audience.userNames ?? null,
              frequency: input.frequency,
              time_of_day: input.timeOfDay,
              day_of_week: input.dayOfWeek,
              timezone: input.timezone,
              enabled: input.enabled,
              next_run_at: computeNextRunAt(input.frequency, input.timeOfDay, input.dayOfWeek),
              created_by_id: input.createdBy.id,
              created_by_name: input.createdBy.name,
            })
            .select('*')
            .single();
          if (error) throw error;
          return mapRecurringSchedule(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Notifications'],
    }),

    updateRecurringSchedule: builder.mutation<
      RecurringSchedule,
      {
        id: string;
        name?: string;
        title?: string;
        message?: string;
        priority?: NotificationPriority;
        eventType?: EventType;
        audience?: Omit<AudienceConfig, 'estimatedCount' | 'resolvedAt'>;
        frequency?: RecurringSchedule['frequency'];
        timeOfDay?: string;
        dayOfWeek?: number | null;
        timezone?: string;
        enabled?: boolean;
      }
    >({
      query: ({ id, audience, frequency, timeOfDay, dayOfWeek, ...rest }) => ({
        handler: async (client) => {
          const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (rest.name !== undefined) payload.name = rest.name;
          if (rest.title !== undefined) payload.title = rest.title;
          if (rest.message !== undefined) payload.message = rest.message;
          if (rest.priority !== undefined) payload.priority = rest.priority;
          if (rest.eventType !== undefined) payload.event_type = rest.eventType;
          if (rest.enabled !== undefined) payload.enabled = rest.enabled;
          if (rest.timezone !== undefined) payload.timezone = rest.timezone;
          if (audience !== undefined) {
            payload.audience_type = audience.type;
            payload.audience_plan_id = audience.planId ?? null;
            payload.audience_plan_name = audience.planName ?? null;
            payload.audience_area = audience.area ?? null;
            payload.audience_user_ids = audience.userIds ?? null;
            payload.audience_user_names = audience.userNames ?? null;
          }
          if (frequency !== undefined) payload.frequency = frequency;
          if (timeOfDay !== undefined) payload.time_of_day = timeOfDay;
          if (dayOfWeek !== undefined) payload.day_of_week = dayOfWeek;
          if (frequency !== undefined || timeOfDay !== undefined || dayOfWeek !== undefined) {
            payload.next_run_at = computeNextRunAt(
              frequency ?? 'weekly',
              timeOfDay ?? '09:00',
              dayOfWeek ?? null,
            );
          }

          const { data, error } = await client
            .from('notification_recurring_schedules')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();
          if (error) throw error;
          return mapRecurringSchedule(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Notifications'],
    }),

    deleteRecurringSchedule: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client.from('notification_recurring_schedules').delete().eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetAutomationRulesQuery,
  useUpdateAutomationRuleMutation,
  useGetRecurringSchedulesQuery,
  useCreateRecurringScheduleMutation,
  useUpdateRecurringScheduleMutation,
  useDeleteRecurringScheduleMutation,
} = notificationAutomationApi;
