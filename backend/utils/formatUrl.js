// backend/utils/formatUrl.js
// Utility to prepend base backend URL to relative upload asset paths

export function formatAssetUrl(urlOrPath, fallbackName = '') {
  if (!urlOrPath || typeof urlOrPath !== 'string' || urlOrPath.trim() === '') {
    if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim() !== '') {
      const name = encodeURIComponent(fallbackName.trim());
      return `https://ui-avatars.com/api/?name=${name}&background=0284c7&color=fff&size=200`;
    }
    return null;
  }
  const clean = urlOrPath.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }

  const baseUrl = (
    process.env.BASE_URL || 
    process.env.RENDER_EXTERNAL_URL || 
    'https://zipride-1.onrender.com'
  ).replace(/\/$/, '');

  const relativePath = clean.startsWith('/') ? clean : `/${clean}`;
  return `${baseUrl}${relativePath}`;
}

export default formatAssetUrl;
