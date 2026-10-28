import { useCallback, useEffect, useState } from 'react';

export function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    load()
      .then((value) => !cancelled && setData(value))
      .catch((caught) => !cancelled && setError(caught));
    return () => {
      cancelled = true;
    };
  }, [load, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, setData, error, reload };
}
