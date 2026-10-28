import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../services/api';
import { readVisit, updateVisit } from '../services/visit';

/** Caminho para onde mandar quem ainda não tem sessão de convidado, ou null quando já tem. */
export function guestGatePath(slug: string): string | null {
  const visit = readVisit(slug);
  if (visit.guestToken && visit.sessionId && visit.table) return null;
  return visit.table ? `/t/${slug}/identificacao` : `/t/${slug}/mesa?next=identificacao`;
}

/** Trata o 401 (sessão vencida) voltando para a identificação. Devolve true quando tratou o erro. */
export function useExpiredSession(slug: string) {
  const navigate = useNavigate();
  return useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError) || error.status !== 401) return false;
      updateVisit(slug, { sessionId: undefined, guestToken: undefined });
      navigate(`/t/${slug}/identificacao`, { replace: true });
      return true;
    },
    [slug, navigate],
  );
}
