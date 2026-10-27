import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import ClientScreen from './ClientScreen';
import { QrOffIcon } from './icons';

interface InvalidQrScreenProps {
  slug: string;
  token: string;
  onRetry: () => void;
}

const { colors, fontSize, fontWeight, radius } = tokens;

export default function InvalidQrScreen({ slug, token, onRetry }: InvalidQrScreenProps) {
  const navigate = useNavigate();

  return (
    <ClientScreen>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 7,
          py: 10,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 96,
            height: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '24px',
            bgcolor: colors.surface,
          }}
        >
          <QrOffIcon sx={{ fontSize: 40, color: colors.text }} />
        </Box>
        <Typography variant="h2" component="h1" sx={{ mt: 6 }}>
          Esse código não vale mais
        </Typography>
        <Typography sx={{ mt: 3, color: colors.textSecondary }}>
          O QR pode ter sido trocado ou a mesa foi desativada. Chame alguém da equipe para conferir a plaquinha.
        </Typography>

        <Box
          sx={{
            width: '100%',
            mt: 6,
            px: 4,
            py: 4,
            textAlign: 'left',
            borderRadius: `${radius.card}px`,
            bgcolor: colors.surface,
          }}
        >
          <Typography
            sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}
          >
            CÓDIGO LIDO
          </Typography>
          <Typography sx={{ mt: 1, fontSize: fontSize.button, fontWeight: fontWeight.extraBold, wordBreak: 'break-all' }}>
            {`${window.location.host}/t/${slug}/${token}`}
          </Typography>
        </Box>

        <ActionButton sx={{ mt: 6 }} onClick={onRetry}>
          Tentar de novo
        </ActionButton>
        <ActionButton tone="secondary" sx={{ mt: 3 }} onClick={() => navigate(`/t/${slug}/mesa`)}>
          Informar a mesa na mão
        </ActionButton>
      </Box>
    </ClientScreen>
  );
}
