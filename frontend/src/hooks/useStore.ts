import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchStore } from '../services/store';
import type { Store } from '../services/store';

export type StoreState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; store: Store };

const cache = new Map<string, Store>();

function initialState(slug: string): StoreState {
  const cached = cache.get(slug);
  return cached ? { status: 'ready', store: cached } : { status: 'loading' };
}

export function useStore(slug: string) {
  const [state, setState] = useState<StoreState>(() => initialState(slug));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(initialState(slug));
    fetchStore(slug)
      .then((store) => {
        cache.set(slug, store);
        if (!cancelled) setState({ status: 'ready', store });
      })
      .catch((error: unknown) => {
        if (cancelled || cache.has(slug)) return;
        setState({ status: 'error', notFound: error instanceof ApiError && error.status === 404 });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry };
}
