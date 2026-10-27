import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import BackHeader from '../../components/client/BackHeader';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import type { Store } from '../../services/store';
import { fetchTableByNumber, formatTableNumber } from '../../services/tables';
import { readVisit, updateVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const MAX_DIGITS = 3;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'];
const { colors, fontSize, fontWeight, radius } = tokens;

export default function TableNumberPage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const visit = readVisit(slug);
  const changing = searchParams.get('trocar') === '1';

  if (visit.sessionId && visit.table && !changing) return <Navigate to={`/t/${slug}/comandas`} replace />;
  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (!state.store.status.acceptingOrders) return <ClosedStoreScreen store={state.store} />;
  return <TableKeypad store={state.store} next={searchParams.get('next')} />;
}

function TableKeypad({ store, next }: { store: Store; next: string | null }) {
  const navigate = useNavigate();
  const [digits, setDigits] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = useCallback((key: string) => {
    setError(null);
    if (key === 'C') setDigits('');
    else if (key === '←') setDigits((value) => value.slice(0, -1));
    else setDigits((value) => (value.length >= MAX_DIGITS ? value : `${value}${key}`).replace(/^0+(?=\d)/, ''));
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === 'Backspace') press('←');
      else if (event.key === 'Escape') press('C');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [press]);

  async function confirm() {
    const number = Number(digits);
    if (!number || checking) return;
    setChecking(true);
    setError(null);
    try {
      const table = await fetchTableByNumber(store.slug, number);
      const visit = updateVisit(store.slug, { table, scannedToken: table.token });
      if (visit.sessionId) navigate(`/t/${store.slug}/comandas`);
      else if (next === 'identificacao') navigate(`/t/${store.slug}/identificacao`);
      else navigate(`/t/${store.slug}/entrada`);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 404
          ? `Não achamos a mesa ${formatTableNumber(number)}. Confira a plaquinha.`
          : 'Não foi possível conferir a mesa agora. Tente de novo.',
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <ClientScreen
      footer={
        <ActionButton onClick={confirm} disabled={!Number(digits) || checking}>
          {checking ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : 'Confirmar mesa'}
        </ActionButton>
      }
    >
      <BackHeader title={store.name} onBack={() => navigate(-1)} />
      <Box sx={{ px: 5, pt: 7, pb: 6 }}>
        <Typography variant="h2" component="h1">
          Em qual mesa você está?
        </Typography>
        <Typography sx={{ mt: 2, fontSize: fontSize.button, color: colors.textMuted }}>
          O número fica na plaquinha em cima da mesa.
        </Typography>

        <Box
          aria-live="polite"
          aria-label="Número da mesa"
          sx={{
            height: 96,
            mt: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${error ? colors.error : colors.border}`,
            borderRadius: `${radius.card}px`,
            fontSize: fontSize.display,
            fontWeight: fontWeight.extraBold,
            letterSpacing: 2,
            color: digits ? colors.text : colors.border,
          }}
        >
          {digits ? formatTableNumber(Number(digits)) : '00'}
        </Box>
        {error && (
          <Typography role="alert" sx={{ mt: 2, fontSize: fontSize.body, color: colors.error }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mt: 6 }}>
          {KEYS.map((key) => {
            const isAction = key === 'C' || key === '←';
            return (
              <ButtonBase
                key={key}
                onClick={() => press(key)}
                aria-label={key === 'C' ? 'Limpar' : key === '←' ? 'Apagar' : key}
                sx={{
                  height: 64,
                  borderRadius: `${radius.button}px`,
                  border: isAction ? 'none' : `1px solid ${colors.border}`,
                  bgcolor: isAction ? colors.surface : colors.background,
                  fontFamily: 'inherit',
                  fontSize: fontSize.title,
                  fontWeight: fontWeight.extraBold,
                  color: colors.text,
                }}
              >
                {key}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
    </ClientScreen>
  );
}
