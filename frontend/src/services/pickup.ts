/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
import { api } from './api';

// Painel de senhas do balcão (público, só números).
export interface PickupBoard {
  storeName: string;
  preparing: number[];
  ready: number[];
}

export function fetchPickupBoard(slug: string): Promise<PickupBoard> {
  return api.get<PickupBoard>(`/api/public/stores/${encodeURIComponent(slug)}/pickup-board`, { anonymous: true });
}
