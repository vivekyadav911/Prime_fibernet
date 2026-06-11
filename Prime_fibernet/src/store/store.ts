import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers'; // Adjust the path as necessary to point to your root reducer

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;