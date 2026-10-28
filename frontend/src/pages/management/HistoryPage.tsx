import { useCallback, useState } from 'react';
import {
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
import ManagementLayout, { Card, LoadState, Segmented } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { formatCents } from '../../services/format';
import { METHOD_LABELS, fetchHistory } from '../../services/management';
import type { ClosedTab, HistoryPeriod } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

const PERIOD_TEXT: Record<HistoryPeriod, string> = { TODAY: 'hoje', YESTERDAY: 'ontem', WEEK: 'nos últimos 7 dias' };

export default function HistoryPage() {
  const [period, setPeriod] = useState<HistoryPeriod>('TODAY');
  const [search, setSearch] = useState('');
  const [receipt, setReceipt] = useState<ClosedTab | null>(null);
  const load = useCallback(() => fetchHistory(period, search), [period, search]);
  const { data, error, reload } = useLoader(load);

  return (
    <ManagementLayout
      title="Histórico de contas"
      subtitle={data ? `${data.count} contas fechadas ${PERIOD_TEXT[period]} · ${formatCents(data.revenueCents)}` : undefined}
      actions={
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <TextField
            size="small"
            placeholder="Nome, mesa ou valor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 240, bgcolor: colors.background }}
          />
          <Segmented<HistoryPeriod>
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'TODAY', label: 'Hoje' },
              { value: 'YESTERDAY', label: 'Ontem' },
              { value: 'WEEK', label: '7 dias' },
            ]}
          />
        </Box>
      }
    >
      {!data ? (
        <LoadState error={error} onRetry={reload} />
      ) : (
        <>
          <TableContainer sx={{ bgcolor: colors.background, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Conta</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell>Pagamento</TableCell>
                  <TableCell>Fechada por</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.tabs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ color: colors.textMuted }}>
                      Nenhuma conta fechada {PERIOD_TEXT[period]}.
                    </TableCell>
                  </TableRow>
                )}
                {data.tabs.map((tab) => (
                  <TableRow key={tab.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: fontWeight.bold }}>{tab.name}</Typography>
                      <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                        {clock(tab.closedAt)} · {tab.items} {tab.items === 1 ? 'item' : 'itens'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          px: 3,
                          py: 1,
                          borderRadius: 999,
                          fontSize: fontSize.small,
                          fontWeight: fontWeight.extraBold,
                          bgcolor: tab.origin === 'Balcão' ? colors.text : colors.surface,
                          color: tab.origin === 'Balcão' ? colors.background : colors.text,
                        }}
                      >
                        {tab.origin}
                      </Box>
                    </TableCell>
                    <TableCell>{tab.methods.map((method) => METHOD_LABELS[method] ?? method).join(' + ') || '—'}</TableCell>
                    <TableCell>{tab.closedBy}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: fontWeight.extraBold }}>
                      {formatCents(tab.totalCents)}
                    </TableCell>
                    <TableCell align="right">
                      <Button variant="outlined" onClick={() => setReceipt(tab)} sx={{ minHeight: 44 }}>
                        2ª via
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4, mt: 6 }}>
            <Summary label="Contas fechadas" value={String(data.count)} />
            <Summary label="Faturamento" value={formatCents(data.revenueCents)} />
            <Summary label="Ticket médio" value={formatCents(data.averageTicketCents)} />
          </Box>
          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Reabrir uma conta fechada é ação do dono e entra numa próxima entrega.
          </Typography>
        </>
      )}

      <Dialog open={!!receipt} onClose={() => setReceipt(null)}>
        <DialogTitle>2ª via da conta</DialogTitle>
        {receipt && (
          <DialogContent>
            <Box sx={{ fontFamily: 'monospace', fontSize: fontSize.body, minWidth: 260 }}>
              <div>{receipt.origin.toUpperCase()} · {receipt.name.toUpperCase()}</div>
              <div>Fechada às {clock(receipt.closedAt)} por {receipt.closedBy}</div>
              <div>{receipt.items} itens</div>
              <div>Pagamento: {receipt.methods.map((method) => METHOD_LABELS[method] ?? method).join(' + ') || '—'}</div>
              <div style={{ marginTop: 12, fontWeight: 800 }}>TOTAL {formatCents(receipt.totalCents)}</div>
              <div style={{ marginTop: 12 }}>Não é documento fiscal</div>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => window.print()}>Imprimir</Button>
          <Button onClick={() => setReceipt(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </ManagementLayout>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Typography sx={{ fontSize: fontSize.body, color: colors.textSecondary }}>{label}</Typography>
      <Typography sx={{ mt: 2, fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>{value}</Typography>
    </Card>
  );
}

function clock(iso: string): string {
  const date = new Date(iso);
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
}
