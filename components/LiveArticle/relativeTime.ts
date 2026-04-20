/**
 * Convert an ISO timestamp into a short, human-readable relative string.
 *
 * Examples:
 *   "Just now"
 *   "2 min ago"
 *   "1 hour ago"
 *   "3 days ago"
 */
export function formatRelativeTime(input: string | Date | null | undefined, now: Date = new Date()): string {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();

  // Future timestamps: treat as "just now" rather than showing negatives.
  if (diffMs < 0) return 'Just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
