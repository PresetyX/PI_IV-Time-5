import { useCallback, useEffect, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import ManagementLayout, { LoadState } from '../../components/management/ManagementLayout';
import { ROLE_COLORS, ROLE_LABELS, fetchTeam, initials } from '../../services/management';
import type { TeamMember } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setTeam(null);
    setError(null);
    fetchTeam()
      .then((data) => !cancelled && setTeam(data))
      .catch((caught) => !cancelled && setError(caught));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  const active = team?.filter((member) => member.active) ?? [];
  const waiting = active.filter((member) => !member.lastLoginAt).length;

  return (
    <ManagementLayout
      title="Equipe"
      subtitle={
        team
          ? `${active.length} ${active.length === 1 ? 'pessoa' : 'pessoas'} com acesso${waiting ? ` · ${waiting} aguardando primeiro acesso` : ''}`
          : undefined
      }
    >
      {!team ? (
        <LoadState error={error} onRetry={load} />
      ) : (
        <>
          <TableContainer
            sx={{ bgcolor: colors.background, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pessoa</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Último acesso</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ mt: 6, fontSize: fontSize.body, color: colors.textSecondary }}>
            Convidar e desligar pessoas entra na próxima entrega.
          </Typography>
        </>
      )}
    </ManagementLayout>
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
