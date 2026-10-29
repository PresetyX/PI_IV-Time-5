import { useEffect, useRef, useState } from 'react';
import { keyframes } from '@emotion/react';
import { Box, ButtonBase, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { CHEF_PATHS } from '../../components/BrandMark';
import { landing, motionSafe, useInView } from './landingKit';

const sway = keyframes`
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(4deg); }
`;

const blink = keyframes`
  0%, 88%, 100% { transform: scaleY(1); }
  91% { transform: scaleY(.15); }
  94% { transform: scaleY(1); }
`;

const wiggle = keyframes`
  0%, 70%, 100% { transform: rotate(0deg); }
  76% { transform: rotate(-8deg); }
  82% { transform: rotate(7deg); }
  88% { transform: rotate(-3deg); }
`;

const steamUp = keyframes`
  0% { transform: translateY(0) scale(.6); opacity: 0; }
  30% { opacity: .7; }
  100% { transform: translateY(-90px) scale(1.5); opacity: 0; }
`;

const hop = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  35% { transform: translateY(-22px) rotate(-6deg); }
  65% { transform: translateY(4px) rotate(3deg); }
`;

const floatBody = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const burstOut = keyframes`
  0% { transform: translate(-50%, -50%) scale(.2); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(160deg); opacity: 0; }
`;

const snore = keyframes`
  0% { transform: translate(0, 0) scale(.6); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translate(26px, -60px) scale(1.2); opacity: 0; }
`;

const pop = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(.9); }
  to { opacity: 1; transform: none; }
`;

type Size = number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };

interface ChefMascotProps {
  size: Size;
  color?: string;
  steam?: boolean;
  float?: boolean;
  phrases?: string[];
  bubble?: 'top' | 'right' | 'left';
  label?: string;
  tilt?: number;
  flip?: boolean;
  sleepy?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

export default function ChefMascot({ size, color = landing.ink, steam = true, float = true, phrases, bubble = 'top', label = 'Biggas, o chef do Pede Aí', tilt = 0, flip = false, sleepy = false, onClick, sx }: ChefMascotProps) {
  const root = useRef<HTMLButtonElement | null>(null);
  const face = useRef<SVGGElement | null>(null);
  const [awake, setAwake] = useState(false);
  const [hopping, setHopping] = useState(0);
  const [phrase, setPhrase] = useState(0);
  const [burst, setBurst] = useState(0);
  const [wink, setWink] = useState(false);

  useEffect(() => {
    let timer = 0;
    const onWink = () => {
      setWink(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setWink(false), 900);
    };
    window.addEventListener('biggas:wink', onWink);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('biggas:wink', onWink);
    };
  }, []);

  useEffect(() => {
    if (sleepy || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = root.current;
        const group = face.current;
        if (!node || !group) return;
        const rect = node.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
        group.style.transform = `translate(${Math.max(-1, Math.min(1, dx * 2)) * 14 * (flip ? -1 : 1)}px, ${Math.max(-1, Math.min(1, dy * 2)) * 10}px)`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, [flip, sleepy]);

  useEffect(() => {
    if (!phrases || phrases.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setPhrase((value) => (value + 1) % phrases.length), 4200);
    return () => window.clearInterval(timer);
  }, [phrases]);

  function poke() {
    setHopping((value) => value + 1);
    setBurst((value) => value + 1);
    window.dispatchEvent(new Event('biggas:wink'));
    if (phrases) setPhrase((value) => (value + 1) % phrases.length);
    onClick?.();
  }

  const bubblePlacement = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', mb: 1 },
    right: { left: '88%', top: '-6%' },
    left: { right: '88%', top: '-6%' },
  }[bubble];

  return (
    <ButtonBase
      ref={root}
      aria-label={label}
      onClick={poke}
      onMouseEnter={() => setAwake(true)}
      onMouseLeave={() => setAwake(false)}
      onFocus={() => setAwake(true)}
      onBlur={() => setAwake(false)}
      disableRipple
      sx={[{ position: 'relative', display: 'inline-flex', width: size, height: size, borderRadius: '50%', color, overflow: 'visible' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {phrases && (
        <Box
          aria-live="polite"
          sx={{
            position: 'absolute',
            ...bubblePlacement,
            zIndex: 2,
            px: 3,
            py: 2,
            borderRadius: '14px',
            bgcolor: landing.white,
            boxShadow: '0 16px 30px -16px rgba(0,0,0,.4)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <Typography key={phrase} sx={{ fontFamily: landing.sans, fontWeight: 700, fontSize: 12.5, color: landing.ink, animation: `${pop} .45s cubic-bezier(.2,.75,.2,1) both`, ...motionSafe }}>
            {phrases[phrase]}
          </Typography>
        </Box>
      )}
      {burst > 0 &&
        Array.from({ length: 10 }).map((_, index) => {
          const angle = (index / 10) * Math.PI * 2;
          return (
            <Box
              key={`${burst}-${index}`}
              aria-hidden
              sx={{
                position: 'absolute',
                left: '50%',
                top: '45%',
                width: index % 2 ? 10 : 14,
                height: index % 2 ? 10 : 14,
                bgcolor: index % 3 ? landing.accent : '#F7B26A',
                clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)',
                pointerEvents: 'none',
                '--dx': `${Math.cos(angle) * 90}%`,
                '--dy': `${Math.sin(angle) * 90}%`,
                animation: `${burstOut} .8s cubic-bezier(.2,.75,.2,1) forwards`,
                ...motionSafe,
              }}
            />
          );
        })}
      {sleepy &&
        ['z', 'z', 'Z'].map((letter, index) => (
          <Typography
            key={index}
            aria-hidden
            sx={{ position: 'absolute', right: '6%', top: '8%', fontFamily: landing.sans, fontWeight: 800, fontSize: 18 + index * 6, color: landing.accent, opacity: 0, pointerEvents: 'none', animation: `${snore} 3s ease-out ${index}s infinite`, ...motionSafe }}
          >
            {letter}
          </Typography>
        ))}
      <Box
        key={hopping}
        sx={{ width: '100%', height: '100%', rotate: `${tilt}deg`, animation: hopping ? `${hop} .7s cubic-bezier(.3,.7,.3,1)` : 'none', ...motionSafe }}
      >
        <Box
          component="svg"
          viewBox="395 200 410 450"
          aria-hidden
          sx={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', scale: flip ? '-1 1' : '1 1', animation: float ? `${floatBody} ${sleepy ? 7 : 4.5}s ease-in-out infinite` : 'none', ...motionSafe }}
        >
          {steam &&
            [0, 1, 2].map((index) => (
              <Box
                key={index}
                component="circle"
                cx={560 + index * 60}
                cy={262}
                r={16 + index * 3}
                sx={{ fill: '#C9C1B8', opacity: 0, transformBox: 'fill-box', transformOrigin: 'center', animation: `${steamUp} ${3 + index * 0.6}s ease-out ${index * 1.1}s infinite`, filter: 'blur(7px)', ...motionSafe }}
              />
            ))}
          <Box
            component="g"
            sx={{ transformBox: 'fill-box', transformOrigin: '30% 100%', animation: `${sway} 3.4s ease-in-out infinite`, transition: 'translate .3s ease', translate: awake ? '0 -14px' : '0 0', ...motionSafe }}
          >
            <path d={CHEF_PATHS.hat} fill="currentColor" />
            <path d={CHEF_PATHS.band} fill="currentColor" />
          </Box>
          <g ref={face} style={{ transition: 'transform .25s ease-out' }}>
            {wink ? (
              <>
                <circle cx={477} cy={513} r={11} fill="currentColor" />
                <path d="M528 534 Q547 518 566 534" fill="none" stroke="currentColor" strokeWidth={11} strokeLinecap="round" />
                <Box component="path" d="M590 488 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" sx={{ fill: landing.accent, transformBox: 'fill-box', transformOrigin: 'center', animation: `${pop} .5s cubic-bezier(.2,.75,.2,1) both` }} />
              </>
            ) : awake ? (
              <>
                <circle cx={477} cy={513} r={11} fill="currentColor" />
                <circle cx={548} cy={531} r={11} fill="currentColor" />
              </>
            ) : (
              <Box component="g" sx={{ transformBox: 'fill-box', transformOrigin: 'center', animation: sleepy ? 'none' : `${blink} 4.2s ease-in-out infinite`, ...motionSafe }}>
                <path d={CHEF_PATHS.eyes} fill="none" stroke="currentColor" strokeWidth={11} strokeLinecap="round" />
              </Box>
            )}
            <Box
              component="g"
              sx={{ transformBox: 'fill-box', transformOrigin: '45% 25%', animation: `${wiggle} ${awake ? 0.9 : 3.6}s ease-in-out infinite`, ...motionSafe }}
            >
              <path d={CHEF_PATHS.mustache} fill="currentColor" />
            </Box>
          </g>
        </Box>
      </Box>
    </ButtonBase>
  );
}

export function MascotDock() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 16, md: 28 },
        bottom: { xs: 16, md: 28 },
        zIndex: 35,
        width: { xs: 62, md: 74 },
        height: { xs: 62, md: 74 },
        borderRadius: '50%',
        bgcolor: landing.white,
        boxShadow: '0 18px 40px -16px rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(30px) scale(.8)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity .4s ease, transform .5s cubic-bezier(.2,.75,.2,1)',
        '&:hover .dock-tip': { opacity: 1, transform: 'none' },
      }}
    >
      <Box className="dock-tip" sx={{ position: 'absolute', right: '110%', px: 3, py: 1.5, borderRadius: '12px', bgcolor: landing.ink, color: landing.white, fontFamily: landing.sans, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', opacity: 0, transform: 'translateX(8px)', transition: 'all .3s ease', pointerEvents: 'none' }}>
        O Biggas te leva pro topo
      </Box>
      <ChefMascot size={{ xs: 46, md: 54 }} steam={false} float={false} label="Voltar ao topo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
    </Box>
  );
}

export function PeekChef({ side, phrases, top = '40%', size = 200 }: { side: 'left' | 'right'; phrases: string[]; top?: string; size?: number }) {
  const { ref, visible } = useInView<HTMLDivElement>(0.4);
  const tilt = side === 'left' ? 16 : -16;
  const hidden = side === 'left' ? '-120%' : '120%';
  return (
    <Box ref={ref} aria-hidden sx={{ position: 'absolute', top, [side]: 0, zIndex: 3, width: size, height: size, display: { xs: 'none', lg: 'block' }, pointerEvents: 'none' }}>
      <Box
        sx={{
          pointerEvents: 'auto',
          transform: visible ? `translateX(${side === 'left' ? '-16%' : '16%'})` : `translateX(${hidden})`,
          transition: 'transform 1.1s cubic-bezier(.34,1.56,.64,1) .2s',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <ChefMascot size={size} flip={side === 'left'} tilt={visible ? tilt : tilt * 2} phrases={phrases} bubble={side === 'left' ? 'right' : 'left'} sx={{ '& > div:last-of-type': { transition: 'rotate 1.1s cubic-bezier(.34,1.56,.64,1) .2s' } }} />
      </Box>
    </Box>
  );
}
