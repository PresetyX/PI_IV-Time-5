import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ActionButton from '../components/client/ActionButton';
import { placeOrder } from '../services/tabs';
import { readVisit } from '../services/visit';
import { Box, Button, CircularProgress, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import StatusMessage from '../components/StatusMessage';
import { ApiError } from '../services/api';
import { formatCents } from '../services/format';
import { fetchMenu } from '../services/menu';
import type { Menu, MenuProduct } from '../services/menu';
import { useStoreColor } from '../hooks/useStoreColor';
import { tokens } from '../theme/theme';

type MenuState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; menu: Menu };

const { colors, touchTarget } = tokens;

export default function MenuPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const visit = readVisit(slug);
  const hasTab = Boolean(visit.sessionId && visit.guestToken);
  const [state, setState] = useState<MenuState>({ status: 'loading' });
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchMenu(slug)
      .then((menu) => {
        if (cancelled) return;
        setSelectedCategory(0);
        setState({ status: 'ready', menu });
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

  const storeColor = state.status === 'ready' ? state.menu.store.primaryColor : null;
  useStoreColor(storeColor);

  function addProduct(product: MenuProduct) {
    setSendError(null);
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
  }

  const products =
    state.status === 'ready' ? state.menu.categories.flatMap((category) => category.products) : [];
  const cartItems = products.filter((product) => (quantities[product.id] ?? 0) > 0);
  const cartCount = cartItems.reduce((sum, product) => sum + quantities[product.id], 0);
  const cartTotal = cartItems.reduce((sum, product) => sum + product.priceCents * quantities[product.id], 0);

  async function sendOrder() {
    if (sending || cartItems.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      await placeOrder(
        slug,
        cartItems.map((product) => ({ productId: product.id, quantity: quantities[product.id] })),
      );
      setQuantities({});
      navigate(`/t/${slug}/conta`);
    } catch (caught) {
      setSendError(
        caught instanceof ApiError && caught.status === 409
          ? 'Algum item acabou ou a casa parou de aceitar pedidos. Confira e tente de novo.'
          : 'Não foi possível enviar o pedido agora. Tente de novo.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.panel }}>
      <Box
        component="main"
        sx={{ maxWidth: 390, minHeight: '100vh', mx: 'auto', bgcolor: colors.background }}
      >
        {state.status === 'loading' && <MenuSkeleton />}

        {state.status === 'error' && (
          <StatusMessage
            tone="error"
            title={state.notFound ? 'Loja não encontrada' : 'Não foi possível carregar o cardápio'}
            description={
              state.notFound
                ? 'Confira o endereço ou leia o QR code da mesa de novo.'
                : 'Verifique sua conexão e tente novamente.'
            }
            action={
              !state.notFound && (
                <Button variant="contained" onClick={load} sx={{ minHeight: touchTarget, px: 6 }}>
                  Tentar de novo
                </Button>
              )
            }
          />
        )}

        {state.status === 'ready' && (
          <MenuContent
            menu={state.menu}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            quantities={quantities}
            onAdd={addProduct}
          />
        )}

        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            px: 5,
            py: 4,
            bgcolor: colors.background,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          {sendError && (
            <Typography role="alert" sx={{ mb: 2, fontSize: 13, color: colors.error }}>
              {sendError}
            </Typography>
          )}
          {hasTab && cartCount > 0 ? (
            <>
              <ActionButton onClick={sendOrder} disabled={sending}>
                {sending ? (
                  <CircularProgress size={22} sx={{ color: 'inherit' }} />
                ) : (
                  `Enviar para a cozinha · ${cartCount} ${cartCount === 1 ? 'item' : 'itens'} · ${formatCents(cartTotal)}`
                )}
              </ActionButton>
              <ActionButton tone="quiet" sx={{ mt: 2 }} disabled={sending} onClick={() => setQuantities({})}>
                Limpar carrinho
              </ActionButton>
            </>
          ) : hasTab ? (
            <ActionButton onClick={() => navigate(`/t/${slug}/comandas/minha`)}>Voltar para minha comanda</ActionButton>
          ) : (
            <ActionButton onClick={() => navigate(`/t/${slug}/entrada`)}>Pedir pelo celular</ActionButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}

interface MenuContentProps {
  menu: Menu;
  selectedCategory: number;
  onSelectCategory: (index: number) => void;
  quantities: Record<string, number>;
  onAdd: (product: MenuProduct) => void;
}

function MenuContent({ menu, selectedCategory, onSelectCategory, quantities, onAdd }: MenuContentProps) {
  const hasProducts = menu.categories.some((category) => category.products.length > 0);
  const category = menu.categories[selectedCategory];

  return (
    <>
      <Box component="header" sx={{ px: 5, pt: 8, pb: 4 }}>
        <Typography variant="h2" component="h1" sx={{ color: 'primary.main' }}>
          {menu.store.name}
        </Typography>
        {menu.store.tagline && (
          <Typography variant="body2" sx={{ mt: 1, color: colors.textMuted }}>
            {menu.store.tagline}
          </Typography>
        )}
      </Box>

      {!hasProducts ? (
        <StatusMessage
          title="Cardápio vazio"
          description="Esta casa ainda não publicou nenhum item. Volte em instantes."
        />
      ) : (
        <>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: colors.background,
              borderBottom: `1px solid ${colors.divider}`,
            }}
          >
            <Tabs
              value={selectedCategory}
              onChange={(_, index: number) => onSelectCategory(index)}
              variant="scrollable"
              scrollButtons={false}
              aria-label="Categorias do cardápio"
              sx={{ minHeight: touchTarget, px: 2 }}
            >
              {menu.categories.map((item) => (
                <Tab key={item.id} label={item.name} />
              ))}
            </Tabs>
          </Box>

          <Box component="ul" sx={{ listStyle: 'none', m: 0, px: 5, py: 0 }}>
            {category.products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                quantity={quantities[product.id] ?? 0}
                onAdd={() => onAdd(product)}
              />
            ))}
          </Box>

          {category.products.length === 0 && (
            <StatusMessage title="Nenhum item aqui" description="Veja as outras categorias." />
          )}
        </>
      )}
    </>
  );
}

interface ProductRowProps {
  product: MenuProduct;
  quantity: number;
  onAdd: () => void;
}

function ProductRow({ product, quantity, onAdd }: ProductRowProps) {
  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        py: 4,
        borderBottom: `1px solid ${colors.divider}`,
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5" component="h2">
          {product.name}
        </Typography>
        {product.description && (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: colors.textSecondary,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </Typography>
        )}
        <Typography variant="h6" component="p" sx={{ mt: 2 }}>
          {formatCents(product.priceCents)}
        </Typography>
      </Box>
      <Button
        variant="contained"
        onClick={onAdd}
        aria-label={`Adicionar ${product.name}`}
        sx={{ minWidth: touchTarget, minHeight: touchTarget, px: 4, flexShrink: 0 }}
      >
        {quantity > 0 ? `Adicionar (${quantity})` : 'Adicionar'}
      </Button>
    </Box>
  );
}

function MenuSkeleton() {
  return (
    <Box aria-busy="true" aria-label="Carregando cardápio" sx={{ px: 5, pt: 8 }}>
      <Skeleton variant="rounded" width={200} height={32} />
      <Skeleton variant="rounded" width={260} height={16} sx={{ mt: 2 }} />
      <Skeleton variant="rounded" height={44} sx={{ mt: 6 }} />
      {[0, 1, 2, 3].map((item) => (
        <Box key={item} sx={{ display: 'flex', gap: 4, py: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rounded" width="60%" height={20} />
            <Skeleton variant="rounded" width="90%" height={16} sx={{ mt: 2 }} />
            <Skeleton variant="rounded" width={72} height={16} sx={{ mt: 2 }} />
          </Box>
          <Skeleton variant="rounded" width={104} height={touchTarget} />
        </Box>
      ))}
    </Box>
  );
}
