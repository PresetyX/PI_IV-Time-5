import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { CheckIcon } from '../../components/client/icons';
import { ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { callWaiter, fetchWaiterCalls, formatClock } from '../../services/tabs';
import type { WaiterCall, WaiterCallType } from '../../services/tabs';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 5000;
const { colors, fontSize, fontWeight, radius } = tokens;

const REASONS: { type: WaiterCallType; title: string; detail: string }[] = [
  { type: 'CLOSE_BILL', title: 'Fechar a conta', detail: 'Quero pagar com cartão ou dinheiro' },
  { type: 'QUESTION', title: 'Tirar uma dúvida', detail: 'Sobre um item do cardápio' },
  { type: 'MISSING_ITEM', title: 'Faltou algo na mesa', detail: 'Talher, guardanapo, copo' },
  { type: 'ORDER_PROBLEM', title: 'Problema no pedido', detail: 'Veio errado ou faltou item' },
];

function isReason(value: string | null): value is WaiterCallType {
  return REASONS.some((reason) => reason.type === value);
}

export default function WaiterCallPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const asked = params.get('motivo');
  const [selected, setSelected] = useState<WaiterCallType | null>(isReason(asked) ? asked : null);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [missing, setMissing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCalls(await fetchWaiterCalls(slug));
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
    }
  }, [slug, handleExpired]);

  useEffect(() => {
    if (gate) return undefined;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [gate, load]);

  if (gate) return <Navigate to={gate} replace />;
  if (missing) return <Navigate to={`/t/${slug}/comandas`} replace />;
  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;

  const open = calls.filter((call) => call.status === 'OPEN');
  const answered = calls
    .filter((call) => call.status === 'RESOLVED' && call.resolvedAt)
    .filter((call) => Date.now() - new Date(call.resolvedAt as string).getTime() < 10 * 60000);
  const back = () => navigate(`/t/${slug}/comandas/minha`);

  async function send() {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      const call = await callWaiter(slug, selected);
      setCalls((current) => [...current.filter((item) => item.id !== call.id), call]);
      setSelected(null);
    } catch (caught) {
      if (!handleExpired(caught)) setError('Não foi possível chamar agora. Tente de novo ou acene para a equipe.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              {error}
            </Alert>
          )}
          <ActionButton onClick={send} disabled={!selected || sending}>
            {sending ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : 'Chamar o garçom'}
          </ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={back}>
            Voltar ao pedido
          </ActionButton>
        </>
      }
    >
      <ScreenHeader title="Chamar o garçom" onBack={back} />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {open.length > 0 && (
          <Box
            role="status"
            sx={{ mb: 5, p: 4, display: 'flex', gap: 3, borderRadius: `${radius.card}px`, bgcolor: 'primary.main', color: '#FFFFFF' }}
          >
            <Box
              aria-hidden
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,.2)',
              }}
            >
              <CheckIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
                Pronto, o garçom já foi avisado
              </Typography>
              {open.map((call) => (
                <Typography key={call.id} sx={{ fontSize: fontSize.small, opacity: 0.9 }}>
                  {call.reason} · chamado às {formatClock(call.createdAt)}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
        {answered.map((call) => (
          <Typography key={call.id} sx={{ mb: 3, fontSize: fontSize.small, color: colors.success, fontWeight: fontWeight.bold }}>
            {call.reason}: atendido às {formatClock(call.resolvedAt as string)}
          </Typography>
        ))}

        <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
          Escolha o motivo. O chamado aparece na hora no painel do salão com o número da sua mesa.
        </Typography>

        <SectionLabel>{open.length > 0 ? 'Precisa de mais alguma coisa?' : 'Motivo'}</SectionLabel>
        <Box role="radiogroup" aria-label="Motivo do chamado" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {REASONS.map((reason) => {
            const checked = selected === reason.type;
            const waiting = open.some((call) => call.type === reason.type);
            return (
              <ButtonBase
                key={reason.type}
                role="radio"
                aria-checked={checked}
                disabled={waiting}
                onClick={() => {
                  setError(null);
                  setSelected(reason.type);
                }}
                sx={{
                  p: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  border: `${checked ? 1.5 : 1}px solid ${checked ? colors.text : colors.border}`,
                  borderRadius: `${radius.card}px`,
                  opacity: waiting ? 0.55 : 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>{reason.title}</Typography>
                  <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
                    {waiting ? 'Já chamado, o garçom está vindo' : reason.detail}
                  </Typography>
                </Box>
                <Box
                  aria-hidden
                  sx={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: `1.5px solid ${checked ? colors.text : colors.border}`,
                  }}
                >
                  {checked && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: colors.text }} />}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
    </ClientScreen>
  );
}
