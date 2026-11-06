import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, ButtonBase, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { LockIcon } from '../../components/client/icons';
import { Avatar, InfoNote, ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import { fetchMyTab, formatClock, removeTabMember, renewTabCode } from '../../services/tabs';
import type { Tab, TabMember } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 5000;
const { colors, fontSize, fontWeight, radius } = tokens;

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`;
}

export default function MyTabPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [tab, setTab] = useState<Tab | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setTab(await fetchMyTab(slug));
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
      else setLoadFailed(true);
    }
  }, [slug, handleExpired]);

  useEffect(() => {
    if (gate) return undefined;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [gate, load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresAt = tab?.joinCodeExpiresAt ? new Date(tab.joinCodeExpiresAt).getTime() : null;
  const codeExpired = expiresAt !== null && expiresAt <= now;
  useEffect(() => {
    // O backend troca o código vencido sozinho; basta buscar de novo quando a contagem zera.
    if (codeExpired) load();
  }, [codeExpired, load]);

  if (gate) return <Navigate to={gate} replace />;
  // [Mateus · Card 5] Alteração: no balcão, sem comanda aberta (já retirou) a senha mostra a retirada confirmada.
  if (missing) return <Navigate to={readVisit(slug).counter ? `/t/${slug}/balcao/senha` : `/t/${slug}/comandas`} replace />;
  if (state.status === 'loading' || (tab === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (tab === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  const current = tab;

  async function run(action: () => Promise<Tab>, failure: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setTab(await action());
    } catch (caught) {
      if (!handleExpired(caught)) setError(failure);
    } finally {
      setBusy(false);
    }
  }

  function remove(member: TabMember) {
    if (!window.confirm(`Remover ${member.name}? Os itens dela ou dele continuam na conta.`)) return;
    run(() => removeTabMember(slug, current.id, member.sessionId), 'Não foi possível remover agora. Tente de novo.');
  }

  // [Mateus · Card 5] Alteração: comanda de balcão não tem mesa; mostra a senha quando já tiver.
  const counter = current.mode === 'COUNTER';
  const place = counter
    ? `Balcão${current.pickupTicket ? ` · senha ${current.pickupTicket}` : ''}`
    : `Mesa ${formatTableNumber(current.tableNumber)}`;
  const subtitle = current.owner
    ? `${place} · você abriu às ${formatClock(current.openedAt)}`
    : `${place} · comanda de ${current.ownerName}`;
  const inviteLink = `${window.location.origin}/t/${slug}/balcao?entrar=${current.id}`;

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
        <ActionButton sx={{ mb: 3 }} onClick={() => navigate(`/t/${slug}/cardapio`)}>
          Fazer pedido
        </ActionButton>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {current.owner && (
            <ActionButton
              tone="secondary"
              disabled={busy}
              onClick={() => run(() => renewTabCode(slug, current.id), 'Não foi possível gerar outro código agora.')}
            >
              Gerar outro código
            </ActionButton>
          )}
          <ActionButton tone="secondary" onClick={() => navigate(`/t/${slug}/conta`)}>
            Ver a conta
          </ActionButton>
        </Box>
        {/* [Mateus · Card 5] Alteração: no balcão não há garçom nem rodada da mesa; entra "Minha senha". */}
        {counter ? (
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={() => navigate(`/t/${slug}/balcao/senha`)}>
            Minha senha
          </ActionButton>
        ) : (
          <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
            <ActionButton tone="quiet" onClick={() => navigate(`/t/${slug}/rodada`)}>
              Mais uma rodada
            </ActionButton>
            <ActionButton tone="quiet" onClick={() => navigate(`/t/${slug}/garcom`)}>
              Chamar o garçom
            </ActionButton>
          </Box>
        )}
        </>
      }
    >
      <ScreenHeader
        title="Minha comanda"
        subtitle={subtitle}
        onBack={() => navigate(counter ? `/t/${slug}/cardapio` : `/t/${slug}/comandas`)}
      />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {current.owner && current.joinCode && (
          <>
            <Box
              sx={{
                py: 5,
                textAlign: 'center',
                borderRadius: `${radius.card}px`,
                bgcolor: 'primary.main',
                color: '#FFFFFF',
              }}
            >
              <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1 }}>
                CÓDIGO PARA ENTRAR
              </Typography>
              <Typography
                aria-label={`Código ${current.joinCode.split('').join(' ')}`}
                sx={{ my: 1, fontSize: 64, lineHeight: 1.1, fontWeight: fontWeight.extraBold, letterSpacing: 6 }}
              >
                {current.joinCode}
              </Typography>
              <Typography sx={{ fontSize: fontSize.small }}>
                Muda em {formatRemaining((expiresAt ?? now) - now)}
              </Typography>
            </Box>
            {counter ? (
              // [Mateus · Card 5] Alteração: no balcão não há mesa para achar a comanda; vai o link de convite.
              <>
                <Typography sx={{ mt: 3, fontSize: fontSize.small, color: colors.textSecondary }}>
                  Para alguém pedir junto com você, mande este link e passe o código. Tudo cai nesta comanda e na
                  mesma senha.
                </Typography>
                <Typography sx={{ mt: 2, fontSize: fontSize.caption, wordBreak: 'break-all', color: colors.text }}>
                  {inviteLink}
                </Typography>
                <ActionButton
                  tone="secondary"
                  sx={{ mt: 2 }}
                  onClick={() => void navigator.clipboard?.writeText(inviteLink).catch(() => undefined)}
                >
                  Copiar link
                </ActionButton>
              </>
            ) : (
              <Typography sx={{ mt: 3, fontSize: fontSize.small, color: colors.textSecondary }}>
                Passe o código para quem está na mesa. Quem entrar pede na mesma comanda, e tudo cai nesta conta.
              </Typography>
            )}
          </>
        )}

        <SectionLabel>Quem está nesta comanda</SectionLabel>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {current.members.map((member) => (
            <MemberRow
              key={member.sessionId}
              member={member}
              canRemove={current.owner && !member.owner}
              disabled={busy}
              onRemove={() => remove(member)}
            />
          ))}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 4, borderRadius: `${radius.button}px` }}>
            {error}
          </Alert>
        )}

        <InfoNote icon={<LockIcon sx={{ fontSize: 18 }} />}>
          {current.owner
            ? 'Só você fecha esta conta. Quem participa vê o que pediu, mas não encerra a comanda.'
            : `Quem abriu a comanda fecha a conta. Você vê o que pediu, e ${current.ownerName} encerra.`}
        </InfoNote>
      </Box>
    </ClientScreen>
  );
}

function MemberRow({
  member,
  canRemove,
  disabled,
  onRemove,
}: {
  member: TabMember;
  canRemove: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
  const detail = member.owner ? 'abriu a comanda' : `entrou às ${formatClock(member.joinedAt)}`;
  return (
    <Box
      sx={{
        p: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        border: `1px solid ${colors.border}`,
        borderRadius: `${radius.card}px`,
      }}
    >
      <Avatar name={member.name} size={36} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>{member.name}</Typography>
        <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
          {detail} · {formatCents(member.totalCents)}
        </Typography>
      </Box>
      {canRemove && (
        <ButtonBase
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remover ${member.name}`}
          sx={{
            px: 3,
            py: 2,
            border: `1px solid ${colors.border}`,
            borderRadius: `${radius.button}px`,
            fontFamily: 'inherit',
            fontSize: fontSize.small,
            fontWeight: fontWeight.extraBold,
          }}
        >
          Remover
        </ButtonBase>
      )}
    </Box>
  );
}
