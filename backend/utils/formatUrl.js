// backend/utils/formatUrl.js
// Utility to prepend base backend URL to relative upload asset paths

export function formatAssetUrl(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string' || urlOrPath.trim() === '') {
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
