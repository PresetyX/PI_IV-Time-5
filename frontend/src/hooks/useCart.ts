import { useCallback, useState } from 'react';
import { readCart, saveCart } from '../services/cart';
import type { CartLine } from '../services/cart';

/** Carrinho com estado React, gravado no localStorage a cada mudança. */
export function useCart(slug: string) {
  const [lines, setLines] = useState<CartLine[]>(() => readCart(slug));
  const update = useCallback(
    (next: CartLine[] | ((current: CartLine[]) => CartLine[])) => {
      setLines((current) => {
        const value = typeof next === 'function' ? next(current) : next;
        saveCart(slug, value);
        return value;
      });
    },
    [slug],
  );
  return [lines, update] as const;
}
