import type {
  Plan,
  PlanCategory,
  PlanFilters,
  PlanStats,
} from '@/types/plans';

const VALID_CATEGORIES: PlanCategory[] = ['standard', 'premium', 'business', 'student', 'custom'];

function parseCategory(raw: unknown): PlanCategory {
  const value = String(raw ?? 'standard').toLowerCase();
  if (VALID_CATEGORIES.includes(value as PlanCategory)) return value as PlanCategory;
  return 'standard';
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function parseSpeedMbps(row: Record<string, unknown>): number {
  if (row.speed_mbps != null && row.speed_mbps !== '') {
    const n = Number(row.speed_mbps);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const legacy = String(row.speed ?? '').replace(/\D/g, '');
  const parsed = parseInt(legacy, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFeatures(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.features)) return row.features.map(String);
  if (row.features && typeof row.features === 'object') {
    return Object.values(row.features as Record<string, unknown>).map(String);
  }
  return [];
}

function parseCreatedBy(raw: unknown): { id: string; name: string } {
  const value = String(raw ?? '').trim();
  if (!value) return { id: '', name: '' };
  if (value.includes('|')) {
    const [id, name] = value.split('|');
    return { id: id ?? '', name: name ?? '' };
  }
  return { id: '', name: value };
}

export function formatValidity(days: number): string {
  if (days <= 0) return '—';
  if (days % 365 === 0) return `${days / 365} Year${days / 365 === 1 ? '' : 's'}`;
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} Month${months === 1 ? '' : 's'}`;
  }
  return `${days} Days`;
}

export function computePerDayCost(price: number, validityDays: number): number {
  if (validityDays <= 0 || !Number.isFinite(price)) return 0;
  return Math.round((price / validityDays) * 100) / 100;
}

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function getSpeedTier(mbps: number): { label: string; color: string; shortLabel: string } {
  if (mbps <= 25) {
    return { label: 'Basic (≤25)', color: '#9CA3AF', shortLabel: `${mbps}M` };
  }
  if (mbps <= 100) {
    return { label: 'Standard (26-100)', color: '#3B82F6', shortLabel: `${mbps}M` };
  }
  if (mbps <= 300) {
    return { label: 'Fast (101-300)', color: '#6366F1', shortLabel: `${mbps}M` };
  }
  return { label: 'Ultra (300+)', color: '#8B5CF6', shortLabel: `${mbps}M` };
}

export function mapDbRowToPlan(row: Record<string, unknown>): Plan {
  const name = String(row.name ?? '');
  const displayName = String(row.display_name ?? '').trim() || name;
  const validityDays = Number(row.validity_days ?? 30) || 30;
  const price = Number(row.price ?? 0) || 0;
  const createdBy = parseCreatedBy(row.created_by);

  return {
    id: String(row.id),
    name,
    displayName,
    description: String(row.description ?? ''),
    planTag: String(row.plan_tag ?? ''),
    category: parseCategory(row.category),
    speedMbps: parseSpeedMbps(row),
    validityDays,
    validityDisplay: formatValidity(validityDays),
    price,
    perDayCost: computePerDayCost(price, validityDays),
    currency: 'INR',
    dataLimit: String(row.data_limit ?? 'Unlimited') || 'Unlimited',
    routerType: String(row.router_type ?? ''),
    features: parseFeatures(row),
    isActive: row.is_active !== false,
    isDeleted: row.is_deleted === true,
    sortOrder: Number(row.sort_order ?? 0) || 0,
    subscriberCount: Number(row.subscriber_count ?? 0) || 0,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
    createdById: createdBy.id,
    createdByName: createdBy.name,
  };
}

export function applyPlanFilters(plans: Plan[], filters: PlanFilters): Plan[] {
  let result = plans.filter((p) => !p.isDeleted);

  if (filters.status === 'active') {
    result = result.filter((p) => p.isActive);
  } else if (filters.status === 'inactive') {
    result = result.filter((p) => !p.isActive);
  }

  if (filters.category !== 'all') {
    result = result.filter((p) => p.category === filters.category);
  }

  if (filters.speedMin != null) {
    result = result.filter((p) => p.speedMbps >= filters.speedMin!);
  }
  if (filters.speedMax != null) {
    result = result.filter((p) => p.speedMbps <= filters.speedMax!);
  }

  if (filters.priceMin != null) {
    result = result.filter((p) => p.price >= filters.priceMin!);
  }
  if (filters.priceMax != null) {
    result = result.filter((p) => p.price <= filters.priceMax!);
  }

  if (filters.validityDays != null) {
    result = result.filter((p) => p.validityDays === filters.validityDays);
  }

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.planTag.toLowerCase().includes(q) ||
        p.routerType.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  result.sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.displayName.localeCompare(b.displayName);
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'speed_asc':
        return a.speedMbps - b.speedMbps;
      case 'speed_desc':
        return b.speedMbps - a.speedMbps;
      case 'subscribers':
        return b.subscriberCount - a.subscriberCount;
      case 'newest':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'sort_order':
      default:
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.displayName.localeCompare(b.displayName);
    }
  });

  return result;
}

export function computePlanStats(plans: Plan[]): PlanStats {
  const active = plans.filter((p) => !p.isDeleted && p.isActive);
  const allNonDeleted = plans.filter((p) => !p.isDeleted);

  if (allNonDeleted.length === 0) {
    return {
      totalPlans: 0,
      activePlansCount: 0,
      avgPrice: 0,
      priceRange: { min: 0, max: 0 },
      avgSpeedMbps: 0,
      speedRange: { min: 0, max: 0 },
      totalPotentialMonthlyRevenue: 0,
    };
  }

  const prices = allNonDeleted.map((p) => p.price).filter(Number.isFinite);
  const speeds = allNonDeleted.map((p) => p.speedMbps).filter((s) => s > 0);

  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const avgSpeedMbps = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

  const totalPotentialMonthlyRevenue = allNonDeleted.reduce(
    (sum, p) => sum + p.price * p.subscriberCount,
    0,
  );

  return {
    totalPlans: allNonDeleted.length,
    activePlansCount: active.length,
    avgPrice: Math.round(avgPrice),
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    avgSpeedMbps: Math.round(avgSpeedMbps),
    speedRange: {
      min: speeds.length ? Math.min(...speeds) : 0,
      max: speeds.length ? Math.max(...speeds) : 0,
    },
    totalPotentialMonthlyRevenue,
  };
}

export function countActiveFilters(filters: PlanFilters): number {
  let count = 0;
  if (filters.status !== 'all') count += 1;
  if (filters.category !== 'all') count += 1;
  if (filters.speedMin != null || filters.speedMax != null) count += 1;
  if (filters.priceMin != null || filters.priceMax != null) count += 1;
  if (filters.validityDays != null) count += 1;
  if (filters.sortBy !== 'sort_order') count += 1;
  return count;
}

export function encodeCreatedBy(id: string, name: string): string {
  if (id && name) return `${id}|${name}`;
  return name || id || '';
}

export function formDataToDbPayload(
  data: {
    name: string;
    displayName: string;
    description: string;
    planTag: string;
    category: PlanCategory;
    speedMbps: number;
    validityDays: number;
    price: number;
    dataLimit: string;
    routerType: string;
    features: string[];
    isActive: boolean;
    sortOrder: number;
  },
  adminName?: string,
): Record<string, unknown> {
  return {
    name: data.name.trim() || data.displayName.trim(),
    display_name: data.displayName.trim(),
    description: data.description.trim(),
    plan_tag: data.planTag.trim(),
    category: data.category,
    speed_mbps: data.speedMbps,
    speed: `${data.speedMbps} Mbps`,
    validity_days: data.validityDays,
    price: data.price,
    data_limit: data.dataLimit,
    router_type: data.routerType.trim(),
    features: data.features,
    is_active: data.isActive,
    sort_order: data.sortOrder,
    updated_at: new Date().toISOString(),
    ...(adminName ? { created_by: adminName } : {}),
  };
}
