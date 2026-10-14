import { Button, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PublicPage() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Pede Aí
      </Typography>
      <Typography sx={{ mb: 2 }}>Página pública de exemplo.</Typography>
      <Button variant="contained" component={RouterLink} to="/dashboard">
        Ir para o painel
      </Button>
    </Container>
  );
}
