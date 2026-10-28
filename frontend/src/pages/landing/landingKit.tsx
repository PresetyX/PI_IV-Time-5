import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export const landing = {
  accent: '#D9480F',
  accentDark: '#B93C0C',
  ink: '#141414',
  body: '#555555',
  muted: '#8A8A8A',
  line: '#E8E2DC',
  paper: '#FBF9F7',
  white: '#FFFFFF',
  serif: '"Playfair Display", Georgia, serif',
  sans: 'Manrope, system-ui, sans-serif',
  radius: '12px',
};

export function photo(id: string, width = 900, height?: number): string {
  const size = height ? `&h=${height}` : '';
  return `https://images.unsplash.com/photo-${id}?w=${width}${size}&q=75&auto=format&fit=crop`;
}

export const PHOTOS = {
  bowl: '1546069901-ba9599a7e63c',
  pizza: '1574071318508-1cdbab80d002',
  ribs: '1544025162-d76694265947',
  saladTop: '1512621776951-a57141f2eefd',
  burger: '1568901346375-23c9450c58cd',
  diningTable: '1414235077428-338989a2e8c0',
  tableSpread: '1600891964599-f61ba0e24092',
  burgers: '1550547660-d9450f859349',
  spread: '1504674900247-0877df9cc836',
  bar: '1514933651103-005eec06c04b',
  plating: '1581349485608-9469926a8e5e',
};

export function useInView<T extends Element>() {
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
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

export function Reveal({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  const { ref, visible } = useInView<HTMLDivElement>();
  return (
    <Box
      ref={ref}
      sx={[
        {
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(12px)',
          transition: 'opacity .5s ease, transform .5s ease',
          '@media (prefers-reduced-motion: reduce)': { opacity: 1, transform: 'none', transition: 'none' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ fontFamily: landing.sans, fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: landing.accent }}>
      {children}
    </Typography>
  );
}

export function Heading({ children, size = 'section', component = 'h2' }: { children: ReactNode; size?: 'hero' | 'section' | 'item'; component?: 'h1' | 'h2' | 'h3' }) {
  const fontSize = { hero: { xs: 42, md: 64 }, section: { xs: 32, md: 44 }, item: { xs: 22, md: 24 } }[size];
  return (
    <Typography component={component} sx={{ fontFamily: landing.serif, fontWeight: 600, fontSize, lineHeight: 1.1, letterSpacing: '-0.01em', color: landing.ink }}>
      {children}
    </Typography>
  );
}

export function Lead({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Typography sx={[{ fontFamily: landing.sans, fontWeight: 500, fontSize: { xs: 16, md: 18 }, lineHeight: 1.65, color: landing.body }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Typography>
  );
}

interface CtaProps {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'inverse';
}

export function Cta({ to, children, variant = 'primary' }: CtaProps) {
  const styles = {
    primary: { bgcolor: landing.accent, color: landing.white, border: `1px solid ${landing.accent}`, '&:hover': { bgcolor: landing.accentDark } },
    secondary: { bgcolor: 'transparent', color: landing.ink, border: `1px solid ${landing.ink}`, '&:hover': { bgcolor: landing.ink, color: landing.white } },
    inverse: { bgcolor: 'transparent', color: landing.white, border: '1px solid rgba(255,255,255,.4)', '&:hover': { borderColor: landing.white } },
  }[variant];
  const internal = to.startsWith('/');
  return (
    <ButtonBase
      {...(internal ? { component: RouterLink, to } : { href: to })}
      sx={{
        ...styles,
        height: 50,
        px: 6,
        borderRadius: '10px',
        fontFamily: landing.sans,
        fontWeight: 700,
        fontSize: 15,
        transition: 'background-color .2s ease, color .2s ease, border-color .2s ease',
      }}
    >
      {children}
    </ButtonBase>
  );
}

export function Img({ id, alt, width = 900, height, sx }: { id: string; alt: string; width?: number; height?: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="img"
      src={photo(id, width, height)}
      alt={alt}
      loading="lazy"
      sx={[{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: landing.radius }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}
