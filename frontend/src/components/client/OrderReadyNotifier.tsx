import { useEffect, useState } from 'react';
import { keyframes } from '@emotion/react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import { fetchBill } from '../../services/bill';
import { formatTableNumber } from '../../services/tables';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import HappyBiggas from './HappyBiggas';
import { CloseIcon } from './icons';

const REFRESH_MS = 6000;
const { colors, fontSize, fontWeight } = tokens;

const popIn = keyframes`
  0% { opacity: 0; transform: translateY(40px) scale(.85); }
  60% { opacity: 1; transform: translateY(-6px) scale(1.02); }
  100% { transform: none; }
`;

const fall = keyframes`
  0% { transform: translate3d(0, -40px, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin)); opacity: .9; }
`;

const glow = keyframes`
  0%, 100% { transform: scale(1); opacity: .35; }
  50% { transform: scale(1.12); opacity: .55; }
`;

const CONFETTI_COLORS = ['#FFFFFF', '#F7B26A', '#FFD9C7', '#111111'];
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 7) * 0.18,
  duration: 2.4 + (index % 5) * 0.35,
  drift: ((index % 9) - 4) * 14,
  spin: 360 + (index % 4) * 180,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  round: index % 3 === 0,
}));
const stillWhenAsked = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

interface ReadyOrder {
  id: string;
  number: number;
  tableNumber: number;
}

function seenKey(slug: string): string {
  return `pedeai.ready.${slug}`;
}

function readSeen(slug: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(seenKey(slug)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function markSeen(slug: string, ids: string[]) {
  try {
    sessionStorage.setItem(seenKey(slug), JSON.stringify([...new Set([...readSeen(slug), ...ids])]));
  } catch {
    // Sem sessionStorage o aviso só pode repetir depois de recarregar a página.
  }
}

/** Comemora em tela cheia, em qualquer tela do cliente, quando um pedido da comanda fica pronto. Uma vez por pedido. */
export default function OrderReadyNotifier() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const slug = matchPath('/t/:slug/*', pathname)?.params.slug ?? null;
  const hasTab = slug !== null && Boolean(readVisit(slug).guestToken);
  const [ready, setReady] = useState<ReadyOrder | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!slug || !hasTab) return undefined;
    let stopped = false;
    async function check(currentSlug: string) {
      try {
        const bill = await fetchBill(currentSlug);
        const seen = readSeen(currentSlug);
        const fresh = bill.orders.filter((order) => order.status === 'READY' && !seen.includes(order.id));
        if (stopped || fresh.length === 0) return;
        markSeen(currentSlug, fresh.map((order) => order.id));
        const latest = fresh[fresh.length - 1];
        setReady({ id: latest.id, number: latest.number, tableNumber: bill.tableNumber });
        setVisible(true);
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // Sem comanda ou sem conexão: as telas já mostram o próprio erro.
      }
    }
    check(slug);
    const timer = window.setInterval(() => check(slug), REFRESH_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [slug, hasTab]);

  // O pedido continua guardado depois de fechar, para o conteúdo não sumir durante a saída do pop-up.
  const open = Boolean(visible && slug && ready && pathname !== `/t/${slug}/pedidos/${ready.id}`);
  const close = () => setVisible(false);

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      aria-labelledby="order-ready-title"
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(17,17,17,.55)', backdropFilter: 'blur(6px)' } } }}
      PaperProps={{
        sx: {
          position: 'relative',
          width: '100%',
          maxWidth: 360,
          m: 4,
          overflow: 'hidden',
          borderRadius: '28px',
          bgcolor: 'primary.main',
          color: '#FFFFFF',
          boxShadow: '0 40px 80px -30px rgba(0,0,0,.7)',
          animation: `${popIn} .6s cubic-bezier(.2,.75,.2,1) both`,
          ...stillWhenAsked,
        },
      }}
    >
      {ready && (
        <>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {CONFETTI.map((piece, index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: `${piece.left}%`,
                  width: piece.round ? 8 : 7,
                  height: piece.round ? 8 : 13,
                  borderRadius: piece.round ? '50%' : '2px',
                  bgcolor: piece.color,
                  opacity: 0,
                  '--drift': `${piece.drift}px`,
                  '--spin': `${piece.spin}deg`,
                  animation: `${fall} ${piece.duration}s linear ${piece.delay}s infinite`,
                  '@media (prefers-reduced-motion: reduce)': { display: 'none' },
                }}
              />
            ))}
          </Box>

          <IconButton
            onClick={close}
            aria-label="Fechar"
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1, color: 'inherit', bgcolor: 'rgba(255,255,255,.16)' }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <Box sx={{ position: 'relative', px: 6, pt: 10, pb: 6, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', width: 190, height: 190, mx: 'auto' }}>
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: -14,
                  borderRadius: '50%',
                  bgcolor: '#FFFFFF',
                  animation: `${glow} 1.8s ease-in-out infinite`,
                  ...stillWhenAsked,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)',
                }}
              >
                <HappyBiggas size={136} color={colors.text} sparkleColor="#F7B26A" />
              </Box>
            </Box>

            <Typography
              sx={{ mt: 7, fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1.6, opacity: 0.85 }}
            >
              PEDIDO #{ready.number}
            </Typography>
            <Typography
              id="order-ready-title"
              component="h2"
              sx={{ mt: 1, fontSize: fontSize.display, fontWeight: fontWeight.extraBold, lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Ficou pronto!
            </Typography>
            <Typography sx={{ mt: 3, fontSize: fontSize.body, lineHeight: 1.45, opacity: 0.92 }}>
              {/* [Mateus · Card 5] Alteração: no balcão (sem mesa) o cliente retira, ninguém leva. */}
              {ready.tableNumber > 0
                ? `O Biggas caprichou. O garçom já está levando à mesa ${formatTableNumber(ready.tableNumber)}.`
                : 'O Biggas caprichou. Retire no balcão e diga a sua senha.'}
            </Typography>

            <ActionButton
              onClick={() => {
                close();
                navigate(ready.tableNumber > 0 ? `/t/${slug}/pedidos/${ready.id}` : `/t/${slug}/balcao/senha`);
              }}
              sx={{ mt: 7, bgcolor: '#FFFFFF', color: colors.text, '&:hover': { bgcolor: '#F4F4F4' } }}
            >
              Ver meu pedido
            </ActionButton>
            <ActionButton tone="quiet" onClick={close} sx={{ mt: 1, color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(255,255,255,.12)' } }}>
              Continuar aqui
            </ActionButton>
          </Box>
        </>
      )}
    </Dialog>
  );
}
