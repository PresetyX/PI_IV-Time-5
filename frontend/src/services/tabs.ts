import { api, ApiError } from './api';
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

export interface OrderItemInput {
  productId: string;
  quantity: number;
  note?: string;
}

export interface PlacedOrder {
  id: string;
  number: number;
  status: string;
  totalCents: number;
}

/**
 * Envia o pedido. `expectedTotalCents` é o total que o cliente viu na tela: o backend confere com os preços
 * do banco pelo server e recusa com `price_changed` se forem diferentes.
 */
export function placeOrder(
  slug: string,
  items: OrderItemInput[],
  expectedTotalCents: number,
): Promise<PlacedOrder> {
  return api.post<PlacedOrder>('/api/tabs/mine/orders', { items, expectedTotalCents }, guest(slug));
}

/** Texto para a tela quando o envio do pedido falha. Em nenhum desses casos o pedido foi gravado. */
export function orderErrorMessage(caught: unknown): string {
  if (caught instanceof ApiError) {
    switch (caught.code) {
      case 'price_changed':
        return 'O preço de algum item mudou. Confira o carrinho e envie de novo.';
      case 'store_closed':
        return 'A casa não está aceitando pedidos agora.';
      case 'validation_unavailable':
        return 'Não conseguimos conferir seu pedido agora. Nada foi enviado. Tente de novo em instantes.';
    }
    if (caught.status === 409) {
      return 'Algum item acabou ou a casa parou de aceitar pedidos. Confira e tente de novo.';
    }
  }
  return 'Não foi possível enviar o pedido agora. Tente de novo.';
}

export interface RoundItem {
  productId: string;
  name: string;
  note?: string;
  quantity: number;
  unitPriceCents: number;
  available: boolean;
}

export interface RoundSuggestion {
  productId: string;
  name: string;
  priceCents: number;
  orderedBy?: string;
  orderedAt: string;
}

export interface Round {
  ownerName: string;
  tableNumber: number;
  lastOrderNumber?: number;
  lastOrderAt?: string;
  items: RoundItem[];
  suggestions: RoundSuggestion[];
}

export function fetchRound(slug: string): Promise<Round> {
  return api.get<Round>('/api/tabs/mine/round', guest(slug));
}

export interface TrackedLine {
  name: string;
  note?: string;
  quantity: number;
  totalCents: number;
  canceled: boolean;
}

export interface TrackedOrder {
  id: string;
  number: number;
  status: string;
  tableNumber: number;
  createdAt: string;
  items: TrackedLine[];
  totalCents: number;
  timeline: { status: string; at: string }[];
}

export function fetchOrder(slug: string, orderId: string): Promise<TrackedOrder> {
  return api.get<TrackedOrder>(`/api/tabs/mine/orders/${orderId}`, guest(slug));
}

export type WaiterCallType = 'CLOSE_BILL' | 'QUESTION' | 'MISSING_ITEM' | 'ORDER_PROBLEM';

export interface WaiterCall {
  id: string;
  type: WaiterCallType;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export function fetchWaiterCalls(slug: string): Promise<WaiterCall[]> {
  return api.get<WaiterCall[]>('/api/tabs/mine/calls', guest(slug));
}

export function callWaiter(slug: string, type: WaiterCallType): Promise<WaiterCall> {
  return api.post<WaiterCall>('/api/tabs/mine/calls', { type }, guest(slug));
}
