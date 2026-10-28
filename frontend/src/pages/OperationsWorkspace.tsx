import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ManagementLayout, { Card, Segmented } from '../components/management/ManagementLayout';
import { ApiError, api } from '../services/api';
import { formatCents } from '../services/format';
import { operations, statusLabels } from '../services/operations';
import type { KitchenOrder, OrderStatus } from '../services/operations';
import { tokens } from '../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

type Item = { nameSnapshot: string; quantity: number; unitPriceCents: number; status: string; note?: string; options?: { label: string }[] };
type Order = { id: string; tabId: string; tableId?: string; number: number; status: OrderStatus; items: Item[]; totalCents: number; createdAt: string; readyAt?: string; statusHistory?: { to: string; at: string }[] };
type Call = { id: string; reason: string; createdAt: string; status: string };
type Tab = { id: string; tableId?: string; mode: string; customerName?: string; status: string; totalCents?: number; subtotalCents?: number; serviceFeeCents?: number; openedAt?: string; pickupTicket?: number; waiterCalls?: Call[] };
type Waiting = { id: string; number: number; name: string; partySize: number; createdAt: string; status: string };
type Workspace = { store: { name: string; logoUrl?: string; pausedUntil?: string; pausedScopes?: string[] }; role: string; tables: { id: string; number: number; nickname?: string }[]; tabs: Tab[]; orders: Order[]; waitlist: Waiting[]; serverTime: string };

const COLUMNS = ['RECEIVED', 'PREPARING', 'READY'] as const;
const REASONS = ['Cliente desistiu', 'Pedido lançado errado', 'Faltou ingrediente', 'Pedido duplicado'];
const HIDDEN_ITEMS = ['REMOVED', 'CANCELLED'];
const LATE_MINUTES = 15;
const KITCHEN_ROLES = ['OWNER', 'MANAGER', 'KITCHEN'];
const FLOOR_ROLES = ['OWNER', 'MANAGER', 'WAITER'];
const COLUMN_DOT: Record<(typeof COLUMNS)[number], string> = { RECEIVED: colors.error, PREPARING: colors.text, READY: colors.success };
const METHODS: [string, string][] = [
  ['PIX_MANUAL', 'Pix (confirmado na mão)'],
  ['CASH', 'Dinheiro'],
  ['CARD_DEBIT', 'Cartão de débito'],
  ['CARD_CREDIT', 'Cartão de crédito'],
];
const NOT_CONNECTED = 'Esta ação ainda não está ligada ao servidor. Nenhuma alteração foi gravada.';

const money = (cents?: number) => (cents === undefined ? '—' : formatCents(cents));
const time = (date?: string) => (date ? new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
const pad = (value: number) => String(value).padStart(2, '0');

function useWorkspace() {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [synced, setSynced] = useState(false);
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const result = await api.get<Workspace>('/api/operations/workspace');
        if (stopped) return;
        setData(result);
        setOffset(Date.parse(result.serverTime) - Date.now());
        setSynced(true);
        setError('');
      } catch (cause) {
        if (stopped) return;
        setSynced(false);
        setError(cause instanceof ApiError && cause.status === 401 ? 'Sua sessão expirou. Entre de novo.' : 'Não foi possível sincronizar com o servidor.');
      } finally {
        if (!stopped) timer = setTimeout(load, 15000);
      }
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [revision]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, error, synced, reload, now: clock + offset, setError };
}

export default function OperationsWorkspace() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, error, synced, reload, now, setError } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const pieces = pathname.split('/').filter(Boolean);
  const root = pieces[0];
  const view = pieces[1] ?? '';

  const age = (date: string) => Math.max(0, Math.floor((now - Date.parse(date)) / 60000));
  const tabFor = (order: Order) => data?.tabs.find((tab) => tab.id === order.tabId);
  const tableNumber = (id?: string) => data?.tables.find((table) => table.id === id)?.number;
  const title = (order: Order) => {
    const tab = tabFor(order);
    const number = tableNumber(order.tableId ?? tab?.tableId);
    if (tab?.mode === 'COUNTER') return `Balcão${tab.pickupTicket ? ` · senha ${tab.pickupTicket}` : ''}`;
    return number ? `Mesa ${pad(number)}` : `Pedido #${order.number}`;
  };
  const late = (order: Order) => ['RECEIVED', 'PREPARING'].includes(order.status) && age(order.createdAt) >= LATE_MINUTES;
  const active = (data?.orders ?? [])
    .filter((order) => COLUMNS.some((status) => status === order.status))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const ready = active
    .filter((order) => order.status === 'READY')
    .sort((a, b) => Date.parse(a.readyAt ?? a.createdAt) - Date.parse(b.readyAt ?? b.createdAt));
  const calls = data?.tabs.flatMap((tab) => (tab.waiterCalls ?? []).filter((call) => call.status === 'OPEN').map((call) => ({ ...call, tab }))) ?? [];
  const role = data?.role ?? '';

  async function advance(order: Order) {
    if (busy || !synced) return;
    const target = order.status === 'RECEIVED' ? 'PREPARING' : order.status === 'PREPARING' ? 'READY' : 'DELIVERED';
    setBusy(true);
    try {
      await operations.changeStatus({ id: order.id, status: order.status } as KitchenOrder, target);
      reload();
      navigate(target === 'DELIVERED' ? '/salao/entregas' : '/producao');
    } catch {
      setError('Não foi possível mudar o status. O pedido pode ter mudado em outra tela.');
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function closeBill(tabId: string, method: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/api/operations/tabs/${tabId}/close`, { method });
      reload();
      navigate('/contas');
    } catch {
      setError('Não foi possível fechar a conta agora.');
      reload();
    } finally {
      setBusy(false);
    }
  }

  const ctx: Ctx = { data, now, age, tabFor, tableNumber, title, late, active, ready, calls, role, busy, synced, advance, navigate, notify: setNotice };

  const kitchen = root === 'producao';
  const counters = data && (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Counter label={kitchen ? 'Na fila agora' : 'Contas abertas'} value={kitchen ? active.length : data.tabs.length} />
      {!kitchen && <Counter label="Chamados" value={calls.length} alert={calls.length > 0} />}
    </Box>
  );

  if (kitchen && view === 'tela-grande') return <WallScreen ctx={ctx} />;

  const page = resolvePage(root, view, pieces, ctx, closeBill);

  return (
    <ManagementLayout
      title={page.title}
      subtitle={page.subtitle ?? (kitchen ? `Atualiza sozinho a cada 15 segundos · ${time(new Date(now).toISOString())}` : data ? `${data.tables.length} mesas · ${data.tabs.length} contas abertas` : undefined)}
      back={page.back}
      actions={<SyncBadge synced={synced} />}
      sidebarFooter={counters}
    >
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" onClick={reload}>
              Atualizar
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {!data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>{error ? <Typography>Não foi possível carregar a operação.</Typography> : <CircularProgress />}</Box>
      ) : (
        page.body
      )}
      <Dialog open={!!notice} onClose={() => setNotice('')}>
        <DialogTitle>{notice}</DialogTitle>
        <DialogContent>
          <Alert severity="info">{NOT_CONNECTED}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotice('')}>Entendi</Button>
        </DialogActions>
      </Dialog>
    </ManagementLayout>
  );
}

interface Ctx {
  data: Workspace | null;
  now: number;
  age: (date: string) => number;
  tabFor: (order: Order) => Tab | undefined;
  tableNumber: (id?: string) => number | undefined;
  title: (order: Order) => string;
  late: (order: Order) => boolean;
  active: Order[];
  ready: Order[];
  calls: (Call & { tab: Tab })[];
  role: string;
  busy: boolean;
  synced: boolean;
  advance: (order: Order) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
  notify: (title: string) => void;
}

interface Page {
  title: string;
  subtitle?: string;
  back?: { to: string; label: string };
  body: ReactNode;
}

function resolvePage(root: string, view: string, pieces: string[], ctx: Ctx, closeBill: (tabId: string, method: string) => Promise<void>): Page {
  const { data } = ctx;
  if (root === 'producao') {
    const selected = data?.orders.find((order) => order.id === pieces[2]);
    if (['pedido', 'confirmar', 'cancelar'].includes(view)) {
      const back = { to: '/producao', label: 'Voltar à fila' };
      if (!selected) return { title: 'Pedido', back, body: <Alert severity="warning">Pedido não encontrado ou não está mais ativo.</Alert> };
      if (view === 'confirmar') return { title: 'Marcar como pronto?', back, body: <ConfirmReady ctx={ctx} order={selected} /> };
      if (view === 'cancelar') return { title: `Cancelar o pedido #${selected.number}?`, back, body: <CancelOrder ctx={ctx} order={selected} /> };
      return { title: `${ctx.title(selected)} · #${selected.number}`, back, body: <OrderDetail ctx={ctx} order={selected} /> };
    }
    if (view === 'pausar') return { title: 'Pausar pedidos', back: { to: '/producao', label: 'Voltar à fila' }, body: <PauseOrders ctx={ctx} /> };
    if (view === 'impressao') return { title: 'Impressão e tela grande', back: { to: '/producao', label: 'Voltar à fila' }, body: <Printing ctx={ctx} /> };
    return { title: 'Produção', body: <ProductionBoard ctx={ctx} /> };
  }
  if (root === 'salao') {
    const tabs = <FloorTabs ctx={ctx} current={view} />;
    if (view === 'entregas') return { title: 'Entregas pendentes', body: <>{tabs}<Deliveries ctx={ctx} /></> };
    if (view === 'chamados') return { title: 'Chamados', body: <>{tabs}<Calls ctx={ctx} /></> };
    return { title: 'Salão', body: <>{tabs}<TablesMap ctx={ctx} /></> };
  }
  if (root === 'fila-espera') return { title: 'Fila de espera', body: <Waitlist ctx={ctx} /> };
  const bill = data?.tabs.find((tab) => tab.id === pieces[1]);
  if (bill) {
    const number = ctx.tableNumber(bill.tableId);
    return {
      title: `${number ? `Mesa ${pad(number)}` : 'Balcão'} · ${bill.customerName ? `comanda de ${bill.customerName}` : 'comanda'}`,
      subtitle: `Aberta às ${time(bill.openedAt)}`,
      back: { to: '/contas', label: 'Contas abertas' },
      body: <BillDetail ctx={ctx} bill={bill} onClose={closeBill} conference={pieces[2] === 'conferencia'} />,
    };
  }
  return { title: 'Contas abertas', body: <OpenTabs ctx={ctx} missing={!!pieces[1] && !!data} /> };
}

function SyncBadge({ synced }: { synced: boolean }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        px: 4,
        height: 36,
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.background,
        fontSize: fontSize.small,
        fontWeight: fontWeight.bold,
        color: synced ? colors.success : colors.error,
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: synced ? colors.success : colors.error }} />
      {synced ? 'Conectado' : 'Sem conexão'}
    </Box>
  );
}

function Counter({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: alert ? colors.error : 'rgba(255,255,255,0.08)' }}>
      <Typography sx={{ fontSize: fontSize.small, color: 'rgba(255,255,255,0.7)' }}>{label}</Typography>
      <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>{value}</Typography>
    </Box>
  );
}

function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'dark' | 'red' | 'green' }) {
  const styles = {
    neutral: { bgcolor: colors.surface, color: colors.text },
    dark: { bgcolor: colors.text, color: colors.background },
    red: { bgcolor: colors.error, color: colors.background },
    green: { bgcolor: colors.success, color: colors.background },
  }[tone];
  return (
    <Box component="span" sx={{ ...styles, px: 3, py: 1, borderRadius: 999, fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 16, color: colors.textSecondary }}>
      <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold, color: colors.text }}>{text}</Typography>
      <Typography sx={{ mt: 2 }}>Assim que houver uma atualização, ela aparece aqui sozinha.</Typography>
    </Box>
  );
}

function ItemList({ order, prices = false, large = false }: { order: Order; prices?: boolean; large?: boolean }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 3 }}>
      {order.items
        .filter((item) => !HIDDEN_ITEMS.includes(item.status))
        .map((item, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
            <Box>
              <Typography sx={{ fontWeight: fontWeight.extraBold, fontSize: large ? fontSize.title : fontSize.base }}>
                {item.quantity}× {item.nameSnapshot}
              </Typography>
              {!!item.options?.length && (
                <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>{item.options.map((option) => option.label).join(' · ')}</Typography>
              )}
              {item.note && <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold, color: colors.error }}>{item.note}</Typography>}
            </Box>
            {prices && <Typography sx={{ fontWeight: fontWeight.extraBold }}>{money(item.quantity * item.unitPriceCents)}</Typography>}
          </Box>
        ))}
    </Box>
  );
}

function OrderAction({ ctx, order }: { ctx: Ctx; order: Order }) {
  const delivery = order.status === 'READY';
  const permitted = (delivery ? FLOOR_ROLES : KITCHEN_ROLES).includes(ctx.role);
  const label =
    order.status === 'RECEIVED'
      ? 'Iniciar preparo'
      : order.status === 'PREPARING'
        ? 'Marcar pronto'
        : ctx.tabFor(order)?.mode === 'COUNTER'
          ? 'Confirmar retirada'
          : 'Confirmar entrega';
  return (
    <Button
      fullWidth
      variant={delivery ? 'outlined' : 'contained'}
      disabled={ctx.busy || !ctx.synced || !permitted}
      onClick={() => (order.status === 'PREPARING' ? ctx.navigate(`/producao/confirmar/${order.id}`) : void ctx.advance(order))}
      sx={{ minHeight: 48 }}
    >
      {label}
    </Button>
  );
}

function OrderCard({ ctx, order, large = false }: { ctx: Ctx; order: Order; large?: boolean }) {
  const isLate = ctx.late(order);
  const minutes = ctx.age(order.createdAt);
  const tab = ctx.tabFor(order);
  return (
    <Box sx={{ bgcolor: colors.background, border: `1px solid ${isLate ? colors.error : colors.border}`, borderRadius: `${radius.card}px`, p: 5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
        <ButtonBase
          onClick={() => ctx.navigate(`/producao/pedido/${order.id}`)}
          sx={{ fontFamily: 'inherit', fontSize: large ? fontSize.heading : fontSize.lead, fontWeight: fontWeight.extraBold }}
        >
          {ctx.title(order)}
        </ButtonBase>
        <Pill tone={isLate ? 'red' : 'neutral'}>{minutes ? `${minutes} min` : 'agora'}</Pill>
      </Box>
      <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
        Pedido #{order.number}
        {tab?.customerName ? ` · ${tab.customerName}` : ''}
      </Typography>
      <ItemList order={order} large={large} />
      <OrderAction ctx={ctx} order={order} />
    </Box>
  );
}

function ProductionBoard({ ctx }: { ctx: Ctx }) {
  const [mode, setMode] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const { data, active } = ctx;
  const filtered = active.filter((order) => (mode === 'ALL' || ctx.tabFor(order)?.mode === mode) && (status === 'ALL' || order.status === status));
  const paused = !!data?.store.pausedUntil && Date.parse(data.store.pausedUntil) > ctx.now;
  const visible = COLUMNS.filter((column) => status === 'ALL' || status === column);

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 6 }}>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'ALL', label: 'Tudo' }, { value: 'TABLE', label: 'Mesa' }, { value: 'COUNTER', label: 'Balcão' }]} />
        <Segmented
          value={status}
          onChange={setStatus}
          options={[{ value: 'ALL', label: 'Todos' }, ...COLUMNS.map((column) => ({ value: column, label: statusLabels[column] }))]}
        />
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" component={RouterLink} to="/producao/pausar" sx={{ minHeight: 44 }}>
          Pausar pedidos
        </Button>
        <Button variant="outlined" component={RouterLink} to="/producao/impressao" sx={{ minHeight: 44 }}>
          Impressão
        </Button>
      </Box>
      {paused && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Pausa registrada até {time(data?.store.pausedUntil)}. Pedidos já recebidos continuam em preparo.
        </Alert>
      )}
      {!filtered.length ? (
        <EmptyState text={active.length ? 'Nenhum pedido com estes filtros' : 'Nenhum pedido na fila'} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: `repeat(${visible.length}, 1fr)` }, gap: 5, alignItems: 'start' }}>
          {visible.map((column) => {
            const orders = filtered.filter((order) => order.status === column);
            return (
              <Box key={column}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLUMN_DOT[column] }} />
                  <Typography sx={{ fontWeight: fontWeight.extraBold, flex: 1 }}>{statusLabels[column]}</Typography>
                  <Typography sx={{ fontWeight: fontWeight.extraBold, color: colors.textMuted }}>{orders.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {orders.map((order) => (
                    <OrderCard key={order.id} ctx={ctx} order={order} />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );
}

function OrderDetail({ ctx, order }: { ctx: Ctx; order: Order }) {
  const tab = ctx.tabFor(order);
  const others = ctx.active.filter((other) => other.tabId === order.tabId && other.id !== order.id).length;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 6, alignItems: 'start' }}>
      <Card highlighted={ctx.late(order)}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
          <Typography sx={{ color: colors.textSecondary }}>
            Comanda {tab?.customerName ?? ''} · enviado às {time(order.createdAt)}
          </Typography>
          <Pill tone={ctx.late(order) ? 'red' : 'neutral'}>{ctx.age(order.createdAt)} min na fila</Pill>
        </Box>
        <ItemList order={order} prices />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 4, borderTop: `1px solid ${colors.divider}` }}>
          <Typography sx={{ fontWeight: fontWeight.bold }}>Total do pedido</Typography>
          <Typography sx={{ fontWeight: fontWeight.extraBold }}>{money(order.totalCents)}</Typography>
        </Box>
      </Card>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Card>
          <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 3 }}>Status</Typography>
          {[...COLUMNS, 'DELIVERED' as const].map((status) => (
            <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ fontWeight: order.status === status ? fontWeight.extraBold : fontWeight.bold, color: order.status === status ? colors.text : colors.textMuted }}>
                {statusLabels[status]}
              </Typography>
              <Typography sx={{ color: colors.textMuted }}>
                {time(status === 'RECEIVED' ? order.createdAt : order.statusHistory?.find((entry) => entry.to === status)?.at)}
              </Typography>
            </Box>
          ))}
          <Box sx={{ mt: 4 }}>
            <OrderAction ctx={ctx} order={order} />
          </Box>
        </Card>
        <Card>
          <Typography sx={{ fontWeight: fontWeight.extraBold }}>{ctx.title(order)}</Typography>
          <Typography sx={{ mt: 1, color: colors.textSecondary }}>Outros pedidos abertos nesta comanda: {others}</Typography>
          <Button color="error" variant="outlined" fullWidth component={RouterLink} to={`/producao/cancelar/${order.id}`} sx={{ mt: 4, minHeight: 44 }}>
            Cancelar pedido
          </Button>
        </Card>
      </Box>
    </Box>
  );
}

function ConfirmReady({ ctx, order }: { ctx: Ctx; order: Order }) {
  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography sx={{ color: colors.textSecondary, mb: 4 }}>
        {ctx.title(order)} · pedido #{order.number} · {ctx.age(order.createdAt)} minutos na fila
      </Typography>
      <Card>
        <ItemList order={order} />
      </Card>
      <Alert severity="info" sx={{ mt: 4 }}>
        O pedido fica disponível na lista de entregas pendentes do salão.
      </Alert>
      <Box sx={{ display: 'flex', gap: 3, mt: 6 }}>
        <Button variant="outlined" component={RouterLink} to={`/producao/pedido/${order.id}`} sx={{ flex: 1, minHeight: 52 }}>
          Voltar
        </Button>
        <Button
          variant="contained"
          disabled={ctx.busy || !ctx.synced || order.status !== 'PREPARING' || !KITCHEN_ROLES.includes(ctx.role)}
          onClick={() => void ctx.advance(order)}
          sx={{ flex: 2, minHeight: 52 }}
        >
          Sim, está pronto
        </Button>
      </Box>
    </Box>
  );
}

function CancelOrder({ ctx, order }: { ctx: Ctx; order: Order }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography sx={{ color: colors.textSecondary, mb: 4 }}>
        {ctx.title(order)} · {money(order.totalCents)}
      </Typography>
      <Card>
        <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 2 }}>Motivo do cancelamento</Typography>
        {REASONS.map((value) => (
          <FormControlLabel key={value} control={<Radio checked={reason === value} onChange={() => setReason(value)} />} label={value} sx={{ display: 'flex' }} />
        ))}
        <TextField fullWidth multiline minRows={2} label="Observação para o histórico" value={note} onChange={(event) => setNote(event.target.value)} sx={{ mt: 3 }} />
      </Card>
      <Alert severity="warning" sx={{ mt: 4 }}>
        Só é permitido cancelar antes de ficar pronto. O cancelamento ainda não está ligado ao servidor.
      </Alert>
      <Box sx={{ display: 'flex', gap: 3, mt: 6 }}>
        <Button variant="outlined" component={RouterLink} to={`/producao/pedido/${order.id}`} sx={{ flex: 1, minHeight: 52 }}>
          Manter pedido
        </Button>
        <Button color="error" variant="contained" disabled sx={{ flex: 1, minHeight: 52 }}>
          Cancelar pedido
        </Button>
      </Box>
    </Box>
  );
}

function PauseOrders({ ctx }: { ctx: Ctx }) {
  const [minutes, setMinutes] = useState('15');
  const [scopes, setScopes] = useState(['KITCHEN', 'COUNTER']);
  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography sx={{ color: colors.textSecondary, mb: 4 }}>A fila tem {ctx.active.length} pedidos.</Typography>
      <Card>
        <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 3 }}>Por quanto tempo</Typography>
        <Segmented value={minutes} onChange={setMinutes} options={['10', '15', '30', '60'].map((value) => ({ value, label: `${value} min` }))} />
        <Typography sx={{ fontWeight: fontWeight.extraBold, mt: 6, mb: 1 }}>O que pausar</Typography>
        {[
          ['KITCHEN', 'Itens que vão para a cozinha'],
          ['DRINKS', 'Bebidas'],
          ['COUNTER', 'Pedidos de balcão'],
        ].map(([value, label]) => (
          <FormControlLabel
            key={value}
            labelPlacement="start"
            label={label}
            control={<Switch checked={scopes.includes(value)} onChange={(_, checked) => setScopes((old) => (checked ? [...old, value] : old.filter((scope) => scope !== value)))} />}
            sx={{ m: 0, py: 1, width: '100%', justifyContent: 'space-between' }}
          />
        ))}
      </Card>
      <Box sx={{ mt: 4, p: 5, borderRadius: `${radius.card}px`, bgcolor: colors.surface }}>
        <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, color: colors.textSecondary }}>O CLIENTE VÊ</Typography>
        <Typography sx={{ mt: 1 }}>A cozinha está com fila agora. Voltamos a aceitar pedidos em {minutes} minutos.</Typography>
      </Box>
      <Alert severity="warning" sx={{ mt: 4 }}>
        A pausa ainda não está ligada ao servidor. Nenhuma pausa será simulada.
      </Alert>
      <Box sx={{ display: 'flex', gap: 3, mt: 6 }}>
        <Button variant="outlined" component={RouterLink} to="/producao" sx={{ flex: 1, minHeight: 52 }}>
          Cancelar
        </Button>
        <Button variant="contained" disabled sx={{ flex: 2, minHeight: 52 }}>
          Pausar por {minutes} min
        </Button>
      </Box>
    </Box>
  );
}

function Receipt({ ctx, order }: { ctx: Ctx; order?: Order }) {
  const [highlight, setHighlight] = useState(true);
  return (
    <Card>
      <Typography sx={{ fontWeight: fontWeight.extraBold }}>Comanda impressa · 80 mm</Typography>
      {order ? (
        <Box sx={{ mt: 4, p: 4, bgcolor: colors.panel, border: `1px dashed ${colors.border}`, fontFamily: 'monospace' }}>
          <Typography sx={{ fontFamily: 'inherit', fontWeight: 800 }}>COZINHA · {ctx.title(order).toUpperCase()}</Typography>
          <Typography sx={{ fontFamily: 'inherit', fontSize: fontSize.small }}>
            PEDIDO #{order.number} · {time(order.createdAt)}
          </Typography>
          <Box>
            <ItemList order={highlight ? order : { ...order, items: order.items.map((item) => ({ ...item, note: undefined })) }} />
          </Box>
          <Typography sx={{ fontFamily: 'inherit', fontSize: fontSize.small }}>Não é documento fiscal</Typography>
        </Box>
      ) : (
        <Typography sx={{ mt: 3, color: colors.textMuted }}>Nenhum pedido disponível para imprimir.</Typography>
      )}
      <FormControlLabel control={<Switch checked={highlight} onChange={(_, value) => setHighlight(value)} />} label="Mostrar observações" sx={{ mt: 3 }} />
      <Button variant="contained" fullWidth disabled={!order} onClick={() => window.print()} sx={{ mt: 3, minHeight: 48 }}>
        Imprimir de novo
      </Button>
    </Card>
  );
}

function Printing({ ctx }: { ctx: Ctx }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 6, alignItems: 'start' }}>
      <Receipt ctx={ctx} order={ctx.active[0]} />
      <Card>
        <Typography sx={{ fontWeight: fontWeight.extraBold }}>Tela grande da cozinha</Typography>
        <Typography sx={{ mt: 2, color: colors.textSecondary }}>
          Mostra a fila em letras grandes, sem menu, para deixar aberta numa TV ou tablet na cozinha.
        </Typography>
        <Button variant="outlined" fullWidth component={RouterLink} to="/producao/tela-grande" sx={{ mt: 4, minHeight: 48 }}>
          Abrir modo tela grande
        </Button>
        <Typography sx={{ mt: 4, fontSize: fontSize.small, color: colors.textMuted }}>
          Impressão manual pelo navegador. Impressão automática depende de integração com a impressora.
        </Typography>
      </Card>
    </Box>
  );
}

function WallScreen({ ctx }: { ctx: Ctx }) {
  const orders = ctx.active.filter((order) => order.status !== 'READY');
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.panel, p: { xs: 5, md: 8 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, mb: 6 }}>
        <Typography variant="h1" sx={{ fontSize: fontSize.display }}>
          Cozinha · {orders.length} na fila
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <SyncBadge synced={ctx.synced} />
          <Button variant="outlined" component={RouterLink} to="/producao" sx={{ minHeight: 44 }}>
            Sair da tela grande
          </Button>
        </Box>
      </Box>
      {orders.length ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 5 }}>
          {orders.map((order) => (
            <OrderCard key={order.id} ctx={ctx} order={order} large />
          ))}
        </Box>
      ) : (
        <EmptyState text="Nenhum pedido na fila" />
      )}
    </Box>
  );
}

function FloorTabs({ ctx, current }: { ctx: Ctx; current: string }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 6 }}>
      <Segmented
        value={current || 'mesas'}
        onChange={(value) => ctx.navigate(value === 'mesas' ? '/salao' : `/salao/${value}`)}
        options={[
          { value: 'mesas', label: 'Mesas' },
          { value: 'entregas', label: `Entregas (${ctx.ready.length})` },
          { value: 'chamados', label: `Chamados (${ctx.calls.length})` },
        ]}
      />
      <Box sx={{ flex: 1 }} />
      <Button variant="contained" onClick={() => ctx.notify('Abrir conta manual')} sx={{ minHeight: 44 }}>
        Abrir conta manual
      </Button>
    </Box>
  );
}

function TablesMap({ ctx }: { ctx: Ctx }) {
  const { data, calls } = ctx;
  if (!data) return null;
  const tables = [...data.tables].sort((a, b) => a.number - b.number);
  return (
    <>
      {calls.length > 0 && (
        <Alert severity="error" sx={{ mb: 4 }}>
          Chamados agora:{' '}
          {calls.map((call) => `Mesa ${ctx.tableNumber(call.tab.tableId) ?? '—'} · ${call.reason} · há ${ctx.age(call.createdAt)} min`).join(' | ')}
        </Alert>
      )}
      {!tables.length ? (
        <EmptyState text="Nenhuma mesa cadastrada" />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 4 }}>
          {tables.map((table) => {
            const tabs = data.tabs.filter((tab) => tab.tableId === table.id);
            const calling = calls.find((call) => call.tab.tableId === table.id);
            const paying = tabs.some((tab) => tab.status === 'AWAITING_PAYMENT');
            const occupied = tabs.length > 0;
            return (
              <ButtonBase
                key={table.id}
                onClick={() => (tabs[0] ? ctx.navigate(`/contas/${tabs[0].id}`) : ctx.notify(`Mesa ${pad(table.number)} · abrir conta`))}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 5,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  bgcolor: colors.background,
                  borderRadius: `${radius.card}px`,
                  border: `${calling || occupied ? 2 : 1}px solid ${calling ? colors.error : paying ? colors.success : occupied ? colors.text : colors.border}`,
                }}
              >
                <Typography sx={{ fontSize: fontSize.display, fontWeight: fontWeight.extraBold, lineHeight: 1 }}>{pad(table.number)}</Typography>
                <Pill tone={calling ? 'red' : paying ? 'green' : occupied ? 'dark' : 'neutral'}>
                  {calling ? 'Chamando' : paying ? 'Pagando' : occupied ? `${tabs.length} comanda${tabs.length > 1 ? 's' : ''}` : 'Livre'}
                </Pill>
                <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
                  {calling ? calling.reason : occupied ? money(tabs.reduce((sum, tab) => sum + (tab.totalCents ?? 0), 0)) : table.nickname ?? 'Sem conta'}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </>
  );
}

function ListRow({ lead, title, detail, side, actions, alert = false }: { lead: ReactNode; title: ReactNode; detail?: ReactNode; side?: ReactNode; actions?: ReactNode; alert?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        alignItems: 'center',
        gap: 4,
        p: 5,
        bgcolor: colors.background,
        border: `1px solid ${alert ? colors.error : colors.border}`,
        borderRadius: `${radius.card}px`,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: '14px',
          bgcolor: alert ? colors.error : colors.surface,
          color: alert ? colors.background : colors.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: fontWeight.extraBold,
        }}
      >
        {lead}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: fontWeight.extraBold }}>{title}</Typography>
        {detail && <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>{detail}</Typography>}
      </Box>
      {side}
      {actions}
    </Box>
  );
}

function Deliveries({ ctx }: { ctx: Ctx }) {
  if (!ctx.ready.length) return <EmptyState text="Nenhuma entrega pendente" />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography sx={{ color: colors.textSecondary }}>A cozinha marcou como pronto. Leve à mesa e confirme aqui.</Typography>
      {ctx.ready.map((order) => {
        const tab = ctx.tabFor(order);
        const waiting = ctx.age(order.readyAt ?? order.createdAt);
        return (
          <ListRow
            key={order.id}
            alert={waiting >= 5}
            lead={ctx.tableNumber(order.tableId ?? tab?.tableId) ?? tab?.pickupTicket ?? '#'}
            title={`${ctx.title(order)}${tab?.customerName ? ` · ${tab.customerName}` : ''}`}
            detail={order.items.filter((item) => !HIDDEN_ITEMS.includes(item.status)).map((item) => `${item.quantity}× ${item.nameSnapshot}`).join(', ')}
            side={<Pill tone={waiting >= 5 ? 'red' : 'neutral'}>pronto há {waiting} min</Pill>}
            actions={
              <Box sx={{ minWidth: 200 }}>
                <OrderAction ctx={ctx} order={order} />
              </Box>
            }
          />
        );
      })}
    </Box>
  );
}

function Calls({ ctx }: { ctx: Ctx }) {
  if (!ctx.calls.length) return <EmptyState text="Nenhum chamado aberto" />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {ctx.calls.map((call) => (
        <ListRow
          key={call.id}
          alert
          lead={ctx.tableNumber(call.tab.tableId) ?? '—'}
          title={call.reason}
          detail={`${call.tab.customerName ?? 'Comanda'} · ${time(call.createdAt)}`}
          side={<Pill>{ctx.age(call.createdAt)} min</Pill>}
          actions={
            <Button variant="contained" onClick={() => ctx.notify('Atender chamado')} sx={{ minHeight: 44 }}>
              Atender
            </Button>
          }
        />
      ))}
    </Box>
  );
}

function Waitlist({ ctx }: { ctx: Ctx }) {
  const entries = [...(ctx.data?.waitlist ?? [])].sort((a, b) => a.number - b.number);
  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 6 }}>
        <TextField size="small" label="Nome e quantas pessoas" sx={{ minWidth: 280, bgcolor: colors.background }} />
        <Button variant="contained" onClick={() => ctx.notify('Adicionar à fila')} sx={{ minHeight: 40 }}>
          Pôr na fila
        </Button>
      </Box>
      {!entries.length ? (
        <EmptyState text="Nenhuma pessoa na fila" />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {entries.map((entry) => (
            <ListRow
              key={entry.id}
              lead={entry.number}
              title={entry.name}
              detail={`${entry.partySize} pessoas · chegou ${time(entry.createdAt)} · ${ctx.age(entry.createdAt)} min esperando`}
              side={<Pill tone={entry.status === 'CALLED' ? 'dark' : 'neutral'}>{entry.status === 'CALLED' ? 'Chamado' : 'Esperando'}</Pill>}
              actions={
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" onClick={() => ctx.notify(entry.status === 'CALLED' ? 'Sentar na mesa' : 'Chamar cliente')} sx={{ minHeight: 44 }}>
                    {entry.status === 'CALLED' ? 'Sentar na mesa' : 'Chamar'}
                  </Button>
                  <Button variant="outlined" onClick={() => ctx.notify('Remover da fila')} sx={{ minHeight: 44 }}>
                    Desistiu
                  </Button>
                </Box>
              }
            />
          ))}
        </Box>
      )}
    </>
  );
}

function OpenTabs({ ctx, missing }: { ctx: Ctx; missing: boolean }) {
  const tabs = ctx.data?.tabs ?? [];
  return (
    <>
      {missing && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Conta não encontrada ou já fechada.
        </Alert>
      )}
      {!tabs.length ? (
        <EmptyState text="Nenhuma conta aberta" />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tabs.map((tab) => {
            const number = ctx.tableNumber(tab.tableId);
            return (
              <ButtonBase key={tab.id} onClick={() => ctx.navigate(`/contas/${tab.id}`)} sx={{ display: 'block', textAlign: 'left', fontFamily: 'inherit', borderRadius: `${radius.card}px` }}>
                <ListRow
                  lead={number ? pad(number) : 'B'}
                  title={`${number ? `Mesa ${pad(number)}` : 'Balcão'} · ${tab.customerName ?? 'Comanda'}`}
                  detail={`Aberta às ${time(tab.openedAt)}${tab.status === 'AWAITING_PAYMENT' ? ' · pedindo a conta' : ''}`}
                  side={<Typography sx={{ fontWeight: fontWeight.extraBold }}>{money(tab.totalCents)}</Typography>}
                />
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </>
  );
}

function BillDetail({ ctx, bill, onClose, conference }: { ctx: Ctx; bill: Tab; onClose: (tabId: string, method: string) => Promise<void>; conference: boolean }) {
  const [method, setMethod] = useState('PIX_MANUAL');
  const orders = ctx.data?.orders.filter((order) => order.tabId === bill.id && order.status !== 'CANCELLED') ?? [];
  const canClose = FLOOR_ROLES.includes(ctx.role);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 6, alignItems: 'start' }}>
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: fontWeight.extraBold }}>
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </Typography>
          <Button variant="outlined" component={RouterLink} to={conference ? `/contas/${bill.id}` : `/contas/${bill.id}/conferencia`} sx={{ minHeight: 40 }}>
            {conference ? 'Ver itens' : 'Conferência para imprimir'}
          </Button>
        </Box>
        {!orders.length && <Typography sx={{ color: colors.textMuted, py: 4 }}>Nenhum pedido nesta comanda ainda.</Typography>}
        {orders.map((order) => (
          <Box key={order.id} sx={{ borderTop: `1px solid ${colors.divider}`, pt: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                Pedido #{order.number} · {time(order.createdAt)}
              </Typography>
              <Pill tone={order.status === 'READY' ? 'green' : order.status === 'DELIVERED' ? 'neutral' : 'dark'}>{statusLabels[order.status] ?? order.status}</Pill>
            </Box>
            <ItemList order={order} prices />
          </Box>
        ))}
      </Card>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Card>
          {[
            ['Consumo', money(bill.subtotalCents)],
            ['Serviço', money(bill.serviceFeeCents)],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography sx={{ color: colors.textSecondary }}>{label}</Typography>
              <Typography sx={{ fontWeight: fontWeight.bold }}>{value}</Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 3, mt: 2, borderTop: `1px solid ${colors.divider}` }}>
            <Typography sx={{ fontWeight: fontWeight.extraBold }}>Total</Typography>
            <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>{money(bill.totalCents)}</Typography>
          </Box>
          {conference && (
            <Button variant="outlined" fullWidth onClick={() => window.print()} sx={{ mt: 4, minHeight: 44 }}>
              Imprimir conferência
            </Button>
          )}
        </Card>
        <Card>
          <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 2 }}>Forma de pagamento</Typography>
          {METHODS.map(([value, label]) => (
            <FormControlLabel
              key={value}
              labelPlacement="start"
              control={<Radio checked={method === value} onChange={() => setMethod(value)} />}
              label={label}
              sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
            />
          ))}
          <Button variant="contained" fullWidth disabled={ctx.busy || !canClose} onClick={() => void onClose(bill.id, method)} sx={{ mt: 4, minHeight: 52 }}>
            Registrar pagamento e fechar
          </Button>
          <Typography sx={{ mt: 3, fontSize: fontSize.small, color: colors.textSecondary }}>
            O pagamento é conferido na mão: Pix no extrato, cartão na maquininha, dinheiro no caixa.
          </Typography>
        </Card>
      </Box>
    </Box>
  );
}
