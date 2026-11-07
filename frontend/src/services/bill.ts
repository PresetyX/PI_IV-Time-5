import { api } from './api';
import { readVisit } from './visit';

export interface BillLine {
  name: string;
  note?: string;
  quantity: number;
  totalCents: number;
  status: string;
  canceled: boolean;
  personId?: string;
  orderedBy?: string;
  orderedAt?: string;
}

export interface BillPerson {
  id: string;
  name: string;
  owner: boolean;
  totalCents: number;
}

export interface BillOrder {
  id: string;
  number: number;
  status: string;
  items: BillLine[];
}

export interface Bill {
  tabId: string;
  ownerName: string;
  tableNumber: number;
  openedAt: string;
  orders: BillOrder[];
  consumptionCents: number;
  serviceFeeCents: number;
  totalCents: number;
  owner?: boolean;
  people?: BillPerson[];
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
  // [Mateus · Card 5] Alteração: pedido de balcão esperando o pagamento no caixa.
  AWAITING_PAYMENT: 'Aguardando pagamento',
  // [Mateus · Card 4] Alteração: o backend grava CANCELLED (com dois L) ao cancelar o pedido.
  CANCELLED: 'Cancelado',
};

export function fetchBill(slug: string): Promise<Bill> {
  return api.get<Bill>('/api/tabs/mine/bill', { token: readVisit(slug).guestToken });
}

export interface Pix {
  tabId: string;
  storeName: string;
  amountCents: number;
  payload?: string;
}

export function fetchPix(slug: string): Promise<Pix> {
  return api.get<Pix>('/api/tabs/mine/pix', { token: readVisit(slug).guestToken });
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}
