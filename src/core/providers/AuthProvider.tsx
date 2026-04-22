import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, setSessionExpiredHandler } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { SecureStorage } from '@core/auth/SecureStorage';
import { useAuth } from '@core/auth/useAuth';
import { SessionUser } from '@core/types';

interface SessionResponse {
  user: SessionUser | null;
  expires: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser, setLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wasAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    const prev = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (prev && !isAuthenticated) {
      queryClient.clear();
    } else if (!prev && isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ['pqrs-by-user'] });
    }
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearUser);
    return () => setSessionExpiredHandler(null);
  }, [clearUser]);

  useEffect(() => {
    async function refreshSession() {
      if (isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = await SecureStorage.getSessionToken();
        if (!token) {
          clearUser();
          return;
        }
        const response = await apiClient.get<SessionResponse>(ENDPOINTS.AUTH.SESSION);
        const session = response.data;
        if (session?.user) {
          setUser(session.user);
        } else {
          await SecureStorage.removeSessionToken();
          clearUser();
        }
      } catch {
        await SecureStorage.removeSessionToken();
        clearUser();
      }
    }

    refreshSession();
  }, []);

  return <>{children}</>;
}
