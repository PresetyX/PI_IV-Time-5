import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import { Photo, formatPrice, landing, photo } from './landingKit';

const { accent, ink, body, muted, line, white, sans } = landing;

export interface MenuHighlight {
  image: string;
  name: string;
  category: string;
  priceCents: number;
  prepMinutes: number;
  banner: string;
}

function ArrowButton({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={direction === 'prev' ? 'Anterior' : 'Próximo'}
      onClick={onClick}
      sx={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${line}`, bgcolor: white, color: ink, transition: 'all .25s ease', '&:hover': { bgcolor: accent, borderColor: accent, color: white, transform: 'scale(1.06)' } }}
    >
      <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', transform: direction === 'prev' ? 'rotate(180deg)' : 'none' }}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </Box>
    </ButtonBase>
  );
}

export function TrendingCarousel({ items }: { items: MenuHighlight[] }) {
  const track = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const node = track.current;
    if (!node) return;
    const count = Math.max(1, Math.ceil(node.scrollWidth / node.clientWidth - 0.05));
    setPages(count);
    setPage(Math.min(count - 1, Math.round(node.scrollLeft / node.clientWidth)));
  }, []);

  const move = useCallback((direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 20 : node.clientWidth;
    const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 8;
    if (direction === 1 && atEnd) node.scrollTo({ left: 0, behavior: 'smooth' });
    else node.scrollBy({ left: step * direction, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => move(1), 3800);
    return () => clearInterval(timer);
  }, [paused, move]);

  return (
    <Box onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Box
        ref={track}
        onScroll={measure}
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: '82%', sm: '46%', md: 'calc((100% - 40px) / 3)' },
          gap: '20px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          py: 3,
          px: 0.5,
        }}
      >
        {items.map((item) => (
          <Box
            key={item.name}
            data-card
            sx={{
              scrollSnapAlign: 'start',
              bgcolor: white,
              borderRadius: '18px',
              overflow: 'hidden',
              border: `1px solid ${line}`,
              transition: 'transform .4s cubic-bezier(.2,.75,.2,1), box-shadow .4s ease',
              '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 26px 40px -26px rgba(0,0,0,.35)' },
              '&:hover img': { transform: 'scale(1.08)' },
            }}
          >
            <Box sx={{ position: 'relative', height: 200, overflow: 'hidden', '& img': { transition: 'transform 1s cubic-bezier(.2,.75,.2,1)' } }}>
              <Photo id={item.image} alt={item.name} width={700} height={460} />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.72) 100%)' }} />
              <Box sx={{ position: 'absolute', right: 12, top: 12, px: 3, py: 1, borderRadius: 999, bgcolor: accent, color: white, fontFamily: sans, fontWeight: 700, fontSize: 12 }}>Aberto</Box>
              <Typography sx={{ position: 'absolute', left: 16, bottom: 12, fontFamily: sans, fontWeight: 800, fontSize: 15, color: white, letterSpacing: 0.3, textTransform: 'uppercase' }}>{item.banner}</Typography>
            </Box>
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 17, color: ink }}>{item.name}</Typography>
                <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: muted }}>{item.category}</Typography>
              </Box>
              <Box sx={{ mt: 3, display: 'flex', gap: 4, fontFamily: sans, fontWeight: 600, fontSize: 12.5, color: body }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ color: accent }}>●</Box> {formatPrice(item.priceCents)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="svg" viewBox="0 0 24 24" sx={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </Box>
                  {item.prepMinutes} min
                </Box>
                <Box>Mesa ou balcão</Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {Array.from({ length: pages }).map((_, index) => (
            <Box key={index} sx={{ height: 6, width: index === page ? 28 : 6, borderRadius: 3, bgcolor: index === page ? accent : '#DDD6CF', transition: 'width .35s ease, background-color .35s ease' }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ArrowButton direction="prev" onClick={() => move(-1)} />
          <ArrowButton direction="next" onClick={() => move(1)} />
        </Box>
      </Box>
    </Box>
  );
}

export function CurvedGallery({ images }: { images: { id: string; alt: string }[] }) {
  const stage = useRef<HTMLDivElement | null>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const paused = useRef(false);
  const list = [...images, ...images, ...images];

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let offset = 0;
    let frame = 0;
    let last = performance.now();

    const render = (now: number) => {
      const node = stage.current;
      if (!node) return;
      const width = node.clientWidth;
      const card = width < 700 ? 170 : 240;
      const gap = 18;
      const step = card + gap;
      const loop = step * images.length;
      if (!paused.current && !reduce) offset = (offset + ((now - last) / 1000) * 38) % loop;
      last = now;
      items.current.forEach((element, index) => {
        if (!element) return;
        let x = index * step - offset - loop;
        while (x < -step * 2) x += loop * 3;
        while (x > width + step) x -= loop * 3;
        const center = x + card / 2 - width / 2;
        const distance = Math.max(-1.6, Math.min(1.6, center / (width / 2)));
        const lift = distance * distance;
        element.style.width = `${card}px`;
        element.style.transform = `translate3d(${x}px, ${-lift * 18}px, 0) rotateY(${-distance * 24}deg) scale(${1 + lift * 0.16})`;
        element.style.zIndex = String(100 - Math.round(Math.abs(distance) * 10));
        element.style.filter = `brightness(${1 - Math.abs(distance) * 0.08})`;
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [images.length]);

  return (
    <Box
      ref={stage}
      aria-label="Galeria de cozinhas e salões"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
      sx={{ position: 'relative', height: { xs: 260, md: 360 }, perspective: '1100px', overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)' }}
    >
      {list.map((image, index) => (
        <Box
          key={`${image.id}-${index}`}
          ref={(element: HTMLDivElement | null) => {
            items.current[index] = element;
          }}
          sx={{ position: 'absolute', left: 0, top: { xs: 40, md: 60 }, height: { xs: 190, md: 250 }, borderRadius: '16px', overflow: 'hidden', willChange: 'transform', transformStyle: 'preserve-3d', boxShadow: '0 20px 40px -24px rgba(0,0,0,.5)' }}
        >
          <Photo id={image.id} alt={image.alt} width={520} height={560} />
        </Box>
      ))}
    </Box>
  );
}

export function TiltCard({ children, sx }: { children: ReactNode; sx?: object }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  function track(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({ x: ((event.clientY - rect.top) / rect.height - 0.5) * -10, y: ((event.clientX - rect.left) / rect.width - 0.5) * 12 });
  }
  return (
    <Box sx={{ perspective: '900px', height: '100%' }}>
      <Box
        onMouseMove={track}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        sx={{ height: '100%', transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d', transition: 'transform .25s ease-out', '@media (prefers-reduced-motion: reduce)': { transform: 'none' }, ...sx }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function PersonaCard({ image, name, role, quote, sees, to }: { image: string; name: string; role: string; quote: string; sees: string[]; to: string }) {
  return (
    <Box tabIndex={0} sx={{ perspective: '1200px', height: 400, outline: 'none', '&:hover .flip, &:focus-visible .flip': { transform: 'rotateY(180deg)' } }}>
      <Box className="flip" sx={{ position: 'relative', height: '100%', transformStyle: 'preserve-3d', transition: 'transform .8s cubic-bezier(.2,.75,.2,1)', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}>
        <Box sx={{ position: 'absolute', inset: 0, borderRadius: '22px', overflow: 'hidden', backfaceVisibility: 'hidden' }}>
          <Box component="img" src={photo(image, 600, 800)} alt={name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.8) 100%)' }} />
          <Box sx={{ position: 'absolute', left: 18, top: 18, px: 3, py: 1, borderRadius: 999, bgcolor: 'rgba(255,255,255,.92)', fontFamily: sans, fontWeight: 800, fontSize: 11.5, letterSpacing: 0.5, color: accent, textTransform: 'uppercase' }}>{role}</Box>
          <Box sx={{ position: 'absolute', left: 20, right: 20, bottom: 20, color: white }}>
            <Typography sx={{ fontFamily: landing.serif, fontSize: 24 }}>{name}</Typography>
            <Typography sx={{ mt: 1, fontFamily: sans, fontWeight: 500, fontSize: 13.5, opacity: 0.85 }}>“{quote}”</Typography>
          </Box>
        </Box>
        <Box sx={{ position: 'absolute', inset: 0, borderRadius: '22px', p: 6, bgcolor: ink, color: white, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, color: accent, textTransform: 'uppercase' }}>O que {name.split(' ')[0]} vê</Typography>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {sees.map((item) => (
              <Box component="li" key={item} sx={{ display: 'flex', gap: 3, fontFamily: sans, fontWeight: 600, fontSize: 14.5, lineHeight: 1.5, color: 'rgba(255,255,255,.88)' }}>
                <Box component="span" sx={{ color: accent }}>—</Box>
                {item}
              </Box>
            ))}
          </Box>
          <ButtonBase component={RouterLink} to={to} sx={{ mt: 'auto', alignSelf: 'flex-start', px: 5, height: 44, borderRadius: 999, bgcolor: accent, color: white, fontFamily: sans, fontWeight: 800, fontSize: 14 }}>
            Ver essa tela
          </ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}
