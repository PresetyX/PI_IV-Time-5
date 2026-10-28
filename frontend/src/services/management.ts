import { api } from './api';

export type ReportPeriod = 'TODAY' | 'WEEK' | 'MONTH';

export interface HourRevenue {
  hour: number;
  revenueCents: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
}

export interface ReportSummary {
  period: ReportPeriod;
  revenueCents: number;
  previousRevenueCents: number;
  tabs: number;
  previousTabs: number;
  averageTicketCents: number;
  previousAverageTicketCents: number;
  averagePrepMinutes: number | null;
  previousAveragePrepMinutes: number | null;
  byHour: HourRevenue[];
  topProducts: TopProduct[];
}

export type AbcClass = 'A' | 'B' | 'C';

export interface AbcRow {
  productId: string;
  name: string;
  category: string;
  abcClass: AbcClass;
  quantity: number;
  revenueCents: number;
  cumulativePercent: number;
}

export interface AbcReport {
  days: number;
  productsInMenu: number;
  totalRevenueCents: number;
  rows: AbcRow[];
}

export type StaffRole = 'OWNER' | 'MANAGER' | 'WAITER' | 'KITCHEN';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  lastLoginAt: string | null;
}

export function fetchSummary(period: ReportPeriod): Promise<ReportSummary> {
  return api.get<ReportSummary>(`/api/management/reports/summary?period=${period}`);
}

export function fetchAbc(days = 30): Promise<AbcReport> {
  return api.get<AbcReport>(`/api/management/reports/abc?days=${days}`);
}

export function fetchTeam(): Promise<TeamMember[]> {
  return api.get<TeamMember[]>('/api/management/team');
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: 'Dono',
  MANAGER: 'Gerente',
  WAITER: 'Salão',
  KITCHEN: 'Cozinha',
};

export const ROLE_COLORS: Record<StaffRole, string> = {
  OWNER: '#111111',
  MANAGER: '#7B3FC4',
  WAITER: '#1F6FD6',
  KITCHEN: '#157A4A',
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
