import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, ButtonBase, TextField, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import { optionsText, QuantityStepper } from '../../components/client/CartParts';
import ClientScreen from '../../components/client/ClientScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { ScreenHeader } from '../../components/client/TabParts';
import { useCart } from '../../hooks/useCart';
import { guestGatePath } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { cartCount, cartTotal, lineTotal, MAX_LINE_QUANTITY, MAX_NOTE_LENGTH, setNote, setQuantity } from '../../services/cart';
import type { CartLine } from '../../services/cart';
import { formatCents } from '../../services/format';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

export default function CartPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const gate = guestGatePath(slug);
  const [cart, setCart] = useCart(slug);

  if (gate) return <Navigate to={gate} replace />;
  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;

  const toMenu = () => navigate(`/t/${slug}/cardapio`);
  const count = cartCount(cart);

  if (cart.length === 0) {
    return (
      <ClientScreen footer={<ActionButton onClick={toMenu}>Ver o cardápio</ActionButton>}>
        <ScreenHeader title="Carrinho" onBack={toMenu} />
        <Box sx={{ px: 5, pt: 8 }}>
          <Typography variant="h2" component="h1">
            Seu carrinho está vazio
          </Typography>
          <Typography sx={{ mt: 3, color: colors.textSecondary }}>
            Escolha os itens no cardápio. Eles ficam guardados aqui até você enviar para a cozinha.
          </Typography>
        </Box>
      </ClientScreen>
    );
  }

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>
              {count} {count === 1 ? 'item' : 'itens'}
            </Typography>
            <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
              {formatCents(cartTotal(cart))}
            </Typography>
          </Box>
          <ActionButton onClick={() => navigate(`/t/${slug}/carrinho/confirmar`)}>Revisar pedido</ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={toMenu}>
            Adicionar mais itens
          </ActionButton>
        </>
      }
    >
      <ScreenHeader title="Carrinho" subtitle={state.store.name} onBack={toMenu} />
      <Box component="ul" sx={{ listStyle: 'none', m: 0, px: 5, pt: 2, pb: 6 }}>
        {cart.map((line) => (
          <CartRow
            key={line.key}
            line={line}
            onQuantity={(quantity) => setCart((current) => setQuantity(current, line.key, quantity))}
            onNote={(note) => setCart((current) => setNote(current, line.key, note))}
          />
        ))}
      </Box>
    </ClientScreen>
  );
}

interface CartRowProps {
  line: CartLine;
  onQuantity: (quantity: number) => void;
  onNote: (note: string) => void;
}

function CartRow({ line, onQuantity, onNote }: CartRowProps) {
  const options = optionsText(line.options);
  return (
    <Box component="li" sx={{ py: 4, borderBottom: `1px solid ${colors.divider}`, '&:last-of-type': { borderBottom: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h2">
            {line.name}
          </Typography>
          {options && <Typography sx={{ mt: 1, fontSize: fontSize.small, color: colors.textSecondary }}>{options}</Typography>}
        </Box>
        <Typography sx={{ flexShrink: 0, fontWeight: fontWeight.extraBold }}>{formatCents(lineTotal(line))}</Typography>
      </Box>

      <TextField
        placeholder="Observação (ex.: sem cebola)"
        defaultValue={line.note}
        onBlur={(event) => {
          if (event.target.value.trim() !== line.note) onNote(event.target.value.trim());
        }}
        inputProps={{ maxLength: MAX_NOTE_LENGTH, 'aria-label': `Observação de ${line.name}` }}
        size="small"
        fullWidth
        sx={{ mt: 3 }}
      />

      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
        <ButtonBase
          onClick={() => onQuantity(0)}
          sx={{
            px: 3,
            minHeight: 44,
            borderRadius: `${radius.button}px`,
            fontFamily: 'inherit',
            fontSize: fontSize.small,
            fontWeight: fontWeight.bold,
            color: colors.textSecondary,
          }}
        >
          Remover
        </ButtonBase>
        <QuantityStepper
          value={line.quantity}
          min={1}
          max={MAX_LINE_QUANTITY}
          label={`Quantidade de ${line.name}`}
          onChange={onQuantity}
        />
      </Box>
    </Box>
  );
}
