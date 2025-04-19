import {
  isSameDay,
  isSameYear,
  differenceInHours,
  formatDistanceToNow,
  format as formatDate,
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

export const formatTimestamp = (
  timestamp: Date,
  timeZoneOffsetMinutes = 480,
) => {
  // Shift the timestamp from UTC to your target local time (default is UTC+8)
  const localTime = new Date(
    timestamp.getTime() + timeZoneOffsetMinutes * 60 * 1000,
  );
  const now = new Date(
    new Date().getTime() + timeZoneOffsetMinutes * 60 * 1000,
  );

  const sameDay = isSameDay(localTime, now);
  const sameYear = isSameYear(localTime, now);
  const hoursAgo = differenceInHours(now, localTime);

  let value = '';

  if (sameDay && hoursAgo <= 3) {
    value = formatDistanceToNow(localTime, { addSuffix: true });
  } else if (sameDay) {
    value = formatDate(localTime, 'hh:mm a');
  } else if (sameYear) {
    value = formatDate(localTime, 'MMM d, hh:mm a');
  } else {
    value = formatDate(localTime, 'MMM d yyyy, hh:mm a');
  }

  return formatDate(localTime, 'MMM d, hh:mm a');
};
