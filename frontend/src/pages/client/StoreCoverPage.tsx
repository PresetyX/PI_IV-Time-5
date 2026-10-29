import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BrandMark from '../../components/BrandMark';
import { Box, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { ArrowRightIcon } from '../../components/client/icons';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { formatHour } from '../../services/hours';
import type { Store } from '../../services/store';
import { fetchTableByToken, formatTableNumber } from '../../services/tables';
import { readVisit, updateVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;
const HERO_PILL = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  height: 32,
  px: 3,
  borderRadius: 999,
  bgcolor: 'rgba(255, 255, 255, 0.2)',
  color: colors.background,
  fontSize: fontSize.small,
  fontWeight: fontWeight.extraBold,
};

export default function StoreCoverPage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);

  const scannedToken = searchParams.get('mesa');
  useEffect(() => {
    if (scannedToken) updateVisit(slug, { scannedToken });
  }, [slug, scannedToken]);

  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (!state.store.status.acceptingOrders) return <ClosedStoreScreen store={state.store} />;
  return <StoreCover store={state.store} />;
}

function StoreCover({ store }: { store: Store }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tableNumber, setTableNumber] = useState(() => readVisit(store.slug).table?.number);

  const currentToken = useCallback(() => {
    const visit = readVisit(store.slug);
    return searchParams.get('mesa') ?? visit.scannedToken ?? visit.table?.token;
  }, [store.slug, searchParams]);

  useEffect(() => {
    const token = currentToken();
    if (!token || readVisit(store.slug).table?.token === token) return undefined;
    let cancelled = false;
    fetchTableByToken(store.slug, token)
      .then((table) => {
        if (!cancelled) setTableNumber(table.number);
      })
      .catch(() => {
        if (!cancelled) setTableNumber(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [store.slug, currentToken]);

  function startOrder() {
    const token = currentToken();
    navigate(token ? `/t/${store.slug}/${encodeURIComponent(token)}` : `/t/${store.slug}/entrada`);
  }

  return (
    <ClientScreen
      footer={
        <>
          <ActionButton endIcon={<ArrowRightIcon />} onClick={startOrder}>
            Pedir pelo celular
          </ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={() => navigate(`/t/${store.slug}/cardapio`)}>
            Só espiar o cardápio
          </ActionButton>
        </>
      }
    >
      <CoverHero store={store} tableNumber={tableNumber} />
      <Box sx={{ px: 5, pt: 6 }}>
        <Typography variant="h1">{store.name}</Typography>
        {store.tagline && <Typography sx={{ mt: 2, color: colors.textSecondary }}>{store.tagline}</Typography>}

        {store.highlights.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 4 }}>
            {store.highlights.map((highlight) => (
              <Box
                key={highlight}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 999,
                  bgcolor: colors.surface,
                  fontSize: fontSize.small,
                  fontWeight: fontWeight.extraBold,
                }}
              >
                {highlight}
              </Box>
            ))}
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            mt: 4,
            px: 4,
            py: 4,
            border: `1px solid ${colors.border}`,
            borderRadius: `${radius.card}px`,
          }}
        >
          <Box sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: '50%', bgcolor: colors.success }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: fontWeight.extraBold }}>
              {store.status.closesAt ? `Aberto até ${formatHour(store.status.closesAt)}` : 'Aberto agora'}
            </Typography>
            {store.status.lastOrderAt && (
              <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
                Cozinha aceita pedido até {formatHour(store.status.lastOrderAt)}
              </Typography>
            )}
          </Box>
          {store.averagePrepMinutes && (
            <Box
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 999,
                bgcolor: colors.surface,
                fontSize: fontSize.body,
                fontWeight: fontWeight.extraBold,
                whiteSpace: 'nowrap',
              }}
            >
              ~{store.averagePrepMinutes} min
            </Box>
          )}
        </Box>
      </Box>
    </ClientScreen>
  );
}

function CoverHero({ store, tableNumber }: { store: Store; tableNumber?: number }) {
  return (
    <Box sx={{ position: 'relative', height: 330, overflow: 'hidden', bgcolor: 'primary.main' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -110,
          right: -90,
          width: 360,
          height: 360,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 140,
          left: -110,
          width: 340,
          height: 340,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <Box
        component="svg"
        viewBox="0 0 390 330"
        aria-hidden
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <g fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="2" strokeLinejoin="round">
          <path d="M92 185v19M106 182v22M80 204h44l-6 90H86z M70 232h56" />
          <path d="M262 236c0-24 22-40 46-40s46 16 46 40z M255 248h106 M264 262h88c0 12-10 22-22 22h-44c-12 0-22-10-22-22z" />
        </g>
      </Box>

      <Box sx={{ position: 'absolute', top: 22, left: 20, right: 20, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={HERO_PILL}>
          <Box sx={{ width: 8, height: 8, bgcolor: colors.background, borderRadius: '2px' }} />
          Aberto agora
        </Box>
        {tableNumber !== undefined && <Box sx={HERO_PILL}>Mesa {formatTableNumber(tableNumber)}</Box>}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          left: 20,
          bottom: 22,
          width: 74,
          height: 74,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: `${radius.card}px`,
          bgcolor: colors.background,
          color: colors.text,
        }}
      >
        {store.logoUrl ? (
          <Box component="img" src={store.logoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <BrandMark aria-hidden sx={{ fontSize: 40 }} />
        )}
      </Box>
    </Box>
  );
}
