import type { MenuProduct } from './menu';
import type { OrderItemInput } from './tabs';
import { readVisit } from './visit';

export const MAX_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 30;
export const MAX_NOTE_LENGTH = 140;

export interface CartOption {
  group: string;
  label: string;
  deltaCents: number;
}

export interface CartLine {
  /** Mesmo produto com as mesmas opções e a mesma observação vira uma linha só. */
  key: string;
  productId: string;
  name: string;
  basePriceCents: number;
  options: CartOption[];
  quantity: number;
  note: string;
  isAlcoholic: boolean;
}

interface StoredCart {
  sessionId?: string;
  lines: CartLine[];
}

function storageKey(slug: string): string {
  return `pedeai.cart.${slug}`;
}

function lineKey(productId: string, options: CartOption[], note: string): string {
  const picked = options.map((option) => `${option.group}=${option.label}`).sort().join('&');
  return `${productId}|${picked}|${note.trim()}`;
}

/** Preço de uma unidade com as opções. */
export function unitPrice(line: Pick<CartLine, 'basePriceCents' | 'options'>): number {
  return line.basePriceCents + line.options.reduce((sum, option) => sum + option.deltaCents, 0);
}

export function lineTotal(line: CartLine): number {
  return unitPrice(line) * line.quantity;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Carrinho da sessão atual. Carrinho de outra sessão (cliente entrou de novo) é descartado. */
export function readCart(slug: string): CartLine[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredCart;
    return stored.sessionId === readVisit(slug).sessionId && Array.isArray(stored.lines) ? stored.lines : [];
  } catch {
    return [];
  }
}

export function saveCart(slug: string, lines: CartLine[]): void {
  try {
    if (lines.length === 0) {
      localStorage.removeItem(storageKey(slug));
      return;
    }
    const stored: StoredCart = { sessionId: readVisit(slug).sessionId, lines };
    localStorage.setItem(storageKey(slug), JSON.stringify(stored));
  } catch {
    // Sem localStorage o carrinho vale só enquanto a página estiver aberta.
  }
}

export function addLine(
  lines: CartLine[],
  product: MenuProduct,
  options: CartOption[] = [],
  quantity = 1,
  note = '',
): CartLine[] {
  const key = lineKey(product.id, options, note);
  const existing = lines.find((line) => line.key === key);
  if (existing) {
    return lines.map((line) =>
      line.key === key ? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, line.quantity + quantity) } : line,
    );
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [
    ...lines,
    {
      key,
      productId: product.id,
      name: product.name,
      basePriceCents: product.priceCents,
      options,
      quantity: Math.min(MAX_LINE_QUANTITY, quantity),
      note: note.trim(),
      isAlcoholic: Boolean(product.isAlcoholic),
    },
  ];
}

export function setQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter((line) => line.key !== key);
  return lines.map((line) => (line.key === key ? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : line));
}

/** Troca a observação; se ficar igual a outra linha do mesmo produto e opções, as duas viram uma. */
export function setNote(lines: CartLine[], key: string, note: string): CartLine[] {
  const text = note.slice(0, MAX_NOTE_LENGTH);
  const target = lines.find((line) => line.key === key);
  if (!target) return lines;
  const nextKey = lineKey(target.productId, target.options, text);
  const twin = lines.find((line) => line.key === nextKey && line.key !== key);
  if (twin) {
    return lines
      .filter((line) => line.key !== key)
      .map((line) =>
        line.key === nextKey ? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, line.quantity + target.quantity) } : line,
      );
  }
  return lines.map((line) => (line.key === key ? { ...line, key: nextKey, note: text } : line));
}

export function toOrderItems(lines: CartLine[]): OrderItemInput[] {
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    note: line.note.trim() || undefined,
    options: line.options.map(({ group, label }) => ({ group, label })),
  }));
}

export interface PriceChange {
  key: string;
  name: string;
  fromCents: number;
  toCents: number;
}

export interface CartRefresh {
  lines: CartLine[];
  /** Linhas que saíram: produto fora do cardápio ou opção que não existe mais. */
  removed: CartLine[];
  changes: PriceChange[];
}

/**
 * Confere o carrinho contra o cardápio de agora: atualiza preço do produto e das opções e separa o que saiu.
 * O cardápio público só traz produtos disponíveis.
 */
export function refreshWithMenu(lines: CartLine[], products: MenuProduct[]): CartRefresh {
  const byId = new Map(products.map((product) => [product.id, product]));
  const kept: CartLine[] = [];
  const removed: CartLine[] = [];
  const changes: PriceChange[] = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) {
      removed.push(line);
      continue;
    }
    const options: CartOption[] = [];
    let valid = true;
    for (const option of line.options) {
      const found = product.optionGroups
        ?.find((group) => group.name === option.group)
        ?.options.find((candidate) => candidate.label === option.label);
      if (!found) {
        valid = false;
        break;
      }
      options.push({ ...option, deltaCents: found.deltaCents });
    }
    if (!valid) {
      removed.push(line);
      continue;
    }
    const next = { ...line, name: product.name, basePriceCents: product.priceCents, options, isAlcoholic: Boolean(product.isAlcoholic) };
    if (unitPrice(next) !== unitPrice(line)) {
      changes.push({ key: line.key, name: product.name, fromCents: unitPrice(line), toCents: unitPrice(next) });
    }
    kept.push(next);
  }
  return { lines: kept, removed, changes };
}
