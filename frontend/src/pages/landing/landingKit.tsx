import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export const landing = {
  accent: '#E8562A',
  accentSoft: '#FDEBE4',
  ink: '#151515',
  body: '#5B5B5B',
  muted: '#8A8A8A',
  line: '#EFEAE6',
  cream: '#FBF8F5',
  serif: '"Playfair Display", Georgia, serif',
  sans: 'Manrope, system-ui, sans-serif',
};

export function photo(id: string, width = 900, height?: number): string {
  const size = height ? `&h=${height}` : '';
  return `https://images.unsplash.com/photo-${id}?w=${width}${size}&q=75&auto=format&fit=crop`;
}

export const PHOTOS = {
  spread: '1504674900247-0877df9cc836',
  pizzaBoard: '1565299624946-b28f40a0ae38',
  burger: '1568901346375-23c9450c58cd',
  bowl: '1546069901-ba9599a7e63c',
  grill: '1555939594-58d7cb561ad1',
  saladDark: '1540189549336-e6e99c3679fe',
  cake: '1565958011703-44f9829ba187',
  diningTable: '1414235077428-338989a2e8c0',
  hall: '1517248135467-4c7edcad34c4',
  friendsCooking: '1556910103-1c02745aae4d',
  chefPlating: '1577219491135-ce391730fb2c',
  bar: '1514933651103-005eec06c04b',
  chopping: '1551218808-94e220e084d2',
  tableSpread: '1600891964599-f61ba0e24092',
  saladTop: '1512621776951-a57141f2eefd',
  burgerClassic: '1571091718767-18b5b1457add',
  ribs: '1544025162-d76694265947',
  payment: '1556745753-b2904692b3cd',
  flames: '1600565193348-f74bd3c7ccdf',
  plating: '1581349485608-9469926a8e5e',
  pizza: '1574071318508-1cdbab80d002',
  burgers: '1550547660-d9450f859349',
  crowd: '1528605248644-14dd04022da1',
};

export const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(3deg); }
`;

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const marquee = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

export function useInView<T extends Element>(threshold = 0.18) {
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

export function Reveal({ children, delay = 0, sx }: { children: ReactNode; delay?: number; sx?: SxProps<Theme> }) {
  const { ref, visible } = useInView<HTMLDivElement>();
  return (
    <Box
      ref={ref}
      sx={[
        {
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(28px)',
          transition: `opacity .7s ease ${delay}ms, transform .7s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
          '@media (prefers-reduced-motion: reduce)': { opacity: 1, transform: 'none', transition: 'none' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.5);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 1200);
      setValue(Math.round(to * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, accent, lead, align = 'center' }: { eyebrow?: string; title: string; accent?: string; lead?: string; align?: 'center' | 'left' }) {
  return (
    <Box sx={{ textAlign: align, maxWidth: align === 'center' ? 640 : 520, mx: align === 'center' ? 'auto' : 0 }}>
      {eyebrow && (
        <Typography sx={{ fontFamily: landing.sans, fontSize: 12, fontWeight: 800, letterSpacing: 2, color: landing.accent, textTransform: 'uppercase' }}>
          {eyebrow}
        </Typography>
      )}
      <Typography component="h2" sx={{ mt: 2, fontFamily: landing.sans, fontWeight: 800, fontSize: { xs: 30, md: 40 }, lineHeight: 1.15, color: landing.ink }}>
        {title} {accent && <Box component="span" sx={{ color: landing.accent }}>{accent}</Box>}
      </Typography>
      {lead && <Typography sx={{ mt: 3, fontFamily: landing.sans, fontWeight: 500, fontSize: 16, lineHeight: 1.7, color: landing.body }}>{lead}</Typography>}
    </Box>
  );
}

export function Blob({ color, size, sx }: { color: string; size: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      aria-hidden
      sx={[
        { position: 'absolute', width: size, height: size, borderRadius: '50%', bgcolor: color, filter: 'blur(70px)', opacity: 0.55, pointerEvents: 'none' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
