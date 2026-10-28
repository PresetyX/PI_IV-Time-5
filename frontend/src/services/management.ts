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

export type PaymentMethod = 'CASH' | 'PIX_MANUAL' | 'CARD_DEBIT' | 'CARD_CREDIT';

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX_MANUAL: 'Pix',
  CARD_DEBIT: 'Cartão de débito',
  CARD_CREDIT: 'Cartão de crédito',
};

export type HistoryPeriod = 'TODAY' | 'YESTERDAY' | 'WEEK';

export interface ClosedTab {
  id: string;
  name: string;
  origin: string;
  methods: PaymentMethod[];
  closedBy: string;
  totalCents: number;
  items: number;
  closedAt: string;
}

export interface History {
  period: HistoryPeriod;
  count: number;
  revenueCents: number;
  averageTicketCents: number;
  tabs: ClosedTab[];
}

export interface Withdrawal {
  reason: string;
  amountCents: number;
  at: string;
}

export interface CashView {
  open: boolean;
  openedAt: string | null;
  openedBy: string | null;
  openingFloatCents: number;
  methods: { method: PaymentMethod; amountCents: number }[];
  salesCents: number;
  withdrawals: Withdrawal[];
  commissionsCents: number;
  openTabs: number;
}

export interface WaiterCommission {
  userId: string;
  name: string;
  items: number;
  launchedCents: number;
  confirmedCents: number;
  pendingCents: number;
  reversedCents: number;
  paidCents: number;
  toPayCents: number;
}

export interface CommissionReport {
  from: string;
  to: string;
  rateBasisPoints: number;
  toPayCents: number;
  pendingCents: number;
  reversedCents: number;
  waiters: WaiterCommission[];
}

export type ServiceMode = 'TABLE' | 'COUNTER' | 'DELIVERY';

export interface StoreSettings {
  slug: string;
  name: string;
  tagline: string | null;
  primaryColor: string;
  serviceModes: ServiceMode[];
  requireCustomerPhone: boolean;
}

export interface Invitation {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  temporaryPassword: string;
}

export function fetchHistory(period: HistoryPeriod, search: string): Promise<History> {
  const query = search.trim() ? `&q=${encodeURIComponent(search.trim())}` : '';
  return api.get<History>(`/api/management/tabs/closed?period=${period}${query}`);
}

export function fetchCash(): Promise<CashView> {
  return api.get<CashView>('/api/management/cash');
}

export function openCash(openingFloatCents: number): Promise<CashView> {
  return api.post<CashView>('/api/management/cash/open', { openingFloatCents });
}

export function registerWithdrawal(reason: string, amountCents: number): Promise<CashView> {
  return api.post<CashView>('/api/management/cash/withdrawals', { reason, amountCents });
}

export function closeCash(counted: Partial<Record<PaymentMethod, number>>, note: string): Promise<unknown> {
  return api.post('/api/management/cash/close', { counted, note });
}

export function fetchCommissions(): Promise<CommissionReport> {
  return api.get<CommissionReport>('/api/management/commissions');
}

export function payCommissions(): Promise<CommissionReport> {
  return api.post<CommissionReport>('/api/management/commissions/pay');
}

export function fetchStoreSettings(): Promise<StoreSettings> {
  return api.get<StoreSettings>('/api/management/store');
}

export function saveStoreSettings(settings: Omit<StoreSettings, 'slug'>): Promise<StoreSettings> {
  return api.put<StoreSettings>('/api/management/store', settings);
}

export function inviteMember(name: string, email: string, role: StaffRole): Promise<Invitation> {
  return api.post<Invitation>('/api/management/team', { name, email, role });
}

export interface MemberChanges {
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

export function updateMember(id: string, changes: MemberChanges): Promise<TeamMember> {
  return api.put<TeamMember>(`/api/management/team/${id}`, changes);
}

export function deactivateMember(id: string): Promise<unknown> {
  return api.post(`/api/management/team/${id}/deactivate`);
}

export function parseCents(text: string): number {
  const clean = text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(clean);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
