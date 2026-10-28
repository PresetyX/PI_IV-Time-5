import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ButtonBase, Container, Drawer, IconButton, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import { PHOTOS, float, landing, photo } from './landingKit';
import {
  AboutSection,
  CtaSection,
  FaqSection,
  Footer,
  GallerySection,
  HowItWorksSection,
  ManagementSection,
  ModesSection,
  WhySection,
} from './LandingSections';

const { accent, accentSoft, ink, body, cream, serif, sans } = landing;

const NAV = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'como-funciona', label: 'Como funciona' },
  { id: 'atendimento', label: 'Atendimento' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'duvidas', label: 'Dúvidas' },
];

function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
      const current = [...NAV].reverse().find((item) => {
        const section = document.getElementById(item.id);
        return section && section.getBoundingClientRect().top < window.innerHeight * 0.4;
      });
      setActive(current?.id ?? '');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { scrolled, active };
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function NavBar() {
  const { scrolled, active } = useScrollState();
  const [open, setOpen] = useState(false);

  return (
    <Box component="header" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, px: { xs: 3, md: 5 }, pt: scrolled ? 2 : 4, transition: 'padding .3s ease' }}>
      <Box
        sx={{
          maxWidth: 1180,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          pl: 4,
          pr: 2,
          height: 64,
          borderRadius: 999,
          bgcolor: scrolled ? 'rgba(17,17,17,.92)' : '#111',
          backdropFilter: 'blur(12px)',
          boxShadow: scrolled ? '0 18px 40px -24px rgba(0,0,0,.6)' : 'none',
          transition: 'background-color .3s ease, box-shadow .3s ease',
        }}
      >
        <ButtonBase onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#fff', borderRadius: 999, pr: 2 }}>
          <BrandMark sx={{ fontSize: 34, color: '#fff' }} />
          <Typography sx={{ fontFamily: serif, fontSize: 22, color: '#fff' }}>Pede Aí</Typography>
        </ButtonBase>
        <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, mx: 'auto', gap: 1 }}>
          {NAV.map((item) => (
            <ButtonBase
              key={item.id}
              onClick={() => scrollTo(item.id)}
              sx={{
                px: 4,
                height: 38,
                borderRadius: 999,
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 14,
                color: active === item.id ? ink : 'rgba(255,255,255,.85)',
                bgcolor: active === item.id ? '#fff' : 'transparent',
                transition: 'background-color .25s ease, color .25s ease',
                '&:hover': { color: active === item.id ? ink : '#fff' },
              }}
            >
              {item.label}
            </ButtonBase>
          ))}
        </Box>
        <Box sx={{ ml: { xs: 'auto', md: 0 }, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button component={RouterLink} to="/login" sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#fff', borderRadius: 999, px: 4, minHeight: 44, fontWeight: 700 }}>
            Entrar
          </Button>
          <Button component={RouterLink} to="/t/triunfo-lanches?mesa=t05-000a" sx={{ bgcolor: accent, color: '#fff', borderRadius: 999, px: 5, minHeight: 46, fontWeight: 800, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#cf4720' } }}>
            Testar agora
          </Button>
          <IconButton aria-label="Abrir menu" onClick={() => setOpen(true)} sx={{ display: { md: 'none' }, color: '#fff', width: 44, height: 44 }}>
            ☰
          </IconButton>
        </Box>
      </Box>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 280, p: 6, bgcolor: cream } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 8 }}>
          <BrandMark sx={{ fontSize: 34, color: ink }} />
          <Typography sx={{ fontFamily: serif, fontSize: 22, color: ink }}>Pede Aí</Typography>
        </Box>
        {NAV.map((item) => (
          <ButtonBase
            key={item.id}
            onClick={() => {
              setOpen(false);
              setTimeout(() => scrollTo(item.id), 250);
            }}
            sx={{ display: 'block', width: '100%', textAlign: 'left', py: 3, fontFamily: sans, fontWeight: 800, fontSize: 18, color: active === item.id ? accent : ink }}
          >
            {item.label}
          </ButtonBase>
        ))}
        <Button component={RouterLink} to="/login" fullWidth sx={{ mt: 6, border: `1px solid ${ink}`, color: ink, borderRadius: 999, minHeight: 48, fontWeight: 800 }}>
          Entrar como equipe
        </Button>
      </Drawer>
    </Box>
  );
}

const HERO_DISHES = [
  { id: PHOTOS.bowl, alt: 'Bowl de salada', sx: { left: { xs: '-40px', md: '4%' }, top: { xs: 140, md: 170 } }, depth: 18, delay: '0s' },
  { id: PHOTOS.pizza, alt: 'Pizza', sx: { right: { xs: '-40px', md: '4%' }, top: { xs: 130, md: 160 } }, depth: -22, delay: '1.2s' },
  { id: PHOTOS.ribs, alt: 'Costela', sx: { left: { xs: '-30px', md: '9%' }, bottom: { xs: 30, md: 40 } }, depth: -14, delay: '.6s' },
  { id: PHOTOS.saladTop, alt: 'Salada colorida', sx: { right: { xs: '-30px', md: '10%' }, bottom: { xs: 20, md: 30 } }, depth: 24, delay: '1.8s' },
];

function Hero() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const frame = useRef(0);

  function track(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setPointer({ x, y }));
  }

  return (
    <Box
      component="section"
      onMouseMove={track}
      onMouseLeave={() => setPointer({ x: 0, y: 0 })}
      sx={{
        position: 'relative',
        minHeight: { xs: 640, md: 720 },
        pt: { xs: 26, md: 30 },
        pb: { xs: 14, md: 18 },
        overflow: 'hidden',
        background: `radial-gradient(1200px 500px at 50% 0%, #FFF4EC 0%, ${cream} 55%, #fff 100%)`,
      }}
    >
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'radial-gradient(#F1E2D8 1.2px, transparent 1.2px)', backgroundSize: '26px 26px', maskImage: 'radial-gradient(ellipse at center, #000 40%, transparent 75%)' }} />
      {HERO_DISHES.map((dish) => (
        <Box
          key={dish.id}
          sx={{
            position: 'absolute',
            ...dish.sx,
            width: { xs: 130, sm: 170, md: 210 },
            height: { xs: 130, sm: 170, md: 210 },
            transform: `translate(${pointer.x * dish.depth}px, ${pointer.y * dish.depth}px)`,
            transition: 'transform .25s ease-out',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Box sx={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '8px solid #fff', boxShadow: '0 30px 50px -24px rgba(0,0,0,.45)', animation: `${float} 7s ease-in-out ${dish.delay} infinite` }}>
            <Box component="img" src={photo(dish.id, 440, 440)} alt={dish.alt} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
        </Box>
      ))}

      <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, px: 4, py: 2, borderRadius: 999, bgcolor: accentSoft, color: accent, fontFamily: sans, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, animation: 'rise .8s ease both', '@keyframes rise': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'none' } } }}>
          <BrandMark sx={{ fontSize: 18 }} />
          PEDIDOS DIGITAIS PARA BARES E RESTAURANTES
        </Box>
        <Typography component="h1" sx={{ mt: 5, fontFamily: serif, fontWeight: 700, fontSize: { xs: 40, sm: 54, md: 68 }, lineHeight: 1.08, color: ink, animation: 'rise .8s ease .1s both' }}>
          Do QR na mesa
          <br />
          <Box component="span" sx={{ position: 'relative', color: accent, fontStyle: 'italic' }}>
            direto pra cozinha
            <Box component="svg" viewBox="0 0 300 20" aria-hidden sx={{ position: 'absolute', left: 0, right: 0, bottom: { xs: -10, md: -14 }, width: '100%', height: 16 }}>
              <path d="M2 14 C 80 2, 220 2, 298 12" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="320" strokeDashoffset="320" style={{ animation: 'draw 1.4s ease .7s forwards' }} />
            </Box>
          </Box>
        </Typography>
        <Box sx={{ '@keyframes draw': { to: { strokeDashoffset: 0 } } }} />
        <Typography sx={{ mt: 6, mx: 'auto', maxWidth: 560, fontFamily: sans, fontWeight: 500, fontSize: { xs: 16, md: 18 }, lineHeight: 1.7, color: body, animation: 'rise .8s ease .2s both' }}>
          O cliente pede pelo celular, a cozinha recebe na hora e você acompanha o salão, o caixa e os números da casa numa tela só.
        </Typography>
        <Box sx={{ mt: 8, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', animation: 'rise .8s ease .3s both' }}>
          <Button component={RouterLink} to="/t/triunfo-lanches?mesa=t05-000a" sx={{ bgcolor: accent, color: '#fff', borderRadius: 999, px: 7, minHeight: 54, fontSize: 16, fontWeight: 800, boxShadow: '0 16px 30px -14px rgba(232,86,42,.8)', transition: 'transform .2s ease', '&:hover': { bgcolor: '#cf4720', transform: 'translateY(-2px)' } }}>
            Fazer um pedido de teste
          </Button>
          <Button onClick={() => scrollTo('como-funciona')} sx={{ bgcolor: '#fff', color: ink, border: '1px solid #EADFD7', borderRadius: 999, px: 7, minHeight: 54, fontSize: 16, fontWeight: 800, '&:hover': { bgcolor: accentSoft } }}>
            Ver como funciona
          </Button>
        </Box>
        <Box sx={{ mt: 7, display: 'flex', justifyContent: 'center', gap: { xs: 4, md: 8 }, flexWrap: 'wrap', animation: 'rise .8s ease .4s both' }}>
          {['Sem app para instalar', 'Comanda compartilhada', 'Sua marca, sua cor'].map((item) => (
            <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: body }}>
              <Box sx={{ width: 22, height: 2, bgcolor: accent, borderRadius: 1 }} />
              {item}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <IconButton
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      sx={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 20,
        width: 52,
        height: 52,
        bgcolor: ink,
        color: '#fff',
        fontWeight: 800,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'none' : 'translateY(12px)',
        transition: 'opacity .3s ease, transform .3s ease',
        '&:hover': { bgcolor: accent },
      }}
    >
      ↑
    </IconButton>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Pede Aí · pedidos digitais para bares e restaurantes';
    return () => {
      document.title = 'Pede Aí';
    };
  }, []);

  return (
    <Box sx={{ bgcolor: cream, color: ink, overflowX: 'hidden', '& .MuiContainer-root': { px: { xs: 4, sm: 6 } } }}>
      <NavBar />
      <Hero />
      <AboutSection />
      <WhySection />
      <HowItWorksSection />
      <ModesSection />
      <ManagementSection />
      <GallerySection />
      <FaqSection />
      <CtaSection />
      <Footer />
      <BackToTop />
    </Box>
  );
}
