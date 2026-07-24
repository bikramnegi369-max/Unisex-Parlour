import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import branchReducer from './slices/branchSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    branch: branchReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

