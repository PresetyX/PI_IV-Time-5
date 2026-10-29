import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  IconButton,
  Radio,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ManagementLayout, { LoadState } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { ApiError } from '../../services/api';
import {
  ROLE_COLORS,
  ROLE_LABELS,
  deactivateMember,
  fetchTeam,
  initials,
  inviteMember,
  updateMember,
} from '../../services/management';
import type { Invitation, MemberChanges, StaffRole, TeamMember } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

const ROLE_OPTIONS: { value: StaffRole; hint: string }[] = [
  { value: 'OWNER', hint: 'Acesso total, inclusive configuração e relatórios' },
  { value: 'MANAGER', hint: 'Cardápio, contas e relatórios' },
  { value: 'WAITER', hint: 'Mesas, contas e entregas' },
  { value: 'KITCHEN', hint: 'Só a fila de produção' },
];

const ACCESS: { label: string; roles: StaffRole[] }[] = [
  { label: 'Fila de produção', roles: ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'] },
  { label: 'Mapa de mesas e contas', roles: ['OWNER', 'MANAGER', 'WAITER'] },
  { label: 'Cardápio e mesas', roles: ['OWNER', 'MANAGER'] },
  { label: 'Gestão e configuração', roles: ['OWNER'] },
];

export default function TeamPage() {
  const { data: team, error, reload } = useLoader(fetchTeam);
  const [inviting, setInviting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [leaving, setLeaving] = useState<TeamMember | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const active = team?.filter((member) => member.active) ?? [];
  const waiting = active.filter((member) => !member.lastLoginAt).length;

  async function confirmDeactivate() {
    if (!leaving) return;
    try {
      await deactivateMember(leaving.id);
      reload();
    } catch (caught) {
      setMessage(
        caught instanceof ApiError && caught.status === 409
          ? 'Você não pode desligar a si mesmo.'
          : caught instanceof ApiError && caught.status === 403
            ? 'Só o dono pode mudar a equipe.'
            : 'Não foi possível desligar agora.',
      );
    } finally {
      setLeaving(null);
    }
  }

  return (
    <ManagementLayout
      title="Equipe"
      subtitle={
        team
          ? `${active.length} ${active.length === 1 ? 'pessoa' : 'pessoas'} com acesso${waiting ? ` · ${waiting} aguardando primeiro acesso` : ''}`
          : undefined
      }
      actions={
        <Button variant="contained" onClick={() => setInviting(true)} sx={{ minHeight: 48, px: 6 }}>
          Convidar pessoa
        </Button>
      }
    >
      {message && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {invitation && (
        <Alert severity="success" sx={{ mb: 4 }} onClose={() => setInvitation(null)}>
          {invitation.name} entrou na equipe. Senha provisória: <strong>{invitation.temporaryPassword}</strong>. Passe
          para a pessoa entrar em /login com o e-mail {invitation.email}.
        </Alert>
      )}
      {!team ? (
        <LoadState error={error} onRetry={reload} />
      ) : (
        <>
          <TableContainer sx={{ bgcolor: colors.background, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pessoa</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Último acesso</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {team.map((member) => (
                  <TableRow key={member.id} sx={{ opacity: member.active ? 1 : 0.5 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: '50%',
                            bgcolor: colors.surface,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: fontWeight.extraBold,
                          }}
                        >
                          {initials(member.name)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: fontWeight.bold }}>{member.name}</Typography>
                          <Typography noWrap sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                            {member.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          px: 3,
                          py: 1,
                          borderRadius: 999,
                          bgcolor: ROLE_COLORS[member.role] ?? colors.text,
                          color: colors.background,
                          fontSize: fontSize.caption,
                          fontWeight: fontWeight.extraBold,
                          textTransform: 'uppercase',
                        }}
                      >
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: colors.textSecondary }}>
                      {!member.active ? 'desligado' : describeLastAccess(member.lastLoginAt)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button variant="outlined" onClick={() => setEditing(member)} sx={{ minHeight: 44 }}>
                          Editar
                        </Button>
                        {member.active && (
                          <Button variant="outlined" onClick={() => setLeaving(member)} sx={{ minHeight: 44 }}>
                            Desligar
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Desligar alguém tira o acesso na hora, mas mantém o histórico de quem lançou e fechou cada conta.
          </Typography>
        </>
      )}

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onInvited={(created) => {
          setInviting(false);
          setInvitation(created);
          reload();
        }}
      />

      <EditMemberPanel
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />

      <Dialog open={!!leaving} onClose={() => setLeaving(null)}>
        <DialogTitle>Desligar {leaving?.name}?</DialogTitle>
        <DialogContent>
          <Typography>A pessoa perde o acesso na hora. O histórico dela continua nas contas e comissões.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaving(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeactivate}>
            Desligar
          </Button>
        </DialogActions>
      </Dialog>
    </ManagementLayout>
  );
}

function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: (invitation: Invitation) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('WAITER');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setFailure(null);
    try {
      const created = await inviteMember(name.trim(), email.trim(), role);
      setName('');
      setEmail('');
      setRole('WAITER');
      onInvited(created);
    } catch (caught) {
      setFailure(
        caught instanceof ApiError && caught.status === 409
          ? 'Já existe alguém com esse e-mail.'
          : caught instanceof ApiError && caught.status === 403
            ? 'Só o dono pode convidar pessoas.'
            : 'Confira o nome e o e-mail.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>Convidar para a equipe</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 6, pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {failure && <Alert severity="error">{failure}</Alert>}
            <TextField label="Nome" placeholder="Júlia Mendes" value={name} onChange={(event) => setName(event.target.value)} />
            <TextField
              label="E-mail"
              placeholder="julia@triunfolanches.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              helperText="A pessoa entra com esse e-mail e a senha provisória que aparece depois do convite."
            />
            <RolePicker value={role} onChange={setRole} />
          </Box>
          <AccessPanel role={role} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 6, gap: 3 }}>
        <Button variant="outlined" onClick={onClose} sx={{ minHeight: 48, px: 6 }}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={busy || !name.trim() || !email.trim()} onClick={submit} sx={{ minHeight: 48, px: 8 }}>
          Enviar convite
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RolePicker({ value, onChange }: { value: StaffRole; onChange: (role: StaffRole) => void }) {
  return (
    <>
      <Typography sx={{ fontWeight: fontWeight.bold }}>Perfil</Typography>
      {ROLE_OPTIONS.map((option) => (
        <ButtonBase
          key={option.value}
          onClick={() => onChange(option.value)}
          sx={{
            justifyContent: 'space-between',
            textAlign: 'left',
            p: 4,
            borderRadius: `${radius.button}px`,
            border: `1px solid ${value === option.value ? colors.text : colors.border}`,
            fontFamily: 'inherit',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: fontWeight.extraBold }}>{ROLE_LABELS[option.value]}</Typography>
            <Typography sx={{ fontSize: fontSize.body, color: colors.textSecondary }}>{option.hint}</Typography>
          </Box>
          <Radio checked={value === option.value} tabIndex={-1} />
        </ButtonBase>
      ))}
    </>
  );
}

function AccessPanel({ role }: { role: StaffRole }) {
  return (
    <Box sx={{ p: 5, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px`, alignSelf: 'start' }}>
      <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 3 }}>O que esse perfil abre</Typography>
      {ACCESS.map((item) => {
        const allowed = item.roles.includes(role);
        return (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 1.5 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: allowed ? colors.text : 'transparent',
                border: `2px solid ${allowed ? colors.text : colors.border}`,
              }}
            />
            <Typography sx={{ color: allowed ? colors.text : colors.textMuted }}>{item.label}</Typography>
          </Box>
        );
      })}
      <Typography sx={{ mt: 3, fontSize: fontSize.small, color: colors.textSecondary }}>
        O perfil pode ser trocado depois, sem perder o histórico da pessoa.
      </Typography>
    </Box>
  );
}

function EditMemberPanel({ member, onClose, onSaved }: { member: TeamMember | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<MemberChanges | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setFailure(null);
    setForm(member && { name: member.name, email: member.email, role: member.role, active: member.active });
  }, [member]);

  async function save() {
    if (!member || !form) return;
    setBusy(true);
    setFailure(null);
    try {
      await updateMember(member.id, { ...form, name: form.name.trim(), email: form.email.trim() });
      onSaved();
    } catch (caught) {
      setFailure(
        caught instanceof ApiError && caught.status === 409
          ? 'Esse e-mail já é de outra pessoa, ou você tentou tirar o seu próprio acesso de dono.'
          : caught instanceof ApiError && caught.status === 403
            ? 'Só o dono pode mudar a equipe.'
            : 'Confira o nome e o e-mail.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer anchor="right" open={!!member} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
      {member && form && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 6, borderBottom: `1px solid ${colors.border}` }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: colors.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: fontWeight.extraBold,
              }}
            >
              {initials(form.name || member.name)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>Editar pessoa</Typography>
              <Typography noWrap sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                {describeLastAccess(member.lastLoginAt)}
              </Typography>
            </Box>
            <IconButton aria-label="Fechar" onClick={onClose} sx={{ width: 44, height: 44 }}>
              ×
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {failure && <Alert severity="error">{failure}</Alert>}
            <TextField label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <TextField label="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <RolePicker value={form.role} onChange={(role) => setForm({ ...form, role })} />
            <FormControlLabel
              labelPlacement="start"
              control={<Switch checked={form.active} onChange={() => setForm({ ...form, active: !form.active })} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: fontWeight.bold }}>Acesso ativo</Typography>
                  <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                    Desligado, a pessoa não entra mais, mas o histórico fica.
                  </Typography>
                </Box>
              }
              sx={{ m: 0, justifyContent: 'space-between' }}
            />
            <AccessPanel role={form.role} />
          </Box>

          <Box sx={{ display: 'flex', gap: 3, p: 6, borderTop: `1px solid ${colors.border}` }}>
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1, minHeight: 48 }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={busy || !form.name.trim() || !form.email.trim()}
              onClick={save}
              sx={{ flex: 2, minHeight: 48 }}
            >
              Salvar alterações
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

function describeLastAccess(iso: string | null): string {
  if (!iso) return 'aguardando 1º acesso';
  const date = new Date(iso);
  const time = `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `hoje, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `ontem, ${time}`;
  return `${date.toLocaleDateString('pt-BR')}, ${time}`;
}
