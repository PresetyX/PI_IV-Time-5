import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ApiError } from '../services/api';
import { actionLabels, KitchenOrder, nextStatus, operations, orderTitle, QueueMode, QueueStatus, statusLabels } from '../services/operations';

const columns = ['RECEIVED', 'PREPARING', 'READY'] as const;
const delayMinutes = 15;
const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProductionPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [status, setStatus] = useState<QueueStatus>('ALL');
  const [mode, setMode] = useState<QueueMode>('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(true);
  const [selected, setSelected] = useState<KitchenOrder | null>(null);
  const [confirm, setConfirm] = useState<KitchenOrder | null>(null);
  const [now, setNow] = useState(Date.now());
  const [refresh, setRefresh] = useState(0);
  const requestVersion = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const version = ++requestVersion.current;
    setLoading(true);
    setStale(true);
    async function load() {
      try {
        const data = await operations.queue(status, mode);
        if (disposed || version !== requestVersion.current) return;
        setOrders(data); setStale(false); setError('');
      } catch (cause) {
        if (disposed || version !== requestVersion.current) return;
        setStale(true);
        setError(cause instanceof ApiError && cause.status === 401 ? 'Sua sessão expirou. Entre novamente.'
          : cause instanceof Error ? cause.message : 'Não foi possível carregar a fila.');
      } finally {
        if (!disposed && version === requestVersion.current) {
          setLoading(false); timer = setTimeout(load, 5000);
        }
      }
    }
    void load();
    return () => { disposed = true; clearTimeout(timer); };
  }, [status, mode, refresh]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const age = (order: KitchenOrder) => Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000));
  const late = (order: KitchenOrder) => ['RECEIVED', 'PREPARING'].includes(order.status) && age(order) >= delayMinutes;
  async function openDetail(order: KitchenOrder) {
    setBusy(true);
    try { const detail = await operations.detail(order.id); if (alive.current) setSelected(detail); }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Erro ao abrir pedido.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function advance(order: KitchenOrder) {
    const target = nextStatus[order.status];
    if (!target || target === 'DELIVERED') return;
    setBusy(true);
    try {
      await operations.changeStatus(order, target);
      if (!alive.current) return;
      setConfirm(null); setSelected(null); setRefresh(value => value + 1);
    } catch (cause) {
      if (!alive.current) return;
      setError(cause instanceof Error ? cause.message : 'Não foi possível mudar o status.');
      setConfirm(null); setSelected(null); setRefresh(value => value + 1);
    } finally { if (alive.current) setBusy(false); }
  }
  function act(order: KitchenOrder) {
    if (order.status === 'PREPARING') setConfirm(order);
    else void advance(order);
  }
  function items(order: KitchenOrder) {
    return order.items.map((item, index) => <Box key={index} sx={{ py: 1, px: item.note ? 1 : 0, my: 0.5, borderRadius: 1, bgcolor: item.note ? '#fff0ee' : undefined }}>
      <Typography fontWeight={600}>{item.quantity}× {item.name}</Typography>
      {item.options.length > 0 && <Typography variant="body2">{item.options.join(' · ')}</Typography>}
      {item.note && <Typography variant="body2" sx={{ color: '#9c2119', fontWeight: 700 }}>Observação: {item.note}</Typography>}
    </Box>);
  }
  function action(order: KitchenOrder) {
    return <Button fullWidth variant="contained" disabled={busy || stale || !nextStatus[order.status] || order.status === 'READY'} onClick={() => act(order)}>
      {actionLabels[order.status] ?? statusLabels[order.status]}
    </Button>;
  }

  return <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f7f7f8' }}>
    <Box component="nav" aria-label="Operação" sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', width: 176, p: 2, bgcolor: '#111', color: '#fff', flexShrink: 0 }}>
      <Typography fontWeight={800} sx={{ mb: 3 }}>Pede Aí</Typography>
      <Button color="inherit" component={RouterLink} to="/producao" aria-current="page">Produção</Button>
      <Button color="inherit" component={RouterLink} to="/salao">Salão</Button>
      <Box sx={{ mt: 'auto' }}><Typography variant="caption">Na fila filtrada</Typography><Typography variant="h5">{orders.length}</Typography></Box>
    </Box>
    <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, pb: { xs: 10, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Box><Typography variant="h5" component="h1" fontWeight={800}>Produção</Typography><Typography variant="caption">Atualização a cada 5 segundos · atraso a partir de {delayMinutes} min</Typography></Box>
        <Chip size="small" color={stale ? 'warning' : 'success'} label={stale ? 'Sem sincronização' : 'Conectado'} />
      </Stack>
      {error && <Alert severity="error" sx={{ my: 2 }} action={<Button color="inherit" onClick={() => setRefresh(value => value + 1)}>Atualizar</Button>}>{error} <RouterLink to="/login">Login</RouterLink></Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ my: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, value: QueueMode | null) => { if (value) setMode(value); }} aria-label="Origem dos pedidos">
          <ToggleButton value="ALL">Tudo</ToggleButton><ToggleButton value="TABLE">Mesa</ToggleButton><ToggleButton value="COUNTER">Balcão</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={status} onChange={(_, value: QueueStatus | null) => { if (value) setStatus(value); }} aria-label="Status dos pedidos">
          <ToggleButton value="ALL">Todos</ToggleButton>{columns.map(column => <ToggleButton key={column} value={column}>{statusLabels[column]}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>
      {loading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress aria-label="Carregando fila" /></Box>
        : !orders.length ? <Box sx={{ py: 12, textAlign: 'center' }}><Typography variant="h6">{stale ? 'Não foi possível consultar a fila' : status === 'ALL' && mode === 'ALL' ? 'Nenhum pedido na fila' : 'Nenhum pedido com estes filtros'}</Typography><Typography color="text.secondary">{stale ? 'Confira a conexão e tente atualizar.' : 'Novos pedidos aparecem automaticamente aqui.'}</Typography></Box>
        : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: status === 'ALL' ? 'repeat(3, minmax(0, 1fr))' : '1fr' }, gap: 2 }}>
          {columns.filter(column => status === 'ALL' || status === column).map(column => <Box key={column}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}><Typography fontWeight={700}>{statusLabels[column]}</Typography><Typography>{orders.filter(order => order.status === column).length}</Typography></Stack>
            <Stack spacing={1.5}>{orders.filter(order => order.status === column).map(order => <Card key={order.id} variant="outlined" sx={{ borderColor: late(order) ? '#b3261e' : 'divider', borderWidth: late(order) ? 2 : 1 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Button sx={{ p: 0, textAlign: 'left', justifyContent: 'flex-start' }} disabled={busy} onClick={() => void openDetail(order)}>{orderTitle(order)}</Button><Chip size="small" color={late(order) ? 'error' : 'default'} label={`${age(order)} min${late(order) ? ' · atrasado' : ''}`} /></Stack>
                <Typography variant="caption">Pedido #{order.number}{order.customerName ? ` · ${order.customerName}` : ''}</Typography>
                {items(order)}{action(order)}
              </CardContent>
            </Card>)}</Stack>
          </Box>)}
        </Box>}
    </Box>
    <Box component="nav" aria-label="Navegação móvel" sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', p: 1, display: { xs: 'flex', md: 'none' }, justifyContent: 'space-around', zIndex: 1100 }}><Button component={RouterLink} to="/producao" aria-current="page">Produção</Button><Button component={RouterLink} to="/salao">Salão</Button></Box>
    <Dialog open={!!selected} onClose={() => { if (!busy) setSelected(null); }} fullWidth maxWidth="sm">
      {selected && <><DialogTitle>{orderTitle(selected)} · pedido #{selected.number}</DialogTitle><DialogContent><Chip label={statusLabels[selected.status]} /><Typography sx={{ mt: 1 }}>{age(selected)} min na fila{late(selected) ? ' · Pedido atrasado' : ''}</Typography>{items(selected)}<Divider /><Typography sx={{ mt: 2 }}>Total: {money(selected.totalCents)}</Typography></DialogContent><DialogActions><Button disabled={busy} onClick={() => setSelected(null)}>Voltar</Button>{action(selected)}</DialogActions></>}
    </Dialog>
    <Dialog open={!!confirm} onClose={() => { if (!busy) setConfirm(null); }} fullWidth maxWidth="xs">
      {confirm && <><DialogTitle>Marcar como pronto?</DialogTitle><DialogContent><Typography>{orderTitle(confirm)} · pedido #{confirm.number}</Typography>{items(confirm)}<Alert severity="info">O pedido ficará disponível para entrega pelo salão. Confira todos os itens e observações.</Alert></DialogContent><DialogActions><Button disabled={busy} onClick={() => setConfirm(null)}>Voltar</Button><Button variant="contained" disabled={busy || stale} onClick={() => void advance(confirm)}>{busy ? 'Salvando…' : 'Sim, está pronto'}</Button></DialogActions></>}
    </Dialog>
  </Box>;
}
