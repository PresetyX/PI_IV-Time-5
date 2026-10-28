import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Container, Drawer, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import { Cta, Eyebrow, Heading, Lead, PHOTOS, landing, photo } from './landingKit';
import { CtaSection, FaqSection, Footer, HowItWorksSection, ModesSection, ProductSection, ReasonsSection } from './LandingSections';

const { accent, ink, body, muted, line, paper, white, serif, sans } = landing;

const NAV = [
  { href: '#sobre', label: 'O que é' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#atendimento', label: 'Atendimento' },
  { href: '#duvidas', label: 'Dúvidas' },
];

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkSx = { fontFamily: sans, fontWeight: 600, fontSize: 15, color: body, textDecoration: 'none', '&:hover': { color: ink } };

  return (
    <Box
      component="header"
      sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: scrolled ? 'rgba(251,249,247,.94)' : paper, backdropFilter: scrolled ? 'saturate(1.4) blur(8px)' : 'none', borderBottom: `1px solid ${scrolled ? line : 'transparent'}`, transition: 'border-color .2s ease' }}
    >
      <Container maxWidth="lg" sx={{ height: 72, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Box component="a" href="#" aria-label="Pede Aí, início" sx={{ display: 'flex', alignItems: 'center', gap: 2, color: ink, textDecoration: 'none' }}>
          <BrandMark sx={{ fontSize: 30 }} />
          <Typography sx={{ fontFamily: serif, fontWeight: 600, fontSize: 21 }}>Pede Aí</Typography>
        </Box>
        <Box component="nav" aria-label="Seções" sx={{ display: { xs: 'none', md: 'flex' }, gap: 7, ml: 6 }}>
          {NAV.map((item) => (
            <Box component="a" key={item.href} href={item.href} sx={linkSx}>
              {item.label}
            </Box>
          ))}
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Box component={RouterLink} to="/login" sx={{ ...linkSx, display: { xs: 'none', sm: 'block' } }}>
            Entrar
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Cta to="/t/triunfo-lanches?mesa=t05-000a">Testar o sistema</Cta>
          </Box>
          <ButtonBase
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            sx={{ display: { md: 'none' }, width: 44, height: 44, borderRadius: '10px', flexDirection: 'column', gap: '5px', '& .bar': { display: 'block', width: 20, height: 2, bgcolor: ink, borderRadius: 1 } }}
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </ButtonBase>
        </Box>
      </Container>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 300, p: 6, bgcolor: paper } }}>
        <Box component="nav" aria-label="Seções" sx={{ display: 'flex', flexDirection: 'column' }}>
          {NAV.map((item) => (
            <Box component="a" key={item.href} href={item.href} onClick={() => setOpen(false)} sx={{ ...linkSx, py: 4, fontSize: 18, color: ink, borderBottom: `1px solid ${line}` }}>
              {item.label}
            </Box>
          ))}
          <Box component={RouterLink} to="/login" sx={{ ...linkSx, py: 4, fontSize: 18, color: ink }}>
            Entrar como equipe
          </Box>
        </Box>
        <Box sx={{ mt: 6 }}>
          <Cta to="/t/triunfo-lanches?mesa=t05-000a">Testar o sistema</Cta>
        </Box>
      </Drawer>
    </Box>
  );
}

const DISHES = [
  { id: PHOTOS.bowl, alt: 'Bowl de salada com frango', position: { left: '3%', top: 40 } },
  { id: PHOTOS.ribs, alt: 'Costela com batata', position: { left: '9%', bottom: 40 } },
  { id: PHOTOS.pizza, alt: 'Pizza margherita', position: { right: '3%', top: 40 } },
  { id: PHOTOS.saladTop, alt: 'Salada com grão-de-bico e abacate', position: { right: '9%', bottom: 40 } },
];

function Hero() {
  return (
    <Box component="section" sx={{ position: 'relative', bgcolor: paper, overflow: 'hidden' }}>
      {DISHES.map((dish) => (
        <Box
          key={dish.id}
          sx={{
            position: 'absolute',
            ...dish.position,
            display: { xs: 'none', lg: 'block' },
            width: 200,
            height: 200,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `6px solid ${white}`,
            boxShadow: '0 12px 28px -18px rgba(0,0,0,.35)',
          }}
        >
          <Box component="img" src={photo(dish.id, 420, 420)} alt={dish.alt} sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      ))}
      <Container maxWidth="md" sx={{ position: 'relative', py: { xs: 16, md: 22 }, textAlign: 'center' }}>
        <Eyebrow>Pedidos digitais para bares e restaurantes</Eyebrow>
        <Box sx={{ mt: 5 }}>
          <Heading size="hero" component="h1">
            Do QR na mesa
            <br />
            <Box component="span" sx={{ fontStyle: 'italic', color: accent }}>
              direto para a cozinha
            </Box>
          </Heading>
        </Box>
        <Lead sx={{ mt: 6, mx: 'auto', maxWidth: 560 }}>
          O cliente pede pelo celular, a cozinha recebe na hora e a gestão acompanha salão, caixa e vendas no mesmo sistema.
        </Lead>
        <Box sx={{ mt: 9, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Cta to="/t/triunfo-lanches?mesa=t05-000a">Fazer um pedido de teste</Cta>
          <Cta to="#como-funciona" variant="secondary">
            Ver como funciona
          </Cta>
        </Box>
        <Typography sx={{ mt: 8, fontFamily: sans, fontWeight: 500, fontSize: 14, color: muted }}>
          Sem aplicativo para instalar · Comanda dividida na mesa · A cor da sua casa
        </Typography>
      </Container>
    </Box>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Pede Aí · Pedidos digitais para bares e restaurantes';
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.title = previous;
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <Box sx={{ bgcolor: paper, color: ink, '& .MuiContainer-root': { px: { xs: 5, sm: 8 } } }}>
      <Header />
      <main>
        <Hero />
        <ProductSection />
        <HowItWorksSection />
        <ReasonsSection />
        <ModesSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </Box>
  );
}
