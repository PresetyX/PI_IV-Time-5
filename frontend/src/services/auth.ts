import { api, saveToken } from './api';

export type Role = 'OWNER' | 'MANAGER' | 'WAITER' | 'KITCHEN';

export interface LoginRequest {
  storeSlug: string;
  email: string;
  password: string;
}

export interface LoginUser {
  id: string;
  storeId: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: LoginUser;
}

const ROUTE_BY_ROLE: Record<Role, string> = {
  KITCHEN: '/producao',
  WAITER: '/salao',
  OWNER: '/gestao',
  MANAGER: '/gestao',
};

export function routeForRole(role: string): string | null {
  return ROUTE_BY_ROLE[role as Role] ?? null;
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/auth/login', request, { anonymous: true });
  saveToken(response.token);
  return response;
}
