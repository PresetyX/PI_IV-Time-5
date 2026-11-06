import type { TableInfo } from './tables';

export interface Visit {
  table?: TableInfo;
  scannedToken?: string;
  sessionId?: string;
  guestToken?: string;
  customerName?: string;
  /** [Mateus · Card 5] Visita de balcão: sessão sem mesa, com senha de retirada. */
  counter?: boolean;
  /** Sessão em que o cliente confirmou ter 18 anos ou mais; vale só enquanto for a mesma sessão. */
  ageConfirmedSessionId?: string;
}

function storageKey(slug: string): string {
  return `pedeai.visit.${slug}`;
}

export function readVisit(slug: string): Visit {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as Visit) : {};
  } catch {
    return {};
  }
}

/** A maioridade já foi confirmada nesta visita (mesma sessão de convidado). */
export function isAgeConfirmed(slug: string): boolean {
  const visit = readVisit(slug);
  return Boolean(visit.sessionId && visit.ageConfirmedSessionId === visit.sessionId);
}

export function confirmAge(slug: string): void {
  const visit = readVisit(slug);
  if (visit.sessionId) updateVisit(slug, { ageConfirmedSessionId: visit.sessionId });
}

export function updateVisit(slug: string, changes: Partial<Visit>): Visit {
  const next = { ...readVisit(slug), ...changes };
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}
