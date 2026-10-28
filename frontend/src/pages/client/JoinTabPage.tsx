import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { Avatar, ScreenHeader } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import { fetchTabs, joinTab, openTab } from '../../services/tabs';
import type { TabSummary } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const CODE_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'];
const { colors, fontSize, fontWeight, radius } = tokens;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Código inválido ou vencido. Peça o código que está na tela de quem abriu.';
    if (error.status === 403) return 'Você foi removido desta comanda.';
    if (error.status === 404) return 'Essa comanda não está mais aberta.';
    if (error.status === 409) return 'Você já tem uma comanda nesta mesa. Peça para sair dela antes de entrar em outra.';
  }
  return 'Não foi possível entrar agora. Tente de novo.';
}

export default function JoinTabPage() {
  const { slug = '', tabId = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [tab, setTab] = useState<TabSummary | null | undefined>(undefined);
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gate) return;
    fetchTabs(slug)
      .then((tabs) => setTab(tabs.find((found) => found.id === tabId) ?? null))
      .catch((caught: unknown) => {
        if (!handleExpired(caught)) setTab(null);
      });
  }, [gate, slug, tabId, handleExpired]);

  const press = useCallback((key: string) => {
    setError(null);
    if (key === 'C') setDigits('');
    else if (key === '←') setDigits((value) => value.slice(0, -1));
    else setDigits((value) => (value.length >= CODE_LENGTH ? value : `${value}${key}`));
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === 'Backspace') press('←');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [press]);

  if (gate) return <Navigate to={gate} replace />;
  if (state.status === 'loading' || tab === undefined) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (tab === null) return <Navigate to={`/t/${slug}/comandas`} replace />;
  if (tab.mine) return <Navigate to={`/t/${slug}/comandas/minha`} replace />;

  const table = readVisit(slug).table;

  async function join() {
    if (digits.length < CODE_LENGTH || sending) return;
    setSending(true);
    setError(null);
    try {
      await joinTab(slug, tabId, digits);
      navigate(`/t/${slug}/comandas/minha`, { replace: true });
    } catch (caught) {
      if (handleExpired(caught)) return;
      setError(describeError(caught));
      setDigits('');
    } finally {
      setSending(false);
    }
  }

  async function openMine() {
    try {
      await openTab(slug);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (!(caught instanceof ApiError && caught.status === 409)) {
        setError('Não foi possível abrir a comanda agora. Tente de novo.');
        return;
      }
    }
    navigate(`/t/${slug}/comandas/minha`);
  }

  return (
    <ClientScreen
      footer={
        <>
          <ActionButton onClick={join} disabled={digits.length < CODE_LENGTH || sending}>
            {sending ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : 'Entrar na comanda'}
          </ActionButton>
          <ActionButton tone="quiet" onClick={openMine} sx={{ mt: 1 }}>
            Prefiro abrir a minha
          </ActionButton>
        </>
      }
    >
      <ScreenHeader
        title="Entrar na comanda"
        subtitle={table ? `Mesa ${formatTableNumber(table.number)}` : undefined}
        onBack={() => navigate(`/t/${slug}/comandas`)}
      />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        <Box
          sx={{
            p: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            borderRadius: `${radius.card}px`,
            bgcolor: colors.surface,
          }}
        >
          <Avatar name={tab.ownerName} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
              Comanda de {tab.ownerName}
            </Typography>
            <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
              {tab.peopleCount === 1 ? '1 pessoa' : `${tab.peopleCount} pessoas`} · {formatCents(tab.totalCents)}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ mt: 6, fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
          Digite o código de 4 dígitos
        </Typography>
        <Typography sx={{ mt: 1, fontSize: fontSize.small, color: colors.textSecondary }}>
          {tab.ownerName} vê esse código na tela dele, em Minha comanda. Ele muda a cada 5 minutos.
        </Typography>

        <Box
          role="group"
          aria-label="Código de 4 dígitos"
          sx={{ mt: 5, display: 'flex', justifyContent: 'center', gap: 2.5 }}
        >
          {Array.from({ length: CODE_LENGTH }, (_, index) => (
            <Box
              key={index}
              sx={{
                width: 56,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `${index === digits.length ? 2 : 1}px solid ${
                  error ? colors.error : index <= digits.length ? colors.text : colors.border
                }`,
                borderRadius: `${radius.button}px`,
                fontSize: fontSize.display,
                fontWeight: fontWeight.extraBold,
              }}
            >
              {digits[index] ?? ''}
            </Box>
          ))}
        </Box>
        {error && (
          <Alert severity="error" role="alert" sx={{ mt: 4, borderRadius: `${radius.button}px` }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2.5, mt: 5 }}>
          {KEYS.map((key) => {
            const isAction = key === 'C' || key === '←';
            return (
              <ButtonBase
                key={key}
                onClick={() => press(key)}
                aria-label={key === 'C' ? 'Limpar' : key === '←' ? 'Apagar' : key}
                sx={{
                  height: 56,
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
