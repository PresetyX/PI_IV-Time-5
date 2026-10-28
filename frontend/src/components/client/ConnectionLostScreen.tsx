import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import ClientScreen from './ClientScreen';
import { WifiOffIcon } from './icons';

const { colors, fontSize, fontWeight, radius } = tokens;

const TIPS = [
  'Confira se o wi-fi da casa ainda está conectado.',
  'Se a comanda ficou muito tempo parada, ela expira e você entra de novo pelo QR.',
  'Nada se perde: a conta fica no sistema da casa.',
];

interface ConnectionLostScreenProps {
  slug: string;
  onRetry: () => void;
}

export default function ConnectionLostScreen({ slug, onRetry }: ConnectionLostScreenProps) {
  const navigate = useNavigate();
  return (
    <ClientScreen
      footer={
        <>
          <ActionButton onClick={onRetry}>Tentar de novo</ActionButton>
          <ActionButton tone="secondary" onClick={() => navigate(`/t/${slug}/garcom`)} sx={{ mt: 2 }}>
            Chamar o garçom
          </ActionButton>
        </>
      }
    >
      <Box
        role="status"
        sx={{ px: 5, py: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: colors.surface }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.text }} />
        <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>
          Sem conexão com o restaurante
        </Typography>
      </Box>
      <Box sx={{ flex: 1, px: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `${radius.card + 6}px`,
            bgcolor: colors.surface,
          }}
        >
          <WifiOffIcon sx={{ fontSize: 44 }} />
        </Box>
        <Typography variant="h2" component="h1" sx={{ mt: 6, textAlign: 'center' }}>
          Perdemos a conexão
        </Typography>
        <Typography sx={{ mt: 3, textAlign: 'center', color: colors.textSecondary }}>
          Seu pedido já enviado está salvo e a cozinha continua preparando. O que estava no carrinho fica guardado
          neste celular.
        </Typography>
        <Box
          component="ul"
          sx={{
            mt: 6,
            mb: 0,
            py: 4,
            pl: 8,
            pr: 4,
            width: '100%',
            borderRadius: `${radius.card}px`,
            bgcolor: colors.surface,
            color: colors.textSecondary,
            fontSize: fontSize.small,
            lineHeight: 1.5,
            '& li + li': { mt: 2 },
          }}
        >
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </Box>
      </Box>
    </ClientScreen>
  );
}
