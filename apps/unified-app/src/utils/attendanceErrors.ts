import type { PostgrestError } from '@supabase/supabase-js';

export class AttendanceActionError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'AttendanceActionError';
    this.code = code;
    this.cause = cause;
  }
}

export function mapSupabaseError(error: PostgrestError | Error | unknown, fallback: string): AttendanceActionError {
  if (error instanceof AttendanceActionError) return error;

  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const pg = error as PostgrestError;
    if (pg.code === '42501' || pg.message.toLowerCase().includes('permission')) {
      return new AttendanceActionError(
        'Server denied this action — your account may not have permission. Contact your admin.',
        'rls_denied',
        pg,
      );
    }
    if (pg.code === 'PGRST116') {
      return new AttendanceActionError('Record not found — refresh and try again.', 'not_found', pg);
    }
    if (pg.code === '23505') {
      return mapShiftAlreadyCompletedError();
    }
    return new AttendanceActionError(pg.message || fallback, pg.code ?? 'server_error', pg);
  }

    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('network')) {
        return new AttendanceActionError('No internet connection — queued for sync when online.', 'offline', error);
      }
      if (error.message.toLowerCase().includes('location')) {
        return new AttendanceActionError(error.message, 'location_error', error);
      }
      if (error.message.includes('SHIFT_ALREADY_COMPLETED')) {
        return mapShiftAlreadyCompletedError();
      }
      return new AttendanceActionError(error.message || fallback, 'unknown', error);
    }

  return new AttendanceActionError(fallback, 'unknown', error);
}

export function mapLocationAccuracyError(accuracyM: number | undefined, maxAccuracyM = 100): AttendanceActionError | null {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return null;
  if (accuracyM > maxAccuracyM) {
    return new AttendanceActionError(
      `GPS accuracy is too low (${Math.round(accuracyM)}m). Move to an open area and try again.`,
      'poor_accuracy',
    );
  }
  return null;
}

export function mapNoZoneError(): AttendanceActionError {
  return new AttendanceActionError(
    'No zone assigned — contact your admin or use Request approval.',
    'no_zone',
  );
}

export function mapShiftAlreadyCompletedError(): AttendanceActionError {
  return new AttendanceActionError(
    'Maximum one attendance is allowed per day. Your shift is already completed. If there is an issue, contact your admin or officers.',
    'shift_already_completed',
  );
}

export function mapOutsideZoneError(distanceM: number, radiusM: number, zoneName?: string): AttendanceActionError {
  const zone = zoneName ?? 'your assigned zone';
  const distLabel =
    Number.isFinite(distanceM) && distanceM >= 0 ? `${Math.round(distanceM)}m` : 'some distance';
  const limitLabel = Number.isFinite(radiusM) && radiusM > 0 ? `${Math.round(radiusM)}m` : 'zone limit';
  return new AttendanceActionError(
    `You are ${distLabel} from ${zone} (limit: ${limitLabel}). Request approval or move closer.`,
    'outside_zone',
  );
}
