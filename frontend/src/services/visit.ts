import type { TableInfo } from './tables';

export interface Visit {
  table?: TableInfo;
  scannedToken?: string;
  sessionId?: string;
  customerName?: string;
}

function storageKey(slug: string): string {
  return `pedeai.visit.${slug}`;
}

export function readVisit(slug: string): Visit {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as Visit) : {};
  } catch {
    return {};
  }
}

export function updateVisit(slug: string, changes: Partial<Visit>): Visit {
  const next = { ...readVisit(slug), ...changes };
  try {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}
