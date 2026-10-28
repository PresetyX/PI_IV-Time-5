import type { NextOpening, OpeningHours } from './store';

const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const CLOSED = 'Fechado';

export interface HoursGroup {
  label: string;
  value: string;
}

export function formatHour(value: string): string {
  const [hours, minutes] = value.split(':');
  const hour = Number(hours);
  return minutes === '00' ? `${hour}h` : `${hour}h${minutes}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeDay(hours: OpeningHours[], weekday: number): string {
  const entries = hours
    .filter((entry) => entry.weekday === weekday)
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  if (entries.length === 0) return CLOSED;
  return entries.map((entry) => `${formatHour(entry.opensAt)} às ${formatHour(entry.closesAt)}`).join(' e ');
}

function labelFor(days: number[]): string {
  const first = WEEKDAY_NAMES[days[0]];
  const last = WEEKDAY_NAMES[days[days.length - 1]];
  if (days.length === 1) return capitalize(first);
  if (days.length === 2) return capitalize(`${first} e ${last}`);
  return capitalize(`${first} a ${last}`);
}

export function groupOpeningHours(hours: OpeningHours[]): HoursGroup[] {
  const groups: { days: number[]; value: string }[] = [];
  for (const weekday of WEEK_ORDER) {
    const value = describeDay(hours, weekday);
    const previous = groups[groups.length - 1];
    if (previous && previous.value === value) {
      previous.days.push(weekday);
    } else {
      groups.push({ days: [weekday], value });
    }
  }
  const open = groups.filter((group) => group.value !== CLOSED);
  const closed = groups.filter((group) => group.value === CLOSED);
  return [...open, ...closed].map((group) => ({ label: labelFor(group.days), value: group.value }));
}

export function describeNextOpening(next: NextOpening): string {
  const time = formatHour(next.opensAt);
  if (next.daysFromToday === 0) return `hoje às ${time}`;
  if (next.daysFromToday === 1) return `amanhã às ${time}`;
  const name = WEEKDAY_NAMES[next.weekday];
  const preposition = next.weekday === 0 || next.weekday === 6 ? 'no' : 'na';
  return `${preposition} ${name} às ${time}`;
}
