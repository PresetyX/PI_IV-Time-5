import type { ReactNode } from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { formatCents } from '../../services/format';
import { tokens } from '../../theme/theme';
import { CheckIcon, PlusIcon } from './icons';

const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

/** "Ao ponto · Bacon extra" */
export function optionsText(options?: { label: string }[]): string {
  return (options ?? []).map((option) => option.label).join(' · ');
}

/** "+ R$ 6,00", "− R$ 12,00" ou nada quando não muda o preço. */
export function deltaText(deltaCents: number): string {
  if (deltaCents === 0) return '';
  return `${deltaCents > 0 ? '+' : '−'} ${formatCents(Math.abs(deltaCents))}`;
}

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, min = 0, max, label, onChange }: QuantityStepperProps) {
  const button = {
    width: touchTarget,
    height: touchTarget,
    border: `1px solid ${colors.border}`,
    borderRadius: `${radius.button}px`,
    color: colors.text,
    fontSize: fontSize.lead,
    fontWeight: fontWeight.extraBold,
  };
  return (
    <Box role="group" aria-label={label} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      <IconButton aria-label="Diminuir" disabled={value <= min} onClick={() => onChange(value - 1)} sx={button}>
        −
      </IconButton>
      <Typography aria-live="polite" sx={{ minWidth: 24, textAlign: 'center', fontWeight: fontWeight.extraBold }}>
        {value}
      </Typography>
      <IconButton aria-label="Aumentar" disabled={value >= max} onClick={() => onChange(value + 1)} sx={button}>
        <PlusIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
}

interface ChoiceRowProps {
  kind: 'radio' | 'checkbox';
  checked: boolean;
  disabled?: boolean;
  title: string;
  detail?: ReactNode;
  onClick: () => void;
}

/** Opção marcável no mesmo desenho da lista de motivos do chamado do garçom. */
export function ChoiceRow({ kind, checked, disabled = false, title, detail, onClick }: ChoiceRowProps) {
  return (
    <ButtonBase
      role={kind}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      sx={{
        p: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        textAlign: 'left',
        fontFamily: 'inherit',
        border: `${checked ? 1.5 : 1}px solid ${checked ? colors.text : colors.border}`,
        borderRadius: `${radius.card}px`,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>{title}</Typography>
        {detail && <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>{detail}</Typography>}
      </Box>
      <Box
        aria-hidden
        sx={{
          width: 22,
          height: 22,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: kind === 'radio' ? '50%' : '6px',
          border: `1.5px solid ${checked ? colors.text : colors.border}`,
          bgcolor: kind === 'checkbox' && checked ? colors.text : 'transparent',
          color: colors.background,
        }}
      >
        {checked && kind === 'radio' && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: colors.text }} />}
        {checked && kind === 'checkbox' && <CheckIcon sx={{ fontSize: 16 }} />}
      </Box>
    </ButtonBase>
  );
}

/** Linha de item num resumo: "2x Triunfo duplo", opções e observação embaixo, valor à direita. */
export function SummaryLine({
  quantity,
  name,
  options,
  note,
  totalCents,
  muted = false,
}: {
  quantity: number;
  name: string;
  options?: string;
  note?: string;
  totalCents: number;
  muted?: boolean;
}) {
  const color = muted ? colors.textMuted : colors.text;
  return (
    <Box sx={{ py: 1, display: 'flex', justifyContent: 'space-between', gap: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.small, color }}>
          {quantity}x {name}
        </Typography>
        {options && <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>{options}</Typography>}
        {note && <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>{note}</Typography>}
      </Box>
      <Typography sx={{ flexShrink: 0, fontSize: fontSize.small, fontWeight: fontWeight.extraBold, color }}>
        {formatCents(totalCents)}
      </Typography>
    </Box>
  );
}
