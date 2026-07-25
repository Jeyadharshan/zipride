// src/shared/utils/resolveAssetUrl.ts
// Resolves a backend asset path (e.g. "/uploads/photo.jpg") to a full URL.
//
// Rules:
//  - If the value is already an absolute URL (http/https), return it as-is.
//  - Otherwise, prefix it with the backend API base URL from the environment.
//
// In production: VITE_API_URL = https://zipride-1.onrender.com
// In development: VITE_API_URL = http://localhost:5000 (or proxied via Vite)

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_URL}${path}`;
}
