// src/lib/api.ts
// Central fetch wrapper for all ZipRide backend API calls.
//
// WHY THIS EXISTS:
//   The frontend is hosted on Vercel (https://zipride-khaki.vercel.app) and the
//   backend is on Render (https://zipride-1.onrender.com). They are different origins,
//   so relative paths like fetch('/api/...') only work in local dev (via the Vite proxy).
//   In production every request must use the full absolute backend URL.
//
// USAGE:
//   import { apiFetch, API_BASE } from '@/lib/api';
//   const res = await apiFetch('/api/v1/auth/login', { method: 'POST', ... });

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://zipride-1.onrender.com';

/**
 * Drop-in replacement for `fetch()` that prepends the backend base URL
 * to any path that starts with `/api` or `/uploads`, with automatic retry
 * on transient network errors (such as ERR_NETWORK_CHANGED).
 */
export async function apiFetch(input: string, init?: RequestInit, retries = 2): Promise<Response> {
  const url =
    input.startsWith('http://') || input.startsWith('https://')
      ? input
      : `${API_BASE}${input}`;

  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('jwt_token') ||
        localStorage.getItem('jwt_token') ||
        localStorage.getItem('zipride_jwt_token') ||
        ''
      : '';

  const userId =
    typeof window !== 'undefined'
      ? localStorage.getItem('user_id') ||
        sessionStorage.getItem('user_id') ||
        ''
      : '';

  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (userId && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', userId);
  }

  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const options: RequestInit = {
    ...init,
    headers
  };

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err: any) {
      attempt++;
      if (attempt > retries) {
        throw err;
      }
      console.warn(`[apiFetch] Network glitch encountered (${err.message}). Retrying request (attempt ${attempt}/${retries})…`);
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return fetch(url, options);
}

export default apiFetch;
