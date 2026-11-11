import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import BrandMark from '../BrandMark';
import { formatCents } from '../../services/format';
import type { MenuCategory, MenuProduct } from '../../services/menu';
import { tokens } from '../../theme/theme';
import { ClockIcon, CloseIcon, PlusIcon } from './icons';

const { colors, fontSize, fontWeight, radius } = tokens;

const pop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.18); }
  100% { transform: scale(1); }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

export const motionSafe = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } };

export function startingPrice(product: MenuProduct): number {
  const extra = (product.optionGroups ?? [])
    .filter((group) => group.required || group.min > 0)
    .reduce((sum, group) => {
      const deltas = group.options.map((option) => option.deltaCents).sort((a, b) => a - b);
      const picks = Math.max(1, group.min);
      return sum + deltas.slice(0, picks).reduce((total, delta) => total + delta, 0);
    }, 0);
  return product.priceCents + extra;
}

export function hasOptions(product: MenuProduct): boolean {
  return (product.optionGroups ?? []).length > 0;
}

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface HeroProps {
  name: string;
  tagline?: string;
  logoUrl?: string;
  color: string;
  tableNumber?: number;
  counter?: boolean;
  onBack?: () => void;
}

export function MenuHero({ name, tagline, logoUrl, color, tableNumber, counter, onBack }: HeroProps) {
  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: 5,
        pt: 5,
        pb: 7,
        color: colors.background,
        background: `linear-gradient(140deg, ${color} 0%, color-mix(in srgb, ${color} 70%, #000) 100%)`,
      }}
    >
      <Box aria-hidden sx={{ position: 'absolute', right: -60, top: -70, width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.10)' }} />
      <Box aria-hidden sx={{ position: 'absolute', left: -40, bottom: -90, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.07)' }} />
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        {onBack ? (
          <ButtonBase onClick={onBack} sx={{ height: 34, px: 3, borderRadius: 999, bgcolor: 'rgba(255,255,255,.18)', color: 'inherit', fontWeight: fontWeight.bold, fontSize: fontSize.small }}>
            ← Minha comanda
          </ButtonBase>
        ) : (
          <span />
        )}
        {(tableNumber || counter) && (
          <Box sx={{ height: 34, px: 3, display: 'flex', alignItems: 'center', borderRadius: 999, bgcolor: 'rgba(255,255,255,.18)', fontWeight: fontWeight.extraBold, fontSize: fontSize.small }}>
            {counter ? 'Balcão' : `Mesa ${String(tableNumber).padStart(2, '0')}`}
          </Box>
        )}
      </Box>
      <Box sx={{ position: 'relative', mt: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Box sx={{ width: 64, height: 64, flexShrink: 0, borderRadius: '20px', bgcolor: colors.background, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 12px 24px -12px rgba(0,0,0,.45)' }}>
          {logoUrl ? <Box component="img" src={logoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BrandMark sx={{ fontSize: 44 }} />}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {name}
          </Typography>
          {tagline && <Typography sx={{ mt: 1, fontSize: fontSize.small, opacity: 0.85 }}>{tagline}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MenuSearch({ value, onChange }: SearchProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: 44, px: 4, borderRadius: 999, bgcolor: colors.surface, border: `1px solid ${colors.border}`, '&:focus-within': { borderColor: 'primary.main', bgcolor: colors.background } }}>
      <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={{ width: 18, height: 18, flexShrink: 0, fill: 'none', stroke: colors.textMuted, strokeWidth: 2, strokeLinecap: 'round' }}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </Box>
      <InputBase
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar no cardápio"
        inputProps={{ 'aria-label': 'Buscar no cardápio' }}
        sx={{ flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold }}
      />
      {value && (
        <ButtonBase aria-label="Limpar busca" onClick={() => onChange('')} sx={{ width: 28, height: 28, borderRadius: '50%', color: colors.textMuted }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </ButtonBase>
      )}
    </Box>
  );
}

interface CategoryChipsProps {
  categories: MenuCategory[];
  active: string | null;
  onSelect: (id: string) => void;
}

export function CategoryChips({ categories, active, onSelect }: CategoryChipsProps) {
  return (
    <Box role="tablist" aria-label="Categorias do cardápio" sx={{ display: 'flex', gap: 2, overflowX: 'auto', py: 3, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
      {categories.map((category) => {
        const selected = category.id === active;
        return (
          <ButtonBase
            key={category.id}
            role="tab"
            aria-selected={selected}
            id={`chip-${category.id}`}
            onClick={() => onSelect(category.id)}
            sx={{
              flexShrink: 0,
              height: 36,
              px: 4,
              gap: 1.5,
              borderRadius: 999,
              fontSize: fontSize.small,
              fontWeight: fontWeight.extraBold,
              bgcolor: selected ? 'primary.main' : colors.background,
              color: selected ? colors.background : colors.text,
              border: `1px solid ${selected ? 'transparent' : colors.border}`,
              transition: 'background-color .25s ease, color .25s ease',
            }}
          >
            {category.name}
            <Box component="span" sx={{ fontSize: fontSize.caption, opacity: 0.7 }}>
              {category.products.length}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export function ProductImage({ product, size, height, radius: corner = 16 }: { product: MenuProduct; size: number | string; height?: number; radius?: number }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: height ?? size,
        flexShrink: 0,
        borderRadius: `${corner}px`,
        overflow: 'hidden',
        bgcolor: colors.surface,
        backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,.9), rgba(255,255,255,0) 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'primary.main',
      }}
    >
      {product.imageUrl ? (
        <Box component="img" src={product.imageUrl} alt={product.name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <BrandMark sx={{ fontSize: typeof size === 'number' ? size * 0.5 : 96, opacity: 0.85 }} />
      )}
    </Box>
  );
}

export function Badges({ product }: { product: MenuProduct }) {
  const items: ReactNode[] = [];
  if (product.prepMinutes && product.prepMinutes > 2) {
    items.push(
      <Box key="prep" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <ClockIcon sx={{ fontSize: 13 }} />
        {product.prepMinutes} min
      </Box>,
    );
  }
  if (hasOptions(product)) items.push(<span key="custom">Personalizável</span>);
  if (product.isAlcoholic) items.push(<Box component="span" key="age" sx={{ color: colors.error }}>+18</Box>);
  if (items.length === 0) return null;
  return (
    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
      {items.map((item, index) => (
        <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center', height: 22, px: 2, borderRadius: 999, bgcolor: colors.surface, fontSize: 11, fontWeight: fontWeight.extraBold, color: colors.textSecondary }}>
          {item}
        </Box>
      ))}
    </Box>
  );
}

interface AddControlProps {
  name: string;
  quantity: number;
  canOrder: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function AddControl({ name, quantity, canOrder, onAdd, onRemove }: AddControlProps) {
  if (!canOrder) return null;
  if (quantity === 0) {
    return (
      <ButtonBase
        aria-label={`Adicionar ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'primary.main', color: colors.background, boxShadow: '0 8px 16px -8px rgba(0,0,0,.5)', transition: 'transform .2s ease', '&:active': { transform: 'scale(.9)' } }}
      >
        <PlusIcon sx={{ fontSize: 20 }} />
      </ButtonBase>
    );
  }
  return (
    <Box
      role="group"
      aria-label={`Quantidade de ${name}`}
      onClick={(event) => event.stopPropagation()}
      sx={{ display: 'flex', alignItems: 'center', height: 36, borderRadius: 999, bgcolor: 'primary.main', color: colors.background, boxShadow: '0 8px 16px -8px rgba(0,0,0,.5)', animation: `${rise} .25s ease both`, ...motionSafe }}
    >
      <ButtonBase aria-label={`Tirar um ${name}`} onClick={onRemove} sx={{ width: 34, height: 36, borderRadius: '999px 0 0 999px', fontSize: 20, fontWeight: fontWeight.extraBold, color: 'inherit' }}>
        −
      </ButtonBase>
      <Typography key={quantity} aria-live="polite" sx={{ minWidth: 18, textAlign: 'center', fontWeight: fontWeight.extraBold, fontSize: fontSize.body, animation: `${pop} .3s ease`, ...motionSafe }}>
        {quantity}
      </Typography>
      <ButtonBase aria-label={`Mais um ${name}`} onClick={onAdd} sx={{ width: 34, height: 36, borderRadius: '0 999px 999px 0', color: 'inherit' }}>
        <PlusIcon sx={{ fontSize: 18 }} />
      </ButtonBase>
    </Box>
  );
}

interface ProductCardProps {
  product: MenuProduct;
  quantity: number;
  canOrder: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

export function ProductCard({ product, quantity, canOrder, onOpen, onAdd, onRemove }: ProductCardProps) {
  const from = startingPrice(product);
  return (
    <Box
      component="li"
      onClick={onOpen}
      sx={{
        position: 'relative',
        display: 'flex',
        gap: 4,
        p: 3,
        borderRadius: `${radius.card}px`,
        bgcolor: colors.background,
        border: `1px solid ${quantity > 0 ? 'transparent' : colors.border}`,
        outline: quantity > 0 ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        cursor: 'pointer',
        transition: 'transform .2s ease, box-shadow .2s ease',
        '&:hover': { boxShadow: '0 14px 28px -20px rgba(0,0,0,.35)' },
        '&:active': { transform: 'scale(.99)' },
        animation: `${rise} .35s ease both`,
        ...motionSafe,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography component="h3" sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold, lineHeight: 1.25 }}>
          {product.name}
        </Typography>
        {product.description && (
          <Typography sx={{ mt: 1, fontSize: fontSize.small, color: colors.textSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.description}
          </Typography>
        )}
        <Badges product={product} />
        <Typography sx={{ mt: 'auto', pt: 2, fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
          {from !== product.priceCents && (
            <Box component="span" sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: colors.textMuted, mr: 1 }}>
              a partir de
            </Box>
          )}
          {formatCents(from)}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', alignSelf: 'flex-start' }}>
        <ProductImage product={product} size={104} />
        <Box sx={{ position: 'absolute', right: -6, bottom: -6 }}>
          <AddControl name={product.name} quantity={quantity} canOrder={canOrder} onAdd={onAdd} onRemove={onRemove} />
        </Box>
      </Box>
    </Box>
  );
}

interface HighlightCardProps {
  product: MenuProduct;
  quantity: number;
  canOrder: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

export function HighlightCard({ product, quantity, canOrder, onOpen, onAdd, onRemove }: HighlightCardProps) {
  return (
    <Box
      onClick={onOpen}
      sx={{ flexShrink: 0, width: 156, scrollSnapAlign: 'start', cursor: 'pointer', transition: 'transform .2s ease', '&:active': { transform: 'scale(.98)' } }}
    >
      <Box sx={{ position: 'relative' }}>
        <ProductImage product={product} size={156} radius={20} />
        <Box sx={{ position: 'absolute', right: 8, bottom: 8 }}>
          <AddControl name={product.name} quantity={quantity} canOrder={canOrder} onAdd={onAdd} onRemove={onRemove} />
        </Box>
      </Box>
      <Typography noWrap sx={{ mt: 2, fontSize: fontSize.body, fontWeight: fontWeight.extraBold }}>
        {product.name}
      </Typography>
      <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.bold, color: colors.textSecondary }}>{formatCents(startingPrice(product))}</Typography>
    </Box>
  );
}

interface SectionProps {
  category: MenuCategory;
  children: ReactNode;
}

export const MenuSection = forwardRef<HTMLElement, SectionProps>(function MenuSection({ category, children }, ref) {
  return (
    <Box component="section" ref={ref} id={`categoria-${category.id}`} data-category={category.id} sx={{ scrollMarginTop: 120, pt: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 3 }}>
        <Typography component="h2" sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold, letterSpacing: '-0.01em' }}>
          {category.name}
        </Typography>
        <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: colors.textMuted }}>
          {category.products.length} {category.products.length === 1 ? 'item' : 'itens'}
        </Typography>
      </Box>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </Box>
    </Box>
  );
});

interface CartBarProps {
  count: number;
  totalCents: number;
  bump: number;
  onOpen: () => void;
}

export function CartBar({ count, totalCents, bump, onOpen }: CartBarProps) {
  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        width: '100%',
        height: 60,
        px: 3,
        gap: 3,
        justifyContent: 'space-between',
        borderRadius: 999,
        bgcolor: colors.text,
        color: colors.background,
        boxShadow: '0 18px 30px -14px rgba(0,0,0,.6)',
        animation: `${rise} .3s ease both`,
        ...motionSafe,
      }}
    >
      <Box key={bump} sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: fontWeight.extraBold, fontSize: fontSize.body, animation: bump ? `${pop} .35s ease` : 'none', ...motionSafe }}>
        {count}
      </Box>
      <Typography sx={{ flex: 1, textAlign: 'left', fontWeight: fontWeight.extraBold, fontSize: fontSize.button }}>Ver meu pedido</Typography>
      <Typography sx={{ pr: 3, fontWeight: fontWeight.extraBold, fontSize: fontSize.button }}>{formatCents(totalCents)}</Typography>
    </ButtonBase>
  );
}
