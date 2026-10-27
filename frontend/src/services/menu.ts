import { api } from './api';

export interface MenuOption {
  label: string;
  deltaCents: number;
}

export interface MenuOptionGroup {
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: MenuOption[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  imageUrl?: string;
  prepMinutes?: number;
  isAlcoholic?: boolean;
  optionGroups?: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
  products: MenuProduct[];
}

export interface MenuStore {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  tagline?: string;
}

export interface Menu {
  store: MenuStore;
  categories: MenuCategory[];
}

export function fetchMenu(slug: string): Promise<Menu> {
  return api.get<Menu>(`/api/public/stores/${encodeURIComponent(slug)}/menu`, { anonymous: true });
}
