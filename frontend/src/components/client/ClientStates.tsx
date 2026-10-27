import { Box, CircularProgress, Typography } from '@mui/material';
import StatusMessage from '../StatusMessage';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import ClientScreen from './ClientScreen';

export function ClientLoading() {
  return (
    <ClientScreen>
      <Box
        role="status"
        aria-label="Carregando"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        <CircularProgress size={32} sx={{ color: tokens.colors.text }} />
        <Typography variant="body2" sx={{ color: tokens.colors.textMuted }}>
          Carregando
        </Typography>
      </Box>
    </ClientScreen>
  );
}

interface ClientErrorProps {
  notFound?: boolean;
  onRetry?: () => void;
}

export function ClientError({ notFound = false, onRetry }: ClientErrorProps) {
  return (
    <ClientScreen>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatusMessage
          tone="error"
          title={notFound ? 'Casa não encontrada' : 'Não foi possível carregar'}
          description={
            notFound
              ? 'Confira o endereço ou leia o QR code da mesa de novo.'
              : 'Verifique sua conexão e tente novamente.'
          }
          action={
            !notFound &&
            onRetry && (
              <ActionButton onClick={onRetry} sx={{ px: 8 }}>
                Tentar de novo
              </ActionButton>
            )
          }
        />
      </Box>
    </ClientScreen>
  );
}
