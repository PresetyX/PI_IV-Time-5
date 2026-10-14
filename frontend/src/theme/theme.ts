import { createTheme } from '@mui/material';

export const COR_PRIMARIA_PADRAO = '#d84315';

export function criarTema(corPrimaria: string = COR_PRIMARIA_PADRAO) {
  return createTheme({
    palette: {
      primary: { main: corPrimaria },
    },
  });
}
