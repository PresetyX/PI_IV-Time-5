import { api } from './api';
import { readVisit } from './visit';

export interface TabSummary {
  id: string;
  ownerName: string;
  peopleCount: number;
  totalCents: number;
  openedAt: string;
  mine: boolean;
}

export interface TabMember {
  sessionId: string;
  name: string;
  owner: boolean;
  totalCents: number;
  joinedAt: string;
}

export interface Tab {
  id: string;
  tableNumber: number;
  ownerName: string;
  owner: boolean;
  joinCode?: string;
  joinCodeExpiresAt?: string;
  totalCents: number;
  openedAt: string;
  members: TabMember[];
}

function guest(slug: string) {
  return { token: readVisit(slug).guestToken };
}

export function fetchTabs(slug: string): Promise<TabSummary[]> {
  return api.get<TabSummary[]>('/api/tabs', guest(slug));
}

export function openTab(slug: string): Promise<Tab> {
  return api.post<Tab>('/api/tabs', undefined, guest(slug));
}

export function fetchMyTab(slug: string): Promise<Tab> {
  return api.get<Tab>('/api/tabs/mine', guest(slug));
}

export function joinTab(slug: string, tabId: string, code: string): Promise<Tab> {
  return api.post<Tab>(`/api/tabs/${tabId}/join`, { code }, guest(slug));
}

export function renewTabCode(slug: string, tabId: string): Promise<Tab> {
  return api.post<Tab>(`/api/tabs/${tabId}/code`, undefined, guest(slug));
}

export function removeTabMember(slug: string, tabId: string, sessionId: string): Promise<Tab> {
  return api.delete<Tab>(`/api/tabs/${tabId}/participants/${sessionId}`, guest(slug));
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
}
