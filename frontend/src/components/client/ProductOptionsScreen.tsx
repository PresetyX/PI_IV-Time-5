import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { MAX_LINE_QUANTITY, MAX_NOTE_LENGTH, unitPrice } from '../../services/cart';
import type { CartOption } from '../../services/cart';
import { formatCents } from '../../services/format';
import type { MenuOptionGroup, MenuProduct } from '../../services/menu';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import { ChoiceRow, deltaText, QuantityStepper } from './CartParts';
import ClientScreen from './ClientScreen';
import { ScreenHeader, SectionLabel } from './TabParts';

const { colors, fontSize } = tokens;

function minOf(group: MenuOptionGroup): number {
  return group.required ? Math.max(1, group.min) : Math.max(0, group.min);
}

function ruleText(group: MenuOptionGroup): string {
  const min = minOf(group);
  const max = group.max > 0 ? group.max : group.options.length;
  if (max === 1) return min === 1 ? 'Obrigatório · escolha 1' : 'Opcional · até 1';
  if (min > 0) return `Obrigatório · de ${min} a ${max}`;
  return `Opcional · até ${max}`;
}

interface ProductOptionsScreenProps {
  product: MenuProduct;
  onAdd: (options: CartOption[], quantity: number, note: string) => void;
  onBack: () => void;
}

/** Escolha das opções, quantidade e observação de um produto antes de ir para o carrinho. */
export default function ProductOptionsScreen({ product, onAdd, onBack }: ProductOptionsScreenProps) {
  const groups = product.optionGroups ?? [];
  const [picked, setPicked] = useState<CartOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  function isPicked(group: string, label: string) {
    return picked.some((option) => option.group === group && option.label === label);
  }

  function toggle(group: MenuOptionGroup, label: string, deltaCents: number) {
    setPicked((current) => {
      const inGroup = current.filter((option) => option.group === group.name);
      if (isPicked(group.name, label)) {
        return current.filter((option) => !(option.group === group.name && option.label === label));
      }
      if (group.max === 1) {
        return [...current.filter((option) => option.group !== group.name), { group: group.name, label, deltaCents }];
      }
      if (group.max > 0 && inGroup.length >= group.max) return current;
      return [...current, { group: group.name, label, deltaCents }];
    });
  }

  const missing = groups.filter((group) => picked.filter((option) => option.group === group.name).length < minOf(group));
  const total = unitPrice({ basePriceCents: product.priceCents, options: picked }) * quantity;

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          {missing.length > 0 && (
            <Typography sx={{ mb: 3, fontSize: fontSize.small, color: colors.textSecondary }}>
              Escolha {missing.map((group) => group.name.toLowerCase()).join(' e ')} para continuar.
            </Typography>
          )}
          <ActionButton
            disabled={missing.length > 0}
            onClick={() => onAdd(picked, quantity, note)}
            sx={{ justifyContent: 'space-between', px: 5 }}
          >
            <span>Adicionar ao carrinho</span>
            <span>{formatCents(total)}</span>
          </ActionButton>
        </>
      }
    >
      <ScreenHeader title={product.name} subtitle={formatCents(product.priceCents)} onBack={onBack} />
      <Box sx={{ px: 5, pt: 2, pb: 6 }}>
        {product.description && (
          <Typography sx={{ mt: 3, fontSize: fontSize.small, color: colors.textSecondary }}>{product.description}</Typography>
        )}

        {groups.map((group) => (
          <Box key={group.name}>
            <SectionLabel>{group.name}</SectionLabel>
            <Typography sx={{ mt: -2, mb: 3, fontSize: fontSize.caption, color: colors.textMuted }}>{ruleText(group)}</Typography>
            <Box
              role={group.max === 1 ? 'radiogroup' : 'group'}
              aria-label={group.name}
              sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              {group.options.map((option) => {
                const checked = isPicked(group.name, option.label);
                const full =
                  group.max > 1 && picked.filter((item) => item.group === group.name).length >= group.max;
                return (
                  <ChoiceRow
                    key={option.label}
                    kind={group.max === 1 ? 'radio' : 'checkbox'}
                    checked={checked}
                    disabled={!checked && full}
                    title={option.label}
                    detail={deltaText(option.deltaCents) || undefined}
                    onClick={() => toggle(group, option.label, option.deltaCents)}
                  />
                );
              })}
            </Box>
          </Box>
        ))}

        <SectionLabel>Observação</SectionLabel>
        <TextField
          id="product-note"
          placeholder="Ex.: sem cebola"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE_LENGTH))}
          inputProps={{ maxLength: MAX_NOTE_LENGTH, 'aria-label': 'Observação' }}
          helperText={`${note.length}/${MAX_NOTE_LENGTH}`}
          multiline
          minRows={2}
          fullWidth
        />

        <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>Quantidade</Typography>
          <QuantityStepper value={quantity} min={1} max={MAX_LINE_QUANTITY} label="Quantidade" onChange={setQuantity} />
        </Box>
      </Box>
    </ClientScreen>
  );
}
