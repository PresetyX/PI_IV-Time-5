import { useEffect, useRef, useState } from 'react';
import { keyframes } from '@emotion/react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Container, Drawer, Typography } from '@mui/material';
import { CLIPS, Clip, Cutout, Em, PHOTOS, bob, drift, landing, motionSafe, photo, turn } from './landingKit';
import ChefMascot, { MascotDock } from './ChefMascot';
import { HowItWorksSection } from './landingIllustrations';
import { ConversionSection, CtaSection, DEMO_PATH, FaqSection, Footer, ObservabilitySection, PlansSection } from './LandingInsights';
import { RolesSection } from './landingRoles';
import { GallerySection, MarqueeBand, ModulesSection, ProductSection, SegmentsSection, StatsStrip, WhySection } from './LandingSections';

const { accent, accentDark, peach, ink, body, line, white, sans } = landing;

const NAV = [
  { id: 'produto', label: 'Produto' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'conversao', label: 'Conversão' },
  { id: 'observabilidade', label: 'Observabilidade' },
  { id: 'planos', label: 'Planos' },
  { id: 'duvidas', label: 'Dúvidas' },
];

function ScrollProgress() {
  const bar = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <Box ref={bar} aria-hidden sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 40, transformOrigin: '0 50%', transform: 'scaleX(0)', background: `linear-gradient(90deg, #F2B27A, ${accent})` }} />;
}

const HERO_REEL = [CLIPS.wok, CLIPS.chef, CLIPS.bigKitchen];

function HeroReel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setCurrent((value) => (value + 1) % HERO_REEL.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'multiply', opacity: 0.2 }}>
      {HERO_REEL.map((id, index) => (
        <Box key={id} sx={{ position: 'absolute', inset: 0, opacity: index === current ? 1 : 0, transition: 'opacity 1.8s ease' }}>
          <Clip id={id} quality={360} sx={{ filter: 'grayscale(.55) contrast(1.15) brightness(1.05)', animation: `${drift} 14s ease-in-out infinite alternate`, ...motionSafe }} />
        </Box>
      ))}
    </Box>
  );
}

const sheen = keyframes`
  0% { background-position: 160% 0, 0 0; }
  55%, 100% { background-position: -60% 0, 0 0; }
`;

const wave = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-7px) rotate(-1.2deg); }
`;

function MetallicText({ text }: { text: string }) {
  return (
    <Em sx={{ display: 'block', pb: 2, fontSize: '1.08em', letterSpacing: '-0.02em', filter: 'drop-shadow(0 8px 18px rgba(235,90,36,.28))' }}>
      {text.split(' ').map((word, index) => (
        <Box
          key={`${word}-${index}`}
          component="span"
          sx={{
            display: 'inline-block',
            mr: '0.22em',
            '&:last-of-type': { mr: 0 },
            px: '0.04em',
            backgroundImage: 'linear-gradient(105deg, rgba(255,255,255,0) 38%, rgba(255,244,230,.95) 50%, rgba(255,255,255,0) 62%), linear-gradient(180deg, #FFB98A 0%, #F4732F 34%, #B23F0E 52%, #E5612A 66%, #FF9C5E 84%, #C1491A 100%)',
            backgroundSize: '260% 100%, 100% 100%',
            backgroundRepeat: 'no-repeat',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            animation: `${sheen} 4.2s cubic-bezier(.45,.05,.35,1) ${index * 0.14}s infinite, ${wave} 3.6s ease-in-out ${index * 0.22}s infinite`,
            ...motionSafe,
          }}
        >
          {word}
        </Box>
      ))}
    </Em>
  );
}

function useActiveSection() {
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 30);
      const current = [...NAV].reverse().find((item) => {
        const node = document.getElementById(item.id);
        return node && node.getBoundingClientRect().top < window.innerHeight * 0.35;
      });
      setActive(current?.id ?? '');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { active, scrolled };
}

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function Icon({ d }: { d: string }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d={d} />
    </Box>
  );
}

function NavBar() {
  const { active, scrolled } = useActiveSection();
  const [open, setOpen] = useState(false);

  return (
    <Box component="header" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, px: { xs: 3, md: 5 }, pt: scrolled ? 2 : 4, transition: 'padding .35s ease' }}>
      <Box
        sx={{
          maxWidth: 1160,
          mx: 'auto',
          height: 64,
          pl: { xs: 4, md: 5 },
          pr: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 999,
          bgcolor: '#0D0D0D',
          boxShadow: scrolled ? '0 20px 40px -24px rgba(0,0,0,.7)' : '0 10px 30px -20px rgba(0,0,0,.5)',
          transition: 'box-shadow .35s ease',
        }}
      >
        <ButtonBase onClick={() => go('inicio')} sx={{ gap: 2, borderRadius: 999, color: white }}>
          <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefMascot size={30} color={white} steam={false} float={false} label="Pede Aí" />
          </Box>
          <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>Pede Aí</Typography>
        </ButtonBase>
        <Box component="nav" sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5, ml: 4 }}>
          {NAV.map((item) => {
            const selected = active === item.id;
            return (
              <ButtonBase
                key={item.id}
                onClick={() => go(item.id)}
                sx={{
                  gap: 1.5,
                  px: 3.5,
                  height: 34,
                  borderRadius: 999,
                  fontFamily: sans,
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: selected ? ink : 'rgba(255,255,255,.88)',
                  bgcolor: selected ? white : 'transparent',
                  transition: 'all .3s ease',
                  '&:hover': { color: selected ? ink : white },
                }}
              >
                {selected && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ink }} />}
                {item.label}
              </ButtonBase>
            );
          })}
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ButtonBase component="a" href="https://github.com/PresetyX/PI_IV-Time-5" target="_blank" rel="noreferrer" aria-label="Código no GitHub" sx={{ display: { xs: 'none', md: 'flex' }, width: 40, height: 40, borderRadius: '50%', color: white, '&:hover': { bgcolor: 'rgba(255,255,255,.1)' } }}>
            <Icon d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
          </ButtonBase>
          <ButtonBase component={RouterLink} to="/login" aria-label="Entrar como equipe" sx={{ display: { xs: 'none', md: 'flex' }, width: 40, height: 40, borderRadius: '50%', color: white, '&:hover': { bgcolor: 'rgba(255,255,255,.1)' } }}>
            <Icon d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
          </ButtonBase>
          <ButtonBase
            component={RouterLink}
            to={DEMO_PATH}
            sx={{ ml: 1, height: 46, px: { xs: 4, md: 6 }, borderRadius: 999, bgcolor: accent, color: white, fontFamily: sans, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', transition: 'background-color .25s ease', '&:hover': { bgcolor: accentDark } }}
          >
            Testar agora
          </ButtonBase>
          <ButtonBase aria-label="Abrir menu" onClick={() => setOpen(true)} sx={{ display: { lg: 'none' }, width: 44, height: 44, borderRadius: '50%', color: white }}>
            <Icon d="M4 7h16M4 12h16M4 17h16" />
          </ButtonBase>
        </Box>
      </Box>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 290, p: 6, bgcolor: '#0D0D0D', color: white } }}>
        {NAV.map((item) => (
          <ButtonBase
            key={item.id}
            onClick={() => {
              setOpen(false);
              setTimeout(() => go(item.id), 250);
            }}
            sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%', py: 3, fontFamily: sans, fontWeight: 700, fontSize: 18, color: active === item.id ? accent : white, borderBottom: '1px solid rgba(255,255,255,.1)' }}
          >
            {item.label}
          </ButtonBase>
        ))}
        <ButtonBase component={RouterLink} to="/login" sx={{ mt: 6, height: 46, borderRadius: 999, border: '1px solid rgba(255,255,255,.35)', color: white, fontFamily: sans, fontWeight: 700 }}>
          Entrar como equipe
        </ButtonBase>
      </Drawer>
    </Box>
  );
}

function SilkCanvas() {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const node = canvas.current;
    const context = node?.getContext('2d');
    if (!node || !context) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = node.clientWidth;
      height = node.clientHeight;
      node.width = Math.round(width * ratio);
      node.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const folds = Array.from({ length: 9 }, (_, index) => ({
      base: 0.08 + index * 0.11,
      amplitude: 40 + (index % 3) * 26,
      wave: 0.0022 + (index % 4) * 0.0007,
      speed: 0.00018 + (index % 5) * 0.00005,
      phase: index * 1.7,
      tint: 236 - (index % 3) * 9,
    }));

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#FBFBFA');
      background.addColorStop(0.5, '#F1F0EE');
      background.addColorStop(1, '#FAF9F7');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      folds.forEach((fold) => {
        const t = reduce ? 0 : time * fold.speed;
        const y0 = fold.base * height;
        const curve = (x: number) =>
          y0 + Math.sin(x * fold.wave + fold.phase + t) * fold.amplitude + Math.sin(x * fold.wave * 2.3 - t * 1.3) * fold.amplitude * 0.35;
        context.beginPath();
        context.moveTo(0, curve(0));
        for (let x = 0; x <= width; x += 24) context.lineTo(x, curve(x));
        context.lineTo(width, curve(width) + 140);
        for (let x = width; x >= 0; x -= 24) context.lineTo(x, curve(x) + 140 + Math.sin(x * fold.wave * 1.6 + t) * 30);
        context.closePath();
        const shade = context.createLinearGradient(0, y0 - fold.amplitude, 0, y0 + 180);
        shade.addColorStop(0, 'rgba(255,255,255,0)');
        shade.addColorStop(0.35, 'rgba(255,255,255,.95)');
        shade.addColorStop(0.62, `rgba(${fold.tint},${fold.tint},${fold.tint + 2},.55)`);
        shade.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = shade;
        context.fill();
      });

      if (!reduce) frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <Box component="canvas" ref={canvas} aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'blur(14px) saturate(.9)', transform: 'scale(1.06)' }} />;
}

function Rail({ side, plates }: { side: 'left' | 'right'; plates: { id: string; alt: string }[] }) {
  const flip = side === 'right';
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: { lg: '3%', xl: '6%' },
        width: 230,
        display: { xs: 'none', lg: 'block' },
      }}
    >
      <Box component="svg" viewBox="0 0 230 900" preserveAspectRatio="none" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: flip ? 'scaleX(-1)' : 'none' }}>
        <defs>
          <linearGradient id={`rail-${side}`} x1="0" x2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".5" stopColor="#E9E7E4" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
          <linearGradient id={`glow-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F2B27A" stopOpacity="0" />
            <stop offset=".5" stopColor="#F2B27A" stopOpacity=".55" />
            <stop offset="1" stopColor="#F2B27A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M40 0 V120 Q40 150 70 150 H160 Q190 150 190 180 V390 Q190 420 160 420 H70 Q40 420 40 450 V900" fill="none" stroke={`url(#rail-${side})`} strokeWidth="14" />
        <path d="M40 0 V120 Q40 150 70 150 H160 Q190 150 190 180 V390 Q190 420 160 420 H70 Q40 420 40 450 V900" fill="none" stroke="rgba(0,0,0,.05)" strokeWidth="1" />
        <path d="M115 0 V900" stroke={`url(#glow-${side})`} strokeWidth="2" />
        <path d="M40 470 V560 Q40 590 70 590 H160 Q190 590 190 620 V820 Q190 850 160 850 H70 Q40 850 40 880" fill="none" stroke={`url(#rail-${side})`} strokeWidth="14" />
      </Box>
      {plates.map((plate, index) => (
        <Box
          key={plate.id}
          sx={{
            position: 'absolute',
            left: flip ? 'auto' : 30,
            right: flip ? 30 : 'auto',
            top: index === 0 ? '17%' : '64%',
            width: 170,
            height: 170,
            borderRadius: '50%',
            boxShadow: '0 30px 40px -22px rgba(0,0,0,.55), 0 0 0 8px rgba(255,255,255,.85)',
            overflow: 'hidden',
            animation: `${turn} ${50 + index * 12}s linear infinite ${index % 2 ? 'reverse' : 'normal'}`,
            ...motionSafe,
          }}
        >
          <Box component="img" src={photo(plate.id, 360, 360)} alt={plate.alt} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </Box>
      ))}
    </Box>
  );
}

function Hero() {
  return (
    <Box component="section" id="inicio" sx={{ position: 'relative', isolation: 'isolate', minHeight: { xs: 700, md: 'max(780px, min(100vh, 940px))' }, display: 'flex', alignItems: 'center', overflow: 'hidden', borderBottom: `1px solid ${line}` }}>
      <SilkCanvas />
      <HeroReel />
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(55% 50% at 50% 48%, rgba(255,255,255,.88) 0%, rgba(255,255,255,.35) 60%, rgba(255,255,255,0) 85%)' }} />
      <Box aria-hidden sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, background: 'linear-gradient(180deg, rgba(247,246,244,0), #F7F6F4)' }} />

      <Rail side="left" plates={[{ id: PHOTOS.bowl, alt: 'Bowl de salmão' }, { id: PHOTOS.pancakes, alt: 'Panquecas' }]} />
      <Rail side="right" plates={[{ id: PHOTOS.nuggets, alt: 'Iscas de frango' }]} />

      {[
        { name: 'lemon' as const, size: 78, left: '21%', top: 120, tilt: '-12deg', delay: 0 },
        { name: 'chili' as const, size: 96, right: '20%', top: 130, tilt: '28deg', delay: 0.8 },
        { name: 'cherry' as const, size: 96, left: '25%', bottom: 60, tilt: '8deg', delay: 1.4 },
        { name: 'mushroom' as const, size: 70, right: '28%', bottom: 50, tilt: '10deg', delay: 2.1 },
      ].map((sprite, index) => (
        <Box key={index} aria-hidden sx={{ position: 'absolute', left: sprite.left, right: sprite.right, top: sprite.top, bottom: sprite.bottom, display: { xs: 'none', md: 'block' } }}>
          <Cutout name={sprite.name} size={sprite.size} sx={{ '--tilt': sprite.tilt, animation: `${bob} ${5 + index}s ease-in-out ${sprite.delay}s infinite`, filter: 'drop-shadow(0 10px 8px rgba(0,0,0,.12))', ...motionSafe }} />
        </Box>
      ))}

      <Container maxWidth="md" sx={{ position: 'relative', pt: { xs: 24, md: 30 }, pb: { xs: 14, md: 14 }, textAlign: 'center' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, px: 4, py: 2, borderRadius: '10px', bgcolor: 'rgba(253,231,220,.9)', boxShadow: '0 10px 30px -10px rgba(235,90,36,.45)', animation: 'heroIn .9s ease both', '@keyframes heroIn': { from: { opacity: 0, transform: 'translateY(18px)' }, to: { opacity: 1, transform: 'none' } } }}>
          <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: 'none', stroke: ink, strokeWidth: 1.8, strokeLinecap: 'round' }}>
            <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 0-3 2-3 5s1 4 3 4v9" />
          </Box>
          <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: { xs: 10, sm: 12 }, letterSpacing: { xs: 0.6, sm: 1.6 }, color: ink, whiteSpace: 'nowrap' }}>PLATAFORMA WHITE-LABEL DE COMANDAS DIGITAIS</Typography>
        </Box>
        <Typography component="h1" sx={{ mt: 6, fontFamily: sans, fontWeight: 800, fontSize: { xs: 38, sm: 54, md: 68 }, lineHeight: 1.08, letterSpacing: '-0.035em', color: ink, animation: 'heroIn .9s ease .1s both' }}>
          Comanda digital com
          <MetallicText text="a cara da sua casa" />
        </Typography>
        <Box sx={{ position: 'relative', mt: 5, mx: 'auto', maxWidth: 560, animation: 'heroIn .9s ease .2s both' }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: { xs: 15, md: 17 }, lineHeight: 1.7, color: body }}>
            Cardápio por QR, comanda compartilhada, cozinha, salão, caixa e gestão numa plataforma que leva a marca do seu restaurante. Sem app para instalar e sem taxa por pedido.
          </Typography>
          <Box component="svg" viewBox="0 0 600 60" aria-hidden sx={{ position: 'absolute', left: '-14%', right: '-14%', width: '128%', top: { xs: '70%', md: '62%' }, height: 60, overflow: 'visible' }}>
            <defs>
              <linearGradient id="swoosh" x1="0" x2="1">
                <stop offset="0" stopColor="#F2B27A" stopOpacity="0" />
                <stop offset=".25" stopColor="#EE8A4A" />
                <stop offset=".75" stopColor="#EE8A4A" />
                <stop offset="1" stopColor="#F2B27A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M8 18 Q300 70 592 14" fill="none" stroke="url(#swoosh)" strokeWidth="3" strokeLinecap="round" style={{ strokeDasharray: 700, strokeDashoffset: 700, animation: 'swooshDraw 1.6s ease .6s forwards' }} />
            <path d="M30 22 Q300 64 570 18" fill="none" stroke="url(#swoosh)" strokeWidth="1.2" strokeLinecap="round" opacity=".6" style={{ strokeDasharray: 700, strokeDashoffset: 700, animation: 'swooshDraw 1.6s ease .8s forwards' }} />
          </Box>
          <Box sx={{ '@keyframes swooshDraw': { to: { strokeDashoffset: 0 } } }} />
        </Box>
        <Box sx={{ position: 'relative', mt: 12, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', animation: 'heroIn .9s ease .3s both' }}>
          <Box sx={{ position: 'absolute', right: { md: -30, lg: -70, xl: -160 }, top: { md: -50, xl: -80 }, display: { xs: 'none', md: 'block' }, zIndex: 2, animation: 'biggasDrop 1.3s cubic-bezier(.34,1.56,.64,1) .7s both', '@keyframes biggasDrop': { from: { opacity: 0, transform: 'translateY(-420px) rotate(-35deg)' }, '60%': { opacity: 1 }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}>
            <ChefMascot size={{ md: 140, lg: 160, xl: 190 }} phrases={['Oi, eu sou o Biggas!', 'Mesa 7 pediu 2 smash!', 'Batata saindo!', 'Conta da mesa 4 no Pix', 'Pedido novo na fila!']} />
          </Box>
          <ButtonBase
            component={RouterLink}
            to={DEMO_PATH}
            sx={{ height: 52, px: 7, borderRadius: 999, bgcolor: accent, color: white, fontFamily: sans, fontWeight: 700, fontSize: 15, boxShadow: '0 16px 30px -14px rgba(235,90,36,.8)', transition: 'all .25s ease', '&:hover': { bgcolor: accentDark, transform: 'translateY(-2px)' } }}
          >
            Testar a demonstração
          </ButtonBase>
          <ButtonBase
            onClick={() => go('modulos')}
            sx={{ height: 52, px: 7, borderRadius: 999, bgcolor: peach, color: ink, fontFamily: sans, fontSize: 15, fontWeight: 700, transition: 'all .25s ease', '&:hover': { bgcolor: '#FBD6C4', transform: 'translateY(-2px)' } }}
          >
            Conhecer os módulos
          </ButtonBase>
        </Box>
        <Box sx={{ mt: 7, display: 'flex', justifyContent: 'center', gap: { xs: 4, md: 8 }, flexWrap: 'wrap', animation: 'heroIn .9s ease .4s both' }}>
          {['Sua marca e suas cores', 'Sem taxa por pedido', 'Pronto em um dia'].map((item) => (
            <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: sans, fontWeight: 600, fontSize: 13.5, color: body }}>
              <Box sx={{ width: 34, height: '1.5px', bgcolor: accent }} />
              {item}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Pede Aí · Comandas digitais white-label para restaurantes';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <Box sx={{ bgcolor: '#F7F6F4', color: ink, overflowX: 'hidden', '& .MuiContainer-root': { px: { xs: 4, sm: 6 } } }}>
      <ScrollProgress />
      <NavBar />
      <main>
        <Hero />
        <StatsStrip />
        <ProductSection />
        <HowItWorksSection />
        <WhySection />
        <MarqueeBand />
        <ModulesSection />
        <ConversionSection />
        <ObservabilitySection />
        <SegmentsSection />
        <GallerySection />
        <RolesSection />
        <PlansSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
      <MascotDock />
    </Box>
  );
}
