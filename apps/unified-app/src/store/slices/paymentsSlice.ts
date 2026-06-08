import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { Payment } from '@/types/payment';

type DateRange = {
  start: string | null;
  end: string | null;
};

type PaymentsState = {
  paymentHistory: Payment[];
  pendingPayment: Payment | null;
  dateRangeFilter: DateRange;
};

const initialState: PaymentsState = {
  paymentHistory: [],
  pendingPayment: null,
  dateRangeFilter: {
    start: null,
    end: null,
  },
};

export const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setPaymentHistory(state, action: PayloadAction<Payment[]>) {
      state.paymentHistory = action.payload;
    },
    setPendingPayment(state, action: PayloadAction<Payment | null>) {
      state.pendingPayment = action.payload;
    },
    setDateRangeFilter(state, action: PayloadAction<DateRange>) {
      state.dateRangeFilter = action.payload;
    },
    clearPaymentsState(state) {
      state.paymentHistory = [];
      state.pendingPayment = null;
      state.dateRangeFilter = initialState.dateRangeFilter;
    },
  },
});

export const { setPaymentHistory, setPendingPayment, setDateRangeFilter, clearPaymentsState } =
  paymentsSlice.actions;
