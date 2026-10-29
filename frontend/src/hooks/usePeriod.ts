import { useCallback, useState } from 'react';

export type Period = 'DAY' | 'WEEK' | 'MONTH';

const STORAGE_KEY = 'pedeai.gestao.period';
const PERIODS: Period[] = ['DAY', 'WEEK', 'MONTH'];

export const PERIOD_DAYS: Record<Period, number> = { DAY: 1, WEEK: 7, MONTH: 30 };

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'DAY', label: 'Dia' },
  { value: 'WEEK', label: 'Semana' },
  { value: 'MONTH', label: 'Mês' },
];

export const PERIOD_TEXT: Record<Period, string> = {
  DAY: 'hoje',
  WEEK: 'nos últimos 7 dias',
  MONTH: 'nos últimos 30 dias',
};

function readPeriod(): Period {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Period | null;
    return stored && PERIODS.includes(stored) ? stored : 'DAY';
  } catch {
    return 'DAY';
  }
}

export function usePeriod() {
  const [period, setPeriodState] = useState<Period>(readPeriod);

  const setPeriod = useCallback((next: Period) => {
    setPeriodState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  }, []);

  return [period, setPeriod] as const;
}
