import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ManagementLayout, { Card, LoadState, Segmented } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { ApiError } from '../../services/api';
import { currentRole } from '../../services/auth';
import { fetchCatalog, setProductAvailability, updateProduct } from '../../services/catalog';
import type { Catalog, CatalogCategory, CatalogProduct, ProductChanges } from '../../services/catalog';
import { formatCents } from '../../services/format';
import { centsToInput, parseCents } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

type Filter = 'ALL' | 'UNAVAILABLE';

const DESCRIPTION_LIMIT = 140;

export default function ProductsPage() {
  const { data: catalog, setData, error, reload } = useLoader(fetchCatalog);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = currentRole() !== 'KITCHEN';

  const products = useMemo(() => catalog?.categories.flatMap((category) => category.products) ?? [], [catalog]);
  const unavailable = products.filter((product) => !product.available).length;

  const visibleCategories = useMemo(() => {
    if (!catalog) return [];
    const term = normalize(search);
    return catalog.categories
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) =>
            (filter === 'ALL' || !product.available) && (!term || normalize(product.name).includes(term)),
        ),
      }))
      .filter((category) => category.products.length > 0 || (filter === 'ALL' && !term));
  }, [catalog, filter, search]);

  function replaceProduct(updated: CatalogProduct) {
    setData((current) => (current ? withProduct(current, updated) : current));
  }

  async function toggle(product: CatalogProduct) {
    const next = !product.available;
    setPending((current) => new Set(current).add(product.id));
    replaceProduct({ ...product, available: next, unavailableSince: next ? null : new Date().toISOString() });
    try {
      replaceProduct(await setProductAvailability(product.id, next));
    } catch (caught) {
      replaceProduct(product);
      setMessage(
        caught instanceof ApiError && caught.status === 403
          ? 'Seu perfil não pode mudar a disponibilidade.'
          : `Não foi possível ${next ? 'liberar' : 'marcar como esgotado'} "${product.name}" agora.`,
      );
    } finally {
      setPending((current) => {
        const copy = new Set(current);
        copy.delete(product.id);
        return copy;
      });
    }
  }

  return (
    <ManagementLayout
      title="Cardápio"
      subtitle={
        catalog
          ? `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}${unavailable ? ` · ${unavailable} ${unavailable === 1 ? 'esgotado' : 'esgotados'}` : ''}`
          : undefined
      }
    >
      {message && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {!catalog ? (
        <LoadState error={error} onRetry={reload} />
      ) : (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, mb: 6 }}>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'UNAVAILABLE', label: `Esgotados${unavailable ? ` (${unavailable})` : ''}` },
              ]}
            />
            <TextField
              placeholder="Buscar produto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 220, maxWidth: 360, bgcolor: colors.background }}
            />
          </Box>

          {visibleCategories.length === 0 ? (
            <Card>
              <Typography sx={{ color: colors.textSecondary }}>
                {filter === 'UNAVAILABLE' && !search.trim()
                  ? 'Nenhum produto esgotado agora.'
                  : 'Nenhum produto encontrado.'}
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleCategories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  canEdit={canEdit}
                  pending={pending}
                  onToggle={toggle}
                  onEdit={setEditing}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {catalog && (
        <EditProductPanel
          product={editing}
          categories={catalog.categories}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            if (saved.categoryId !== editing?.categoryId) {
              reload();
            } else {
              replaceProduct(saved);
            }
          }}
        />
      )}
    </ManagementLayout>
  );
}

function CategorySection({
  category,
  canEdit,
  pending,
  onToggle,
  onEdit,
}: {
  category: CatalogCategory;
  canEdit: boolean;
  pending: Set<string>;
  onToggle: (product: CatalogProduct) => void;
  onEdit: (product: CatalogProduct) => void;
}) {
  return (
    <Card>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
        <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>{category.name}</Typography>
        {!category.visible && <Tag label="Oculta no cardápio" />}
        <Typography sx={{ ml: 'auto', fontSize: fontSize.small, color: colors.textMuted }}>
          {category.products.length} {category.products.length === 1 ? 'item' : 'itens'}
        </Typography>
      </Box>
      {category.products.length === 0 ? (
        <Typography sx={{ py: 3, color: colors.textMuted }}>Nenhum produto nesta categoria.</Typography>
      ) : (
        category.products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            canEdit={canEdit}
            busy={pending.has(product.id)}
            onToggle={() => onToggle(product)}
            onEdit={() => onEdit(product)}
          />
        ))
      )}
    </Card>
  );
}

function ProductRow({
  product,
  canEdit,
  busy,
  onToggle,
  onEdit,
}: {
  product: CatalogProduct;
  canEdit: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        alignItems: 'center',
        gap: 4,
        py: 4,
        borderTop: `1px solid ${colors.divider}`,
      }}
    >
      <Box sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: 0, opacity: product.available ? 1 : 0.55 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontWeight: fontWeight.bold }}>{product.name}</Typography>
          {product.isAlcoholic && <Tag label="+18" />}
          {!product.available && <Tag label={describeUnavailable(product.unavailableSince)} strong />}
        </Box>
        {product.description && (
          <Typography noWrap sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
            {product.description}
          </Typography>
        )}
      </Box>
      <Typography sx={{ mr: { xs: 'auto', sm: 0 }, fontWeight: fontWeight.extraBold, whiteSpace: 'nowrap' }}>
        {formatCents(product.priceCents)}
      </Typography>
      <FormControlLabel
        control={<Switch checked={product.available} disabled={busy} onChange={onToggle} />}
        label={product.available ? 'Disponível' : 'Esgotado'}
        sx={{ m: 0, minWidth: { sm: 150 }, '& .MuiFormControlLabel-label': { fontSize: fontSize.body } }}
      />
      {canEdit && (
        <Button variant="outlined" onClick={onEdit} sx={{ minHeight: 44 }}>
          Editar
        </Button>
      )}
    </Box>
  );
}

function Tag({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        px: 2.5,
        py: 0.5,
        borderRadius: 999,
        bgcolor: strong ? colors.text : colors.surface,
        color: strong ? colors.background : colors.textSecondary,
        fontSize: fontSize.caption,
        fontWeight: fontWeight.extraBold,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

interface ProductForm {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  prepMinutes: string;
  imageUrl: string;
  isAlcoholic: boolean;
  available: boolean;
}

function EditProductPanel({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: CatalogProduct | null;
  categories: CatalogCategory[];
  onClose: () => void;
  onSaved: (product: CatalogProduct) => void;
}) {
  const [form, setForm] = useState<ProductForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setFailure(null);
    setForm(
      product && {
        categoryId: product.categoryId,
        name: product.name,
        description: product.description ?? '',
        price: centsToInput(product.priceCents),
        prepMinutes: product.prepMinutes == null ? '' : String(product.prepMinutes),
        imageUrl: product.imageUrl ?? '',
        isAlcoholic: !!product.isAlcoholic,
        available: product.available,
      },
    );
  }, [product]);

  const priceCents = form ? parseCents(form.price) : 0;
  const prepMinutes = form && form.prepMinutes.trim() ? Number(form.prepMinutes) : null;
  const prepInvalid = prepMinutes !== null && (!Number.isInteger(prepMinutes) || prepMinutes < 0 || prepMinutes > 240);
  const valid = !!form && !!form.name.trim() && priceCents >= 1 && !prepInvalid;

  async function save() {
    if (!product || !form || !valid) return;
    setBusy(true);
    setFailure(null);
    const changes: ProductChanges = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceCents,
      imageUrl: form.imageUrl.trim() || null,
      prepMinutes,
      isAlcoholic: form.isAlcoholic,
      available: form.available,
    };
    try {
      onSaved(await updateProduct(product.id, changes));
    } catch (caught) {
      setFailure(
        caught instanceof ApiError && caught.status === 403
          ? 'Só o dono e o gerente podem editar produtos.'
          : caught instanceof ApiError && caught.status === 404
            ? 'Esse produto não existe mais. Atualize a página.'
            : caught instanceof ApiError && caught.status === 400
              ? 'Confira os campos do produto.'
              : 'Não foi possível salvar agora.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer anchor="right" open={!!product} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
      {product && form && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 6, borderBottom: `1px solid ${colors.border}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>Editar produto</Typography>
              <Typography noWrap sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                {product.name}
              </Typography>
            </Box>
            <IconButton aria-label="Fechar" onClick={onClose} sx={{ width: 44, height: 44 }}>
              ×
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {failure && <Alert severity="error">{failure}</Alert>}
            <TextField
              label="Nome"
              value={form.name}
              inputProps={{ maxLength: 80 }}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              label="Descrição"
              value={form.description}
              multiline
              minRows={2}
              inputProps={{ maxLength: DESCRIPTION_LIMIT }}
              helperText={`${form.description.length}/${DESCRIPTION_LIMIT}`}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <TextField
                label="Preço"
                value={form.price}
                inputMode="decimal"
                error={priceCents < 1}
                helperText={priceCents < 1 ? 'Informe um preço maior que zero.' : ' '}
                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
              <TextField
                label="Preparo"
                value={form.prepMinutes}
                inputMode="numeric"
                error={prepInvalid}
                helperText={prepInvalid ? 'De 0 a 240 minutos.' : ' '}
                InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                onChange={(event) => setForm({ ...form, prepMinutes: event.target.value.replace(/\D/g, '') })}
              />
            </Box>
            <TextField
              select
              label="Categoria"
              value={form.categoryId}
              helperText={
                form.categoryId !== product.categoryId ? 'O produto vai para o fim da nova categoria.' : ' '
              }
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                  {!category.visible ? ' (oculta)' : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Link da foto"
              placeholder="https://..."
              value={form.imageUrl}
              inputProps={{ maxLength: 500 }}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
            />
            <PanelSwitch
              title="Disponível"
              hint="Esgotado, o produto some do cardápio do cliente."
              checked={form.available}
              onChange={() => setForm({ ...form, available: !form.available })}
            />
            <PanelSwitch
              title="Bebida alcoólica"
              hint="Pede confirmação de maioridade antes de enviar o pedido."
              checked={form.isAlcoholic}
              onChange={() => setForm({ ...form, isAlcoholic: !form.isAlcoholic })}
            />
            <Box sx={{ p: 4, bgcolor: colors.surface, borderRadius: `${radius.button}px` }}>
              <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
                Mudar o preço não altera pedidos já enviados: eles guardam o preço do momento do envio.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, p: 6, borderTop: `1px solid ${colors.border}` }}>
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1, minHeight: 48 }}>
              Cancelar
            </Button>
            <Button variant="contained" disabled={busy || !valid} onClick={save} sx={{ flex: 2, minHeight: 48 }}>
              Salvar alterações
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

function PanelSwitch({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <FormControlLabel
      labelPlacement="start"
      control={<Switch checked={checked} onChange={onChange} />}
      label={
        <Box>
          <Typography sx={{ fontWeight: fontWeight.bold }}>{title}</Typography>
          <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>{hint}</Typography>
        </Box>
      }
      sx={{ m: 0, justifyContent: 'space-between' }}
    />
  );
}

function withProduct(catalog: Catalog, updated: CatalogProduct): Catalog {
  return {
    categories: catalog.categories.map((category) => ({
      ...category,
      products: category.products.map((product) => (product.id === updated.id ? updated : product)),
    })),
  };
}

function describeUnavailable(since: string | null): string {
  if (!since) return 'Esgotado';
  const date = new Date(since);
  return `Esgotado desde ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
