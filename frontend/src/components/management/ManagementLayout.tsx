import type { ReactNode } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, ButtonBase, CircularProgress, Typography } from '@mui/material';
import { ApiError, getToken, saveToken } from '../../services/api';
import { currentRole } from '../../services/auth';
import type { Role } from '../../services/auth';
import BrandMark from '../BrandMark';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  exact?: boolean;
}

const MANAGERS: Role[] = ['OWNER', 'MANAGER'];
const FLOOR: Role[] = ['OWNER', 'MANAGER', 'WAITER'];
const EVERYONE: Role[] = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];

const NAV: NavItem[] = [
  { to: '/gestao', label: 'Gestão', roles: MANAGERS, exact: true },
  { to: '/gestao/curva-abc', label: 'Curva ABC', roles: MANAGERS },
  { to: '/gestao/contas', label: 'Histórico de contas', roles: MANAGERS },
  { to: '/gestao/caixa', label: 'Caixa', roles: MANAGERS },
  { to: '/gestao/comissoes', label: 'Comissões', roles: MANAGERS },
  { to: '/gestao/equipe', label: 'Equipe', roles: MANAGERS },
  { to: '/gestao/configuracao', label: 'Configuração', roles: MANAGERS },
  { to: '/producao', label: 'Produção', roles: EVERYONE },
  { to: '/salao', label: 'Salão', roles: FLOOR },
  { to: '/contas', label: 'Contas abertas', roles: FLOOR },
  { to: '/fila-espera', label: 'Fila de espera', roles: FLOOR },
];

const ROLE_SUBTITLE: Record<Role, string> = {
  OWNER: 'Perfil dono',
  MANAGER: 'Perfil gerente',
  WAITER: 'Perfil salão',
  KITCHEN: 'Perfil cozinha',
};

interface ManagementLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  back?: { to: string; label: string };
  sidebarFooter?: ReactNode;
  children: ReactNode;
}

export default function ManagementLayout({ title, subtitle, actions, back, sidebarFooter, children }: ManagementLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = currentRole();

  if (!getToken()) return <Navigate to="/login" replace />;
  const items = NAV.filter((item) => !role || item.roles.includes(role));
  const activeItem = items
    .filter((item) => (item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  function logout() {
    saveToken(null);
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: colors.panel }}>
      <Box
        component="aside"
        sx={{
          width: { xs: '100%', md: 280 },
          flexShrink: 0,
          bgcolor: colors.text,
          color: colors.background,
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <BrandMark aria-hidden sx={{ fontSize: 44, color: colors.background }} />
          <Box>
            <Typography sx={{ fontWeight: fontWeight.extraBold }}>Pede Aí</Typography>
            <Typography sx={{ fontSize: fontSize.small, color: 'rgba(255,255,255,0.6)' }}>
              {role ? ROLE_SUBTITLE[role] : 'Painel da casa'}
            </Typography>
          </Box>
        </Box>
        <Box component="nav" sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, flexWrap: 'wrap', gap: 1 }}>
          {items.map((item) => {
            const active = item === activeItem;
            return (
              <ButtonBase
                key={item.to}
                component={RouterLink}
                to={item.to}
                sx={{
                  justifyContent: 'flex-start',
                  minHeight: 44,
                  px: 4,
                  borderRadius: `${radius.button}px`,
                  fontFamily: 'inherit',
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.bold,
                  bgcolor: active ? colors.background : 'transparent',
                  color: active ? colors.text : 'rgba(255,255,255,0.85)',
                }}
              >
                {item.label}
              </ButtonBase>
            );
          })}
        </Box>
        <Box sx={{ mt: { md: 'auto' }, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sidebarFooter}
          <Button onClick={logout} sx={{ color: 'rgba(255,255,255,0.7)', minHeight: 44 }}>
            Sair
          </Button>
        </Box>
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 5, md: 10 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, mb: 8 }}>
          <Box>
            {back && (
              <ButtonBase
                component={RouterLink}
                to={back.to}
                sx={{ mb: 2, minHeight: 32, fontFamily: 'inherit', fontWeight: fontWeight.bold, color: colors.textSecondary }}
              >
                ← {back.label}
              </ButtonBase>
            )}
            <Typography variant="h1" sx={{ fontSize: fontSize.display }}>
              {title}
            </Typography>
            {subtitle && <Typography sx={{ mt: 1, color: colors.textSecondary }}>{subtitle}</Typography>}
          </Box>
          {actions}
        </Box>
        {children}
      </Box>
    </Box>
  );
}

export function Card({ children, highlighted = false }: { children: ReactNode; highlighted?: boolean }) {
  return (
    <Box
      sx={{
        bgcolor: colors.background,
        border: `1px solid ${highlighted ? colors.text : colors.border}`,
        borderRadius: `${radius.card}px`,
        p: 6,
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: '#EFEFEF', borderRadius: `${radius.button}px` }}>
      {options.map((option) => (
        <ButtonBase
          key={option.value}
          onClick={() => onChange(option.value)}
          sx={{
            minHeight: 44,
            px: 5,
            borderRadius: '12px',
            fontFamily: 'inherit',
            fontSize: fontSize.button,
            fontWeight: fontWeight.bold,
            bgcolor: value === option.value ? colors.background : 'transparent',
            color: value === option.value ? colors.text : colors.textSecondary,
          }}
        >
          {option.label}
        </ButtonBase>
      ))}
    </Box>
  );
}

export function LoadState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (!error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error instanceof ApiError && error.status === 401) return <Navigate to="/login" replace />;
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <Alert
      severity="error"
      action={
        forbidden ? undefined : (
          <Button color="inherit" onClick={onRetry}>
            Tentar de novo
          </Button>
        )
      }
    >
      {forbidden ? 'Seu perfil não tem acesso à gestão.' : 'Não foi possível carregar os dados agora.'}
    </Alert>
  );
}
