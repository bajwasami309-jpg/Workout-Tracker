export const DAYS = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];

export const STORAGE_KEY = 'workout-tracker-data';

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date`. */
export function getWeekStartMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return formatDate(d);
}

/** Index 0 = Mon … 6 = Sun (matches DAYS order). */
export function getTodayIndex(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export function createEmptyWeek() {
  const week = {};
  for (const day of DAYS) {
    week[day] = { workedOut: false, workoutsDone: '', workoutsPlanned: '' };
  }
  return week;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getCurrentWeekData(data) {
  const weekStart = getWeekStartMonday();

  if (!data) {
    data = {
      ownerName: 'Sami',
      weeks: {},
    };
  }

  if (!data.weeks[weekStart]) {
    data.weeks[weekStart] = createEmptyWeek();
    saveData(data);
  }

  return { data, weekStart, week: data.weeks[weekStart] };
}

export function updateDay(data, weekStart, day, updates) {
  // Ensure a minimal structure if `data` is missing (avoid crashes when
  // event handlers call updateDay(loadData(), ... ) and localStorage is empty).
  if (!data) data = { ownerName: 'Sami', weeks: {} };
  if (!data.weeks) data.weeks = {};
  if (!data.weeks[weekStart]) data.weeks[weekStart] = createEmptyWeek();

  const week = data.weeks[weekStart];
  week[day] = { ...week[day], ...updates };
  saveData(data);
}
