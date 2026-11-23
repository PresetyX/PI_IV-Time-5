/*
 * Autor: Pedro Henrique Bonetto da Costa
 * RA: 25018203
 */
import { api } from './api';

export type OrderStatus = 'AWAITING_PAYMENT' | 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type QueueStatus = 'ALL' | 'RECEIVED' | 'PREPARING' | 'READY';
export type QueueMode = 'ALL' | 'TABLE' | 'COUNTER';
export interface KitchenOrder {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  readyAt: string | null;
  mode: string;
  customerName: string | null;
  tableNumber: number | null;
  totalCents: number;
  items: { name: string; quantity: number; note: string | null; unitPriceCents: number; options: string[] }[];
}
export const statusLabels: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento', RECEIVED: 'Recebido', PREPARING: 'Em preparo', READY: 'Pronto', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
};
export const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: 'PREPARING', PREPARING: 'READY', READY: 'DELIVERED',
};
export const actionLabels: Partial<Record<OrderStatus, string>> = {
  RECEIVED: 'Iniciar preparo', PREPARING: 'Marcar pronto', READY: 'Aguardando entrega pelo salão',
};
export const operations = {
  queue: (status: QueueStatus, mode: QueueMode) => api.get<KitchenOrder[]>(`/api/operations/queue?status=${status}&mode=${mode}`),
  detail: (id: string) => api.get<KitchenOrder>(`/api/operations/orders/${encodeURIComponent(id)}`),
  changeStatus: (order: KitchenOrder, status: OrderStatus) => api.patch<{ id: string; status: OrderStatus }>(
    `/api/operations/orders/${encodeURIComponent(order.id)}/status`, { expectedStatus: order.status, status }),
  cancel: (id: string, reason: CancelReason, note: string) => api.post<{ id: string; status: OrderStatus }>(
    `/api/operations/orders/${encodeURIComponent(id)}/cancel`, { reason, note: note.trim() || undefined }),
  deliver: (id: string, itemIndexes: number[]) => api.post<{ id: string; status: OrderStatus }>(
    `/api/operations/orders/${encodeURIComponent(id)}/deliver`, { itemIndexes }),
  // Pagamento no caixa de um pedido de balcão; solta o pedido para a cozinha.
  pay: (id: string, method: string) => api.post<{ id: string; status: OrderStatus }>(
    `/api/operations/orders/${encodeURIComponent(id)}/pay`, { method }),
};
// Motivos aceitos pelo backend em POST /api/operations/orders/{id}/cancel.
export type CancelReason = 'GAVE_UP' | 'WRONG_ORDER' | 'OUT_OF_STOCK' | 'DUPLICATE';
export function orderTitle(order: KitchenOrder): string {
  if (order.mode === 'COUNTER') return `Balcão · pedido #${order.number}`;
  if (order.tableNumber !== null) return `Mesa ${String(order.tableNumber).padStart(2, '0')}`;
  return `Pedido #${order.number}`;
}
