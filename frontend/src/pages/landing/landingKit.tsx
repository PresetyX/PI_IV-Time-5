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
  display: '"Playfair Display", Georgia, serif',
  sans: 'Manrope, system-ui, sans-serif',
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
  burgerClassic: '1571091718767-18b5b1457add',
  fries: '1541592106381-b31e9677c0e5',
  nuggets: '1562967914-608f82629710',
  shake: '1572490122747-3968b75cc699',
  juice: '1600271886742-f049cd451bba',
  beer: '1608270586620-248524c67de9',
  pancakes: '1506084868230-bb9d95c24759',
  chefPlating: '1577219491135-ce391730fb2c',
  chefWoman: '1595257841889-eca2678454e2',
  friendsCooking: '1556910103-1c02745aae4d',
  crowd: '1528605248644-14dd04022da1',
  bar: '1514933651103-005eec06c04b',
  hall: '1517248135467-4c7edcad34c4',
  latte: '1760175445000-0e01e193d1cd',
  sushi: '1564489563601-c53cfc451e93',
  tacos: '1511690078903-71dc5a49f5e3',
  iceCream: '1629385701021-fcd568a743e8',
  pasta: '1621996346565-e3dbc646d9a9',
};

export const CLIPS = {
  brigade: 15875,
  chef: 39535,
  bigKitchen: 43048,
  wok: 9286,
  finishing: 13261,
  garlic: 43055,
  bar: 4043,
  waiter: 4672,
  meatballs: 3806,
  bacon: 43063,
  eggs: 2686,
  cocktail: 4295,
  porkChop: 2439,
  ceviche: 3793,
  roast: 32457,
  flour: 1669,
  guests: 4385,
};

export function clipSource(id: number, quality: 360 | 720 = 720): string {
  return `https://assets.mixkit.co/videos/${id}/${id}-${quality}.mp4`;
}

export function clipPoster(id: number): string {
  return `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`;
}

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

export const drift = keyframes`
  from { transform: scale(1.12) translate3d(-1.5%, -1%, 0); }
  to { transform: scale(1.02) translate3d(1.5%, 1%, 0); }
`;

export const marquee = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
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
          <Scribble>{accent}</Scribble>
        </>
      )}
    </Typography>
  );
}

export function Scribble({ children }: { children: ReactNode }) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.6);
  return (
    <Box component="span" ref={ref} sx={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <Em>{children}</Em>
      <Box component="svg" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden sx={{ position: 'absolute', left: '-2%', bottom: '-0.12em', width: '104%', height: '0.32em', overflow: 'visible' }}>
        <path
          d="M4 14 C 60 4, 120 18, 180 9 S 270 6, 296 11"
          fill="none"
          stroke={landing.accent}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.55}
          style={{ strokeDasharray: 320, strokeDashoffset: visible ? 0 : 320, transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.75,.2,1) .35s' }}
        />
      </Box>
    </Box>
  );
}

export function Em({ children, color = landing.accent, sx }: { children: ReactNode; color?: string; sx?: SxProps<Theme> }) {
  return (
    <Box component="em" sx={[{ fontFamily: landing.display, fontStyle: 'italic', fontWeight: 600, letterSpacing: '-0.01em', color }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

export function Clip({ id, alt, quality = 720, sx }: { id: number; alt?: string; quality?: 360 | 720; sx?: SxProps<Theme> }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    node.muted = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const play = () => node.play().catch(() => undefined);
    if (typeof IntersectionObserver === 'undefined') {
      play();
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play();
        else node.pause();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      component="video"
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={clipPoster(id)}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      sx={[{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <source src={clipSource(id, quality)} type="video/mp4" />
    </Box>
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

export type CutoutName = 'chili' | 'peppers' | 'lemon' | 'cherry' | 'mushroom' | 'avocado' | 'broccoli' | 'strawberry';

export function Cutout({ name, size, sx }: { name: CutoutName; size: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="img"
      src={`/landing/${name}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      draggable={false}
      sx={[{ display: 'block', width: size, height: 'auto', userSelect: 'none' }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}

export const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
