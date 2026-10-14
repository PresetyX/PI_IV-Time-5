import { Button, Container, Typography } from '@mui/material';
import { Link as LinkRouter } from 'react-router-dom';

export default function PaginaPainel() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Painel
      </Typography>
      <Typography sx={{ mb: 2 }}>Página de painel de exemplo.</Typography>
      <Button variant="outlined" component={LinkRouter} to="/">
        Voltar
      </Button>
    </Container>
  );
}
