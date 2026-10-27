import { api } from './api';

export interface TableInfo {
  token: string;
  number: number;
  nickname?: string;
}

export function fetchTableByToken(slug: string, token: string): Promise<TableInfo> {
  return api.get<TableInfo>(
    `/api/public/stores/${encodeURIComponent(slug)}/tables/${encodeURIComponent(token)}`,
    { anonymous: true },
  );
}

export function fetchTableByNumber(slug: string, number: number): Promise<TableInfo> {
  return api.get<TableInfo>(`/api/public/stores/${encodeURIComponent(slug)}/tables?number=${number}`, {
    anonymous: true,
  });
}

export function formatTableNumber(number: number): string {
  return String(number).padStart(2, '0');
}
