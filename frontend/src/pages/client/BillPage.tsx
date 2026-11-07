import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { InfoNote, ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { LockIcon } from '../../components/client/icons';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { fetchBill, orderStatusLabel } from '../../services/bill';
import type { Bill, BillLine, BillPerson } from '../../services/bill';
import { formatCents } from '../../services/format';
import { callWaiter, fetchWaiterCalls, formatClock } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 8000;
const { colors, fontSize, fontWeight, radius } = tokens;

export default function BillPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [bill, setBill] = useState<Bill | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [waiterComing, setWaiterComing] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextBill, calls] = await Promise.all([fetchBill(slug), fetchWaiterCalls(slug).catch(() => [])]);
      setBill(nextBill);
      setWaiterComing(calls.some((call) => call.type === 'CLOSE_BILL' && call.status === 'OPEN'));
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
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
  if (state.status === 'loading' || (bill === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (bill === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  async function payWithWaiter() {
    if (calling || waiterComing) return;
    setCalling(true);
    setCallError(false);
    try {
      await callWaiter(slug, 'CLOSE_BILL');
      setWaiterComing(true);
    } catch (caught) {
      if (!handleExpired(caught)) setCallError(true);
    } finally {
      setCalling(false);
    }
  }

  if ((bill.people?.length ?? 0) > 1) {
    return (
      <SharedBill
        bill={bill}
        waiterComing={waiterComing}
        calling={calling}
        callError={callError}
        onCloseBill={payWithWaiter}
        onBack={() => navigate(`/t/${slug}/comandas/minha`)}
        onInvite={() => navigate(`/t/${slug}/comandas/minha`)}
        onOrderMore={() => navigate(`/t/${slug}/cardapio`)}
      />
    );
  }

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          {waiterComing && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              O garçom já foi avisado e vem fechar a conta com você.
            </Alert>
          )}
          {callError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              Não foi possível chamar o garçom agora. Tente de novo.
            </Alert>
          )}
          <ActionButton onClick={() => navigate(`/t/${slug}/pix`)}>Pagar por Pix</ActionButton>
          <ActionButton tone="secondary" onClick={payWithWaiter} disabled={calling || waiterComing} sx={{ mt: 2 }}>
            {calling ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : waiterComing ? 'Garçom a caminho' : 'Pagar com garçom'}
          </ActionButton>
        </>
      }
    >
      <ScreenHeader
        title={`Comanda de ${bill.ownerName}`}
        subtitle={`Mesa ${formatTableNumber(bill.tableNumber)} · aberta às ${formatClock(bill.openedAt)}`}
        onBack={() => navigate(`/t/${slug}/comandas/minha`)}
      />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {bill.orders.length === 0 && (
          <Typography sx={{ py: 6, textAlign: 'center', color: colors.textMuted }}>
            Nenhum pedido nesta comanda ainda.
          </Typography>
        )}
        {bill.orders.map((order) => (
          <Box key={order.id} sx={{ mb: 5 }}>
            <ButtonBase
              onClick={() => navigate(`/t/${slug}/pedidos/${order.id}`)}
              aria-label={`Acompanhar o pedido ${order.number}`}
              sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'space-between', fontFamily: 'inherit' }}
            >
              <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1 }}>
                PEDIDO #{order.number}
              </Typography>
              <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted, textDecoration: 'underline' }}>
                {orderStatusLabel(order.status)}
              </Typography>
            </ButtonBase>
            <Box sx={{ border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px`, overflow: 'hidden' }}>
              {order.items.map((item, index) => (
                <Line key={index} item={item} first={index === 0} />
              ))}
            </Box>
          </Box>
        ))}

        {bill.orders.length > 0 && (
          <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: colors.surface }}>
            <Sum label="Consumo" cents={bill.consumptionCents} />
            <Sum label="Serviço (10%, opcional)" cents={bill.serviceFeeCents} />
            <Box sx={{ mt: 3, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${colors.border}` }}>
              <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>Total</Typography>
              <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>
                {formatCents(bill.totalCents)}
              </Typography>
            </Box>
          </Box>
        )}
        <Typography sx={{ mt: 3, fontSize: fontSize.caption, color: colors.textMuted }}>
          A conta é só sua. Quem está na mesma mesa paga a comanda dela.
        </Typography>
      </Box>
    </ClientScreen>
  );
}

function Line({ item, first }: { item: BillLine; first: boolean }) {
  const muted = item.canceled ? colors.textMuted : colors.text;
  const strike = item.canceled ? 'line-through' : 'none';
  return (
    <Box
      sx={{
        px: 4,
        py: 3,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 3,
        borderTop: first ? 'none' : `1px solid ${colors.divider}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.button, fontWeight: fontWeight.bold, color: muted, textDecoration: strike }}>
          {item.quantity}x {item.name}
        </Typography>
        {item.note && <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>{item.note}</Typography>}
      </Box>
      <Typography
        sx={{ flexShrink: 0, fontSize: fontSize.button, fontWeight: fontWeight.extraBold, color: muted, textDecoration: strike }}
      >
        {formatCents(item.totalCents)}
      </Typography>
    </Box>
  );
}

function Sum({ label, cents }: { label: string; cents: number }) {
  return (
    <Box sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', color: colors.textSecondary }}>
      <Typography sx={{ fontSize: fontSize.button }}>{label}</Typography>
      <Typography sx={{ fontSize: fontSize.button, fontWeight: fontWeight.extraBold }}>{formatCents(cents)}</Typography>
    </Box>
  );
}

const PERSON_COLORS = ['#111111', '#7A3FC0', '#157A4A', '#1D5FD1', '#9A5B00', '#C62828'];

interface SharedBillProps {
  bill: Bill;
  waiterComing: boolean;
  calling: boolean;
  callError: boolean;
  onCloseBill: () => void;
  onBack: () => void;
  onInvite: () => void;
  onOrderMore: () => void;
}

function SharedBill({ bill, waiterComing, calling, callError, onCloseBill, onBack, onInvite, onOrderMore }: SharedBillProps) {
  const [filter, setFilter] = useState('all');
  const people = bill.people ?? [];
  const colorOf = (id?: string) => PERSON_COLORS[Math.max(0, people.findIndex((person) => person.id === id)) % PERSON_COLORS.length];
  const peopleCount = people.filter((person) => person.id !== 'staff').length;
  const lines = bill.orders
    .flatMap((order) => order.items)
    .filter((item) => filter === 'all' || item.personId === filter);
  const chips: { id: string; label: string }[] = [{ id: 'all', label: 'Todos' }, ...people.map((person) => ({ id: person.id, label: person.name }))];

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          {waiterComing && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              O garçom já foi avisado e vem fechar a conta com você.
            </Alert>
          )}
          {callError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: `${radius.button}px` }}>
              Não foi possível chamar o garçom agora. Tente de novo.
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 3 }}>
            <ActionButton tone="secondary" onClick={onOrderMore}>
              Pedir mais
            </ActionButton>
            {bill.owner && (
              <ActionButton onClick={onCloseBill} disabled={calling || waiterComing}>
                {calling ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : waiterComing ? 'Garçom a caminho' : 'Fechar a conta toda'}
              </ActionButton>
            )}
          </Box>
        </>
      }
    >
      <ScreenHeader
        title={`Comanda de ${bill.ownerName}`}
        subtitle={`${bill.tableNumber > 0 ? `Mesa ${formatTableNumber(bill.tableNumber)}` : 'Balcão'} · ${peopleCount === 1 ? '1 pessoa' : `${peopleCount} pessoas`}`}
        onBack={onBack}
        action={
          bill.owner ? (
            <ActionButton
              tone="secondary"
              fullWidth={false}
              onClick={onInvite}
              sx={{ minHeight: 36, px: 3, fontSize: fontSize.caption, whiteSpace: 'nowrap' }}
            >
              Convidar
            </ActionButton>
          ) : undefined
        }
      />

      <Box
        role="group"
        aria-label="Filtrar por pessoa"
        sx={{ px: 5, pt: 4, display: 'flex', gap: 2, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {chips.map((chip) => {
          const on = chip.id === filter;
          return (
            <ButtonBase
              key={chip.id}
              aria-pressed={on}
              onClick={() => setFilter(chip.id)}
              sx={{
                flexShrink: 0,
                height: 36,
                px: 4,
                borderRadius: 999,
                border: `1px solid ${on ? colors.text : colors.border}`,
                bgcolor: on ? colors.text : colors.background,
                color: on ? colors.background : colors.text,
                fontFamily: 'inherit',
                fontSize: fontSize.caption,
                fontWeight: fontWeight.bold,
              }}
            >
              {chip.label}
            </ButtonBase>
          );
        })}
      </Box>

      <Box sx={{ px: 5, pt: 4, pb: 6 }}>
        {lines.length === 0 && (
          <Typography sx={{ py: 6, textAlign: 'center', color: colors.textMuted }}>Nenhum pedido ainda.</Typography>
        )}
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {lines.map((item, index) => (
            <SharedLine key={index} item={item} color={colorOf(item.personId)} first={index === 0} />
          ))}
        </Box>

        <SectionLabel>Quanto cada um consumiu</SectionLabel>
        <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: colors.surface }}>
          {people.map((person) => (
            <PersonTotal key={person.id} person={person} />
          ))}
          {bill.serviceFeeCents > 0 && (
            <Box sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', color: colors.textSecondary }}>
              <Typography sx={{ fontSize: fontSize.small }}>Serviço (10%, opcional)</Typography>
              <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>
                {formatCents(bill.serviceFeeCents)}
              </Typography>
            </Box>
          )}
          <Box sx={{ mt: 3, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${colors.border}` }}>
            <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>Total da comanda</Typography>
            <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>{formatCents(bill.totalCents)}</Typography>
          </Box>
        </Box>

        <InfoNote icon={<LockIcon sx={{ fontSize: 18 }} />}>
          {bill.owner
            ? 'Quem abriu a comanda é quem fecha. Você paga a conta toda com o garçom.'
            : `Quem abriu a comanda é quem fecha. ${bill.ownerName} encerra a conta no fim.`}
        </InfoNote>
      </Box>
    </ClientScreen>
  );
}

function SharedLine({ item, color, first }: { item: BillLine; color: string; first: boolean }) {
  const strike = item.canceled ? 'line-through' : 'none';
  const tone = item.canceled ? colors.textMuted : colors.text;
  const who = item.orderedBy ?? '';
  return (
    <Box
      component="li"
      sx={{ py: 3, display: 'flex', gap: 3, alignItems: 'flex-start', borderTop: first ? 'none' : `1px solid ${colors.divider}` }}
    >
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          mt: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bgcolor: color,
          color: '#FFFFFF',
          fontSize: fontSize.caption,
          fontWeight: fontWeight.extraBold,
        }}
      >
        {who.trim().charAt(0).toUpperCase()}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.button, fontWeight: fontWeight.bold, color: tone, textDecoration: strike }}>
          {item.quantity}x {item.name}
        </Typography>
        <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>
          {item.canceled ? 'Cancelado' : `Pedido por ${who}`}
          {item.orderedAt ? ` · ${formatClock(item.orderedAt)}` : ''}
        </Typography>
        {item.note && <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>{item.note}</Typography>}
      </Box>
      <Typography sx={{ flexShrink: 0, fontSize: fontSize.button, fontWeight: fontWeight.extraBold, color: tone, textDecoration: strike }}>
        {formatCents(item.totalCents)}
      </Typography>
    </Box>
  );
}

function PersonTotal({ person }: { person: BillPerson }) {
  return (
    <Box sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: fontSize.small }}>{person.name}</Typography>
      <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>{formatCents(person.totalCents)}</Typography>
    </Box>
  );
}
