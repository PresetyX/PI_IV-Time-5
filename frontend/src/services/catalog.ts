import { api } from './api';

export interface CatalogOption {
  label: string;
  deltaCents: number;
}

export interface CatalogOptionGroup {
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: CatalogOption[];
}

export interface CatalogProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  prepMinutes: number | null;
  available: boolean;
  unavailableSince: string | null;
  isAlcoholic: boolean | null;
  position: number;
  optionGroups: CatalogOptionGroup[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  position: number;
  visible: boolean;
  products: CatalogProduct[];
}

export interface Catalog {
  categories: CatalogCategory[];
}

export interface ProductChanges {
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  prepMinutes: number | null;
  isAlcoholic: boolean;
  available: boolean;
}

export function fetchCatalog(): Promise<Catalog> {
  return api.get<Catalog>('/api/management/products');
}

export function updateProduct(id: string, changes: ProductChanges): Promise<CatalogProduct> {
  return api.put<CatalogProduct>(`/api/management/products/${id}`, changes);
}

export function setProductAvailability(id: string, available: boolean): Promise<CatalogProduct> {
  return api.patch<CatalogProduct>(`/api/management/products/${id}/availability`, { available });
}
