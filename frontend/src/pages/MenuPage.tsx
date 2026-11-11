import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, ButtonBase, Drawer, Skeleton, Snackbar, TextField, Typography } from '@mui/material';
import ActionButton from '../components/client/ActionButton';
import ProductOptionsScreen from '../components/client/ProductOptionsScreen';
import { optionsText, QuantityStepper } from '../components/client/CartParts';
import { CloseIcon } from '../components/client/icons';
import {
  Badges,
  CartBar,
  CategoryChips,
  HighlightCard,
  MenuHero,
  MenuSearch,
  MenuSection,
  ProductCard,
  ProductImage,
  hasOptions,
  normalize,
  startingPrice,
} from '../components/client/MenuParts';
import StatusMessage from '../components/StatusMessage';
import { useCart } from '../hooks/useCart';
import { useStoreColor } from '../hooks/useStoreColor';
import { ApiError } from '../services/api';
import { MAX_LINE_QUANTITY, MAX_NOTE_LENGTH, addLine, cartCount, cartTotal, lineTotal, setQuantity } from '../services/cart';
import type { CartLine, CartOption } from '../services/cart';
import { formatCents } from '../services/format';
import { fetchMenu } from '../services/menu';
import type { Menu, MenuProduct } from '../services/menu';
import { readVisit } from '../services/visit';
import { tokens } from '../theme/theme';

type MenuState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; menu: Menu };

interface Toast {
  id: number;
  message: string;
  previous: CartLine[];
}

const { colors, fontSize, fontWeight, touchTarget } = tokens;

export default function MenuPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const visit = readVisit(slug);
  const canOrder = Boolean(visit.sessionId && visit.guestToken);
  const [state, setState] = useState<MenuState>({ status: 'loading' });
  const [cart, setCart] = useCart(slug);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState<MenuProduct | null>(null);
  const [choosing, setChoosing] = useState<MenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bump, setBump] = useState(0);
  const sections = useRef<Map<string, HTMLElement>>(new Map());
  const scrollingTo = useRef<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchMenu(slug)
      .then((menu) => {
        if (cancelled) return;
        setState({ status: 'ready', menu });
        setActive(menu.categories.find((category) => category.products.length > 0)?.id ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', notFound: error instanceof ApiError && error.status === 404 });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => load(), [load]);

  const menu = state.status === 'ready' ? state.menu : null;
  useStoreColor(menu?.store.primaryColor ?? null);

  const categories = useMemo(() => {
    if (!menu) return [];
    const term = normalize(query.trim());
    return menu.categories
      .map((category) => ({
        ...category,
        products: term
          ? category.products.filter((product) => normalize(`${product.name} ${product.description ?? ''}`).includes(term))
          : category.products,
      }))
      .filter((category) => category.products.length > 0);
  }, [menu, query]);

  const highlights = useMemo(() => {
    if (!menu || query) return [];
    return menu.categories.flatMap((category) => category.products).filter((product) => product.imageUrl).slice(0, 6);
  }, [menu, query]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || categories.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingTo.current) return;
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.getAttribute('data-category');
        if (id) setActive(id);
      },
      { rootMargin: '-130px 0px -60% 0px' },
    );
    sections.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    if (active) document.getElementById(`chip-${active}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  function goToCategory(id: string) {
    setActive(id);
    scrollingTo.current = id;
    sections.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      scrollingTo.current = null;
    }, 700);
  }

  const quantities = useMemo(() => {
    const result: Record<string, number> = {};
    cart.forEach((line) => {
      result[line.productId] = (result[line.productId] ?? 0) + line.quantity;
    });
    return result;
  }, [cart]);

  const count = cartCount(cart);
  const total = cartTotal(cart);

  function notify(message: string, previous: CartLine[]) {
    setToast({ id: Date.now(), message, previous });
    setBump((value) => value + 1);
  }

  function quickAdd(product: MenuProduct) {
    if (!canOrder) {
      setDetail(product);
      return;
    }
    if (hasOptions(product)) {
      setChoosing(product);
      return;
    }
    const previous = cart;
    setCart((current) => addLine(current, product));
    notify(`${product.name} no pedido`, previous);
  }

  function quickRemove(product: MenuProduct) {
    const lines = cart.filter((line) => line.productId === product.id);
    const last = lines[lines.length - 1];
    if (!last) return;
    const previous = cart;
    setCart((current) => setQuantity(current, last.key, last.quantity - 1));
    if (last.quantity === 1 && lines.length === 1) notify(`${product.name} saiu do pedido`, previous);
  }

  function addFromSheet(product: MenuProduct, quantity: number, note: string) {
    const previous = cart;
    setCart((current) => addLine(current, product, [], quantity, note));
    setDetail(null);
    notify(`${quantity}× ${product.name} no pedido`, previous);
  }

  function addWithOptions(options: CartOption[], quantity: number, note: string) {
    if (!choosing) return;
    const product = choosing;
    const previous = cart;
    setCart((current) => addLine(current, product, options, quantity, note));
    setChoosing(null);
    notify(`${quantity}× ${product.name} no pedido`, previous);
  }

  function clearCart() {
    const previous = cart;
    setCart([]);
    setCartOpen(false);
    notify('Pedido esvaziado', previous);
  }

  function undo() {
    if (!toast) return;
    setCart(toast.previous);
    setToast(null);
  }

  if (choosing) {
    return <ProductOptionsScreen product={choosing} onAdd={addWithOptions} onBack={() => setChoosing(null)} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.panel }}>
      <Box component="main" sx={{ position: 'relative', maxWidth: 480, minHeight: '100vh', mx: 'auto', bgcolor: colors.panel, pb: 28 }}>
        {state.status === 'loading' && <MenuSkeleton />}

        {state.status === 'error' && (
          <StatusMessage
            tone="error"
            title={state.notFound ? 'Loja não encontrada' : 'Não foi possível carregar o cardápio'}
            description={state.notFound ? 'Confira o endereço ou leia o QR code da mesa de novo.' : 'Verifique sua conexão e tente novamente.'}
            action={
              !state.notFound && (
                <Button variant="contained" onClick={load} sx={{ minHeight: touchTarget, px: 6 }}>
                  Tentar de novo
                </Button>
              )
            }
          />
        )}

        {menu && (
          <>
            <MenuHero
              name={menu.store.name}
              tagline={menu.store.tagline}
              logoUrl={menu.store.logoUrl}
              color={menu.store.primaryColor}
              tableNumber={visit.table?.number}
              counter={visit.counter}
              onBack={canOrder ? () => navigate(`/t/${slug}/comandas/minha`) : undefined}
            />

            <Box sx={{ position: 'sticky', top: 0, zIndex: 3, px: 4, pt: 3, bgcolor: 'rgba(250,250,250,.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${colors.divider}` }}>
              <MenuSearch value={query} onChange={setQuery} />
              {categories.length > 0 && <CategoryChips categories={categories} active={active} onSelect={goToCategory} />}
            </Box>

            {highlights.length > 0 && (
              <Box sx={{ pt: 6 }}>
                <Typography component="h2" sx={{ px: 4, fontSize: fontSize.title, fontWeight: fontWeight.extraBold, letterSpacing: '-0.01em' }}>
                  Destaques da casa
                </Typography>
                <Box sx={{ mt: 3, px: 4, display: 'flex', gap: 3, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                  {highlights.map((product) => (
                    <HighlightCard
                      key={product.id}
                      product={product}
                      quantity={quantities[product.id] ?? 0}
                      canOrder={canOrder}
                      onOpen={() => setDetail(product)}
                      onAdd={() => quickAdd(product)}
                      onRemove={() => quickRemove(product)}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ px: 4 }}>
              {categories.map((category) => (
                <MenuSection
                  key={category.id}
                  category={category}
                  ref={(node: HTMLElement | null) => {
                    if (node) sections.current.set(category.id, node);
                    else sections.current.delete(category.id);
                  }}
                >
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={quantities[product.id] ?? 0}
                      canOrder={canOrder}
                      onOpen={() => setDetail(product)}
                      onAdd={() => quickAdd(product)}
                      onRemove={() => quickRemove(product)}
                    />
                  ))}
                </MenuSection>
              ))}

              {categories.length === 0 && (
                <StatusMessage
                  title={query ? `Nada com "${query}"` : 'Cardápio vazio'}
                  description={query ? 'Tente outro nome ou veja o cardápio completo.' : 'Esta casa ainda não publicou nenhum item. Volte em instantes.'}
                  action={
                    query && (
                      <Button variant="outlined" onClick={() => setQuery('')} sx={{ minHeight: touchTarget, px: 6 }}>
                        Ver tudo
                      </Button>
                    )
                  }
                />
              )}
            </Box>
          </>
        )}

        <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 4, pointerEvents: 'none' }}>
          <Box sx={{ maxWidth: 480, mx: 'auto', px: 4, pb: 4, pt: 6, background: `linear-gradient(180deg, rgba(250,250,250,0), ${colors.panel} 45%)`, pointerEvents: 'auto' }}>
            {canOrder && count > 0 ? (
              <CartBar count={count} totalCents={total} bump={bump} onOpen={() => setCartOpen(true)} />
            ) : canOrder ? (
              <ActionButton tone="secondary" onClick={() => navigate(`/t/${slug}/comandas/minha`)}>
                Voltar para minha comanda
              </ActionButton>
            ) : (
              <ActionButton onClick={() => navigate(`/t/${slug}/entrada`)}>Pedir pelo celular</ActionButton>
            )}
          </Box>
        </Box>
      </Box>

      <ProductSheet
        product={detail}
        canOrder={canOrder}
        inCart={detail ? quantities[detail.id] ?? 0 : 0}
        onClose={() => setDetail(null)}
        onAdd={addFromSheet}
        onChoose={(product) => {
          setDetail(null);
          setChoosing(product);
        }}
        onEnter={() => navigate(`/t/${slug}/entrada`)}
      />

      <CartSheet
        open={cartOpen}
        lines={cart}
        onClose={() => setCartOpen(false)}
        onQuantity={(key, quantity) => {
          const previous = cart;
          const line = cart.find((item) => item.key === key);
          setCart((current) => setQuantity(current, key, quantity));
          if (line && quantity === 0) notify(`${line.name} saiu do pedido`, previous);
        }}
        onClear={clearCart}
        onCheckout={() => navigate(`/t/${slug}/carrinho`)}
      />

      <Snackbar
        key={toast?.id}
        open={Boolean(toast) && !detail && !cartOpen}
        autoHideDuration={3500}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setToast(null);
        }}
        message={toast?.message}
        action={
          <Button size="small" onClick={undo} sx={{ color: '#FFD3B8', fontWeight: fontWeight.extraBold }}>
            Desfazer
          </Button>
        }
        sx={{ bottom: { xs: 96, sm: 100 } }}
        ContentProps={{ sx: { borderRadius: 999, bgcolor: colors.text, fontWeight: fontWeight.bold, px: 4 } }}
      />
    </Box>
  );
}

interface ProductSheetProps {
  product: MenuProduct | null;
  canOrder: boolean;
  inCart: number;
  onClose: () => void;
  onAdd: (product: MenuProduct, quantity: number, note: string) => void;
  onChoose: (product: MenuProduct) => void;
  onEnter: () => void;
}

function ProductSheet({ product, canOrder, inCart, onClose, onAdd, onChoose, onEnter }: ProductSheetProps) {
  const [quantity, setQuantityValue] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    setQuantityValue(1);
    setNote('');
  }, [product?.id]);

  return (
    <Drawer
      anchor="bottom"
      open={Boolean(product)}
      onClose={onClose}
      PaperProps={{ sx: { maxWidth: 480, mx: 'auto', borderRadius: '28px 28px 0 0', maxHeight: '92vh' } }}
    >
      {product && (
        <Box sx={{ pb: 5 }}>
          <Box sx={{ position: 'relative' }}>
            <ProductImage product={product} size="100%" height={250} radius={0} />
            <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 44, height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.8)' }} />
            <ButtonBase aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.92)', color: colors.text }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </ButtonBase>
          </Box>
          <Box sx={{ px: 5, pt: 5 }}>
            <Typography component="h2" sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {product.name}
            </Typography>
            {product.description && (
              <Typography sx={{ mt: 2, fontSize: fontSize.body, lineHeight: 1.6, color: colors.textSecondary }}>{product.description}</Typography>
            )}
            <Badges product={product} />
            <Typography sx={{ mt: 4, fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>{formatCents(startingPrice(product))}</Typography>
            {inCart > 0 && (
              <Typography sx={{ mt: 1, fontSize: fontSize.small, fontWeight: fontWeight.bold, color: 'primary.main' }}>
                Você já tem {inCart} no pedido
              </Typography>
            )}

            {!canOrder ? (
              <ActionButton sx={{ mt: 6 }} onClick={onEnter}>
                Entrar na mesa para pedir
              </ActionButton>
            ) : hasOptions(product) ? (
              <ActionButton sx={{ mt: 6 }} onClick={() => onChoose(product)}>
                Escolher opções
              </ActionButton>
            ) : (
              <>
                <TextField
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE_LENGTH))}
                  placeholder="Alguma observação? Ex.: sem cebola"
                  multiline
                  minRows={2}
                  fullWidth
                  helperText={`${note.length}/${MAX_NOTE_LENGTH}`}
                  sx={{ mt: 5 }}
                />
                <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <QuantityStepper value={quantity} min={1} max={MAX_LINE_QUANTITY} label="Quantidade" onChange={setQuantityValue} />
                  <ActionButton onClick={() => onAdd(product, quantity, note)} sx={{ justifyContent: 'space-between', px: 5 }}>
                    <span>Adicionar</span>
                    <span>{formatCents(product.priceCents * quantity)}</span>
                  </ActionButton>
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

interface CartSheetProps {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  onQuantity: (key: string, quantity: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}

function CartSheet({ open, lines, onClose, onQuantity, onClear, onCheckout }: CartSheetProps) {
  useEffect(() => {
    if (open && lines.length === 0) onClose();
  }, [open, lines.length, onClose]);

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { maxWidth: 480, mx: 'auto', borderRadius: '28px 28px 0 0', maxHeight: '85vh' } }}>
      <Box sx={{ px: 5, pt: 3, pb: 5 }}>
        <Box sx={{ mx: 'auto', width: 44, height: 5, borderRadius: 3, bgcolor: colors.border }} />
        <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component="h2" sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
            Seu pedido
          </Typography>
          <Button onClick={onClear} sx={{ color: colors.error, fontWeight: fontWeight.bold }}>
            Esvaziar
          </Button>
        </Box>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, mt: 2 }}>
          {lines.map((line) => (
            <Box component="li" key={line.key} sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 3, borderBottom: `1px solid ${colors.divider}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: fontWeight.extraBold, fontSize: fontSize.body }}>{line.name}</Typography>
                {line.options.length > 0 && <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>{optionsText(line.options)}</Typography>}
                {line.note && <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted, fontStyle: 'italic' }}>“{line.note}”</Typography>}
                <Typography sx={{ mt: 1, fontSize: fontSize.small, fontWeight: fontWeight.bold }}>{formatCents(lineTotal(line))}</Typography>
              </Box>
              <QuantityStepper value={line.quantity} max={MAX_LINE_QUANTITY} label={`Quantidade de ${line.name}`} onChange={(value) => onQuantity(line.key, value)} />
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography sx={{ color: colors.textSecondary, fontWeight: fontWeight.bold }}>Subtotal</Typography>
          <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>{formatCents(cartTotal(lines))}</Typography>
        </Box>
        <ActionButton sx={{ mt: 4 }} onClick={onCheckout}>
          Revisar e enviar para a cozinha
        </ActionButton>
        <ActionButton tone="quiet" sx={{ mt: 1 }} onClick={onClose}>
          Continuar escolhendo
        </ActionButton>
      </Box>
    </Drawer>
  );
}

function MenuSkeleton() {
  return (
    <Box aria-busy="true" aria-label="Carregando cardápio">
      <Skeleton variant="rectangular" height={190} />
      <Box sx={{ px: 4, pt: 4 }}>
        <Skeleton variant="rounded" height={44} sx={{ borderRadius: 999 }} />
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          {[80, 96, 72, 104].map((width) => (
            <Skeleton key={width} variant="rounded" width={width} height={36} sx={{ borderRadius: 999 }} />
          ))}
        </Box>
        {[0, 1, 2, 3].map((item) => (
          <Box key={item} sx={{ mt: 3, display: 'flex', gap: 4, p: 3, borderRadius: 4, bgcolor: colors.background }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="rounded" width="60%" height={20} />
              <Skeleton variant="rounded" width="90%" height={14} sx={{ mt: 2 }} />
              <Skeleton variant="rounded" width={72} height={18} sx={{ mt: 4 }} />
            </Box>
            <Skeleton variant="rounded" width={104} height={104} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
