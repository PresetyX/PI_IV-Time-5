import { createTheme } from '@mui/material';

export const DEFAULT_PRIMARY_COLOR = '#d84315';

export function createAppTheme(primaryColor: string = DEFAULT_PRIMARY_COLOR) {
  return createTheme({
    palette: {
      primary: { main: primaryColor },
    },
  });
}
