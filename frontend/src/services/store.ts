import { api } from './api';

export type ServiceMode = 'TABLE' | 'COUNTER' | 'DELIVERY';

export interface OpeningHours {
  weekday: number;
  opensAt: string;
  closesAt: string;
  lastOrderAt?: string;
}

export interface StoreAddress {
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface NextOpening {
  weekday: number;
  opensAt: string;
  daysFromToday: number;
}

export interface StoreStatus {
  open: boolean;
  acceptingOrders: boolean;
  paused: boolean;
  closesAt?: string;
  lastOrderAt?: string;
  nextOpening?: NextOpening;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  kind?: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor: string;
  address?: StoreAddress;
  openingHours: OpeningHours[];
  serviceModes: ServiceMode[];
  serviceFeeBasisPoints: number;
  requireCustomerPhone: boolean;
  highlights: string[];
  averagePrepMinutes?: number;
  status: StoreStatus;
}

export function fetchStore(slug: string): Promise<Store> {
  return api.get<Store>(`/api/public/stores/${encodeURIComponent(slug)}`, { anonymous: true });
}

export function formatStreet(address?: StoreAddress): string | null {
  if (!address?.street) return null;
  return address.number ? `${address.street}, ${address.number}` : address.street;
}
