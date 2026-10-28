import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BrandMark from '../../components/BrandMark';
import { Box, Button, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import FootNote from '../../components/client/FootNote';
import InvalidQrScreen from '../../components/client/InvalidQrScreen';
import { CheckIcon } from '../../components/client/icons';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatHour } from '../../services/hours';
import { formatStreet } from '../../services/store';
import type { Store } from '../../services/store';
import { fetchTableByToken, formatTableNumber } from '../../services/tables';
import type { TableInfo } from '../../services/tables';
import { updateVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

type TableState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'error' }
  | { status: 'ready'; table: TableInfo };

const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

export default function TableScanPage() {
  const { slug = '', tableToken = '' } = useParams();
  const { state: storeState, retry: retryStore } = useStore(slug);
  const [tableState, setTableState] = useState<TableState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useStoreColor(storeState.status === 'ready' ? storeState.store.primaryColor : null);

  useEffect(() => {
    let cancelled = false;
    setTableState({ status: 'loading' });
    fetchTableByToken(slug, tableToken)
      .then((table) => {
        if (cancelled) return;
        updateVisit(slug, { table, scannedToken: tableToken });
        setTableState({ status: 'ready', table });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTableState({ status: error instanceof ApiError && error.status === 404 ? 'invalid' : 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, tableToken, attempt]);

  const retryTable = useCallback(() => setAttempt((value) => value + 1), []);

  if (storeState.status === 'error') return <ClientError notFound={storeState.notFound} onRetry={retryStore} />;
  if (storeState.status === 'loading' || tableState.status === 'loading') return <ClientLoading />;
  if (tableState.status === 'invalid') return <InvalidQrScreen slug={slug} token={tableToken} onRetry={retryTable} />;
  if (tableState.status === 'error') return <ClientError onRetry={retryTable} />;
  if (!storeState.store.status.acceptingOrders) return <ClosedStoreScreen store={storeState.store} />;
  return <ScanConfirmation store={storeState.store} table={tableState.table} token={tableToken} />;
}

interface ScanConfirmationProps {
  store: Store;
  table: TableInfo;
  token: string;
}

function ScanConfirmation({ store, table, token }: ScanConfirmationProps) {
  const navigate = useNavigate();
  const number = formatTableNumber(table.number);
  const nickname = table.nickname?.toLowerCase();
  const street = formatStreet(store.address);

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          <ActionButton onClick={() => navigate(`/t/${store.slug}/entrada`)}>Continuar</ActionButton>
          <FootNote>No próximo passo você escolhe entre mesa, retirada ou entrega.</FootNote>
        </>
      }
    >
      <Box sx={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.main' }}>
        <Box
          sx={{
            width: 70,
            height: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `${radius.card}px`,
            bgcolor: colors.background,
            color: colors.text,
          }}
        >
          <BrandMark aria-hidden sx={{ fontSize: 36 }} />
        </Box>
      </Box>

      <Box sx={{ px: 5, pt: 7, pb: 6 }}>
        <Typography variant="h2" component="h1">
          Tudo certo com o seu QR
        </Typography>
        <Typography sx={{ mt: 2, color: colors.textSecondary }}>
          Identificamos a casa e a mesa. Confira antes de continuar.
        </Typography>

        <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 6, p: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <CheckItem done title="QR code válido" detail={`código ${token}`} />
          <CheckItem
            done
            title="Casa aberta"
            detail={store.status.lastOrderAt ? `aceita pedido até ${formatHour(store.status.lastOrderAt)}` : 'aceitando pedidos'}
          />
          <CheckItem title="Mesa identificada" detail={nickname ? `mesa ${number}, ${nickname}` : `mesa ${number}`} />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            mt: 6,
            p: 4,
            borderRadius: `${radius.card}px`,
            bgcolor: colors.surface,
          }}
        >
          <Box
            sx={{
              width: 54,
              height: 54,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '14px',
              bgcolor: colors.background,
              fontSize: fontSize.heading,
              fontWeight: fontWeight.extraBold,
            }}
          >
            {number}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: fontWeight.extraBold }}>
              Mesa {number}
              {nickname ? ` · ${nickname}` : ''}
            </Typography>
            <Typography sx={{ fontSize: fontSize.body, color: colors.textSecondary }}>
              {street ? `${store.name} · ${street}` : store.name}
            </Typography>
          </Box>
          <Button
            onClick={() => navigate(`/t/${store.slug}/mesa?trocar=1`)}
            sx={{
              minHeight: touchTarget,
              px: 4,
              flexShrink: 0,
              color: colors.text,
              bgcolor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '14px',
              fontSize: fontSize.button,
            }}
          >
            Trocar
          </Button>
        </Box>

        <Typography sx={{ mt: 4, fontSize: fontSize.body, color: colors.textMuted }}>
          Se você não está nessa mesa, toque em trocar. Pedido lançado na mesa errada atrapalha a conta de outra pessoa.
        </Typography>
      </Box>
    </ClientScreen>
  );
}

function CheckItem({ title, detail, done = false }: { title: string; detail: ReactNode; done?: boolean }) {
  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bgcolor: done ? colors.text : 'transparent',
          border: done ? 'none' : `3px solid ${colors.text}`,
          color: colors.background,
        }}
      >
        {done && <CheckIcon sx={{ fontSize: 16 }} />}
      </Box>
      <Box>
        <Typography sx={{ fontSize: fontSize.lead, fontWeight: fontWeight.extraBold }}>{title}</Typography>
        <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>{detail}</Typography>
      </Box>
    </Box>
  );
}
