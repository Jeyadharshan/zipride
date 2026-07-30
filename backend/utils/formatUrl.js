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
    if (clean.startsWith('http://') && !clean.includes('localhost') && !clean.includes('127.0.0.1')) {
      return clean.replace(/^http:\/\//i, 'https://');
    }
    return clean;
  }

  let baseUrl = (
    process.env.BASE_URL || 
    process.env.RENDER_EXTERNAL_URL || 
    ''
  ).replace(/\/$/, '');

  if (baseUrl && baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    baseUrl = baseUrl.replace(/^http:\/\//i, 'https://');
  }

  const relativePath = clean.startsWith('/') ? clean : `/${clean}`;
  return baseUrl ? `${baseUrl}${relativePath}` : relativePath;
}

export default formatAssetUrl;
