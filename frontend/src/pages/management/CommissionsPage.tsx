import { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ManagementLayout, { Card, LoadState, Segmented } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { PERIOD_DAYS, PERIOD_OPTIONS, usePeriod } from '../../hooks/usePeriod';
import { formatCents } from '../../services/format';
import { fetchCommissions, initials, payCommissions } from '../../services/management';
import type { CommissionReport } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;
const AVATAR_COLORS = ['#111111', '#7B3FC4', '#1F6FD6', '#157A4A', '#C2410C'];

export default function CommissionsPage() {
  const [period, setPeriod] = usePeriod();
  const load = useCallback(() => fetchCommissions(PERIOD_DAYS[period]), [period]);
  const { data, setData, error, reload } = useLoader(load);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);

  async function markPaid() {
    setBusy(true);
    setFailure(false);
    try {
      setData(await payCommissions(PERIOD_DAYS[period]));
    } catch {
      setFailure(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ManagementLayout
      title="Comissões por garçom"
      subtitle={data ? `Período de ${day(data.from)} a ${day(data.to)} · ${data.rateBasisPoints / 100}% sobre o que cada um lançou` : undefined}
      actions={
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Segmented value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
          {data && (
            <>
              <Button variant="outlined" onClick={() => exportCsv(data)} sx={{ minHeight: 48 }}>
                Exportar CSV
              </Button>
              <Button variant="contained" disabled={busy || data.toPayCents === 0} onClick={markPaid} sx={{ minHeight: 48 }}>
                Marcar como pago
              </Button>
            </>
          )}
        </Box>
      }
    >
      {failure && (
        <Alert severity="error" sx={{ mb: 4 }}>
          Não foi possível marcar como pago agora.
        </Alert>
      )}
      {!data ? (
        <LoadState error={error} onRetry={reload} />
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            <Summary label="Comissões a pagar" value={formatCents(data.toPayCents)} hint="de contas já pagas" />
            <Summary label="A confirmar" value={formatCents(data.pendingCents)} hint="contas ainda abertas" />
            <Summary label="Estornado no período" value={formatCents(data.reversedCents)} hint="pedidos cancelados" />
          </Box>
          <TableContainer sx={{ mt: 6, bgcolor: colors.background, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Garçom</TableCell>
                  <TableCell align="right">Lançou</TableCell>
                  <TableCell align="right">Confirmado</TableCell>
                  <TableCell align="right">A confirmar</TableCell>
                  <TableCell align="right">Estornado</TableCell>
                  <TableCell align="right">A pagar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.waiters.map((waiter, index) => (
                  <TableRow key={waiter.userId}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: '50%',
                            bgcolor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                            color: colors.background,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: fontWeight.extraBold,
                          }}
                        >
                          {initials(waiter.name)}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: fontWeight.bold }}>{waiter.name}</Typography>
                          <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>{waiter.items} itens lançados</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{formatCents(waiter.launchedCents)}</TableCell>
                    <TableCell align="right" sx={{ color: colors.success, fontWeight: fontWeight.bold }}>
                      {formatCents(waiter.confirmedCents)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.textSecondary }}>
                      {formatCents(waiter.pendingCents)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.error }}>
                      - {formatCents(waiter.reversedCents)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: fontWeight.extraBold }}>
                      {formatCents(waiter.toPayCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Só entra comissão de item lançado por usuário da casa. Pedido feito pelo cliente no celular não gera comissão para ninguém.
          </Typography>
        </>
      )}
    </ManagementLayout>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <Typography sx={{ fontSize: fontSize.body, color: colors.textSecondary }}>{label}</Typography>
      <Typography sx={{ mt: 2, fontSize: fontSize.display, fontWeight: fontWeight.extraBold }}>{value}</Typography>
      <Typography sx={{ mt: 1, fontSize: fontSize.body, color: colors.textSecondary }}>{hint}</Typography>
    </Card>
  );
}

function exportCsv(report: CommissionReport) {
  const header = 'garcom;itens;lancou;confirmado;a_confirmar;estornado;a_pagar';
  const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
  const lines = report.waiters.map((waiter) =>
    [waiter.name, waiter.items, money(waiter.launchedCents), money(waiter.confirmedCents), money(waiter.pendingCents), money(waiter.reversedCents), money(waiter.toPayCents)].join(';'),
  );
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `comissoes-${report.from}-a-${report.to}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function day(iso: string): string {
  const [, month, date] = iso.split('-');
  return `${date}/${month}`;
}
