import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '../store/auth-store';
import { ApiError, api } from './api';

// Carga datos cada vez que la pantalla se muestra.
// Si el token ya expiró (401), cierra sesión y manda al login.
export function useFetch<T>(path: string | null) {
  const token = useAuth((s) => s.token);
  const logout = useAuth((s) => s.logout);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await api<T>(path, { token }));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await logout();
        router.replace('/login');
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [path, token, logout]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, loading, error, reload };
}