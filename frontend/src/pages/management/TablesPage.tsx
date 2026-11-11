import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import ManagementLayout, { Card, LoadState, Segmented } from '../../components/management/ManagementLayout';
import QrCode from '../../components/management/QrCode';
import { useLoader } from '../../hooks/useLoader';
import { ApiError } from '../../services/api';
import { fetchStoreSettings } from '../../services/management';
import {
  createTable,
  fetchManagedTables,
  regenerateTableToken,
  setTableActive,
  tableLabel,
  tableLink,
  updateTable,
} from '../../services/tableAdmin';
import type { ManagedTable } from '../../services/tableAdmin';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type TableTarget = { mode: 'create'; suggestedNumber: number } | { mode: 'edit'; table: ManagedTable };

type Confirmation = { kind: 'deactivate' | 'token'; table: ManagedTable };

export default function TablesPage() {
  const { data: tables, setData, error, reload } = useLoader(fetchManagedTables);
  const { data: store } = useLoader(fetchStoreSettings);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [target, setTarget] = useState<TableTarget | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const active = tables?.filter((table) => table.active).length ?? 0;
  const inactive = (tables?.length ?? 0) - active;
  const shown =
    tables?.filter((table) => (filter === 'ALL' ? true : filter === 'ACTIVE' ? table.active : !table.active)) ?? [];
  const nextNumber = tables && tables.length > 0 ? Math.max(...tables.map((table) => table.number)) + 1 : 1;

  function replaceTable(updated: ManagedTable) {
    setData((current) =>
      current ? current.map((table) => (table.id === updated.id ? updated : table)).sort((a, b) => a.number - b.number) : current,
    );
  }

  async function activate(table: ManagedTable) {
    try {
      replaceTable(await setTableActive(table.id, true));
      setNotice(`Mesa ${tableLabel(table.number)} ativada. A plaquinha dela volta a funcionar.`);
    } catch {
      setMessage(`Não foi possível ativar a mesa ${tableLabel(table.number)} agora.`);
    }
  }

  async function confirm() {
    if (!confirmation) return;
    const { kind, table } = confirmation;
    setConfirmation(null);
    try {
      if (kind === 'deactivate') {
        replaceTable(await setTableActive(table.id, false));
        setNotice(`Mesa ${tableLabel(table.number)} desativada. O QR dela não abre mais comanda.`);
      } else {
        replaceTable(await regenerateTableToken(table.id));
        setNotice(`Novo QR da mesa ${tableLabel(table.number)} gerado. Imprima a plaquinha nova.`);
      }
    } catch (caught) {
      setMessage(
        caught instanceof ApiError && caught.status === 409
          ? caught.message
          : kind === 'deactivate'
            ? `Não foi possível desativar a mesa ${tableLabel(table.number)} agora.`
            : `Não foi possível gerar o novo QR da mesa ${tableLabel(table.number)} agora.`,
      );
    }
  }

  return (
    <ManagementLayout
      title="Mesas"
      subtitle={
        tables
          ? `${active} ${active === 1 ? 'mesa ativa' : 'mesas ativas'}${inactive ? ` · ${inactive} ${inactive === 1 ? 'desativada' : 'desativadas'}` : ''}`
          : undefined
      }
      actions={
        tables ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Button
              variant="outlined"
              component={RouterLink}
              to="/gestao/mesas/qr"
              disabled={active === 0}
              sx={{ minHeight: 48, px: 5 }}
            >
              Imprimir QR codes
            </Button>
            <Button
              variant="contained"
              onClick={() => setTarget({ mode: 'create', suggestedNumber: nextNumber })}
              sx={{ minHeight: 48, px: 6 }}
            >
              Nova mesa
            </Button>
          </Box>
        ) : undefined
      }
    >
      {message && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 4 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {!tables ? (
        <LoadState error={error} onRetry={reload} />
      ) : tables.length === 0 ? (
        <Card>
          <Typography sx={{ fontWeight: fontWeight.bold }}>Nenhuma mesa cadastrada.</Typography>
          <Typography sx={{ mt: 1, color: colors.textSecondary }}>
            Cadastre as mesas do salão para gerar o QR code de cada uma.
          </Typography>
        </Card>
      ) : (
        <>
          <Box sx={{ mb: 6, display: 'flex' }}>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'Todas' },
                { value: 'ACTIVE', label: 'Ativas' },
                { value: 'INACTIVE', label: `Desativadas${inactive ? ` (${inactive})` : ''}` },
              ]}
            />
          </Box>
          {shown.length === 0 ? (
            <Card>
              <Typography sx={{ color: colors.textSecondary }}>Nenhuma mesa nesse filtro.</Typography>
            </Card>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
                gap: 5,
              }}
            >
              {shown.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  slug={store?.slug ?? null}
                  onEdit={() => setTarget({ mode: 'edit', table })}
                  onActivate={() => activate(table)}
                  onDeactivate={() => setConfirmation({ kind: 'deactivate', table })}
                  onNewToken={() => setConfirmation({ kind: 'token', table })}
                />
              ))}
            </Box>
          )}
          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Desativar uma mesa derruba o QR dela: quem ler a plaquinha vê o aviso de QR inválido. Gerar um novo QR invalida
            a plaquinha antiga para sempre.
          </Typography>
        </>
      )}

      <TableDialog
        target={target}
        onClose={() => setTarget(null)}
        onSaved={(saved, created) => {
          setTarget(null);
          if (created) {
            setData((current) => (current ? [...current, saved].sort((a, b) => a.number - b.number) : current));
            setNotice(`Mesa ${tableLabel(saved.number)} criada. O QR dela já está pronto para imprimir.`);
          } else {
            replaceTable(saved);
          }
        }}
      />

      <Dialog open={!!confirmation} onClose={() => setConfirmation(null)}>
        <DialogTitle>
          {confirmation?.kind === 'deactivate'
            ? `Desativar a mesa ${confirmation ? tableLabel(confirmation.table.number) : ''}?`
            : `Gerar novo QR da mesa ${confirmation ? tableLabel(confirmation.table.number) : ''}?`}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmation?.kind === 'deactivate'
              ? 'O QR da mesa para de funcionar na hora e ninguém consegue abrir comanda nela. Dá para ativar de novo depois, com a mesma plaquinha.'
              : 'A plaquinha que está na mesa para de funcionar na hora. Depois é só imprimir e trocar pela nova.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmation(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirm}>
            {confirmation?.kind === 'deactivate' ? 'Desativar' : 'Gerar novo QR'}
          </Button>
        </DialogActions>
      </Dialog>
    </ManagementLayout>
  );
}

function TableCard({
  table,
  slug,
  onEdit,
  onActivate,
  onDeactivate,
  onNewToken,
}: {
  table: ManagedTable;
  slug: string | null;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onNewToken: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Card highlighted={table.openTabs > 0}>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0, opacity: table.active ? 1 : 0.55 }}>
          <Typography sx={{ fontSize: 40, lineHeight: 1, fontWeight: fontWeight.extraBold }}>
            {tableLabel(table.number)}
          </Typography>
          <Typography noWrap sx={{ mt: 2, fontWeight: fontWeight.bold }}>
            {table.nickname ?? `Mesa ${tableLabel(table.number)}`}
          </Typography>
          <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
            {table.seats ? `${table.seats} ${table.seats === 1 ? 'lugar' : 'lugares'}` : 'Lugares não informados'}
          </Typography>
        </Box>
        <Box sx={{ opacity: table.active ? 1 : 0.25, flexShrink: 0 }}>
          {slug ? (
            <QrCode value={tableLink(slug, table.token)} size={84} label={`QR code da mesa ${table.number}`} />
          ) : (
            <Box sx={{ width: 84, height: 84, bgcolor: colors.surface, borderRadius: `${radius.button}px` }} />
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 4 }}>
        <StatusTag table={table} />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={onEdit} sx={{ flex: 1, minHeight: 44, px: 2, whiteSpace: 'nowrap' }}>
          Editar
        </Button>
        {table.active ? (
          <Button
            variant="outlined"
            component={RouterLink}
            to={`/gestao/mesas/qr?mesa=${table.id}`}
            sx={{ flex: 1, minHeight: 44, px: 2, whiteSpace: 'nowrap' }}
          >
            Imprimir QR
          </Button>
        ) : (
          <Button variant="contained" onClick={onActivate} sx={{ flex: 1, minHeight: 44, px: 2, whiteSpace: 'nowrap' }}>
            Ativar
          </Button>
        )}
        <IconButton
          aria-label={`Mais opções da mesa ${table.number}`}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ width: 44, height: 44, border: `1px solid ${colors.border}`, fontWeight: fontWeight.extraBold }}
        >
          ⋯
        </IconButton>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onNewToken();
            }}
          >
            Gerar novo QR
          </MenuItem>
          {table.active ? (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onDeactivate();
              }}
              sx={{ color: colors.error }}
            >
              Desativar mesa
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onActivate();
              }}
            >
              Ativar mesa
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Card>
  );
}

function StatusTag({ table }: { table: ManagedTable }) {
  const label = !table.active
    ? 'Desativada · QR fora do ar'
    : table.openTabs > 0
      ? `${table.openTabs} ${table.openTabs === 1 ? 'comanda aberta' : 'comandas abertas'}`
      : 'Livre';
  const strong = !table.active || table.openTabs > 0;
  return (
    <Box
      component="span"
      sx={{
        px: 3,
        py: 1,
        borderRadius: 999,
        bgcolor: !table.active ? colors.error : strong ? colors.text : colors.surface,
        color: strong ? colors.background : colors.textSecondary,
        fontSize: fontSize.caption,
        fontWeight: fontWeight.extraBold,
      }}
    >
      {label}
    </Box>
  );
}

function TableDialog({
  target,
  onClose,
  onSaved,
}: {
  target: TableTarget | null;
  onClose: () => void;
  onSaved: (table: ManagedTable, created: boolean) => void;
}) {
  const [number, setNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [seats, setSeats] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setFailure(null);
    if (target?.mode === 'edit') {
      setNumber(String(target.table.number));
      setNickname(target.table.nickname ?? '');
      setSeats(target.table.seats ? String(target.table.seats) : '');
    } else if (target) {
      setNumber(String(target.suggestedNumber));
      setNickname('');
      setSeats('');
    }
  }, [target]);

  const parsedNumber = Number(number);
  const numberInvalid = !number || !Number.isInteger(parsedNumber) || parsedNumber < 1 || parsedNumber > 999;
  const parsedSeats = seats ? Number(seats) : null;
  const seatsInvalid = parsedSeats !== null && (parsedSeats < 1 || parsedSeats > 50);

  async function save() {
    if (!target || numberInvalid || seatsInvalid) return;
    setBusy(true);
    setFailure(null);
    const changes = { number: parsedNumber, nickname: nickname.trim() || null, seats: parsedSeats };
    try {
      if (target.mode === 'edit') {
        onSaved(await updateTable(target.table.id, changes), false);
      } else {
        onSaved(await createTable(changes), true);
      }
    } catch (caught) {
      setFailure(
        caught instanceof ApiError && caught.status === 409
          ? `Já existe a mesa ${tableLabel(parsedNumber)}.`
          : caught instanceof ApiError && caught.status === 403
            ? 'Só o dono e o gerente podem mudar as mesas.'
            : 'Não foi possível salvar agora.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>
        {target?.mode === 'edit' ? `Editar mesa ${tableLabel(target.table.number)}` : 'Nova mesa'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 2 }}>
          {failure && <Alert severity="error">{failure}</Alert>}
          <TextField
            label="Número"
            value={number}
            inputMode="numeric"
            autoFocus
            error={!!number && numberInvalid}
            helperText={
              number && numberInvalid
                ? 'De 1 a 999.'
                : target?.mode === 'edit'
                  ? 'Trocar o número não muda o QR da mesa.'
                  : 'É o número que aparece na plaquinha.'
            }
            onChange={(event) => setNumber(event.target.value.replace(/\D/g, '').slice(0, 3))}
          />
          <TextField
            label="Apelido (opcional)"
            placeholder="Varanda, Janela, Mezanino..."
            value={nickname}
            inputProps={{ maxLength: 30 }}
            onChange={(event) => setNickname(event.target.value)}
          />
          <TextField
            label="Lugares (opcional)"
            value={seats}
            inputMode="numeric"
            error={seatsInvalid}
            helperText={seatsInvalid ? 'De 1 a 50.' : ' '}
            onChange={(event) => setSeats(event.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 6, gap: 3 }}>
        <Button variant="outlined" onClick={onClose} sx={{ minHeight: 48, px: 6 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={busy || numberInvalid || seatsInvalid}
          onClick={save}
          sx={{ minHeight: 48, px: 8 }}
        >
          {target?.mode === 'edit' ? 'Salvar' : 'Criar mesa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
