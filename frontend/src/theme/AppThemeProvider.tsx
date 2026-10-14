import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { DEFAULT_PRIMARY_COLOR, createAppTheme } from './theme';

interface TenantThemeContext {
  primaryColor: string;
  changePrimaryColor: (color: string) => void;
}

const TenantThemeContext = createContext<TenantThemeContext>({
  primaryColor: DEFAULT_PRIMARY_COLOR,
  changePrimaryColor: () => {},
});

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}

export default function AppThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, changePrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const theme = useMemo(() => createAppTheme(primaryColor), [primaryColor]);

  return (
    <TenantThemeContext.Provider value={{ primaryColor, changePrimaryColor }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </TenantThemeContext.Provider>
  );
}
