import { useEffect, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { fetchBill } from '../../services/bill';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';
import { ClocheIcon, CloseIcon } from './icons';

const REFRESH_MS = 6000;
const HIDE_AFTER_MS = 12000;
const { fontSize, fontWeight, radius } = tokens;

interface ReadyOrder {
  id: string;
  number: number;
}

function seenKey(slug: string): string {
  return `pedeai.ready.${slug}`;
}

function readSeen(slug: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(seenKey(slug)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function markSeen(slug: string, ids: string[]) {
  try {
    sessionStorage.setItem(seenKey(slug), JSON.stringify([...new Set([...readSeen(slug), ...ids])]));
  } catch {
    // Sem sessionStorage o aviso só pode repetir depois de recarregar a página.
  }
}

/** Avisa no topo de qualquer tela do cliente quando um pedido da comanda fica pronto, uma vez por pedido. */
export default function OrderReadyNotifier() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const slug = matchPath('/t/:slug/*', pathname)?.params.slug ?? null;
  const hasTab = slug !== null && Boolean(readVisit(slug).guestToken);
  const [ready, setReady] = useState<ReadyOrder | null>(null);

  useEffect(() => {
    if (!slug || !hasTab) return undefined;
    let stopped = false;
    async function check(currentSlug: string) {
      try {
        const bill = await fetchBill(currentSlug);
        const seen = readSeen(currentSlug);
        const fresh = bill.orders.filter((order) => order.status === 'READY' && !seen.includes(order.id));
        if (stopped || fresh.length === 0) return;
        markSeen(currentSlug, fresh.map((order) => order.id));
        const latest = fresh[fresh.length - 1];
        setReady({ id: latest.id, number: latest.number });
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // Sem comanda ou sem conexão: as telas já mostram o próprio erro.
      }
    }
    check(slug);
    const timer = window.setInterval(() => check(slug), REFRESH_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [slug, hasTab]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = window.setTimeout(() => setReady(null), HIDE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!slug || !ready || pathname === `/t/${slug}/pedidos/${ready.id}`) return null;

  return (
    <Box
      role="status"
      sx={{
        position: 'fixed',
        top: 12,
        left: 0,
        right: 0,
        zIndex: 1400,
        px: 3,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        animation: 'orderReadyIn .35s ease-out',
        '@keyframes orderReadyIn': { from: { opacity: 0, transform: 'translateY(-24px)' }, to: { opacity: 1, transform: 'none' } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 366,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 3,
          pr: 1,
          py: 2,
          borderRadius: `${radius.card}px`,
          bgcolor: 'primary.main',
          color: '#FFFFFF',
          boxShadow: '0 18px 40px -16px rgba(0,0,0,.55)',
          pointerEvents: 'auto',
        }}
      >
        <ButtonBase
          onClick={() => {
            setReady(null);
            navigate(`/t/${slug}/pedidos/${ready.id}`);
          }}
          sx={{ flex: 1, minWidth: 0, gap: 3, justifyContent: 'flex-start', textAlign: 'left', fontFamily: 'inherit' }}
        >
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              bgcolor: 'rgba(255,255,255,.18)',
            }}
          >
            <ClocheIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold, lineHeight: 1.2 }}>
              Pedido #{ready.number} ficou pronto
            </Typography>
            <Typography sx={{ fontSize: fontSize.caption, opacity: 0.9 }}>
              O garçom já está levando. Toque para ver.
            </Typography>
          </Box>
        </ButtonBase>
        <IconButton onClick={() => setReady(null)} aria-label="Fechar aviso" sx={{ color: 'inherit', flexShrink: 0 }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
