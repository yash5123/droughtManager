export function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined) return ' - ';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export function formatDate(d) {
  if (!d) return ' - ';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(d) {
  if (!d) return ' - ';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateTime(d) {
  if (!d) return ' - ';
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatCoords(lat, lon) {
  if (lat === null || lon === null) return ' - ';
  return `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
}

export function formatPercent(v, decimals = 1) {
  if (v === null || v === undefined) return ' - ';
  return `${v.toFixed(decimals)}%`;
}

export function timeAgo(date) {
  if (!date) return ' - ';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
