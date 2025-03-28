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
