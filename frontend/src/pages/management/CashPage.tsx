import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ManagementLayout, { Card, LoadState } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import {
  METHOD_LABELS,
  centsToInput,
  closeCash,
  fetchCash,
  openCash,
  parseCents,
  registerWithdrawal,
} from '../../services/management';
import type { CashView, PaymentMethod } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;
const NOTE_LIMIT_CENTS = 2000;

export default function CashPage() {
  const { data, setData, error, reload } = useLoader(fetchCash);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function run(action: () => Promise<CashView | unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      if (result && typeof result === 'object' && 'open' in result) setData(result as CashView);
      else reload();
      setMessage({ tone: 'success', text: success });
    } catch (caught) {
      setMessage({ tone: 'error', text: describe(caught) });
    } finally {
      setBusy(false);
    }
  }

  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const subtitle = data?.open && data.openedAt ? `${capitalize(today)} · aberto por ${data.openedBy ?? '—'} às ${clock(data.openedAt)}` : capitalize(today);

  return (
    <ManagementLayout
      title="Fechamento de caixa"
      subtitle={subtitle}
      actions={
        data?.open && data.openTabs > 0 ? (
          <Box sx={{ px: 4, py: 2, borderRadius: 999, bgcolor: '#FBE9E7', color: colors.error, fontWeight: fontWeight.extraBold }}>
            {data.openTabs} {data.openTabs === 1 ? 'conta ainda aberta' : 'contas ainda abertas'}
          </Box>
        ) : undefined
      }
    >
      {message && (
        <Alert severity={message.tone} sx={{ mb: 4 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {!data ? (
        <LoadState error={error} onRetry={reload} />
      ) : !data.open ? (
        <OpenCash busy={busy} onOpen={(cents) => run(() => openCash(cents), 'Caixa aberto.')} />
      ) : (
        <OpenRegister
          cash={data}
          busy={busy}
          onWithdraw={(reason, cents) => run(() => registerWithdrawal(reason, cents), 'Sangria registrada.')}
          onClose={(counted, note) => run(() => closeCash(counted, note), 'Caixa fechado.')}
        />
      )}
    </ManagementLayout>
  );
}

function OpenCash({ busy, onOpen }: { busy: boolean; onOpen: (cents: number) => void }) {
  const [float, setFloat] = useState('200,00');
  return (
    <Box sx={{ maxWidth: 420 }}>
      <Card>
        <Typography sx={{ fontSize: fontSize.lead, fontWeight: fontWeight.extraBold }}>Abrir o caixa</Typography>
        <Typography sx={{ mt: 1, color: colors.textSecondary }}>Informe o fundo de troco que está na gaveta.</Typography>
        <TextField
          label="Fundo de troco (R$)"
          value={float}
          onChange={(event) => setFloat(event.target.value)}
          fullWidth
          sx={{ mt: 4 }}
        />
        <Button variant="contained" fullWidth disabled={busy} onClick={() => onOpen(parseCents(float))} sx={{ mt: 4, minHeight: 52 }}>
          Abrir caixa
        </Button>
      </Card>
    </Box>
  );
}

interface OpenRegisterProps {
  cash: CashView;
  busy: boolean;
  onWithdraw: (reason: string, cents: number) => void;
  onClose: (counted: Partial<Record<PaymentMethod, number>>, note: string) => void;
}

function OpenRegister({ cash, busy, onWithdraw, onClose }: OpenRegisterProps) {
  const withdrawn = cash.withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amountCents, 0);
  const expected = (method: PaymentMethod, amount: number) =>
    method === 'CASH' ? amount + cash.openingFloatCents - withdrawn : amount;
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    setCounted(Object.fromEntries(cash.methods.map((row) => [row.method, centsToInput(expected(row.method, row.amountCents))])));
  }, [cash]);

  const difference = cash.methods.reduce(
    (sum, row) => sum + (parseCents(counted[row.method] ?? '0') - expected(row.method, row.amountCents)),
    0,
  );
  const needsNote = Math.abs(difference) > NOTE_LIMIT_CENTS && !note.trim();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 6, alignItems: 'start' }}>
      <TableContainer sx={{ bgcolor: colors.background, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Forma</TableCell>
              <TableCell align="right">Sistema</TableCell>
              <TableCell align="right">Contado</TableCell>
              <TableCell align="right">Diferença</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cash.methods.map((row) => {
              const system = expected(row.method, row.amountCents);
              const diff = parseCents(counted[row.method] ?? '0') - system;
              return (
                <TableRow key={row.method}>
                  <TableCell sx={{ fontWeight: fontWeight.bold }}>{METHOD_LABELS[row.method] ?? row.method}</TableCell>
                  <TableCell align="right">{formatCents(system)}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      value={counted[row.method] ?? ''}
                      onChange={(event) => setCounted((current) => ({ ...current, [row.method]: event.target.value }))}
                      inputProps={{ style: { textAlign: 'right' }, 'aria-label': `Contado em ${METHOD_LABELS[row.method]}` }}
                      sx={{ width: 140 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: diff === 0 ? colors.textMuted : diff > 0 ? colors.success : colors.error, fontWeight: fontWeight.bold }}>
                    {diff === 0 ? '—' : formatCents(diff)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Card>
          <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 3 }}>Movimento do dia</Typography>
          <Line label="Fundo de troco" value={formatCents(cash.openingFloatCents)} />
          <Line label="Vendas do dia" value={formatCents(cash.salesCents)} />
          <Line label="Sangrias" value={`- ${formatCents(withdrawn)}`} />
          <Line label="Comissões a pagar" value={formatCents(cash.commissionsCents)} />
          <Line label="Diferença de caixa" value={formatCents(difference)} />
        </Card>
        <Card>
          <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 3 }}>Sangrias</Typography>
          {cash.withdrawals.length === 0 && <Typography sx={{ color: colors.textMuted, fontSize: fontSize.body }}>Nenhuma sangria.</Typography>}
          {cash.withdrawals.map((withdrawal, index) => (
            <Line key={index} label={`${withdrawal.reason}, ${clock(withdrawal.at)}`} value={formatCents(withdrawal.amountCents)} small />
          ))}
          <Button variant="outlined" fullWidth onClick={() => setDialog(true)} sx={{ mt: 3, minHeight: 48 }}>
            Registrar sangria
          </Button>
        </Card>
        {Math.abs(difference) > NOTE_LIMIT_CENTS && (
          <TextField label="Justificativa da diferença" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />
        )}
        <Button
          variant="contained"
          disabled={busy || cash.openTabs > 0 || needsNote}
          onClick={() => onClose(Object.fromEntries(Object.entries(counted).map(([key, value]) => [key, parseCents(value)])), note)}
          sx={{ minHeight: 56 }}
        >
          {cash.openTabs > 0 ? 'Fechar as contas antes' : 'Fechar o caixa'}
        </Button>
        <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
          Com conta aberta no salão o caixa não fecha. Diferença acima de R$ 20,00 pede justificativa.
        </Typography>
      </Box>

      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <DialogTitle>Registrar sangria</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '8px !important', minWidth: 320 }}>
          <TextField label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} />
          <TextField label="Valor (R$)" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!reason.trim() || parseCents(amount) <= 0}
            onClick={() => {
              onWithdraw(reason.trim(), parseCents(amount));
              setDialog(false);
              setReason('');
              setAmount('');
            }}
          >
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Line({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, py: 1 }}>
      <Typography sx={{ color: colors.textSecondary, fontSize: small ? fontSize.body : fontSize.base }}>{label}</Typography>
      <Typography sx={{ fontWeight: fontWeight.extraBold, fontSize: small ? fontSize.body : fontSize.base, whiteSpace: 'nowrap' }}>{value}</Typography>
    </Box>
  );
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'Ainda há contas abertas ou o caixa já estava aberto.';
    if (error.status === 400) return 'Confira os valores. Diferença acima de R$ 20,00 pede justificativa.';
    if (error.status === 403) return 'Seu perfil não pode mexer no caixa.';
  }
  return 'Não foi possível concluir agora. Tente de novo.';
}

function clock(iso: string): string {
  const date = new Date(iso);
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
