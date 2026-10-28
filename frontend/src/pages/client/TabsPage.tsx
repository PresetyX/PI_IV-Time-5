import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import ClientScreen from '../../components/client/ClientScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { ChevronRightIcon, PlusIcon } from '../../components/client/icons';
import { Avatar, InfoNote, ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import { fetchTabs, formatClock, openTab } from '../../services/tabs';
import type { TabSummary } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 8000;
const { colors, fontSize, fontWeight, radius } = tokens;

export default function TabsPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const [tabs, setTabs] = useState<TabSummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gate = guestGatePath(slug);

  const load = useCallback(async () => {
    try {
      setTabs(await fetchTabs(slug));
      setLoadFailed(false);
    } catch (caught) {
      if (!handleExpired(caught)) setLoadFailed(true);
    }
  }, [slug, handleExpired]);

  useEffect(() => {
    if (gate) return undefined;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [gate, load]);

  if (gate) return <Navigate to={gate} replace />;
  if (state.status === 'loading' || (tabs === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (tabs === null) return <ClientError onRetry={load} />;

  const table = readVisit(slug).table;
  const hasMine = tabs.some((tab) => tab.mine);

  async function create() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      await openTab(slug);
      navigate(`/t/${slug}/comandas/minha`);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 409) navigate(`/t/${slug}/comandas/minha`);
      else setError('Não foi possível abrir a comanda agora. Tente de novo.');
    } finally {
      setCreating(false);
    }
  }

  const count = tabs.length;
  return (
    <ClientScreen>
      <ScreenHeader
        title={`Mesa ${table ? formatTableNumber(table.number) : ''}`.trim()}
        subtitle={count === 1 ? '1 comanda aberta agora' : `${count} comandas abertas agora`}
        onBack={() => navigate(`/t/${slug}/entrada`)}
      />
      <Box sx={{ px: 5, pt: 6, pb: 8 }}>
        <Typography variant="h2" component="h1">
          Você vai pedir junto ou separado?
        </Typography>
        <Typography sx={{ mt: 2, color: colors.textSecondary }}>
          Entrar numa comanda existente junta o consumo numa conta só. Criar a sua deixa cada um pagando o que pediu.
        </Typography>

        {count > 0 && <SectionLabel>Comandas nesta mesa</SectionLabel>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tabs.map((tab) => (
            <TabCard
              key={tab.id}
              tab={tab}
              onClick={() => navigate(tab.mine ? `/t/${slug}/comandas/minha` : `/t/${slug}/comandas/${tab.id}/entrar`)}
            />
          ))}
        </Box>

        {!hasMine && (
          <ButtonBase
            onClick={create}
            disabled={creating}
            sx={{
              mt: count > 0 ? 4 : 6,
              width: '100%',
              p: 4,
              gap: 3,
              justifyContent: 'flex-start',
              textAlign: 'left',
              border: `1.5px solid ${colors.text}`,
              borderRadius: `${radius.card}px`,
              fontFamily: 'inherit',
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: `${radius.button}px`,
                bgcolor: colors.text,
                color: colors.background,
              }}
            >
              {creating ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : <PlusIcon />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
                Criar minha comanda
              </Typography>
              <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
                Você paga só o que pedir
              </Typography>
            </Box>
            <ChevronRightIcon sx={{ fontSize: 20 }} />
          </ButtonBase>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 4, borderRadius: `${radius.button}px` }}>
            {error}
          </Alert>
        )}

        {count > 0 && !hasMine && (
          <InfoNote>
            Para entrar numa comanda existente, peça o código de quatro dígitos para quem a abriu. Ele aparece na tela
            da pessoa.
          </InfoNote>
        )}
      </Box>
    </ClientScreen>
  );
}

function TabCard({ tab, onClick }: { tab: TabSummary; onClick: () => void }) {
  const people = tab.peopleCount === 1 ? '1 pessoa' : `${tab.peopleCount} pessoas`;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        p: 4,
        gap: 3,
        justifyContent: 'flex-start',
        textAlign: 'left',
        border: `1px solid ${tab.mine ? colors.text : colors.border}`,
        borderRadius: `${radius.card}px`,
        fontFamily: 'inherit',
      }}
    >
      <Avatar name={tab.ownerName} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
          {tab.mine ? 'Sua comanda' : `Comanda de ${tab.ownerName}`}
        </Typography>
        <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
          {people} · aberta às {formatClock(tab.openedAt)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5 }}>
        <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
          {formatCents(tab.totalCents)}
        </Typography>
        <Box
          sx={{
            px: 2.5,
            py: 0.5,
            borderRadius: 999,
            bgcolor: colors.surface,
            fontSize: fontSize.caption,
            fontWeight: fontWeight.extraBold,
            color: colors.textSecondary,
          }}
        >
          {tab.mine ? 'Abrir' : 'Pedir código'}
        </Box>
      </Box>
    </ButtonBase>
  );
}
