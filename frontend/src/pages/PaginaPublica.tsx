import { Button, Container, Typography } from '@mui/material';
import { Link as LinkRouter } from 'react-router-dom';

export default function PaginaPublica() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Pede Aí
      </Typography>
      <Typography sx={{ mb: 2 }}>Página pública de exemplo.</Typography>
      <Button variant="contained" component={LinkRouter} to="/painel">
        Ir para o painel
      </Button>
    </Container>
  );
}
