import { useCallback, useEffect, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import ManagementLayout, { Card, LoadState, Segmented } from '../../components/management/ManagementLayout';
import { formatCents } from '../../services/format';
import { fetchAbc } from '../../services/management';
import type { AbcClass, AbcReport } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

type Filter = 'ALL' | AbcClass;

const CLASS_COLORS: Record<AbcClass, string> = { A: '#111111', B: '#7B3FC4', C: '#8A8A8A' };
const CLASS_HINTS: Record<AbcClass, string> = {
  A: '80% do faturamento vem daqui. Nunca pode faltar.',
  B: 'Sustentam o cardápio. Vale testar preço e combo.',
  C: 'Pouca saída. Candidatos a sair ou virar sazonal.',
};

export default function AbcPage() {
  const [report, setReport] = useState<AbcReport | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<Filter>('ALL');

  const load = useCallback(() => {
    let cancelled = false;
    setReport(null);
    setError(null);
    fetchAbc(30)
      .then((data) => !cancelled && setReport(data))
      .catch((caught) => !cancelled && setError(caught));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  const rows = report ? report.rows.filter((row) => filter === 'ALL' || row.abcClass === filter) : [];

  return (
    <ManagementLayout
      title="Curva ABC de produtos"
      subtitle={report ? `Últimos ${report.days} dias · ${report.productsInMenu} produtos no cardápio` : 'Últimos 30 dias'}
      actions={
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'A', label: 'Classe A' },
            { value: 'B', label: 'Classe B' },
            { value: 'C', label: 'Classe C' },
          ]}
        />
      }
    >
      {!report ? (
        <LoadState error={error} onRetry={load} />
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            {(['A', 'B', 'C'] as AbcClass[]).map((klass) => {
              const group = report.rows.filter((row) => row.abcClass === klass);
              return (
                <Card key={klass} highlighted={filter === klass}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ClassBadge klass={klass} />
                    <Typography sx={{ fontSize: fontSize.lead, fontWeight: fontWeight.extraBold }}>
                      {group.length} {group.length === 1 ? 'produto' : 'produtos'}
                    </Typography>
                  </Box>
                  <Typography sx={{ mt: 4, fontSize: fontSize.display, fontWeight: fontWeight.extraBold }}>
                    {formatCents(group.reduce((sum, row) => sum + row.revenueCents, 0))}
                  </Typography>
                  <Typography sx={{ mt: 2, fontSize: fontSize.body, color: colors.textSecondary }}>{CLASS_HINTS[klass]}</Typography>
                </Card>
              );
            })}
          </Box>

          <TableContainer
            sx={{ mt: 6, bgcolor: colors.background, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="center">Classe</TableCell>
                  <TableCell align="right">Pedidos</TableCell>
                  <TableCell align="right">Faturamento</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Acumulado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ color: colors.textMuted }}>
                      Nenhum produto nesta classe.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>
                      <Typography sx={{ fontWeight: fontWeight.bold }}>{row.name}</Typography>
                      <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>{row.category}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <ClassBadge klass={row.abcClass} />
                    </TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: fontWeight.extraBold }}>
                      {formatCents(row.revenueCents)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: colors.surface }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${row.cumulativePercent}%`,
                              borderRadius: 3,
                              bgcolor: CLASS_COLORS[row.abcClass],
                            }}
                          />
                        </Box>
                        <Typography sx={{ width: 44, textAlign: 'right', fontSize: fontSize.small, fontWeight: fontWeight.bold }}>
                          {row.cumulativePercent}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Classe A é o que traz 80% do faturamento. Classe C costuma ser candidata a sair do cardápio ou mudar de preço.
          </Typography>
        </>
      )}
    </ManagementLayout>
  );
}

function ClassBadge({ klass }: { klass: AbcClass }) {
  return (
    <Box
      component="span"
      sx={{
        width: 32,
        height: 32,
        borderRadius: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: CLASS_COLORS[klass],
        color: colors.background,
        fontSize: fontSize.small,
        fontWeight: fontWeight.extraBold,
      }}
    >
      {klass}
    </Box>
  );
}
