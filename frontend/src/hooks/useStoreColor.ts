import { useEffect } from 'react';
import { useTenantTheme } from '../theme/AppThemeProvider';
import { DEFAULT_PRIMARY_COLOR } from '../theme/theme';

export function useStoreColor(color: string | null | undefined) {
  const { changePrimaryColor } = useTenantTheme();

  useEffect(() => {
    if (!color) return undefined;
    changePrimaryColor(color);
    return () => changePrimaryColor(DEFAULT_PRIMARY_COLOR);
  }, [color, changePrimaryColor]);
}
