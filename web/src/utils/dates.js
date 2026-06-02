export function getLocalISODate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

export function formatRelativeTime(date) {
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const now = Date.now();
  const time = new Date(date).getTime();
  const diffInSeconds = Math.round((time - now) / 1000);

  const minutes = Math.round(diffInSeconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');

  const days = Math.round(hours / 24);
  return rtf.format(days, 'day');
}
