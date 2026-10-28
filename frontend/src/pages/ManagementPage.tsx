import { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ManagementLayout, { Card, LoadState, Segmented } from '../components/management/ManagementLayout';
import { formatCents } from '../services/format';
import { fetchSummary } from '../services/management';
import type { ReportPeriod, ReportSummary } from '../services/management';
import { tokens } from '../theme/theme';

const { colors, fontSize, fontWeight } = tokens;

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hoje' },
  { value: 'WEEK', label: '7 dias' },
  { value: 'MONTH', label: '30 dias' },
];

const COMPARED_TO: Record<ReportPeriod, string> = {
  TODAY: 'que ontem',
  WEEK: 'que os 7 dias anteriores',
  MONTH: 'que os 30 dias anteriores',
};

export default function ManagementPage() {
  const [period, setPeriod] = useState<ReportPeriod>('TODAY');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setSummary(null);
    setError(null);
    fetchSummary(period)
      .then((data) => !cancelled && setSummary(data))
      .catch((caught) => !cancelled && setError(caught));
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(load, [load]);

  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <ManagementLayout
      title="Gestão"
      subtitle={`${today.charAt(0).toUpperCase()}${today.slice(1)} · pedidos não cancelados`}
      actions={<Segmented value={period} options={PERIODS} onChange={setPeriod} />}
    >
      {!summary ? (
        <LoadState error={error} onRetry={load} />
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 4 }}>
            <Kpi
              label="Faturamento"
              value={formatCents(summary.revenueCents)}
              delta={percentDelta(summary.revenueCents, summary.previousRevenueCents, COMPARED_TO[period])}
            />
            <Kpi
              label="Comandas com pedido"
              value={String(summary.tabs)}
              delta={countDelta(summary.tabs, summary.previousTabs, COMPARED_TO[period])}
            />
            <Kpi
              label="Ticket médio"
              value={formatCents(summary.averageTicketCents)}
              delta={percentDelta(summary.averageTicketCents, summary.previousAverageTicketCents, COMPARED_TO[period])}
            />
            <Kpi
              label="Tempo médio de preparo"
              value={summary.averagePrepMinutes == null ? '—' : `${summary.averagePrepMinutes} min`}
              delta={prepDelta(summary.averagePrepMinutes, summary.previousAveragePrepMinutes)}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4, mt: 4 }}>
            <Card>
              <Typography sx={{ fontSize: fontSize.lead, fontWeight: fontWeight.extraBold }}>Faturamento por hora</Typography>
              <HourChart summary={summary} />
            </Card>
            <Card>
              <Typography sx={{ fontSize: fontSize.lead, fontWeight: fontWeight.extraBold }}>Mais pedidos</Typography>
              <TopProducts summary={summary} />
            </Card>
          </Box>

          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Pedido cancelado não entra no faturamento nem no ranking.
          </Typography>
        </>
      )}
    </ManagementLayout>
  );
}

interface Delta {
  text: string;
  tone: 'up' | 'down' | 'flat';
}

function percentDelta(current: number, previous: number, comparedTo: string): Delta {
  if (previous === 0) return { text: current === 0 ? 'sem movimento' : 'sem base para comparar', tone: 'flat' };
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { text: `igual ${comparedTo.replace('que ', 'a ')}`, tone: 'flat' };
  return { text: `${change > 0 ? '+' : ''}${change}% ${comparedTo}`, tone: change > 0 ? 'up' : 'down' };
}

function countDelta(current: number, previous: number, comparedTo: string): Delta {
  const change = current - previous;
  if (change === 0) return { text: `igual ${comparedTo.replace('que ', 'a ')}`, tone: 'flat' };
  return { text: `${change > 0 ? '+' : ''}${change} ${comparedTo}`, tone: change > 0 ? 'up' : 'down' };
}

function prepDelta(current: number | null, previous: number | null): Delta {
  if (current == null) return { text: 'nenhum pedido pronto ainda', tone: 'flat' };
  if (previous == null || Math.abs(current - previous) <= 1) return { text: 'estável', tone: 'up' };
  return current < previous
    ? { text: `${previous - current} min mais rápido`, tone: 'up' }
    : { text: `${current - previous} min mais lento`, tone: 'down' };
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: Delta }) {
  const color = delta.tone === 'up' ? colors.success : delta.tone === 'down' ? colors.error : colors.textMuted;
  return (
    <Card>
      <Typography sx={{ fontSize: fontSize.body, color: colors.textSecondary }}>{label}</Typography>
      <Typography sx={{ mt: 2, fontSize: fontSize.display, fontWeight: fontWeight.extraBold }}>{value}</Typography>
      <Typography sx={{ mt: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold, color }}>{delta.text}</Typography>
    </Card>
  );
}

function HourChart({ summary }: { summary: ReportSummary }) {
  if (summary.byHour.length === 0) {
    return <Typography sx={{ mt: 6, color: colors.textMuted }}>Nenhum pedido no período.</Typography>;
  }
  const max = Math.max(...summary.byHour.map((hour) => hour.revenueCents));
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 260, mt: 6, overflowX: 'auto' }}>
      {summary.byHour.map((hour) => (
        <Box key={hour.hour} sx={{ flex: '1 0 48px', maxWidth: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: colors.textSecondary, mb: 1, whiteSpace: 'nowrap' }}>
            {formatCents(hour.revenueCents).replace(/,\d{2}$/, '')}
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: `${Math.max(4, (hour.revenueCents / max) * 190)}px`,
              bgcolor: colors.text,
              borderRadius: '10px 10px 4px 4px',
            }}
          />
          <Typography sx={{ mt: 2, fontSize: fontSize.small, color: colors.textMuted }}>{hour.hour}h</Typography>
        </Box>
      ))}
    </Box>
  );
}

function TopProducts({ summary }: { summary: ReportSummary }) {
  if (summary.topProducts.length === 0) {
    return <Typography sx={{ mt: 6, color: colors.textMuted }}>Nenhum pedido no período.</Typography>;
  }
  const max = summary.topProducts[0].quantity;
  return (
    <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {summary.topProducts.map((product, index) => (
        <Box component="li" key={product.name} sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: '10px',
              bgcolor: colors.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: fontSize.small,
              fontWeight: fontWeight.extraBold,
            }}
          >
            {index + 1}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography noWrap sx={{ fontWeight: fontWeight.bold }}>{product.name}</Typography>
              <Typography sx={{ fontWeight: fontWeight.extraBold }}>{product.quantity}</Typography>
            </Box>
            <Box sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: colors.surface }}>
              <Box sx={{ height: '100%', width: `${(product.quantity / max) * 100}%`, borderRadius: 3, bgcolor: colors.text }} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
