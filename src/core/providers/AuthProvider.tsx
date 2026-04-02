import React, { useEffect } from 'react';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { SecureStorage } from '@core/auth/SecureStorage';
import { useAuth } from '@core/auth/useAuth';
import { SessionUser } from '@core/types';

interface SessionResponse {
  user: SessionUser;
  expires: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser, setLoading } = useAuth();

  useEffect(() => {
    async function refreshSession() {
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
