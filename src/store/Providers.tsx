"use client";

import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from './index';
import { queryClient } from '@/lib/api/queryClient';
import { useCrossTabSync } from '@/lib/api/crossTabSync';

function CrossTabSyncListener() {
  useCrossTabSync();
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <CrossTabSyncListener />
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
