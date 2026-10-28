import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, Switch, TextField } from '@mui/material';
import { api } from '../services/api';
import { KitchenOrder, operations, statusLabels } from '../services/operations';
import './operations.css';

type Item = { nameSnapshot: string; quantity: number; unitPriceCents: number; status: string; note?: string; options?: { label: string }[] };
type Order = { id: string; tabId: string; tableId?: string; number: number; status: KitchenOrder['status']; items: Item[]; totalCents: number; createdAt: string; readyAt?: string; statusHistory?: { to: string; at: string }[] };
type Call = { id: string; reason: string; createdAt: string; status: string };
type Tab = { id: string; tableId?: string; mode: string; customerName?: string; status: string; totalCents?: number; subtotalCents?: number; serviceFeeCents?: number; openedAt?: string; pickupTicket?: number; waiterCalls?: Call[] };
type Waiting = { id: string; number: number; name: string; partySize: number; createdAt: string; status: string };
type Workspace = { store: { name: string; logoUrl?: string; pausedUntil?: string; pausedScopes?: string[] }; role: string; tables: { id: string; number: number }[]; tabs: Tab[]; orders: Order[]; waitlist: Waiting[]; serverTime: string };
const money = (n?: number) => n === undefined ? '—' : (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const time = (date?: string) => date ? new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
const reasons = ['Cliente desistiu', 'Pedido lançado errado', 'Faltou ingrediente', 'Pedido duplicado'];
const columns = ['RECEIVED', 'PREPARING', 'READY'] as const;

export default function OperationsWorkspace() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [minutes, setMinutes] = useState(15);
  const [scopes, setScopes] = useState(['KITCHEN', 'COUNTER']);
  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState('PIX_MANUAL');
  const [largeFont, setLargeFont] = useState(true);
  const [printTravel, setPrintTravel] = useState(true);
  const [dialog, setDialog] = useState('');
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    setSynced(false);
    async function load() {
      try {
        const result = await api.get<Workspace>('/api/operations/workspace');
        if (stopped) return;
        setData(result); setOffset(Date.parse(result.serverTime) - Date.now()); setSynced(true); setError('');
      } catch (cause) {
        if (!stopped) { setSynced(false); setError(cause instanceof Error ? cause.message : 'Não foi possível sincronizar.'); }
      } finally { if (!stopped) timer = setTimeout(load, 15000); }
    }
    void load();
    return () => { stopped = true; clearTimeout(timer); };
  }, [revision]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const now = clock + offset;
  const age = (date: string) => Math.max(0, Math.floor((now - Date.parse(date)) / 60000));
  const tabFor = (o: Order) => data?.tabs.find(t => t.id === o.tabId);
  const tableNumber = (id?: string) => data?.tables.find(t => t.id === id)?.number;
  const title = (o: Order) => {
    const tab = tabFor(o);
    const number = tableNumber(o.tableId ?? tab?.tableId);
    return tab?.mode === 'COUNTER' ? `Balcão${tab.pickupTicket ? ` · senha ${tab.pickupTicket}` : ''}` : number ? `Mesa ${String(number).padStart(2, '0')}` : `Pedido #${o.number}`;
  };
  const late = (o: Order) => ['RECEIVED', 'PREPARING'].includes(o.status) && age(o.createdAt) >= 15;
  const active = data?.orders.filter(o => columns.some(s => s === o.status)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)) ?? [];
  const filtered = active.filter(o => (mode === 'ALL' || tabFor(o)?.mode === mode) && (status === 'ALL' || o.status === status));
  const ready = active.filter(o => o.status === 'READY').sort((a, b) => Date.parse(a.readyAt ?? a.createdAt) - Date.parse(b.readyAt ?? b.createdAt));
  const calls = data?.tabs.flatMap(tab => (tab.waiterCalls ?? []).filter(call => call.status === 'OPEN').map(call => ({ ...call, tab }))) ?? [];
  const pieces = pathname.split('/').filter(Boolean);
  const root = pieces[0];
  const view = pieces[1] ?? '';
  const orderId = pieces[2];
  const selected = data?.orders.find(o => o.id === orderId);
  const bill = data?.tabs.find(t => t.id === (root === 'contas' ? pieces[1] : ''));
  const billOrders = data?.orders.filter(o => o.tabId === bill?.id && o.status !== 'CANCELLED') ?? [];
  const kitchen = root === 'producao';
  const wall = kitchen && view === 'tela-grande';
  const pause = kitchen && view === 'pausar';
  const printing = kitchen && view === 'impressao';
  const detail = kitchen && ['pedido', 'confirmar', 'cancelar'].includes(view);
  const unavailable = 'Esta ação depende do contrato do módulo responsável. Nenhuma alteração foi gravada.';
  function itemList(order: Order, prices = false) {
    return order.items.filter(i => !['REMOVED', 'CANCELLED'].includes(i.status)).map((item, index) => <div className={`op-item ${item.note ? 'has-note' : ''}`} key={index}>
      <div><strong>{item.quantity}× {item.nameSnapshot}</strong>{item.options?.length ? <small>{item.options.map(o => o.label).join(' · ')}</small> : null}{item.note && <small className="op-note">{item.note}</small>}</div>{prices && <strong>{money(item.quantity * item.unitPriceCents)}</strong>}
    </div>);
  }
  async function closeBill(tabId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/api/operations/tabs/${tabId}/close`, { method });
      setRevision(n => n + 1); navigate('/contas');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível fechar a conta.'); setRevision(n => n + 1); }
    finally { setBusy(false); }
  }
  async function advance(order: Order) {
    if (busy || !synced) return;
    const target = order.status === 'RECEIVED' ? 'PREPARING' : order.status === 'PREPARING' ? 'READY' : 'DELIVERED';
    setBusy(true);
    try {
      await operations.changeStatus({ id: order.id, status: order.status } as KitchenOrder, target);
      setRevision(n => n + 1); navigate(target === 'DELIVERED' ? '/salao/entregas' : '/producao');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao salvar.'); setRevision(n => n + 1); }
    finally { setBusy(false); }
  }
  function action(order: Order) {
    const delivery = order.status === 'READY';
    const permitted = delivery ? ['OWNER', 'MANAGER', 'WAITER'].includes(data?.role ?? '') : ['OWNER', 'MANAGER', 'KITCHEN'].includes(data?.role ?? '');
    return <Button className={`op-button ${delivery ? 'light' : ''}`} disabled={busy || !synced || !permitted} onClick={() => order.status === 'PREPARING' ? navigate(`/producao/confirmar/${order.id}`) : void advance(order)}>{order.status === 'RECEIVED' ? 'Iniciar preparo' : order.status === 'PREPARING' ? 'Marcar pronto' : tabFor(order)?.mode === 'COUNTER' ? 'Confirmar retirada' : 'Confirmar entrega'}</Button>;
  }
  function card(order: Order) {
    return <article className={`op-card ${late(order) ? 'late' : ''}`} key={order.id}><header><button className="op-text-button" onClick={() => navigate(`/producao/pedido/${order.id}`)}>{title(order)}</button><span className={`op-pill ${late(order) ? 'red' : ''}`}>{age(order.createdAt) ? `${age(order.createdAt)} min` : 'agora'}</span></header><small>Pedido #{order.number}{tabFor(order)?.customerName ? ` · ${tabFor(order)?.customerName}` : ''}</small>{itemList(order)}{action(order)}</article>;
  }
  function empty(text: string) { return <div className="op-empty"><span className="op-pot">♨</span><h2>{text}</h2><p>Assim que houver uma atualização, ela aparece aqui sozinha.</p></div>; }
  const paused = !!data?.store.pausedUntil && Date.parse(data.store.pausedUntil) > now;
  const receiptOrder = selected ?? active[0];
  function receipt() {
    return <section className="op-receipt"><h4>Comanda impressa <small>80 mm</small></h4>{receiptOrder ? <div className="op-paper"><strong>COZINHA<br />{title(receiptOrder).toUpperCase()}</strong><p>PEDIDO #{receiptOrder.number} · {time(receiptOrder.createdAt)}</p>{itemList(receiptOrder)}<p>Não é documento fiscal</p></div> : <p>Nenhum pedido disponível para imprimir.</p>}<FormControlLabel control={<Switch checked={printTravel} onChange={(_, value) => setPrintTravel(value)} />} label="Destacar observações" /><p className="op-muted">Impressão manual pelo navegador. Impressão automática e seleção de bebidas dependem de integração com a impressora e classificação dos itens.</p><Button className="op-button" disabled={!receiptOrder} onClick={() => window.print()}>Imprimir de novo</Button><Link className="op-link-button" to="/producao/tela-grande">Abrir modo tela grande</Link></section>;
  }
  const heading = kitchen ? detail && selected ? `${title(selected)} · #${selected.number}` : pause ? 'Pausar pedidos' : printing ? 'Impressão e tela grande' : wall ? 'Cozinha · tela grande' : 'Produção' : root === 'contas' ? 'Contas' : root === 'fila-espera' ? 'Fila de espera' : view === 'entregas' ? 'Entregas pendentes' : view === 'chamados' ? 'Chamados' : 'Salão';
  return <div className={`op-root ${wall ? 'wall' : ''} ${largeFont ? 'large-font' : ''} ${printTravel ? '' : 'notes-hidden'}`}>
    <aside className="op-sidebar"><div className="op-brand">{data?.store.logoUrl ? <img src={data.store.logoUrl} alt="" /> : <span>▤</span>}<div><strong>{data?.store.name ?? 'Pede Aí'}</strong><small>Perfil {kitchen ? 'cozinha' : 'salão'}</small></div></div><nav>{[['/producao', 'Produção'], ['/salao', 'Salão'], ['/contas', 'Contas'], ['/fila-espera', 'Fila de espera']].map(([to, label]) => <Link className={pathname.startsWith(to) ? 'active' : ''} to={to} key={to}>{label}</Link>)}</nav><div className="op-counters"><div><small>{kitchen ? 'Na fila agora' : 'Contas abertas'}</small><strong>{data ? kitchen ? active.length : data.tabs.length : '—'}</strong></div>{!kitchen && <div className="red"><small>Chamados</small><strong>{calls.length}</strong></div>}</div></aside>
    <main className="op-main"><header className="op-page-header"><div>{(detail || pause || printing) && <Link className="op-back" to="/producao">← Voltar à fila</Link>}<h1>{heading}</h1><small>{kitchen ? `Atualiza sozinho a cada 15 segundos · ${time(new Date(now).toISOString())}` : `${data?.tables.length ?? '—'} mesas · ${data?.tabs.length ?? '—'} contas abertas`}</small></div><span className={`op-pill ${synced ? 'connected' : ''}`}>{synced ? '● Conectado' : 'Não sincronizado'}</span></header>
    {error && <Alert severity="error" action={<Button onClick={() => setRevision(n => n + 1)}>Atualizar</Button>}>{error} <Link to="/login">Login</Link></Alert>}
    {!data ? <p role="status">{error ? 'Não foi possível carregar os dados.' : 'Carregando operação…'}</p> : <>
    {kitchen && !detail && !pause && !printing && !wall && <><div className="op-toolbar"><div className="op-segment">{[['ALL', 'Tudo'], ['TABLE', 'Mesa'], ['COUNTER', 'Balcão']].map(([value, label]) => <button className={mode === value ? 'active' : ''} onClick={() => setMode(value)} key={value}>{label}</button>)}</div><div className="op-segment op-status-tabs">{['ALL', ...columns].map(value => <button className={status === value ? 'active' : ''} onClick={() => setStatus(value)} key={value}>{value === 'ALL' ? 'Todos' : statusLabels[value as KitchenOrder['status']]}</button>)}</div><Link to="/producao/pausar">Pausar</Link><Link to="/producao/impressao">Impressão</Link></div>{paused && <Alert severity="warning">Pausa registrada até {time(data.store.pausedUntil)}. Pedidos já recebidos continuam em preparo.</Alert>}{(mode !== 'ALL' || status !== 'ALL') && <div className="op-filter-bar">Filtros ativos: {mode !== 'ALL' && <span className="op-pill dark">{mode === 'TABLE' ? 'Mesa' : 'Balcão'}</span>}{status !== 'ALL' && <span className="op-pill dark">{statusLabels[status as KitchenOrder['status']]}</span>}<button onClick={() => { setMode('ALL'); setStatus('ALL'); }}>Limpar</button></div>}{!filtered.length ? empty(active.length ? 'Nenhum pedido com estes filtros' : 'Nenhum pedido na fila') : <div className={`op-board ${status !== 'ALL' ? 'filtered' : ''}`}>{columns.filter(column => status === 'ALL' || status === column).map(column => <section key={column}><h3><span className={`op-dot ${column.toLowerCase()}`} />{statusLabels[column]}<small>{filtered.filter(o => o.status === column).length}</small></h3><div className="op-order-stack">{filtered.filter(o => o.status === column).map(card)}</div></section>)}</div>}</>}
    {detail && !selected && <Alert severity="warning">Pedido não encontrado ou não está mais ativo nesta consulta.</Alert>}
    {detail && selected && view === 'pedido' && <div className="op-detail-grid"><article className={`op-card op-detail ${late(selected) ? 'late' : ''}`}><header><h2>{title(selected)} · pedido #{selected.number}</h2><span className={`op-pill ${late(selected) ? 'red' : ''}`}>{age(selected.createdAt)} min na fila</span></header><small>Comanda {tabFor(selected)?.customerName ?? ''} · enviado às {time(selected.createdAt)}</small>{itemList(selected, true)}<div className="op-total">Total do pedido <strong>{money(selected.totalCents)}</strong></div></article><aside><section className="op-card"><h4>Status</h4>{[...columns, 'DELIVERED'].map(s => <div className="op-status-row" key={s}><span className={selected.status === s ? 'current' : ''}>● {statusLabels[s as KitchenOrder['status']]}</span><small>{time(s === 'RECEIVED' ? selected.createdAt : selected.statusHistory?.find(h => h.to === s)?.at)}</small></div>)}{action(selected)}</section><section className="op-card"><h4>Mesa</h4><p>{title(selected)}</p><p className="op-muted">Outros pedidos abertos nesta comanda: {active.filter(o => o.tabId === selected.tabId && o.id !== selected.id).length}</p><Link className="op-link-button danger" to={`/producao/cancelar/${selected.id}`}>Cancelar pedido</Link></section></aside></div>}
    {detail && selected && view === 'confirmar' && <section className="op-modal-page"><span className="op-icon green">✓</span><h2>Marcar como pronto?</h2><small>{title(selected)} · pedido #{selected.number} · {age(selected.createdAt)} minutos na fila</small><div className="op-card">{itemList(selected)}</div><Alert severity="info">O pedido ficará disponível na lista de entregas pendentes do salão.</Alert><div className="op-actions"><Link className="op-link-button" to={`/producao/pedido/${selected.id}`}>Voltar</Link><Button className="op-button" disabled={busy || !synced || selected.status !== 'PREPARING' || !['OWNER', 'MANAGER', 'KITCHEN'].includes(data.role)} onClick={() => void advance(selected)}>Sim, está pronto</Button></div></section>}
    {detail && selected && view === 'cancelar' && <section className="op-modal-page"><span className="op-icon red">×</span><h2>Cancelar o pedido #{selected.number}?</h2><p>{title(selected)} · {money(selected.totalCents)}</p><h4>Motivo do cancelamento</h4>{reasons.map(value => <label className="op-choice" key={value}>{value}<Radio checked={reason === value} onChange={() => setReason(value)} /></label>)}<TextField fullWidth multiline minRows={2} label="Observação para o histórico" value={note} onChange={e => setNote(e.target.value)} /><Alert severity="warning">Só é permitido cancelar antes de ficar pronto. A integração de cancelamento, recálculo da comanda e estorno da comissão ainda não está disponível.</Alert><div className="op-actions"><Link className="op-link-button" to={`/producao/pedido/${selected.id}`}>Manter pedido</Link><Button className="op-button danger" disabled>Cancelar pedido</Button></div></section>}
    {pause && <section className="op-modal-page"><span className="op-icon">Ⅱ</span><h2>Pausar novos pedidos</h2><p>A fila tem {active.length} pedidos.</p><h4>Por quanto tempo</h4><div className="op-duration">{[10, 15, 30, 60].map(value => <button className={minutes === value ? 'active' : ''} onClick={() => setMinutes(value)} key={value}>{value} min</button>)}</div><h4>O que pausar</h4>{[['KITCHEN', 'Itens que vão para a cozinha'], ['DRINKS', 'Bebidas'], ['COUNTER', 'Pedidos de balcão']].map(([value, label]) => <FormControlLabel className="op-switch" key={value} label={label} labelPlacement="start" control={<Switch checked={scopes.includes(value)} onChange={(_, checked) => setScopes(old => checked ? [...old, value] : old.filter(s => s !== value))} />} />)}<div className="op-card"><small>O CLIENTE VÊ</small><p>A cozinha está com fila agora. Voltamos a aceitar pedidos em {minutes} minutos.</p></div><Alert severity="warning">Tela preparada. Falta conectar a pausa ao fluxo real de aceitação de pedidos, incluindo expiração no servidor. Nenhuma pausa será simulada.</Alert><div className="op-actions"><Link className="op-link-button" to="/producao">Cancelar</Link><Button className="op-button" disabled>Pausar por {minutes} min</Button></div><small>Pedidos já recebidos continuam sendo preparados.</small></section>}
    {printing && receipt()}
    {wall && <><div className="op-toolbar"><button onClick={() => setLargeFont(value => !value)}>{largeFont ? 'Usar fonte normal' : 'Usar fonte grande'}</button><Link to="/producao">Voltar à produção</Link></div><div className="op-wall-layout"><div className="op-wall-cards">{active.filter(o => o.status !== 'READY').map(card)}{!active.length && empty('Nenhum pedido na fila')}</div>{receipt()}</div></>}
    {root === 'salao' && <><div className="op-toolbar"><Link to="/salao">Mesas</Link><Link to="/contas">Contas abertas</Link><Link to="/salao/entregas">Entregas ({ready.length})</Link><Link to="/salao/chamados">Chamados ({calls.length})</Link><Button className="op-button" onClick={() => setDialog('Abrir conta manual')}>Abrir conta manual</Button></div>{!view && <>{calls.length > 0 && <div className="op-call-banner">Chamados agora {calls.map(call => <span key={call.id}>Mesa {tableNumber(call.tab.tableId) ?? '—'} · {call.reason} · há {age(call.createdAt)} min</span>)}</div>}<h4>Mesas</h4><div className="op-tables">{data.tables.sort((a, b) => a.number - b.number).map(table => { const tabs = data.tabs.filter(t => t.tableId === table.id); const calling = calls.find(c => c.tab.tableId === table.id); const paying = tabs.some(t => t.status === 'AWAITING_PAYMENT'); return <button className={`op-table ${calling ? 'calling' : paying ? 'paying' : tabs.length ? 'occupied' : ''}`} key={table.id} onClick={() => tabs[0] ? navigate(`/contas/${tabs[0].id}`) : setDialog(`Mesa ${table.number} · abrir conta`)}><strong>{String(table.number).padStart(2, '0')}</strong><span className={`op-pill ${calling ? 'red' : paying ? 'green' : tabs.length ? 'dark' : ''}`}>{calling ? 'Chamando' : paying ? 'Pagando' : tabs.length ? `${tabs.length} comanda${tabs.length > 1 ? 's' : ''}` : 'Livre'}</span><small>{calling ? calling.reason : tabs.length ? money(tabs.reduce((sum, t) => sum + (t.totalCents ?? 0), 0)) : 'Sem conta'}</small></button>; })}</div>{!data.tables.length && empty('Nenhuma mesa cadastrada')}</>}{view === 'entregas' && <><p className="op-muted">A cozinha marcou como pronto. Leve à mesa e confirme aqui.</p>{ready.map(order => <article className={`op-list-row ${age(order.readyAt ?? order.createdAt) >= 5 ? 'late' : ''}`} key={order.id}><span className="op-number">{tableNumber(order.tableId ?? tabFor(order)?.tableId) ?? tabFor(order)?.pickupTicket ?? '#'}</span><div className="grow"><strong>{title(order)} · {tabFor(order)?.customerName ?? ''}</strong><small>{order.items.map(i => `${i.quantity}× ${i.nameSnapshot}`).join(', ')}</small></div><span className="op-pill">pronto há {age(order.readyAt ?? order.createdAt)} min</span>{action(order)}</article>)}{!ready.length && empty('Nenhuma entrega pendente')}</>}{view === 'chamados' && <>{calls.map(call => <article className="op-list-row late" key={call.id}><span className="op-number red">{tableNumber(call.tab.tableId) ?? '—'}</span><div className="grow"><strong>{call.reason}</strong><small>{call.tab.customerName} · {time(call.createdAt)}</small></div><span className="op-pill">{age(call.createdAt)} min</span><Button className="op-button" onClick={() => setDialog('Atender chamado')}>Atender</Button></article>)}{!calls.length && empty('Nenhum chamado aberto')}<Alert severity="info">A listagem lê chamados embutidos em tab.waiterCalls. Registro e atendimento aguardam contrato do backend; não há confirmação fictícia.</Alert></>}</>}
    {root === 'fila-espera' && <><div className="op-toolbar"><TextField size="small" label="Nome e quantas pessoas" /><Button className="op-button" onClick={() => setDialog('Adicionar à fila')}>Pôr na fila</Button></div>{data.waitlist.sort((a, b) => a.number - b.number).map(entry => <article className="op-list-row" key={entry.id}><span className="op-number">{entry.number}</span><div className="grow"><strong>{entry.name}</strong><small>{entry.partySize} pessoas · chegou {time(entry.createdAt)} · {age(entry.createdAt)} min esperando</small></div><span className="op-pill">{entry.status === 'CALLED' ? 'Chamado' : 'Esperando'}</span><Button className="op-button" onClick={() => setDialog(entry.status === 'CALLED' ? 'Sentar na mesa' : 'Chamar cliente')}>{entry.status === 'CALLED' ? 'Sentar na mesa' : 'Chamar'}</Button><Button onClick={() => setDialog('Remover da fila')}>Desistiu</Button></article>)}{!data.waitlist.length && empty('Nenhuma pessoa na fila')}</>}
    {root === 'contas' && !bill && <><h2>Contas abertas</h2>{pieces[1] && <Alert severity="warning">Conta não encontrada ou já fechada.</Alert>}{data.tabs.map(tab => <Link className="op-list-row" to={`/contas/${tab.id}`} key={tab.id}><strong>Mesa {tableNumber(tab.tableId) ?? 'Balcão'} · {tab.customerName ?? 'Comanda'}</strong><span>{money(tab.totalCents)}</span></Link>)}{!data.tabs.length && empty('Nenhuma conta aberta')}</>}
    {bill && <><div className="op-toolbar"><Link to="/salao">← Voltar ao salão</Link><Link className="op-link-button" to={`/contas/${bill.id}/conferencia`}>Imprimir conferência</Link></div><h2>Mesa {tableNumber(bill.tableId) ?? 'Balcão'} · Comanda {bill.customerName ? `de ${bill.customerName}` : ''}</h2><small>Aberta às {time(bill.openedAt)} · {billOrders.length} pedidos</small>{pieces[2] === 'conferencia' && <div className="op-segment"><button onClick={() => setDialog('Itens da conferência')}>Itens</button><button className="active">Conferência</button><button onClick={() => setDialog('Pagamento manual')}>Pagamento</button></div>}<div className="op-detail-grid"><section className="op-card">{billOrders.map(order => <div key={order.id}>{order.items.filter(i => !['REMOVED', 'CANCELLED'].includes(i.status)).map((item, index) => <div className="op-bill-item" key={index}><div><strong>{item.quantity}× {item.nameSnapshot}</strong>{item.note && <small className="op-note">{item.note}</small>}<small>{statusLabels[item.status as KitchenOrder['status']] ?? item.status}</small></div><strong>{money(item.quantity * item.unitPriceCents)}</strong></div>)}</div>)}</section><aside><section className="op-card"><div className="op-total">Consumo <span>{money(bill.subtotalCents)}</span></div><div className="op-total">Serviço <span>{money(bill.serviceFeeCents)}</span></div><div className="op-total"><strong>Total</strong><strong>{money(bill.totalCents)}</strong></div></section><section className="op-card"><h4>Forma de pagamento</h4>{[['PIX_MANUAL', 'Pix (confirmado na mão)'], ['CASH', 'Dinheiro'], ['CARD_DEBIT', 'Cartão de débito'], ['CARD_CREDIT', 'Cartão de crédito']].map(([value, label]) => <label className="op-choice" key={value}>{label}<Radio checked={method === value} onChange={() => setMethod(value)} /></label>)}<Button className="op-button" disabled={busy || !['OWNER', 'MANAGER', 'WAITER'].includes(data?.role ?? '')} onClick={() => void closeBill(bill.id)}>Registrar pagamento e fechar</Button><p className="op-muted">O pagamento é conferido na mão: Pix no extrato, cartão na maquininha, dinheiro no caixa.</p>{pieces[2] === 'conferencia' && <Button onClick={() => window.print()}>Imprimir</Button>}</section></aside></div></>}
    </>}
    </main><nav className="op-mobile-nav">{[['/producao', 'Produção'], ['/salao', 'Salão'], ['/contas', 'Contas']].map(([to, label]) => <Link className={pathname.startsWith(to) ? 'active' : ''} to={to} key={to}>{label}</Link>)}</nav>
    <Dialog open={!!dialog} onClose={() => setDialog('')}><DialogTitle>{dialog}</DialogTitle><DialogContent><Alert severity="info">{unavailable}</Alert></DialogContent><DialogActions><Button onClick={() => setDialog('')}>Entendi</Button></DialogActions></Dialog>
  </div>;
}
