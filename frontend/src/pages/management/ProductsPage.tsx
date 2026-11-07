import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ManagementLayout, { Card, LoadState, Segmented } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { ApiError } from '../../services/api';
import { currentRole } from '../../services/auth';
import {
  createCategory,
  createProduct,
  fetchCatalog,
  removeCategory,
  reorderCategories,
  reorderProducts,
  setProductAvailability,
  updateCategory,
  updateProduct,
} from '../../services/catalog';
import type { Catalog, CatalogCategory, CatalogProduct, ProductChanges } from '../../services/catalog';
import { formatCents } from '../../services/format';
import { centsToInput, parseCents } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

type Filter = 'ALL' | 'UNAVAILABLE';

type ProductTarget = { mode: 'create'; categoryId: string } | { mode: 'edit'; product: CatalogProduct };

type CategoryTarget = { mode: 'create' } | { mode: 'edit'; category: CatalogCategory };

const DESCRIPTION_LIMIT = 140;

export default function ProductsPage() {
  const { data: catalog, setData, error, reload } = useLoader(fetchCatalog);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState(false);
  const [productTarget, setProductTarget] = useState<ProductTarget | null>(null);
  const [categoryTarget, setCategoryTarget] = useState<CategoryTarget | null>(null);
  const [removing, setRemoving] = useState<CatalogCategory | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canEdit = currentRole() !== 'KITCHEN';

  const products = useMemo(() => catalog?.categories.flatMap((category) => category.products) ?? [], [catalog]);
  const unavailable = products.filter((product) => !product.available).length;

  const visibleCategories = useMemo(() => {
    if (!catalog) return [];
    if (sorting) return catalog.categories;
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
  }, [catalog, filter, search, sorting]);

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

  async function moveCategory(index: number, step: number) {
    if (!catalog) return;
    const reordered = move(catalog.categories, index, step);
    if (reordered === catalog.categories) return;
    const previous = catalog;
    setData({ categories: reordered });
    try {
      await reorderCategories(reordered.map((category) => category.id));
    } catch {
      setData(previous);
      setMessage('Não foi possível salvar a nova ordem das categorias.');
    }
  }

  async function moveProduct(category: CatalogCategory, index: number, step: number) {
    if (!catalog) return;
    const reordered = move(category.products, index, step);
    if (reordered === category.products) return;
    const previous = catalog;
    setData({
      categories: catalog.categories.map((item) => (item.id === category.id ? { ...item, products: reordered } : item)),
    });
    try {
      await reorderProducts(
        category.id,
        reordered.map((product) => product.id),
      );
    } catch {
      setData(previous);
      setMessage(`Não foi possível salvar a nova ordem de "${category.name}".`);
    }
  }

  async function toggleCategoryVisibility(category: CatalogCategory) {
    try {
      const saved = await updateCategory(category.id, category.name, !category.visible);
      setData((current) =>
        current
          ? {
              categories: current.categories.map((item) =>
                item.id === saved.id ? { ...item, visible: saved.visible } : item,
              ),
            }
          : current,
      );
    } catch {
      setMessage(`Não foi possível ${category.visible ? 'ocultar' : 'mostrar'} "${category.name}" agora.`);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    try {
      const result = await removeCategory(target.id);
      setNotice(
        result.outcome === 'HIDDEN'
          ? `"${target.name}" tem produtos, então foi só ocultada do cardápio do cliente.`
          : `"${target.name}" foi excluída.`,
      );
      reload();
    } catch {
      setMessage(`Não foi possível excluir "${target.name}" agora.`);
    }
  }

  const firstCategoryId = catalog?.categories[0]?.id;

  return (
    <ManagementLayout
      title="Cardápio"
      subtitle={
        catalog
          ? `${products.length} ${products.length === 1 ? 'produto' : 'produtos'} em ${catalog.categories.length} ${catalog.categories.length === 1 ? 'categoria' : 'categorias'}${unavailable ? ` · ${unavailable} ${unavailable === 1 ? 'esgotado' : 'esgotados'}` : ''}`
          : undefined
      }
      actions={
        canEdit && catalog ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {sorting ? (
              <Button variant="contained" onClick={() => setSorting(false)} sx={{ minHeight: 48, px: 6 }}>
                Concluir ordem
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  disabled={catalog.categories.length < 2 && products.length < 2}
                  onClick={() => setSorting(true)}
                  sx={{ minHeight: 48, px: 5 }}
                >
                  Reordenar
                </Button>
                <Button variant="outlined" onClick={() => setCategoryTarget({ mode: 'create' })} sx={{ minHeight: 48, px: 5 }}>
                  Nova categoria
                </Button>
                <Button
                  variant="contained"
                  disabled={!firstCategoryId}
                  onClick={() => firstCategoryId && setProductTarget({ mode: 'create', categoryId: firstCategoryId })}
                  sx={{ minHeight: 48, px: 6 }}
                >
                  Novo produto
                </Button>
              </>
            )}
          </Box>
        ) : undefined
      }
    >
      {message && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 4 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {!catalog ? (
        <LoadState error={error} onRetry={reload} />
      ) : (
        <>
          {sorting ? (
            <Alert severity="info" sx={{ mb: 6 }}>
              Use as setas para mudar a ordem. O cardápio do cliente segue esta mesma ordem, e cada mudança já fica salva.
            </Alert>
          ) : (
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
          )}

          {catalog.categories.length === 0 ? (
            <Card>
              <Typography sx={{ fontWeight: fontWeight.bold }}>O cardápio ainda está vazio.</Typography>
              <Typography sx={{ mt: 1, color: colors.textSecondary }}>
                {canEdit
                  ? 'Comece criando uma categoria, como "Lanches" ou "Bebidas", e depois adicione os produtos.'
                  : 'O dono ou o gerente ainda não cadastrou os produtos.'}
              </Typography>
            </Card>
          ) : visibleCategories.length === 0 ? (
            <Card>
              <Typography sx={{ color: colors.textSecondary }}>
                {filter === 'UNAVAILABLE' && !search.trim()
                  ? 'Nenhum produto esgotado agora.'
                  : 'Nenhum produto encontrado.'}
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleCategories.map((category, index) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  canEdit={canEdit}
                  sorting={sorting}
                  first={index === 0}
                  last={index === visibleCategories.length - 1}
                  pending={pending}
                  onMoveUp={() => moveCategory(index, -1)}
                  onMoveDown={() => moveCategory(index, 1)}
                  onMoveProduct={(productIndex, step) => moveProduct(category, productIndex, step)}
                  onToggle={toggle}
                  onEdit={(product) => setProductTarget({ mode: 'edit', product })}
                  onAddProduct={() => setProductTarget({ mode: 'create', categoryId: category.id })}
                  onRename={() => setCategoryTarget({ mode: 'edit', category })}
                  onToggleVisibility={() => toggleCategoryVisibility(category)}
                  onRemove={() => setRemoving(category)}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {catalog && (
        <ProductPanel
          target={productTarget}
          categories={catalog.categories}
          onClose={() => setProductTarget(null)}
          onSaved={(saved) => {
            const target = productTarget;
            setProductTarget(null);
            if (target?.mode === 'edit' && saved.categoryId === target.product.categoryId) {
              replaceProduct(saved);
            } else {
              if (target?.mode === 'create') setNotice(`"${saved.name}" entrou no cardápio.`);
              reload();
            }
          }}
        />
      )}

      <CategoryDialog
        target={categoryTarget}
        onClose={() => setCategoryTarget(null)}
        onSaved={() => {
          setCategoryTarget(null);
          reload();
        }}
      />

      <Dialog open={!!removing} onClose={() => setRemoving(null)}>
        <DialogTitle>
          {removing && removing.products.length > 0 ? `Ocultar ${removing.name}?` : `Excluir ${removing?.name}?`}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {removing && removing.products.length > 0
              ? `Essa categoria tem ${removing.products.length} ${removing.products.length === 1 ? 'produto' : 'produtos'}, então não pode ser apagada. Ela vai sumir do cardápio do cliente, mas continua aqui no painel com os produtos.`
              : 'A categoria está vazia e vai ser apagada.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>Cancelar</Button>
          <Button
            color={removing && removing.products.length > 0 ? 'primary' : 'error'}
            variant="contained"
            onClick={confirmRemove}
          >
            {removing && removing.products.length > 0 ? 'Ocultar' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </ManagementLayout>
  );
}

function CategorySection({
  category,
  canEdit,
  sorting,
  first,
  last,
  pending,
  onMoveUp,
  onMoveDown,
  onMoveProduct,
  onToggle,
  onEdit,
  onAddProduct,
  onRename,
  onToggleVisibility,
  onRemove,
}: {
  category: CatalogCategory;
  canEdit: boolean;
  sorting: boolean;
  first: boolean;
  last: boolean;
  pending: Set<string>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveProduct: (index: number, step: number) => void;
  onToggle: (product: CatalogProduct) => void;
  onEdit: (product: CatalogProduct) => void;
  onAddProduct: () => void;
  onRename: () => void;
  onToggleVisibility: () => void;
  onRemove: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Card>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
        {sorting && <MoveButtons label={category.name} first={first} last={last} onUp={onMoveUp} onDown={onMoveDown} />}
        <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>{category.name}</Typography>
        {!category.visible && <Tag label="Oculta no cardápio" />}
        <Typography sx={{ ml: 'auto', fontSize: fontSize.small, color: colors.textMuted }}>
          {category.products.length} {category.products.length === 1 ? 'item' : 'itens'}
        </Typography>
        {canEdit && !sorting && (
          <>
            <IconButton
              aria-label={`Opções de ${category.name}`}
              onClick={(event) => setAnchor(event.currentTarget)}
              sx={{ width: 44, height: 44, fontWeight: fontWeight.extraBold }}
            >
              ⋯
            </IconButton>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onAddProduct();
                }}
              >
                Adicionar produto
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onRename();
                }}
              >
                Renomear
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onToggleVisibility();
                }}
              >
                {category.visible ? 'Ocultar do cardápio' : 'Mostrar no cardápio'}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onRemove();
                }}
                sx={{ color: colors.error }}
              >
                Excluir
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
      {category.products.length === 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, py: 3 }}>
          <Typography sx={{ color: colors.textMuted }}>Nenhum produto nesta categoria.</Typography>
          {canEdit && !sorting && (
            <Button onClick={onAddProduct} sx={{ minHeight: 44 }}>
              + Adicionar produto
            </Button>
          )}
        </Box>
      ) : (
        category.products.map((product, index) => (
          <ProductRow
            key={product.id}
            product={product}
            canEdit={canEdit}
            sorting={sorting}
            first={index === 0}
            last={index === category.products.length - 1}
            busy={pending.has(product.id)}
            onToggle={() => onToggle(product)}
            onEdit={() => onEdit(product)}
            onMoveUp={() => onMoveProduct(index, -1)}
            onMoveDown={() => onMoveProduct(index, 1)}
          />
        ))
      )}
    </Card>
  );
}

function ProductRow({
  product,
  canEdit,
  sorting,
  first,
  last,
  busy,
  onToggle,
  onEdit,
  onMoveUp,
  onMoveDown,
}: {
  product: CatalogProduct;
  canEdit: boolean;
  sorting: boolean;
  first: boolean;
  last: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: { xs: sorting ? 'nowrap' : 'wrap', sm: 'nowrap' },
        alignItems: 'center',
        gap: 4,
        py: 4,
        borderTop: `1px solid ${colors.divider}`,
      }}
    >
      {sorting && <MoveButtons label={product.name} first={first} last={last} onUp={onMoveUp} onDown={onMoveDown} />}
      <Box
        sx={{
          flex: { xs: sorting ? 1 : '1 1 100%', sm: 1 },
          minWidth: 0,
          opacity: product.available ? 1 : 0.55,
        }}
      >
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
      <Typography sx={{ mr: { xs: sorting ? 0 : 'auto', sm: 0 }, fontWeight: fontWeight.extraBold, whiteSpace: 'nowrap' }}>
        {formatCents(product.priceCents)}
      </Typography>
      {!sorting && (
        <>
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
        </>
      )}
    </Box>
  );
}

function MoveButtons({
  label,
  first,
  last,
  onUp,
  onDown,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const style = { width: 40, height: 40, border: `1px solid ${colors.border}`, fontSize: fontSize.base };
  return (
    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
      <IconButton aria-label={`Subir ${label}`} disabled={first} onClick={onUp} sx={style}>
        ↑
      </IconButton>
      <IconButton aria-label={`Descer ${label}`} disabled={last} onClick={onDown} sx={style}>
        ↓
      </IconButton>
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

function CategoryDialog({
  target,
  onClose,
  onSaved,
}: {
  target: CategoryTarget | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setFailure(null);
    setName(target?.mode === 'edit' ? target.category.name : '');
    setVisible(target?.mode === 'edit' ? target.category.visible : true);
  }, [target]);

  async function save() {
    if (!target || !name.trim()) return;
    setBusy(true);
    setFailure(null);
    try {
      if (target.mode === 'edit') {
        await updateCategory(target.category.id, name.trim(), visible);
      } else {
        await createCategory(name.trim(), visible);
      }
      onSaved();
    } catch (caught) {
      setFailure(
        caught instanceof ApiError && caught.status === 409
          ? 'Já existe uma categoria com esse nome.'
          : caught instanceof ApiError && caught.status === 403
            ? 'Só o dono e o gerente podem mudar as categorias.'
            : 'Não foi possível salvar agora.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>
        {target?.mode === 'edit' ? 'Editar categoria' : 'Nova categoria'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 2 }}>
          {failure && <Alert severity="error">{failure}</Alert>}
          <TextField
            label="Nome"
            placeholder="Porções"
            value={name}
            autoFocus
            inputProps={{ maxLength: 40 }}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
            }}
          />
          <PanelSwitch
            title="Aparece no cardápio"
            hint="Oculta, a categoria e os produtos dela somem para o cliente."
            checked={visible}
            onChange={() => setVisible(!visible)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 6, gap: 3 }}>
        <Button variant="outlined" onClick={onClose} sx={{ minHeight: 48, px: 6 }}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={busy || !name.trim()} onClick={save} sx={{ minHeight: 48, px: 8 }}>
          {target?.mode === 'edit' ? 'Salvar' : 'Criar categoria'}
        </Button>
      </DialogActions>
    </Dialog>
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

function ProductPanel({
  target,
  categories,
  onClose,
  onSaved,
}: {
  target: ProductTarget | null;
  categories: CatalogCategory[];
  onClose: () => void;
  onSaved: (product: CatalogProduct) => void;
}) {
  const [form, setForm] = useState<ProductForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const editing = target?.mode === 'edit' ? target.product : null;

  useEffect(() => {
    setFailure(null);
    if (!target) {
      setForm(null);
    } else if (target.mode === 'edit') {
      const product = target.product;
      setForm({
        categoryId: product.categoryId,
        name: product.name,
        description: product.description ?? '',
        price: centsToInput(product.priceCents),
        prepMinutes: product.prepMinutes == null ? '' : String(product.prepMinutes),
        imageUrl: product.imageUrl ?? '',
        isAlcoholic: !!product.isAlcoholic,
        available: product.available,
      });
    } else {
      setForm({
        categoryId: target.categoryId,
        name: '',
        description: '',
        price: '',
        prepMinutes: '',
        imageUrl: '',
        isAlcoholic: false,
        available: true,
      });
    }
  }, [target]);

  const priceCents = form ? parseCents(form.price) : 0;
  const priceTouched = !!form && form.price.trim() !== '';
  const prepMinutes = form && form.prepMinutes.trim() ? Number(form.prepMinutes) : null;
  const prepInvalid = prepMinutes !== null && (!Number.isInteger(prepMinutes) || prepMinutes < 0 || prepMinutes > 240);
  const valid = !!form && !!form.name.trim() && priceCents >= 1 && !prepInvalid;

  async function save() {
    if (!target || !form || !valid) return;
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
      onSaved(editing ? await updateProduct(editing.id, changes) : await createProduct(changes));
    } catch (caught) {
      setFailure(
        caught instanceof ApiError && caught.status === 403
          ? 'Só o dono e o gerente podem mudar produtos.'
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
    <Drawer anchor="right" open={!!target} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
      {target && form && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 6, borderBottom: `1px solid ${colors.border}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
                {editing ? 'Editar produto' : 'Novo produto'}
              </Typography>
              <Typography noWrap sx={{ fontSize: fontSize.small, color: colors.textMuted }}>
                {editing ? editing.name : 'Entra no fim da categoria escolhida'}
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
              placeholder="Porção de fritas"
              value={form.name}
              autoFocus={!editing}
              inputProps={{ maxLength: 80 }}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              label="Descrição"
              placeholder="500 g, sal e orégano"
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
                placeholder="0,00"
                value={form.price}
                inputMode="decimal"
                error={priceTouched && priceCents < 1}
                helperText={priceTouched && priceCents < 1 ? 'Informe um preço maior que zero.' : ' '}
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
                editing && form.categoryId !== editing.categoryId ? 'O produto vai para o fim da nova categoria.' : ' '
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
            {editing && (
              <Box sx={{ p: 4, bgcolor: colors.surface, borderRadius: `${radius.button}px` }}>
                <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
                  Mudar o preço não altera pedidos já enviados: eles guardam o preço do momento do envio.
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 3, p: 6, borderTop: `1px solid ${colors.border}` }}>
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1, minHeight: 48 }}>
              Cancelar
            </Button>
            <Button variant="contained" disabled={busy || !valid} onClick={save} sx={{ flex: 2, minHeight: 48 }}>
              {editing ? 'Salvar alterações' : 'Adicionar ao cardápio'}
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

function move<T>(items: T[], index: number, step: number): T[] {
  const target = index + step;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
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
