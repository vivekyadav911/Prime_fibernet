import { getSupabase } from '@/services/api/supabase';
import type { OfficerLiveLocation } from '@/types/attendance';

type LiveUpdateCallback = (locations: OfficerLiveLocation[]) => void;

class RealtimeService {
  private channel: ReturnType<ReturnType<typeof getSupabase>['channel']> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private callback: LiveUpdateCallback | null = null;

  connectToLiveUpdates(onUpdate: LiveUpdateCallback): void {
    this.callback = onUpdate;
    const client = getSupabase();

    this.channel = client
      .channel('live-officer-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          void this.fetchLatest();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'officers' },
        () => {
          void this.fetchLatest();
        },
      )
      .subscribe();

    this.startPolling(() => void this.fetchLatest(), 15_000);
    void this.fetchLatest();
  }

  disconnect(): void {
    if (this.channel) {
      void getSupabase().removeChannel(this.channel);
      this.channel = null;
    }
    this.stopPolling();
    this.callback = null;
  }

  startPolling(callback: () => void, intervalMs: number): void {
    this.stopPolling();
    this.pollTimer = setInterval(callback, intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async fetchLatest(): Promise<void> {
    if (!this.callback) return;

    const client = getSupabase();
    const today = new Date().toISOString().slice(0, 10);
    const [officersRes, shiftsRes] = await Promise.all([
      client
        .from('officers')
        .select(
          'id, full_name, profile_photo_url, current_latitude, current_longitude, last_location_update',
        )
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null),
      client
        .from('shifts')
        .select('officer_id, status, check_in_time, check_out_time')
        .eq('shift_date', today)
        .eq('status', 'active'),
    ]);

    if (officersRes.error || shiftsRes.error || !officersRes.data) return;

    const activeByOfficer = new Map(
      (shiftsRes.data ?? []).map((shift) => [shift.officer_id as string, shift]),
    );

    const locations: OfficerLiveLocation[] = officersRes.data.map((row) => {
      const active = activeByOfficer.get(row.id as string);
      const attendanceStatus: OfficerLiveLocation['attendanceStatus'] =
        active?.status === 'active' && active.check_in_time && !active.check_out_time
          ? 'checked_in'
          : active?.check_out_time
            ? 'checked_out'
            : 'not_started';

      return {
        officerId: row.id as string,
        officerName: (row.full_name as string) ?? 'Officer',
        officerAvatar: (row.profile_photo_url as string) ?? undefined,
        coordinates: {
          latitude: Number(row.current_latitude),
          longitude: Number(row.current_longitude),
        },
        accuracy: 0,
        isInsideGeofence: false,
        lastUpdated: (row.last_location_update as string) ?? new Date().toISOString(),
        attendanceStatus,
      };
    });

    this.callback(locations);
  }
}

export const realtimeService = new RealtimeService();
