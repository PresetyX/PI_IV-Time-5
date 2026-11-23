/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
import { api } from './api';
import { readVisit } from './visit';

/** Item da conta, com quem pediu e o status. */
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

/** Total de cada pessoa da comanda. */
export interface BillPerson {
  id: string;
  name: string;
  owner: boolean;
  totalCents: number;
}

/** Pedido que aparece na conta. */
export interface BillOrder {
  id: string;
  number: number;
  status: string;
  items: BillLine[];
}

/** Conta da comanda: pedidos, consumo, taxa de serviço e total. */
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

// Nome em português de cada status de pedido.
const ORDER_STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  CANCELLED: 'Cancelado',
};

/** Busca a conta da comanda do cliente. */
export function fetchBill(slug: string): Promise<Bill> {
  return api.get<Bill>('/api/tabs/mine/bill', { token: readVisit(slug).guestToken });
}

/** Dados do Pix da conta. `payload` é o código copia e cola. */
export interface Pix {
  tabId: string;
  storeName: string;
  amountCents: number;
  payload?: string;
}

/** Busca o Pix para pagar a conta da comanda. */
export function fetchPix(slug: string): Promise<Pix> {
  return api.get<Pix>('/api/tabs/mine/pix', { token: readVisit(slug).guestToken });
}

/** Traduz o status do pedido; devolve o próprio status se não conhecer. */
export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}
