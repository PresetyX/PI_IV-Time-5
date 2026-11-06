import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { fetchPickupBoard } from '../../services/pickup';
import type { PickupBoard } from '../../services/pickup';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 5000;
const { colors, fontSize, fontWeight, radius } = tokens;

/**
 * [Mateus · Card 5] Painel de senhas do balcão para TV. Público e sem login: só os números das senhas de hoje,
 * em preparo (já pagas) e prontas para retirar.
 */
export default function PickupBoardPage() {
  const { slug = '' } = useParams();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const [board, setBoard] = useState<PickupBoard | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await fetchPickupBoard(slug));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (state.status === 'loading' || (board === null && !offline)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.panel, p: { xs: 5, md: 8 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, mb: 6 }}>
        <Typography variant="h1" sx={{ fontSize: fontSize.display }}>
          {state.store.name} · senhas do balcão
        </Typography>
        {offline && (
          <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold, color: colors.error }}>
            Sem conexão, tentando de novo…
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 5 }}>
        <Column title="Preparando" numbers={board?.preparing ?? []} />
        <Column title="Pronto · retire no balcão" numbers={board?.ready ?? []} highlight />
      </Box>
    </Box>
  );
}

function Column({ title, numbers, highlight = false }: { title: string; numbers: number[]; highlight?: boolean }) {
  return (
    <Box
      sx={{
        p: 6,
        minHeight: 320,
        borderRadius: `${radius.card}px`,
        bgcolor: highlight ? 'primary.main' : colors.background,
        color: highlight ? '#FFFFFF' : colors.text,
        border: highlight ? 'none' : `1px solid ${colors.border}`,
      }}
    >
      <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>{title}</Typography>
      {numbers.length === 0 ? (
        <Typography sx={{ mt: 6, fontSize: fontSize.lead, opacity: 0.7 }}>Nenhuma senha agora</Typography>
      ) : (
        <Box component="ul" aria-label={title} sx={{ listStyle: 'none', m: 0, p: 0, mt: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {numbers.map((number) => (
            <Box component="li" key={number} sx={{ fontSize: 72, fontWeight: fontWeight.extraBold, lineHeight: 1, minWidth: 96 }}>
              {number}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
