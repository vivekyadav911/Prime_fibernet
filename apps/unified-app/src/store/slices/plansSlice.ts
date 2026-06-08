import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { Plan } from '@/types/plan';

export type PlanSortOrder = 'price_asc' | 'price_desc' | 'speed_asc' | 'speed_desc';

type PlansState = {
  plans: Plan[];
  selectedPlan: Plan | null;
  filters: {
    category: string | null;
    search: string;
    activeOnly: boolean;
  };
  sortOrder: PlanSortOrder;
};

const initialState: PlansState = {
  plans: [],
  selectedPlan: null,
  filters: {
    category: null,
    search: '',
    activeOnly: true,
  },
  sortOrder: 'price_asc',
};

export const plansSlice = createSlice({
  name: 'plans',
  initialState,
  reducers: {
    setPlans(state, action: PayloadAction<Plan[]>) {
      state.plans = action.payload;
    },
    setSelectedPlan(state, action: PayloadAction<Plan | null>) {
      state.selectedPlan = action.payload;
    },
    setPlanFilters(state, action: PayloadAction<Partial<PlansState['filters']>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSortOrder(state, action: PayloadAction<PlanSortOrder>) {
      state.sortOrder = action.payload;
    },
    clearPlansState(state) {
      state.plans = [];
      state.selectedPlan = null;
      state.filters = initialState.filters;
      state.sortOrder = initialState.sortOrder;
    },
  },
});

export const { setPlans, setSelectedPlan, setPlanFilters, setSortOrder, clearPlansState } = plansSlice.actions;
