import { api } from './api';

// [Mateus · Card 5] Painel de senhas do balcão (público, só números).
export interface PickupBoard {
  storeName: string;
  preparing: number[];
  ready: number[];
}

export function fetchPickupBoard(slug: string): Promise<PickupBoard> {
  return api.get<PickupBoard>(`/api/public/stores/${encodeURIComponent(slug)}/pickup-board`, { anonymous: true });
}
