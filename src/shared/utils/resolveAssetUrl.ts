import { API_BASE } from '@/lib/api';

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const clean = url.trim();
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const path = clean.startsWith('/') ? clean : `/${clean}`;
  return `${API_BASE}${path}`;
}
