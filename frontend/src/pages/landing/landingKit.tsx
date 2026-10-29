import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export const landing = {
  accent: '#EB5A24',
  accentDark: '#D04B19',
  peach: '#FDE7DC',
  ink: '#141414',
  body: '#5E5E5E',
  muted: '#8D8D8D',
  line: '#EEE9E4',
  paper: '#F7F6F4',
  white: '#FFFFFF',
  serif: '"Playfair Display", Georgia, serif',
  sans: 'Manrope, system-ui, sans-serif',
  script: '"Great Vibes", cursive',
};

export function photo(id: string, width = 900, height?: number): string {
  const size = height ? `&h=${height}` : '';
  return `https://images.unsplash.com/photo-${id}?w=${width}${size}&q=75&auto=format&fit=crop`;
}

export const PHOTOS = {
  spread: '1504674900247-0877df9cc836',
  bowl: '1546069901-ba9599a7e63c',
  pizza: '1574071318508-1cdbab80d002',
  ribs: '1544025162-d76694265947',
  saladTop: '1512621776951-a57141f2eefd',
  grill: '1555939594-58d7cb561ad1',
  burger: '1568901346375-23c9450c58cd',
  burgerStack: '1565299507177-b0ac66763828',
  burgerClassic: '1571091718767-18b5b1457add',
  burgers: '1550547660-d9450f859349',
  fries: '1541592106381-b31e9677c0e5',
  steakFries: '1600891964092-4316c288032e',
  nuggets: '1562967914-608f82629710',
  shake: '1572490122747-3968b75cc699',
  juice: '1600271886742-f049cd451bba',
  beer: '1608270586620-248524c67de9',
  brownie: '1624353365286-3f8d62daad51',
  chopping: '1551218808-94e220e084d2',
  flames: '1600565193348-f74bd3c7ccdf',
  plating: '1581349485608-9469926a8e5e',
  chefPlating: '1577219491135-ce391730fb2c',
  chefWoman: '1595257841889-eca2678454e2',
  friendsCooking: '1556910103-1c02745aae4d',
  crowd: '1528605248644-14dd04022da1',
  bar: '1514933651103-005eec06c04b',
  hall: '1517248135467-4c7edcad34c4',
  owner: '1500648767791-00dcc994a43e',
  manager: '1494790108377-be9c29b29330',
  waiter: '1507003211169-0a1dd7228f2d',
  cook: '1583394293214-28ded15ee548',
  chili: '1583119022894-919a68a3d0e3',
  peppers: '1563565375-f3fdfdbefa83',
  lettuce: '1622206151226-18ca2c9ab4a1',
};

export const bob = keyframes`
  0%, 100% { transform: translateY(0) rotate(var(--tilt, 0deg)); }
  50% { transform: translateY(-12px) rotate(calc(var(--tilt, 0deg) + 4deg)); }
`;

export const turn = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const shimmer = keyframes`
  from { background-position: 0% 50%; }
  to { background-position: 200% 50%; }
`;

export const motionSafe = { '@media (prefers-reduced-motion: reduce)': { animation: 'none !important', transition: 'none !important' } };

export function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, visible]);

  return { ref, visible };
}

export function Reveal({ children, delay = 0, from = 'up', sx }: { children: ReactNode; delay?: number; from?: 'up' | 'left' | 'right' | 'zoom'; sx?: SxProps<Theme> }) {
  const { ref, visible } = useInView<HTMLDivElement>();
  const hidden = { up: 'translateY(32px)', left: 'translateX(-40px)', right: 'translateX(40px)', zoom: 'scale(.92)' }[from];
  return (
    <Box
      ref={ref}
      sx={[
        {
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : hidden,
          transition: `opacity .8s ease ${delay}ms, transform .9s cubic-bezier(.2,.75,.2,1) ${delay}ms`,
          '@media (prefers-reduced-motion: reduce)': { opacity: 1, transform: 'none', transition: 'none' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export function CountUp({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.6);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 1400);
      setValue(Math.round(to * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, to]);

  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

export function Title({ children, accent, align = 'center', size = 40 }: { children: ReactNode; accent?: string; align?: 'center' | 'left'; size?: number }) {
  return (
    <Typography component="h2" sx={{ textAlign: align, fontFamily: landing.sans, fontWeight: 800, fontSize: { xs: size * 0.75, md: size }, lineHeight: 1.15, letterSpacing: '-0.02em', color: landing.ink }}>
      {children}
      {accent && (
        <>
          {' '}
          <Box component="span" sx={{ color: landing.accent }}>
            {accent}
          </Box>
        </>
      )}
    </Typography>
  );
}

export function Sub({ children, align = 'center', sx }: { children: ReactNode; align?: 'center' | 'left'; sx?: SxProps<Theme> }) {
  return (
    <Typography sx={[{ textAlign: align, fontFamily: landing.sans, fontWeight: 500, fontSize: 15, lineHeight: 1.7, color: landing.body }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Typography>
  );
}

export function Photo({ id, alt, width = 900, height, sx }: { id: string; alt: string; width?: number; height?: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="img"
      src={photo(id, width, height)}
      alt={alt}
      loading="lazy"
      draggable={false}
      sx={[{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}

export type CutoutName = 'chili' | 'peppers' | 'lettuce';

export function Cutout({ name, size, sx }: { name: CutoutName; size: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="img"
      src={`/landing/${name}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      draggable={false}
      sx={[{ display: 'block', width: size, height: 'auto', userSelect: 'none', ...(name === 'lettuce' ? { maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%)' } : {}) }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}

export const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
