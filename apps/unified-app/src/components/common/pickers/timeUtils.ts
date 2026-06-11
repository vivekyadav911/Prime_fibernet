export function toTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseTimeString(value: string): { hour: number; minute: number } | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatDisplayTime(value: string): string {
  const parsed = parseTimeString(value);
  if (!parsed) return '';
  return toTimeString(parsed.hour, parsed.minute);
}

export function resolveDraftTime(value: string): { hour: number; minute: number } {
  const parsed = parseTimeString(value);
  if (parsed) return parsed;
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}

export function clampMinute(minute: number, step = 1): number {
  const rounded = Math.round(minute / step) * step;
  return Math.max(0, Math.min(59, rounded));
}
