import { useMemo } from 'react';
import { Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, GlobalStyles, Typography } from '@mui/material';
import QrCode from '../../components/management/QrCode';
import { useLoader } from '../../hooks/useLoader';
import { ApiError, getToken } from '../../services/api';
import { fetchStoreSettings } from '../../services/management';
import { fetchManagedTables, tableLabel, tableLink } from '../../services/tableAdmin';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

export default function QrSheetPage() {
  const [params] = useSearchParams();
  const only = params.get('mesa');
  const { data: tables, error: tablesError, reload } = useLoader(fetchManagedTables);
  const { data: store, error: storeError } = useLoader(fetchStoreSettings);
  const error = tablesError ?? storeError;

  const printable = useMemo(
    () => (tables ?? []).filter((table) => table.active && (!only || table.id === only)),
    [tables, only],
  );

  if (!getToken()) return <Navigate to="/login" replace />;
  if (error instanceof ApiError && error.status === 401) return <Navigate to="/login" replace />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.panel, '@media print': { bgcolor: colors.background } }}>
      <GlobalStyles styles={{ '@page': { size: 'A4', margin: '12mm' } }} />
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 4,
          px: { xs: 5, md: 10 },
          py: 5,
          bgcolor: colors.background,
          borderBottom: `1px solid ${colors.border}`,
          '@media print': { display: 'none' },
        }}
      >
        <Button component={RouterLink} to="/gestao/mesas" sx={{ minHeight: 44 }}>
          ← Mesas
        </Button>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
            {only ? 'QR code da mesa' : 'Folha de QR codes'}
          </Typography>
          <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
            {tables
              ? `${printable.length} ${printable.length === 1 ? 'plaquinha' : 'plaquinhas'} · só mesas ativas · papel A4`
              : 'Carregando...'}
          </Typography>
        </Box>
        {only && (
          <Button variant="outlined" component={RouterLink} to="/gestao/mesas/qr" sx={{ minHeight: 48, px: 5 }}>
            Ver todas
          </Button>
        )}
        <Button
          variant="contained"
          disabled={!store || printable.length === 0}
          onClick={() => window.print()}
          sx={{ minHeight: 48, px: 6 }}
        >
          Imprimir
        </Button>
      </Box>

      <Box sx={{ px: { xs: 5, md: 10 }, py: 8, '@media print': { p: 0 } }}>
        {error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={reload}>
                Tentar de novo
              </Button>
            }
          >
            {error instanceof ApiError && error.status === 403
              ? 'Seu perfil não tem acesso às mesas.'
              : 'Não foi possível carregar as mesas agora.'}
          </Alert>
        ) : !tables || !store ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
            <CircularProgress />
          </Box>
        ) : printable.length === 0 ? (
          <Alert severity="info">Nenhuma mesa ativa para imprimir.</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 6,
              maxWidth: 820,
              mx: 'auto',
              '@media print': { gridTemplateColumns: 'repeat(2, 1fr)', gap: '8mm', maxWidth: 'none' },
            }}
          >
            {printable.map((table) => (
              <Box
                key={table.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 3,
                  p: 6,
                  bgcolor: colors.background,
                  border: `2px dashed ${colors.border}`,
                  borderRadius: `${radius.card}px`,
                  breakInside: 'avoid',
                  '@media print': { border: '1px dashed #999999' },
                }}
              >
                <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold, letterSpacing: 1.5 }}>
                  {store.name.toUpperCase()}
                </Typography>
                <Typography sx={{ fontSize: 44, lineHeight: 1, fontWeight: fontWeight.extraBold }}>
                  Mesa {tableLabel(table.number)}
                </Typography>
                {table.nickname && (
                  <Typography sx={{ fontSize: fontSize.body, color: colors.textSecondary }}>{table.nickname}</Typography>
                )}
                <QrCode value={tableLink(store.slug, table.token)} size={200} label={`QR code da mesa ${table.number}`} />
                <Typography sx={{ fontWeight: fontWeight.bold }}>Aponte a câmera do celular</Typography>
                <Typography sx={{ mt: -2, fontSize: fontSize.small, color: colors.textSecondary }}>
                  e faça o pedido direto da mesa
                </Typography>
                <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted, wordBreak: 'break-all' }}>
                  {tableLink(store.slug, table.token).replace(/^https?:\/\//, '')}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
