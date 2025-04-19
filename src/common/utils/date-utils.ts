import {
  isSameDay,
  isSameYear,
  differenceInHours,
  formatDistanceToNow,
} from 'date-fns';

export function isValidDate(value: string): boolean {
  // Check if format matches YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  // Convert to Date object and check validity
  const date = new Date(value);
  if (isNaN(date.getTime()) || value !== date.toISOString().split('T')[0]) {
    return false; // Ensure it's a real date (e.g., no "2024-02-30")
  }

  return true;
}

export const getDateRange = (start: Date, end: Date) => {
  const dates: string[] = [];
  const current = start;
  current.setHours(23, 59, 59, 999);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatInTimeZone = (
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    ...options,
  }).format(date);
};

export const formatTimestamp = (timestamp: Date, timeZone = 'Asia/Manila') => {
  const date = new Date(timestamp);
  const now = new Date();

  const sameDay = isSameDay(date, now);
  const sameYear = isSameYear(date, now);
  const hoursAgo = differenceInHours(now, date);

  let value = '';

  if (sameDay && hoursAgo <= 3) {
    value = formatDistanceToNow(date, { addSuffix: true });
  } else if (sameDay) {
    value = formatInTimeZone(date, timeZone, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }); // "01:22 PM"
  } else if (sameYear) {
    value = formatInTimeZone(date, timeZone, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }); // "Apr 19, 01:22 PM"
  } else {
    value = formatInTimeZone(date, timeZone, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }); // "Apr 19 2024, 01:22 PM"
  }

  return value;
};
