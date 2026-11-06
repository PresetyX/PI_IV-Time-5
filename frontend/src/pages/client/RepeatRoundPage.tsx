import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, CircularProgress, IconButton, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import { optionsText } from '../../components/client/CartParts';
import AgeConfirmationScreen from '../../components/client/AgeConfirmationScreen';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { CheckIcon, CloseIcon, PlusIcon } from '../../components/client/icons';
import { SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import { fetchRound, needsAgeConfirmation, orderErrorMessage, placeOrder } from '../../services/tabs';
import { confirmAge, isAgeConfirmed } from '../../services/visit';
import type { Round, RoundItem, RoundSuggestion } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

function minutesAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

export default function RepeatRoundPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [round, setRound] = useState<Round | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askingAge, setAskingAge] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchRound(slug);
      setRound(next);
      setChecked(new Set(next.items.flatMap((item, index) => (item.available ? [index] : []))));
      setAdded(new Set());
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
      else setLoadFailed(true);
    }
  }, [slug, handleExpired]);

  useEffect(() => {
    if (!gate) load();
  }, [gate, load]);

  if (gate) return <Navigate to={gate} replace />;
  if (missing) return <Navigate to={`/t/${slug}/comandas`} replace />;
  if (state.status === 'loading' || (round === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (round === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  const current = round;
  const repeated = current.items.filter((_, index) => checked.has(index));
  const extras = current.suggestions.filter((suggestion) => added.has(suggestion.productId));
  const total =
    repeated.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) +
    extras.reduce((sum, suggestion) => sum + suggestion.priceCents, 0);
  const close = () => navigate(`/t/${slug}/comandas/minha`);

  function toggleItem(index: number) {
    setError(null);
    setChecked((value) => {
      const next = new Set(value);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleSuggestion(productId: string) {
    setError(null);
    setAdded((value) => {
      const next = new Set(value);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  // A rodada não sabe quais itens são alcoólicos: a confirmação aparece quando o backend pede.
  async function send(ageConfirmed = isAgeConfirmed(slug)) {
    if (sending || total === 0) return;
    setSending(true);
    setError(null);
    try {
      const placed = await placeOrder(slug, [
        ...repeated.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          note: item.note || undefined,
          options: item.options,
        })),
        ...extras.map((suggestion) => ({ productId: suggestion.productId, quantity: 1, options: suggestion.options })),
      ], total, ageConfirmed);
      setAskingAge(false);
      navigate(`/t/${slug}/pedidos/${placed.id}/enviado`);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (needsAgeConfirmation(caught)) {
        setAskingAge(true);
        return;
      }
      setAskingAge(false);
      setError(orderErrorMessage(caught));
      if (caught instanceof ApiError && caught.status === 409) load();
    } finally {
      setSending(false);
    }
  }

  function confirmAgeAndSend() {
    confirmAge(slug);
    send(true);
  }

  if (askingAge) {
    return (
      <AgeConfirmationScreen
        storeName={state.store.name}
        sending={sending}
        onConfirm={confirmAgeAndSend}
        onBack={() => setAskingAge(false)}
      />
    );
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
          <ActionButton onClick={() => send()} disabled={sending || total === 0} sx={{ justifyContent: 'space-between', px: 5 }}>
            {sending ? (
              <CircularProgress size={22} sx={{ mx: 'auto', color: 'inherit' }} />
            ) : (
              <>
                <span>Repetir rodada</span>
                <span>{formatCents(total)}</span>
              </>
            )}
          </ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={() => navigate(`/t/${slug}/cardapio`)}>
            Ver o cardápio inteiro
          </ActionButton>
        </>
      }
    >
      <Box component="header" sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, px: 5, pt: 5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold, lineHeight: 1.2 }}>
            Mais uma rodada?
          </Typography>
          <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>
            Mesa {formatTableNumber(current.tableNumber)} · comanda de {current.ownerName}
          </Typography>
        </Box>
        <IconButton
          onClick={close}
          aria-label="Fechar"
          sx={{
            width: touchTarget,
            height: touchTarget,
            flexShrink: 0,
            border: `1px solid ${colors.border}`,
            borderRadius: `${radius.button}px`,
            color: colors.text,
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {current.items.length === 0 ? (
          <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: colors.surface, color: colors.textSecondary }}>
            <Typography sx={{ fontSize: fontSize.small }}>
              Ainda não tem pedido nesta comanda para repetir. Escolha no cardápio ou adicione algo abaixo.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 4, border: `1.5px solid ${colors.text}`, borderRadius: `${radius.card}px` }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 3 }}>
              <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>Sua última rodada</Typography>
              {current.lastOrderNumber && current.lastOrderAt && (
                <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>
                  pedido #{current.lastOrderNumber}, {minutesAgo(current.lastOrderAt)}
                </Typography>
              )}
            </Box>
            {current.items.map((item, index) => (
              <RoundRow key={index} item={item} checked={checked.has(index)} onToggle={() => toggleItem(index)} />
            ))}
            <Box
              sx={{
                mt: 2,
                pt: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTop: `1px solid ${colors.divider}`,
              }}
            >
              <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.bold }}>
                Repetindo o que está marcado
              </Typography>
              <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
                {formatCents(repeated.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0))}
              </Typography>
            </Box>
          </Box>
        )}

        {current.suggestions.length > 0 && (
          <>
            <SectionLabel>Quem está na mesa costuma pedir</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {current.suggestions.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.productId}
                  suggestion={suggestion}
                  added={added.has(suggestion.productId)}
                  onToggle={() => toggleSuggestion(suggestion.productId)}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    </ClientScreen>
  );
}

function RoundRow({ item, checked, onToggle }: { item: RoundItem; checked: boolean; onToggle: () => void }) {
  const muted = !checked || !item.available;
  return (
    <ButtonBase
      onClick={onToggle}
      disabled={!item.available}
      role="checkbox"
      aria-checked={checked}
      sx={{ width: '100%', py: 2, display: 'flex', alignItems: 'flex-start', gap: 3, textAlign: 'left', fontFamily: 'inherit' }}
    >
      <Box
        aria-hidden
        sx={{
          mt: '2px',
          width: 20,
          height: 20,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          border: `1.5px solid ${checked ? colors.text : colors.border}`,
          bgcolor: checked ? colors.text : colors.background,
          color: colors.background,
        }}
      >
        {checked && <CheckIcon sx={{ fontSize: 14 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: fontSize.small, fontWeight: fontWeight.bold, color: muted ? colors.textMuted : colors.text }}
        >
          {item.quantity}x {item.name}
        </Typography>
        {item.options && item.options.length > 0 && (
          <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>{optionsText(item.options)}</Typography>
        )}
        {(item.note || !item.available) && (
          <Typography sx={{ fontSize: fontSize.caption, color: item.available ? colors.textMuted : colors.error }}>
            {item.available ? item.note : 'Esgotado agora'}
          </Typography>
        )}
      </Box>
      <Typography
        sx={{ flexShrink: 0, fontSize: fontSize.small, fontWeight: fontWeight.extraBold, color: muted ? colors.textMuted : colors.text }}
      >
        {formatCents(item.unitPriceCents * item.quantity)}
      </Typography>
    </ButtonBase>
  );
}

function SuggestionRow({
  suggestion,
  added,
  onToggle,
}: {
  suggestion: RoundSuggestion;
  added: boolean;
  onToggle: () => void;
}) {
  const who = suggestion.orderedBy ? `${suggestion.orderedBy} pediu` : 'Pedido na mesa';
  return (
    <Box
      sx={{
        p: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        border: `1px solid ${added ? colors.text : colors.border}`,
        borderRadius: `${radius.card}px`,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>{suggestion.name}</Typography>
        {suggestion.options && suggestion.options.length > 0 && (
          <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>{optionsText(suggestion.options)}</Typography>
        )}
        <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>
          {who} {minutesAgo(suggestion.orderedAt)}
        </Typography>
      </Box>
      <Typography sx={{ flexShrink: 0, fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>
        {formatCents(suggestion.priceCents)}
      </Typography>
      <IconButton
        onClick={onToggle}
        aria-label={added ? `Tirar ${suggestion.name}` : `Adicionar ${suggestion.name}`}
        aria-pressed={added}
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          border: `1.5px solid ${colors.text}`,
          bgcolor: added ? colors.text : colors.background,
          color: added ? colors.background : colors.text,
          '&:hover': { bgcolor: added ? colors.text : colors.surface },
        }}
      >
        {added ? <CheckIcon sx={{ fontSize: 18 }} /> : <PlusIcon sx={{ fontSize: 18 }} />}
      </IconButton>
    </Box>
  );
}
