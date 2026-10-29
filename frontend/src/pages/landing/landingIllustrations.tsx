import type { ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Container, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { Cutout, Reveal, Sub, Title, bob, landing, motionSafe } from './landingKit';

const { accent, ink, body, white, sans } = landing;

const blink = keyframes`
  0%, 86%, 100% { transform: scaleY(1); }
  89% { transform: scaleY(.1); }
  92% { transform: scaleY(1); }
`;

const sway = keyframes`
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
`;

const scan = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(58px); }
`;

const twinkle = keyframes`
  0%, 100% { transform: scale(.3); opacity: 0; }
  50% { transform: scale(1); opacity: 1; }
`;

const print = keyframes`
  0% { transform: translateY(64px); }
  45%, 85% { transform: translateY(0); }
  100% { transform: translateY(64px); }
`;

const lamp = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: .2; }
`;

const flip = keyframes`
  0%, 15% { transform: translateY(0) rotate(0deg); }
  45% { transform: translateY(-58px) rotate(180deg); }
  70%, 100% { transform: translateY(0) rotate(360deg); }
`;

const squash = keyframes`
  0%, 66%, 78%, 100% { transform: scaleY(1); }
  71% { transform: scaleY(.86); }
`;

const steam = keyframes`
  0% { transform: translateY(8px); opacity: 0; }
  40% { opacity: .9; }
  100% { transform: translateY(-26px); opacity: 0; }
`;

const ring = keyframes`
  0%, 62%, 96%, 100% { transform: rotate(0deg); }
  66% { transform: rotate(-12deg); }
  71% { transform: rotate(10deg); }
  76% { transform: rotate(-7deg); }
  81% { transform: rotate(5deg); }
  86% { transform: rotate(-2deg); }
`;

const press = keyframes`
  0%, 60%, 70%, 100% { transform: translateY(0); }
  64% { transform: translateY(6px); }
`;

const wave = keyframes`
  0%, 62% { opacity: 0; transform: scale(.6); }
  70% { opacity: 1; }
  92%, 100% { opacity: 0; transform: scale(1.25); }
`;

const spin = keyframes`
  0%, 100% { transform: translateY(0) scaleX(1); }
  25% { transform: translateY(-16px) scaleX(.08); }
  50% { transform: translateY(-22px) scaleX(-1); }
  75% { transform: translateY(-10px) scaleX(.08); }
`;

const shadowPulse = keyframes`
  0%, 100% { transform: scaleX(1); opacity: .25; }
  50% { transform: scaleX(.6); opacity: .12; }
`;

const travel = keyframes`
  from { left: 0%; }
  to { left: 100%; }
`;

const fillBox = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

function Face({ x, y, color, open = false, delay = 0 }: { x: number; y: number; color: string; open?: boolean; delay?: number }) {
  return (
    <g>
      <Box component="g" sx={{ ...fillBox, animation: `${blink} 4s ease-in-out ${delay}s infinite`, ...motionSafe }}>
        <path d={`M${x - 14} ${y} q4.5 -6 9 0 M${x + 5} ${y} q4.5 -6 9 0`} fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
      </Box>
      {open ? <ellipse cx={x} cy={y + 10} rx={4} ry={5} fill={color} /> : <path d={`M${x - 6} ${y + 7} q6 6 12 0`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />}
    </g>
  );
}

function Sparkle({ x, y, delay, size = 7 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <Box
      component="path"
      d={`M${x} ${y - size} L${x + size * 0.3} ${y - size * 0.3} L${x + size} ${y} L${x + size * 0.3} ${y + size * 0.3} L${x} ${y + size} L${x - size * 0.3} ${y + size * 0.3} L${x - size} ${y} L${x - size * 0.3} ${y - size * 0.3} Z`}
      sx={{ fill: accent, ...fillBox, animation: `${twinkle} 2.4s ease-in-out ${delay}s infinite`, ...motionSafe }}
    />
  );
}

type Art = { sx?: SxProps<Theme> };

function Canvas({ children, sx }: { children: ReactNode } & Art) {
  return (
    <Box component="svg" viewBox="0 0 160 160" aria-hidden sx={[{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

export function ScanPhoneArt({ sx }: Art) {
  return (
    <Canvas sx={sx}>
      <Box component="g" sx={{ transformBox: 'fill-box', transformOrigin: '50% 90%', animation: `${sway} 4s ease-in-out infinite`, ...motionSafe }}>
        <rect x={48} y={16} width={64} height={126} rx={14} fill={ink} />
        <rect x={55} y={28} width={50} height={74} rx={6} fill={white} />
        {[
          [61, 34],
          [87, 34],
          [61, 66],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width={13} height={13} rx={2} fill="none" stroke={ink} strokeWidth={3} />
            <rect x={x + 4.5} y={y + 4.5} width={4} height={4} fill={ink} />
          </g>
        ))}
        {[
          [80, 70, accent],
          [88, 78, ink],
          [96, 68, accent],
          [80, 88, ink],
          [94, 90, accent],
          [80, 54, ink],
        ].map(([x, y, color]) => (
          <rect key={`${x}-${y}`} x={x as number} y={y as number} width={6} height={6} rx={1} fill={color as string} />
        ))}
        <Box component="g" sx={{ animation: `${scan} 1.5s ease-in-out infinite alternate`, ...motionSafe }}>
          <rect x={53} y={32} width={54} height={3} rx={1.5} fill={accent} />
          <rect x={53} y={26} width={54} height={8} fill={accent} opacity={0.18} />
        </Box>
        <Face x={80} y={120} color={white} />
      </Box>
      <Sparkle x={32} y={40} delay={0} />
      <Sparkle x={130} y={30} delay={0.8} size={5} />
      <Sparkle x={134} y={110} delay={1.5} />
    </Canvas>
  );
}

export function TicketArt({ sx }: Art) {
  return (
    <Canvas sx={sx}>
      <defs>
        <clipPath id="ticket-clip">
          <rect x={0} y={0} width={160} height={104} />
        </clipPath>
      </defs>
      <g clipPath="url(#ticket-clip)">
        <Box component="g" sx={{ animation: `${print} 3.4s cubic-bezier(.3,.7,.3,1) infinite`, ...motionSafe }}>
          <path d="M50 22 h60 v84 H50 Z" fill={white} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
          <path d="M50 22 l7.5 -6 l7.5 6 l7.5 -6 l7.5 6 l7.5 -6 l7.5 6 l7.5 -6 l7.5 6" fill={white} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
          <Face x={80} y={40} color={ink} delay={0.6} />
          <rect x={60} y={62} width={40} height={4} rx={2} fill={ink} />
          <rect x={60} y={72} width={28} height={4} rx={2} fill={ink} opacity={0.5} />
          <rect x={60} y={82} width={34} height={4} rx={2} fill={accent} />
        </Box>
      </g>
      <rect x={28} y={100} width={104} height={40} rx={12} fill={ink} />
      <rect x={42} y={100} width={76} height={6} rx={3} fill="#3A3A3A" />
      <Box component="circle" cx={118} cy={124} r={4.5} sx={{ fill: accent, animation: `${lamp} 1s ease-in-out infinite`, ...motionSafe }} />
      <rect x={40} y={120} width={30} height={5} rx={2.5} fill="#3A3A3A" />
      <Sparkle x={28} y={48} delay={0.4} />
      <Sparkle x={136} y={58} delay={1.4} size={5} />
    </Canvas>
  );
}

export function PanArt({ sx }: Art) {
  return (
    <Canvas sx={sx}>
      {[60, 80, 100].map((x, index) => (
        <Box
          key={x}
          component="path"
          d={`M${x} 52 q-6 -8 0 -16 q6 -8 0 -16`}
          sx={{ fill: 'none', stroke: '#C9C1B8', strokeWidth: 4, strokeLinecap: 'round', animation: `${steam} 2.2s ease-out ${index * 0.6}s infinite`, opacity: 0, ...motionSafe }}
        />
      ))}
      <Box component="g" sx={{ ...fillBox, transformOrigin: '50% 100%', animation: `${squash} 2.6s ease-in-out infinite`, ...motionSafe }}>
        <path d="M22 104 h100 q-4 26 -50 26 q-46 0 -50 -26 Z" fill={ink} />
        <rect x={118} y={102} width={38} height={10} rx={5} fill={ink} />
      </Box>
      <Box component="g" sx={{ ...fillBox, animation: `${flip} 2.6s cubic-bezier(.4,.1,.3,1) infinite`, ...motionSafe }}>
        <rect x={42} y={86} width={60} height={18} rx={9} fill="#7A3416" />
        <rect x={42} y={86} width={60} height={9} rx={4.5} fill={accent} />
        <g>
          <path d="M60 96 q3 -4 6 0 M78 96 q3 -4 6 0" fill="none" stroke={white} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      </Box>
      <Sparkle x={130} y={64} delay={0.2} />
      <Sparkle x={24} y={74} delay={1.1} size={5} />
    </Canvas>
  );
}

export function BellArt({ sx }: Art) {
  return (
    <Canvas sx={sx}>
      {[-1, 1].map((side) => (
        <Box key={side} component="g" sx={{ transformBox: 'view-box', transformOrigin: '80px 96px', animation: `${wave} 2.8s ease-out infinite`, ...motionSafe }}>
          <path d={side < 0 ? 'M30 70 q-10 20 0 40' : 'M130 70 q10 20 0 40'} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" />
          <path d={side < 0 ? 'M18 62 q-14 28 0 56' : 'M142 62 q14 28 0 56'} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        </Box>
      ))}
      <Box component="g" sx={{ ...fillBox, transformOrigin: '50% 100%', animation: `${ring} 2.8s ease-in-out infinite`, ...motionSafe }}>
        <Box component="g" sx={{ animation: `${press} 2.8s ease-in-out infinite`, ...motionSafe }}>
          <rect x={74} y={52} width={12} height={10} rx={3} fill={ink} />
          <rect x={66} y={48} width={28} height={7} rx={3.5} fill={ink} />
        </Box>
        <path d="M38 118 a42 42 0 0 1 84 0 Z" fill={ink} />
        <path d="M50 100 a32 32 0 0 1 18 -24" fill="none" stroke={white} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
        <Face x={80} y={98} color={white} open delay={0.3} />
      </Box>
      <rect x={28} y={118} width={104} height={14} rx={7} fill={ink} />
    </Canvas>
  );
}

export function CoinArt({ sx }: Art) {
  return (
    <Canvas sx={sx}>
      <Box component="ellipse" cx={80} cy={134} rx={30} ry={6} sx={{ fill: ink, ...fillBox, animation: `${shadowPulse} 2.4s ease-in-out infinite`, ...motionSafe }} />
      <Box component="g" sx={{ ...fillBox, animation: `${spin} 2.4s ease-in-out infinite`, ...motionSafe }}>
        <circle cx={80} cy={84} r={38} fill={accent} />
        <circle cx={80} cy={84} r={29} fill="none" stroke={white} strokeWidth={3} opacity={0.45} />
        <Face x={80} y={80} color={white} delay={0.9} />
      </Box>
      <Sparkle x={30} y={50} delay={0} />
      <Sparkle x={132} y={44} delay={0.7} size={5} />
      <Sparkle x={130} y={108} delay={1.4} />
    </Canvas>
  );
}

const STEPS = [
  { Art: ScanPhoneArt, title: 'Escaneia o QR', text: 'O cliente aponta a câmera para a mesa e o cardápio da sua marca abre na hora.', tint: '#FDE7DC' },
  { Art: TicketArt, title: 'Faz o pedido', text: 'Monta a comanda com os amigos e envia direto do celular.', tint: '#EFE8FB' },
  { Art: PanArt, title: 'A cozinha prepara', text: 'O pedido cai na fila da produção com tempo e prioridade.', tint: '#FFF0D9' },
  { Art: BellArt, title: 'Pronto para servir', text: 'O salão é avisado e leva até a mesa certa.', tint: '#E3F3E8' },
  { Art: CoinArt, title: 'Paga no Pix', text: 'Cada um paga a sua parte e o caixa fecha sem conta de cabeça.', tint: '#FDE7DC' },
];

export function HowItWorksSection() {
  return (
    <Box component="section" id="como-funciona" sx={{ position: 'relative', py: { xs: 14, md: 18 }, scrollMarginTop: 90, overflow: 'hidden' }}>
      <Box aria-hidden sx={{ position: 'absolute', right: '7%', top: 70, display: { xs: 'none', md: 'block' } }}>
        <Cutout name="strawberry" size={92} sx={{ '--tilt': '14deg', animation: `${bob} 6s ease-in-out infinite`, filter: 'drop-shadow(0 12px 10px rgba(0,0,0,.14))', ...motionSafe }} />
      </Box>
      <Container maxWidth="lg">
        <Reveal>
          <Title accent="em cinco passos">Do QR à conta</Title>
          <Sub sx={{ mt: 2 }}>O caminho de um pedido no Pede Aí, do celular do cliente ao caixa.</Sub>
        </Reveal>
        <Box sx={{ position: 'relative', mt: 12 }}>
          <Box aria-hidden sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', left: '10%', right: '10%', top: 78, borderTop: '2px dashed #E6D9CC' }}>
            <Box sx={{ position: 'absolute', top: -7, width: 12, height: 12, ml: '-6px', borderRadius: '50%', bgcolor: accent, boxShadow: '0 0 0 6px rgba(235,90,36,.18)', animation: `${travel} 6s linear infinite`, ...motionSafe }} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: { xs: 8, md: 4 } }}>
            {STEPS.map(({ Art, title, text, tint }, index) => (
              <Reveal key={title} delay={index * 120} from="zoom">
                <Box sx={{ position: 'relative', textAlign: 'center', '&:hover .art': { transform: 'scale(1.1) rotate(-3deg)' } }}>
                  <Box sx={{ position: 'relative', width: 156, height: 156, mx: 'auto', borderRadius: '50%', bgcolor: tint, border: `6px solid ${white}`, boxShadow: '0 26px 40px -30px rgba(0,0,0,.45)' }}>
                    <Box className="art" sx={{ position: 'absolute', inset: 14, transition: 'transform .45s cubic-bezier(.2,.75,.2,1)' }}>
                      <Art />
                    </Box>
                    <Box sx={{ position: 'absolute', right: -4, top: -4, width: 34, height: 34, borderRadius: '50%', bgcolor: ink, color: white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 13, border: `3px solid ${white}` }}>
                      {index + 1}
                    </Box>
                  </Box>
                  <Typography component="h3" sx={{ mt: 5, fontFamily: sans, fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: ink }}>
                    {title}
                  </Typography>
                  <Typography sx={{ mt: 1.5, mx: 'auto', maxWidth: 220, fontFamily: sans, fontWeight: 500, fontSize: 13.5, lineHeight: 1.6, color: body }}>{text}</Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
