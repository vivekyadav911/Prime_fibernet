export type PlanStatus = 'active' | 'inactive';
export type PlanCategory = 'standard' | 'premium' | 'business' | 'student' | 'custom';
export type DataLimit = 'Unlimited' | string;
export type RouterType = string;
export type ValidityUnit = 'days' | 'months';

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  planTag: string;
  category: PlanCategory;

  speedMbps: number;
  validityDays: number;
  validityDisplay: string;

  price: number;
  perDayCost: number;
  currency: string;

  dataLimit: DataLimit;
  routerType: RouterType;
  features: string[];

  isActive: boolean;
  isDeleted: boolean;
  sortOrder: number;

  subscriberCount: number;

  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdByName: string;
}

/** Alias for legacy references (planName on ServiceRequest, etc.) */
export function getPlanName(plan: Plan): string {
  return plan.displayName || plan.name;
}

export interface PlanStats {
  totalPlans: number;
  activePlansCount: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  avgSpeedMbps: number;
  speedRange: { min: number; max: number };
  totalPotentialMonthlyRevenue: number;
}

export interface PlanFilters {
  status: PlanStatus | 'all';
  speedMin: number | null;
  speedMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
  category: PlanCategory | 'all';
  validityDays: number | null;
  searchQuery: string;
  sortBy:
    | 'name'
    | 'price_asc'
    | 'price_desc'
    | 'speed_asc'
    | 'speed_desc'
    | 'subscribers'
    | 'newest'
    | 'sort_order';
}

export interface PlanFormData {
  name: string;
  displayName: string;
  description: string;
  planTag: string;
  category: PlanCategory;
  speedMbps: number | '';
  validityDays: number | '';
  price: number | '';
  dataLimit: DataLimit;
  routerType: RouterType;
  features: string[];
  isActive: boolean;
  sortOrder: number | '';
}

export const DEFAULT_PLAN_FILTERS: PlanFilters = {
  status: 'all',
  speedMin: null,
  speedMax: null,
  priceMin: null,
  priceMax: null,
  category: 'all',
  validityDays: null,
  searchQuery: '',
  sortBy: 'sort_order',
};

export const PLAN_CATEGORY_OPTIONS: { value: PlanCategory; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'business', label: 'Business' },
  { value: 'student', label: 'Student' },
  { value: 'custom', label: 'Custom' },
];

export const DATA_LIMIT_PRESETS = ['Unlimited', '10GB', '25GB', '50GB', '100GB', '200GB', 'Custom'] as const;
