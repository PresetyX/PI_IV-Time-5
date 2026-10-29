import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import BrandMark from '../components/BrandMark';
import { ApiError } from '../services/api';
import { login, routeForRole } from '../services/auth';
import { tokens } from '../theme/theme';

const { colors, touchTarget } = tokens;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Loja, e-mail ou senha incorretos. Confira os dados e tente de novo.';
    }
    if (error.status === 423) {
      const match = error.message.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/);
      const unlockAt = match ? new Date(match[0]) : null;
      if (unlockAt && !Number.isNaN(unlockAt.getTime())) {
        const time = unlockAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `Conta bloqueada após 3 tentativas erradas. Tente de novo às ${time}.`;
      }
      return 'Conta bloqueada após 3 tentativas erradas. Tente de novo em 15 minutos.';
    }
    if (error.status === 400) {
      return 'Preencha loja, e-mail e senha.';
    }
  }
  return 'Não foi possível entrar agora. Verifique sua conexão e tente de novo.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [storeSlug, setStoreSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = storeSlug.trim() !== '' && email.trim() !== '' && password !== '';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await login({ storeSlug: storeSlug.trim(), email: email.trim(), password });
      const destination = routeForRole(response.user.role);
      if (!destination) {
        setError('Seu perfil ainda não tem uma tela disponível.');
        return;
      }
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.background }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          px: 16,
          bgcolor: colors.panel,
          borderRight: `1px solid ${colors.divider}`,
        }}
      >
        <BrandMark aria-hidden sx={{ fontSize: 96, color: colors.text, mb: 6 }} />
        <Typography variant="h1" component="p">
          Pede Aí
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 4, maxWidth: 360, color: colors.textSecondary }}>
          A comanda da sua casa, do pedido na mesa à cozinha.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          px: { xs: 5, md: 16 },
          py: 10,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 390, mx: { xs: 'auto', md: 0 } }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 3, mb: 8 }}>
            <BrandMark aria-hidden sx={{ fontSize: 44, color: colors.text }} />
            <Typography variant="h3" component="p" sx={{ color: colors.textSecondary }}>
              Pede Aí
            </Typography>
          </Box>
          <Typography variant="h2" component="h1">
            Entrar
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: colors.textSecondary }}>
            Acesso da equipe do estabelecimento.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 8 }}>
            <TextField
              label="Loja"
              value={storeSlug}
              onChange={(event) => setStoreSlug(event.target.value)}
              helperText="O endereço da casa, por exemplo triunfo-lanches"
              autoCapitalize="none"
              autoCorrect="off"
              fullWidth
              required
              sx={{ mb: 4 }}
            />
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              fullWidth
              required
              sx={{ mb: 4 }}
            />
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
              required
              sx={{ mb: 4 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 4, borderRadius: `${tokens.radius.button}px` }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!canSubmit || submitting}
              sx={{ minHeight: 48 }}
            >
              {submitting ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 2 }} />
                  Entrando
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
