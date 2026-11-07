import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import qrcode from 'qrcode-generator';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { ScreenHeader } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { fetchPix } from '../../services/bill';
import type { Pix } from '../../services/bill';
import { formatCents } from '../../services/format';
import { callWaiter, fetchWaiterCalls } from '../../services/tabs';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 8000;
const { colors, fontSize, fontWeight, radius } = tokens;

const STEPS = [
  'Abra o aplicativo do seu banco e escolha Pix.',
  'Use ler QR code ou cole o código acima.',
  'Confira o valor e confirme o pagamento.',
];

type Blocked = 'not-owner' | 'no-pix';

export default function PixPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [pix, setPix] = useState<Pix | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextPix, calls] = await Promise.all([fetchPix(slug), fetchWaiterCalls(slug).catch(() => [])]);
      setPix(nextPix);
      setSent(calls.some((call) => call.type === 'PIX_SENT' && call.status === 'OPEN'));
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
      else if (caught instanceof ApiError && caught.status === 403) setBlocked('not-owner');
      else if (caught instanceof ApiError && caught.status === 409) setBlocked('no-pix');
      else setLoadFailed(true);
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
  if (state.status === 'loading' || (pix === null && !blocked && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;

  const toBill = () => navigate(`/t/${slug}/conta`);

  if (blocked || (pix && !pix.payload)) {
    const message =
      blocked === 'not-owner'
        ? {
            title: 'Só quem abriu a comanda paga',
            text: 'A conta é fechada por quem abriu a comanda. Peça para essa pessoa pagar pelo celular dela.',
          }
        : blocked === 'no-pix'
          ? {
              title: 'Esta casa não recebe Pix pelo app',
              text: 'Chame o garçom para pagar com cartão, dinheiro ou Pix na maquininha.',
            }
          : { title: 'Ainda não há nada para pagar', text: 'Quando você fizer um pedido, o valor aparece aqui.' };
    return (
      <ClientScreen
        footer={
          <>
            {blocked === 'no-pix' && (
              <ActionButton sx={{ mb: 2 }} onClick={() => navigate(`/t/${slug}/garcom`)}>
                Chamar o garçom
              </ActionButton>
            )}
            <ActionButton tone={blocked === 'no-pix' ? 'secondary' : 'primary'} onClick={toBill}>
              Voltar à conta
            </ActionButton>
          </>
        }
      >
        <ScreenHeader title="Pagar por Pix" onBack={toBill} />
        <Box sx={{ px: 5, pt: 8 }}>
          <Typography variant="h2" component="h1">
            {message.title}
          </Typography>
          <Typography sx={{ mt: 3, color: colors.textSecondary }}>{message.text}</Typography>
        </Box>
      </ClientScreen>
    );
  }

  if (pix === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;
  const payload = pix.payload as string;

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function paid() {
    if (sending || sent) return;
    setSending(true);
    setSendError(false);
    try {
      await callWaiter(slug, 'PIX_SENT');
      setSent(true);
    } catch (caught) {
      if (!handleExpired(caught)) setSendError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          {sent && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              Avisamos o garçom. Ele confere o comprovante e fecha a conta.
            </Alert>
          )}
          {sendError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              Não foi possível avisar o garçom agora. Tente de novo.
            </Alert>
          )}
          <ActionButton onClick={paid} disabled={sending || sent}>
            {sending ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : sent ? 'Garçom avisado' : 'Já paguei'}
          </ActionButton>
          <Typography sx={{ mt: 2, textAlign: 'center', fontSize: fontSize.caption, color: colors.textMuted }}>
            O garçom confere o comprovante e fecha a conta no sistema.
          </Typography>
        </>
      }
    >
      <ScreenHeader title="Pagar por Pix" subtitle={pix.storeName} onBack={toBill} />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: colors.surface, textAlign: 'center' }}>
          <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>Valor da sua comanda</Typography>
          <Typography sx={{ mt: 1, fontSize: fontSize.display, fontWeight: fontWeight.extraBold }}>
            {formatCents(pix.amountCents)}
          </Typography>
        </Box>

        <Box
          sx={{
            mt: 5,
            mx: 'auto',
            p: 4,
            width: 'fit-content',
            border: `1px solid ${colors.border}`,
            borderRadius: `${radius.card}px`,
            bgcolor: '#FFFFFF',
          }}
        >
          <PixQrCode payload={payload} />
        </Box>

        <Typography sx={{ mt: 5, fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}>
          PIX COPIA E COLA
        </Typography>
        <Box
          sx={{
            mt: 2,
            p: 3,
            borderRadius: `${radius.button}px`,
            border: `1px solid ${colors.border}`,
            fontFamily: 'monospace',
            fontSize: fontSize.caption,
            wordBreak: 'break-all',
            color: colors.textSecondary,
          }}
        >
          {payload}
        </Box>
        <ActionButton tone="secondary" sx={{ mt: 2 }} onClick={copy}>
          {copied ? 'Código copiado' : 'Copiar código'}
        </ActionButton>

        <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 5, p: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {STEPS.map((step, index) => (
            <Box component="li" key={step} sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
              <Box
                aria-hidden
                sx={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: colors.surface,
                  fontSize: fontSize.caption,
                  fontWeight: fontWeight.extraBold,
                }}
              >
                {index + 1}
              </Box>
              <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>{step}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </ClientScreen>
  );
}

function PixQrCode({ payload }: { payload: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { size: count, path: d };
  }, [payload]);

  return (
    <Box
      component="svg"
      role="img"
      aria-label="QR code do Pix"
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      sx={{ display: 'block', width: 220, height: 220 }}
    >
      <path d={path} fill="#111111" />
    </Box>
  );
}
