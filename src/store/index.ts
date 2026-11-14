import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import branchReducer from './slices/branchSlice';
import saleBasketReducer from './slices/saleBasketSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    branch: branchReducer,
    saleBasket: saleBasketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
