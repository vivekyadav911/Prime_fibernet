import { useMemo } from 'react';

import { useGetOfficerSessionProfileQuery } from '@/services/api/authApi';

export type OfficerProfileView = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  employeeId: string | null;
  designation: string | null;
  department: string | null;
  zone: string | null;
  avatarUrl: string | null;
  joinDate: string | null;
};

function mapProfile(raw: Record<string, unknown> | undefined): OfficerProfileView | null {
  if (!raw) return null;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.full_name ?? raw.name ?? 'Officer'),
    email: String(raw.email ?? ''),
    phone: (raw.phone as string) ?? null,
    employeeId: (raw.employee_id as string) ?? null,
    designation: (raw.designation as string) ?? (raw.role_name as string) ?? null,
    department: (raw.department as string) ?? null,
    zone: (raw.region as string) ?? (raw.zone as string) ?? null,
    avatarUrl: (raw.profile_photo_url as string) ?? (raw.avatar_url as string) ?? null,
    joinDate: (raw.joining_date as string) ?? (raw.join_date as string) ?? null,
  };
}

export function useOfficerProfile() {
  const query = useGetOfficerSessionProfileQuery();
  const profile = useMemo(() => mapProfile(query.data), [query.data]);
  return { ...query, profile };
}
