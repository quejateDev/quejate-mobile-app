import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkNotificationRead, useNotifications } from '../useNotifications';
import { apiClient } from '@core/api/client';
import type { Notification } from '@core/types';

jest.mock('@core/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'like',
    message: 'A alguien le gustó tu PQRSD',
    read: false,
    createdAt: new Date() as unknown as Date,
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: 'comment',
    message: 'Alguien comentó tu PQRSD',
    read: true,
    createdAt: new Date() as unknown as Date,
  },
];

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(['notifications'], mockNotifications);
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe('useMarkNotificationRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.patch as jest.Mock).mockResolvedValue({ data: undefined });
  });

  it('actualiza read: true de forma optimista en caché antes de la respuesta del servidor', async () => {
    const { queryClient, wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

    await act(async () => {
      result.current.mutate({ notificationId: 'notif-1' });
      await Promise.resolve();
    });

    const cached = queryClient.getQueryData<Notification[]>(['notifications']);
    const updated = cached?.find((n) => n.id === 'notif-1');
    expect(updated?.read).toBe(true);
  });

  it('no modifica notificaciones que no coinciden con el id', async () => {
    const { queryClient, wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

    await act(async () => {
      result.current.mutate({ notificationId: 'notif-1' });
      await Promise.resolve();
    });

    const cached = queryClient.getQueryData<Notification[]>(['notifications']);
    const untouched = cached?.find((n) => n.id === 'notif-2');
    expect(untouched?.read).toBe(true);
  });

  it('llama a apiClient.patch con el notificationId correcto', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ notificationId: 'notif-1' });
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      expect.any(String),
      { notificationId: 'notif-1' },
      expect.objectContaining({ skipAuth401: true }),
    );
  });
});
