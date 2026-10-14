import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { COR_PRIMARIA_PADRAO, criarTema } from './theme';

interface ContextoDeTema {
  corPrimaria: string;
  trocarCorPrimaria: (cor: string) => void;
}

const ContextoTema = createContext<ContextoDeTema>({
  corPrimaria: COR_PRIMARIA_PADRAO,
  trocarCorPrimaria: () => {},
});

export function useTemaDoEstabelecimento() {
  return useContext(ContextoTema);
}

export default function ProvedorDeTema({ children }: { children: ReactNode }) {
  const [corPrimaria, trocarCorPrimaria] = useState(COR_PRIMARIA_PADRAO);
  const tema = useMemo(() => criarTema(corPrimaria), [corPrimaria]);

  return (
    <ContextoTema.Provider value={{ corPrimaria, trocarCorPrimaria }}>
      <ThemeProvider theme={tema}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ContextoTema.Provider>
  );
}
