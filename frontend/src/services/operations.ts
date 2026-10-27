import { api } from './api';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
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
  RECEIVED: 'Recebido', PREPARING: 'Em preparo', READY: 'Pronto', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
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
};
export function orderTitle(order: KitchenOrder): string {
  if (order.mode === 'COUNTER') return `Balcão · pedido #${order.number}`;
  if (order.tableNumber !== null) return `Mesa ${String(order.tableNumber).padStart(2, '0')}`;
  return `Pedido #${order.number}`;
}
