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
  /** 0 na comanda de balcão. */
  tableNumber: number;
  /** [Mateus · Card 5] TABLE ou COUNTER. */
  mode?: 'TABLE' | 'COUNTER';
  /** [Mateus · Card 5] Senha do balcão, depois do primeiro pedido. */
  pickupTicket?: number | null;
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

/** Opção escolhida, pelo nome do grupo e da opção. O preço vem sempre do cadastro no backend. */
export interface SelectedOption {
  group: string;
  label: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  note?: string;
  options?: SelectedOption[];
}

export interface PlacedOrder {
  id: string;
  number: number;
  status: string;
  totalCents: number;
  /** Senha do balcão; ausente no pedido de mesa. */
  pickupTicket?: number | null;
}

/**
 * Envia o pedido. `expectedTotalCents` é o total que o cliente viu na tela: o backend confere com os preços
 * do banco pelo server e recusa com `price_changed` se forem diferentes. Pedido com bebida alcoólica exige
 * `ageConfirmed`; sem ele o backend recusa com `age_confirmation_required` (422).
 */
export function placeOrder(
  slug: string,
  items: OrderItemInput[],
  expectedTotalCents: number,
  ageConfirmed = false,
): Promise<PlacedOrder> {
  return api.post<PlacedOrder>(
    '/api/tabs/mine/orders',
    { items, expectedTotalCents, ageConfirmed },
    guest(slug),
  );
}

export function needsAgeConfirmation(caught: unknown): boolean {
  return caught instanceof ApiError && caught.code === 'age_confirmation_required';
}

/** Texto para a tela quando o envio do pedido falha. Em nenhum desses casos o pedido foi gravado. */
export function orderErrorMessage(caught: unknown): string {
  if (caught instanceof ApiError) {
    switch (caught.code) {
      case 'price_changed':
        return 'O preço de algum item mudou. Confira o carrinho e envie de novo.';
      case 'store_closed':
        return 'A casa não está aceitando pedidos agora.';
      case 'item_unavailable':
        return 'Algum item do carrinho acabou. Confira e tente de novo.';
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
  /** Já inclui as opções. */
  unitPriceCents: number;
  available: boolean;
  options?: SelectedOption[];
}

export interface RoundSuggestion {
  productId: string;
  name: string;
  /** Já inclui as opções. */
  priceCents: number;
  orderedBy?: string;
  orderedAt: string;
  options?: SelectedOption[];
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
  options?: string[];
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

// [Mateus · Card 5] Senha do balcão vista pelo cliente; continua respondendo depois de a comanda fechar.
export interface PickupLine {
  name: string;
  quantity: number;
  options: string[];
  status: string;
}

export interface PickupOrder {
  id: string;
  number: number;
  status: string;
  totalCents: number;
  createdAt: string;
  items: PickupLine[];
}

export interface PickupInfo {
  tabId: string;
  pickupTicket: number | null;
  /** CLOSED quer dizer retirada confirmada. */
  tabStatus: string;
  customerName: string;
  totalCents: number;
  paidCents: number;
  orders: PickupOrder[];
}

export function fetchPickup(slug: string): Promise<PickupInfo> {
  return api.get<PickupInfo>('/api/tabs/mine/pickup', guest(slug));
}
