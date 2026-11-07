import { api } from './api';

export interface ManagedTable {
  id: string;
  number: number;
  nickname: string | null;
  seats: number | null;
  token: string;
  active: boolean;
  createdAt: string;
  openTabs: number;
}

export interface TableChanges {
  number: number;
  nickname: string | null;
  seats: number | null;
}

export function fetchManagedTables(): Promise<ManagedTable[]> {
  return api.get<ManagedTable[]>('/api/management/tables');
}

export function createTable(changes: TableChanges): Promise<ManagedTable> {
  return api.post<ManagedTable>('/api/management/tables', changes);
}

export function updateTable(id: string, changes: TableChanges): Promise<ManagedTable> {
  return api.put<ManagedTable>(`/api/management/tables/${id}`, changes);
}

export function setTableActive(id: string, active: boolean): Promise<ManagedTable> {
  return api.patch<ManagedTable>(`/api/management/tables/${id}/active`, { active });
}

export function regenerateTableToken(id: string): Promise<ManagedTable> {
  return api.post<ManagedTable>(`/api/management/tables/${id}/token`);
}

export function tableLink(slug: string, token: string): string {
  return `${window.location.origin}/t/${slug}/${token}`;
}

export function tableLabel(number: number): string {
  return String(number).padStart(2, '0');
}
