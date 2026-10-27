import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import BackHeader from '../../components/client/BackHeader';
import ClientScreen from '../../components/client/ClientScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

interface ClientPlaceholderPageProps {
  title: string;
  description: string;
}

export default function ClientPlaceholderPage({ title, description }: ClientPlaceholderPageProps) {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const visit = readVisit(slug);

  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;

  return (
    <ClientScreen>
      <BackHeader
        title={state.store.name}
        tableNumber={visit.table?.number}
        onBack={() => navigate(`/t/${slug}/entrada`)}
      />
      <Box sx={{ px: 5, pt: 8 }}>
        <Typography variant="h2" component="h1">
          {title}
        </Typography>
        <Typography sx={{ mt: 3, color: tokens.colors.textSecondary }}>{description}</Typography>
      </Box>
    </ClientScreen>
  );
}
