import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import AgeConfirmationScreen from '../../components/client/AgeConfirmationScreen';
import { optionsText, SummaryLine } from '../../components/client/CartParts';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { BagIcon, InfoIcon, WifiOffIcon } from '../../components/client/icons';
import OrderProblemScreen from '../../components/client/OrderProblemScreen';
import { InfoNote, ScreenHeader } from '../../components/client/TabParts';
import { useCart } from '../../hooks/useCart';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { cartCount, cartTotal, lineTotal, refreshWithMenu, toOrderItems } from '../../services/cart';
import type { CartLine, PriceChange } from '../../services/cart';
import { formatCents } from '../../services/format';
import { fetchMenu } from '../../services/menu';
import { needsAgeConfirmation, orderErrorMessage, placeOrder } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { confirmAge, isAgeConfirmed, readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;
const ICON = { fontSize: 64, color: colors.text };

type Problem =
  | { kind: 'soldOut'; removed: CartLine[]; lines: CartLine[] }
  | { kind: 'priceChanged'; changes: PriceChange[]; lines: CartLine[] }
  | { kind: 'closed' }
  | { kind: 'failed'; message: string };

export default function ConfirmOrderPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [cart, setCart] = useCart(slug);
  const [sending, setSending] = useState(false);
  const [askingAge, setAskingAge] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  if (gate) return <Navigate to={gate} replace />;
  if (sentId) return <Navigate to={`/t/${slug}/pedidos/${sentId}/enviado`} replace />;
  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (cart.length === 0 && !sending) return <Navigate to={`/t/${slug}/carrinho`} replace />;

  const store = state.store;
  const visit = readVisit(slug);
  const toCart = () => navigate(`/t/${slug}/carrinho`);

  /** Descobre pelo cardápio de agora o que mudou no carrinho depois de uma recusa. */
  async function explain(lines: CartLine[], fallback: string) {
    try {
      const menu = await fetchMenu(slug);
      const refreshed = refreshWithMenu(lines, menu.categories.flatMap((category) => category.products));
      if (refreshed.removed.length > 0) {
        setProblem({ kind: 'soldOut', removed: refreshed.removed, lines: refreshed.lines });
      } else if (refreshed.changes.length > 0) {
        setProblem({ kind: 'priceChanged', changes: refreshed.changes, lines: refreshed.lines });
      } else {
        setProblem({ kind: 'failed', message: fallback });
      }
    } catch {
      setProblem({ kind: 'failed', message: fallback });
    }
  }

  async function send(lines: CartLine[], ageConfirmed = isAgeConfirmed(slug)) {
    if (sending || lines.length === 0) return;
    if (lines.some((line) => line.isAlcoholic) && !ageConfirmed) {
      setAskingAge(true);
      return;
    }
    setSending(true);
    setAskingAge(false);
    setProblem(null);
    try {
      const placed = await placeOrder(slug, toOrderItems(lines), cartTotal(lines), ageConfirmed);
      setSentId(placed.id);
      setCart([]);
    } catch (caught) {
      if (handleExpired(caught)) return;
      const code = caught instanceof ApiError ? caught.code : '';
      if (needsAgeConfirmation(caught)) {
        setAskingAge(true);
      } else if (code === 'item_unavailable' || code === 'price_changed') {
        await explain(lines, orderErrorMessage(caught));
      } else if (code === 'store_closed') {
        retry();
        setProblem({ kind: 'closed' });
      } else {
        setProblem({ kind: 'failed', message: orderErrorMessage(caught) });
      }
    } finally {
      setSending(false);
    }
  }

  function acceptAndSend(lines: CartLine[]) {
    setCart(lines);
    send(lines);
  }

  function acceptAndReview(lines: CartLine[]) {
    setCart(lines);
    setProblem(null);
    if (lines.length === 0) navigate(`/t/${slug}/cardapio`);
    else toCart();
  }

  if (askingAge) {
    return (
      <AgeConfirmationScreen
        storeName={store.name}
        items={cart.filter((line) => line.isAlcoholic).map((line) => ({ name: line.name, quantity: line.quantity }))}
        sending={sending}
        onConfirm={() => {
          confirmAge(slug);
          send(cart, true);
        }}
        onBack={() => {
          setAskingAge(false);
          toCart();
        }}
      />
    );
  }

  if (problem?.kind === 'closed') return <ClosedStoreScreen store={store} />;

  if (problem?.kind === 'soldOut') {
    const rest = problem.lines;
    return (
      <OrderProblemScreen
        storeName={store.name}
        icon={<BagIcon sx={ICON} />}
        title={problem.removed.length === 1 ? 'Um item acabou' : 'Alguns itens acabaram'}
        description={
          rest.length > 0
            ? 'Eles saíram do cardápio enquanto você montava o pedido. Você pode enviar o resto agora.'
            : 'Eles saíram do cardápio enquanto você montava o pedido. Escolha outra coisa no cardápio.'
        }
        primaryLabel={rest.length > 0 ? `Remover e enviar o resto · ${formatCents(cartTotal(rest))}` : undefined}
        onPrimary={() => acceptAndSend(rest)}
        secondaryLabel={rest.length > 0 ? 'Voltar ao carrinho' : 'Ver o cardápio'}
        onSecondary={() => acceptAndReview(rest)}
        sending={sending}
      >
        {problem.removed.map((line) => (
          <SummaryLine
            key={line.key}
            quantity={line.quantity}
            name={line.name}
            options={optionsText(line.options)}
            totalCents={lineTotal(line)}
            muted
          />
        ))}
      </OrderProblemScreen>
    );
  }

  if (problem?.kind === 'priceChanged') {
    return (
      <OrderProblemScreen
        storeName={store.name}
        icon={<InfoIcon sx={ICON} />}
        title="Os preços mudaram"
        description={`A casa atualizou o cardápio enquanto você montava o pedido. O novo total é ${formatCents(
          cartTotal(problem.lines),
        )}.`}
        primaryLabel={`Enviar com os novos valores · ${formatCents(cartTotal(problem.lines))}`}
        onPrimary={() => acceptAndSend(problem.lines)}
        secondaryLabel="Voltar ao carrinho"
        onSecondary={() => acceptAndReview(problem.lines)}
        sending={sending}
      >
        {problem.changes.map((change) => (
          <Box key={change.key} sx={{ py: 1, display: 'flex', justifyContent: 'space-between', gap: 3 }}>
            <Typography sx={{ fontSize: fontSize.small }}>{change.name}</Typography>
            <Typography sx={{ flexShrink: 0, fontSize: fontSize.small }}>
              <Box component="s" sx={{ color: colors.textMuted }}>
                {formatCents(change.fromCents)}
              </Box>{' '}
              <Box component="strong" sx={{ fontWeight: fontWeight.extraBold }}>
                {formatCents(change.toCents)}
              </Box>
            </Typography>
          </Box>
        ))}
      </OrderProblemScreen>
    );
  }

  if (problem?.kind === 'failed') {
    return (
      <OrderProblemScreen
        storeName={store.name}
        icon={<WifiOffIcon sx={ICON} />}
        title="Não conseguimos conferir seu pedido"
        description={problem.message}
        primaryLabel="Tentar de novo"
        onPrimary={() => send(cart)}
        secondaryLabel="Voltar ao carrinho"
        onSecondary={() => acceptAndReview(cart)}
        sending={sending}
      />
    );
  }

  const count = cartCount(cart);
  const where = visit.table ? `Mesa ${formatTableNumber(visit.table.number)}` : store.name;

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          <ActionButton onClick={() => send(cart)} disabled={sending} sx={{ justifyContent: 'space-between', px: 5 }}>
            {sending ? (
              <CircularProgress size={22} sx={{ mx: 'auto', color: 'inherit' }} />
            ) : (
              <>
                <span>Enviar para a cozinha</span>
                <span>{formatCents(cartTotal(cart))}</span>
              </>
            )}
          </ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={toCart} disabled={sending}>
            Voltar ao carrinho
          </ActionButton>
        </>
      }
    >
      <ScreenHeader
        title="Confirmar pedido"
        subtitle={visit.customerName ? `${where} · comanda de ${visit.customerName}` : where}
        onBack={toCart}
      />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        <Box sx={{ p: 4, border: `1.5px solid ${colors.text}`, borderRadius: `${radius.card}px` }}>
          <Typography sx={{ mb: 2, fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>
            {count} {count === 1 ? 'item' : 'itens'}
          </Typography>
          {cart.map((line) => (
            <SummaryLine
              key={line.key}
              quantity={line.quantity}
              name={line.name}
              options={optionsText(line.options)}
              note={line.note}
              totalCents={lineTotal(line)}
            />
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
            <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.bold }}>Total</Typography>
            <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
              {formatCents(cartTotal(cart))}
            </Typography>
          </Box>
        </Box>
        <InfoNote>
          {/* [Mateus · Card 5] No balcão, o pedido só vai para a cozinha depois do pagamento no caixa. */}
          {visit.counter
            ? 'Depois de enviar, você recebe a senha. Pague no caixa e o pedido entra na cozinha. Não há taxa de serviço.'
            : 'Ao enviar, o pedido vai direto para a cozinha e entra na sua comanda. Para mudar depois, chame o garçom.'}
        </InfoNote>
      </Box>
    </ClientScreen>
  );
}
