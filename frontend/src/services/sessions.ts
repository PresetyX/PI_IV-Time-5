import { api } from './api';
import type { ServiceMode } from './store';
import type { TableInfo } from './tables';

export interface CreateSessionRequest {
  storeSlug: string;
  mode: ServiceMode;
  tableToken?: string;
  name: string;
  phone?: string;
}

export interface SessionInfo {
  token: string;
  tokenType: string;
  id: string;
  mode: ServiceMode;
  name: string;
  table?: TableInfo;
  expiresAt: string;
}

export function createSession(request: CreateSessionRequest): Promise<SessionInfo> {
  return api.post<SessionInfo>('/api/public/sessions', request, { anonymous: true });
}
