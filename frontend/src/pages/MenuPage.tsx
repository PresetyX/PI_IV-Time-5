import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import StatusMessage from '../components/StatusMessage';
import { ApiError } from '../services/api';
import { formatCents } from '../services/format';
import { fetchMenu } from '../services/menu';
import type { Menu, MenuProduct } from '../services/menu';
import { useTenantTheme } from '../theme/AppThemeProvider';
import { DEFAULT_PRIMARY_COLOR, tokens } from '../theme/theme';

type MenuState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; menu: Menu };

const { colors, touchTarget } = tokens;

export default function MenuPage() {
  const { slug = '' } = useParams();
  const { changePrimaryColor } = useTenantTheme();
  const [state, setState] = useState<MenuState>({ status: 'loading' });
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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
  useEffect(() => {
    if (!storeColor) return undefined;
    changePrimaryColor(storeColor);
    return () => changePrimaryColor(DEFAULT_PRIMARY_COLOR);
  }, [storeColor, changePrimaryColor]);

  function addProduct(product: MenuProduct) {
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
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
