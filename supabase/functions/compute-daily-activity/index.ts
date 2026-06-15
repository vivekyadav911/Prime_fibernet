import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type HistoryPoint = {
  latitude: number;
  longitude: number;
  speed: number | null;
  is_moving: boolean;
  recorded_at: string;
};

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeActivityStats(points: HistoryPoint[]) {
  if (points.length < 2) {
    return {
      distance_km: 0,
      time_active_minutes: 0,
      stops: 0,
      avg_speed_kmh: 0,
      max_speed_kmh: 0,
      first_ping_at: points[0]?.recorded_at ?? null,
      last_ping_at: points[0]?.recorded_at ?? null,
    };
  }

  let totalDistanceM = 0;
  let activeSeconds = 0;
  let stops = 0;
  const speeds: number[] = [];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    totalDistanceM += haversineMetres(
      Number(prev.latitude),
      Number(prev.longitude),
      Number(curr.latitude),
      Number(curr.longitude),
    );
    const intervalSeconds =
      (new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000;
    if (curr.is_moving) activeSeconds += intervalSeconds;
    else if (prev.is_moving && !curr.is_moving) stops += 1;
    if (curr.speed !== null) speeds.push(Number(curr.speed) * 3.6);
  }

  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length ? Math.max(...speeds) : 0;

  return {
    distance_km: +(totalDistanceM / 1000).toFixed(2),
    time_active_minutes: Math.round(activeSeconds / 60),
    stops,
    avg_speed_kmh: +avgSpeed.toFixed(1),
    max_speed_kmh: +maxSpeed.toFixed(1),
    first_ping_at: points[0].recorded_at,
    last_ping_at: points[points.length - 1].recorded_at,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetDate =
      (body as { date?: string }).date ??
      new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const dayStart = `${targetDate}T00:00:00+05:30`;
    const dayEnd = `${targetDate}T23:59:59+05:30`;

    const { data: officers, error: officersError } = await supabase.from('officers').select('id');
    if (officersError) throw officersError;

    let processed = 0;

    for (const officer of officers ?? []) {
      const { data: points, error } = await supabase
        .from('officer_location_events')
        .select('latitude, longitude, speed, is_moving, recorded_at')
        .eq('officer_id', officer.id)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      if (!points?.length) continue;

      const stats = computeActivityStats(points as HistoryPoint[]);

      const { error: upsertError } = await supabase.from('officer_daily_activity').upsert(
        {
          officer_id: officer.id,
          date: targetDate,
          total_distance_km: stats.distance_km,
          total_time_active_minutes: stats.time_active_minutes,
          total_stops: stats.stops,
          avg_speed_kmh: stats.avg_speed_kmh,
          max_speed_kmh: stats.max_speed_kmh,
          first_ping_at: stats.first_ping_at,
          last_ping_at: stats.last_ping_at,
          total_pings: points.length,
        },
        { onConflict: 'officer_id,date' },
      );

      if (upsertError) throw upsertError;
      processed += 1;
    }

    return new Response(JSON.stringify({ date: targetDate, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
