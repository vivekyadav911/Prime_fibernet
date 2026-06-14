import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';

import { baseApi } from '@/services/api/baseApi';
import '@/services/api';

import { securePersistStorage } from './persistStorage';
import { authSlice } from './slices/authSlice';
import { attendanceSlice } from './slices/attendanceSlice';
import { officeSlice } from './slices/officeSlice';
import { paymentsSlice } from './slices/paymentsSlice';
import { plansSlice } from './slices/plansSlice';
import { requestsSlice } from './slices/requestsSlice';
import { uiSlice } from './slices/uiSlice';
import { userSlice } from './slices/userSlice';

const authPersistConfig = {
  key: 'auth',
  storage: securePersistStorage,
  whitelist: ['user', 'isAuthenticated', 'requires2FA', 'isDevSession'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice.reducer),
  user: userSlice.reducer,
  plans: plansSlice.reducer,
  requests: requestsSlice.reducer,
  payments: paymentsSlice.reducer,
  office: officeSlice.reducer,
  attendance: attendanceSlice.reducer,
  ui: uiSlice.reducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
