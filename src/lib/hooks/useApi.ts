'use client';

import { useAuth } from '@/lib/contexts/auth.context';
import { useCallback } from 'react';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export function useApi() {
  const { tokens, refreshToken, logout } = useAuth();

  const apiFetch = useCallback(
    async <T = unknown>(url: string, options: ApiOptions = {}): Promise<ApiResponse<T>> => {
      const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(customHeaders as Record<string, string>),
      };

      if (!skipAuth && tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }

      try {
        let response = await fetch(url, { ...restOptions, headers });

        // If 401, try refreshing the token
        if (response.status === 401 && !skipAuth && tokens?.refreshToken) {
          try {
            await refreshToken();
            // Retry with new token
            const storedTokens = localStorage.getItem('auth_tokens');
            if (storedTokens) {
              const newTokens = JSON.parse(storedTokens);
              headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
              response = await fetch(url, { ...restOptions, headers });
            }
          } catch {
            await logout();
            throw new Error('Session expired. Please log in again.');
          }
        }

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || `Request failed with status ${response.status}`,
            details: data.details,
          };
        }

        return { success: true, data: data.data ?? data };
      } catch (error) {
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'An unexpected error occurred' };
      }
    },
    [tokens, refreshToken, logout]
  );

  const get = useCallback(
    <T = unknown>(url: string, options?: ApiOptions) => apiFetch<T>(url, { ...options, method: 'GET' }),
    [apiFetch]
  );

  const post = useCallback(
    <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
      apiFetch<T>(url, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    [apiFetch]
  );

  const put = useCallback(
    <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
      apiFetch<T>(url, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    [apiFetch]
  );

  const del = useCallback(
    <T = unknown>(url: string, options?: ApiOptions) => apiFetch<T>(url, { ...options, method: 'DELETE' }),
    [apiFetch]
  );

  return { get, post, put, del, apiFetch };
}
