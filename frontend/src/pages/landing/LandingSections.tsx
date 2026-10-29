import { useEffect, useState } from 'react';
import { Box, ButtonBase, Container, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import ChefMascot, { PeekChef } from './ChefMascot';
import { CLIPS, Clip, CountUp, Cutout, Em, PHOTOS, Reveal, Sub, Title, bob, drift, formatPrice, landing, marquee, motionSafe, photo, turn } from './landingKit';
import type { Showcase } from './landingEffects';
import { CurvedGallery, ShowcaseCarousel, TiltCard } from './landingEffects';

const { accent, peach, ink, body, muted, line, white, sans } = landing;

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Check({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, fontFamily: sans, fontWeight: 600, fontSize: 14.5, lineHeight: 1.5, color: dark ? 'rgba(255,255,255,.85)' : ink }}>
      <Box sx={{ mt: '1px', width: 20, height: 20, flexShrink: 0, borderRadius: '50%', bgcolor: dark ? 'rgba(235,90,36,.2)' : peach, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box component="svg" viewBox="0 0 24 24" sx={{ width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M5 12l5 5L19 7" />
        </Box>
      </Box>
      {children}
    </Box>
  );
}

const BRANDS = [
  {
    name: 'Brasa Burger',
    tagline: 'Smash na chapa desde 2019',
    color: '#E4572E',
    soft: '#FDE9E2',
    items: [
      { name: 'Smash duplo', image: PHOTOS.burgerClassic, cents: 3400 },
      { name: 'Batata rústica', image: PHOTOS.fries, cents: 2200 },
      { name: 'Shake de doce de leite', image: PHOTOS.shake, cents: 1900 },
    ],
  },
  {
    name: 'Forneria Nonna',
    tagline: 'Pizza de fermentação natural',
    color: '#2F7D4F',
    soft: '#E3F2E8',
    items: [
      { name: 'Margherita', image: PHOTOS.pizza, cents: 5600 },
      { name: 'Salada da casa', image: PHOTOS.saladTop, cents: 2800 },
      { name: 'Suco de laranja', image: PHOTOS.juice, cents: 1200 },
    ],
  },
  {
    name: 'Boteco do Largo',
    tagline: 'Chope gelado e petisco',
    color: '#2456B8',
    soft: '#E3EBFA',
    items: [
      { name: 'Chope 500 ml', image: PHOTOS.beer, cents: 1600 },
      { name: 'Costela no bafo', image: PHOTOS.ribs, cents: 6200 },
      { name: 'Espetinhos', image: PHOTOS.grill, cents: 2600 },
    ],
  },
];

function PhoneMock({ brand }: { brand: (typeof BRANDS)[number] }) {
  const total = brand.items.reduce((sum, item) => sum + item.cents, 0);
  const fade = { transition: 'background-color .7s ease, color .7s ease, border-color .7s ease' };
  return (
    <Box sx={{ width: { xs: 260, md: 290 }, height: { xs: 540, md: 590 }, p: '10px', borderRadius: '44px', bgcolor: '#111', boxShadow: '0 50px 80px -40px rgba(0,0,0,.7), inset 0 0 0 2px #2A2A2A' }}>
      <Box sx={{ position: 'relative', height: '100%', borderRadius: '36px', overflow: 'hidden', bgcolor: '#FBFAF8', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 90, height: 24, borderRadius: 999, bgcolor: '#111', zIndex: 2 }} />
        <Box sx={{ pt: 11, px: 5, pb: 5, bgcolor: brand.color, color: white, ...fade }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 18 }}>{brand.name[0]}</Box>
            <Box>
              <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{brand.name}</Typography>
              <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 11.5, opacity: 0.85 }}>{brand.tagline}</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 4, display: 'inline-flex', px: 3, py: 1, borderRadius: 999, bgcolor: 'rgba(255,255,255,.18)', fontFamily: sans, fontWeight: 700, fontSize: 11 }}>Mesa 07 · comanda 4821</Box>
        </Box>
        <Box sx={{ px: 4, pt: 4, display: 'flex', gap: 2 }}>
          {['Destaques', 'Pratos', 'Bebidas'].map((tab, index) => (
            <Box key={tab} sx={{ px: 3, py: 1.25, borderRadius: 999, fontFamily: sans, fontWeight: 700, fontSize: 11, bgcolor: index === 0 ? brand.soft : 'transparent', color: index === 0 ? brand.color : muted, ...fade }}>
              {tab}
            </Box>
          ))}
        </Box>
        <Box key={brand.name} sx={{ flex: 1, px: 4, pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {brand.items.map((item, index) => (
            <Box
              key={item.name}
              sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2, borderRadius: '14px', bgcolor: white, border: `1px solid ${line}`, animation: `itemIn .6s cubic-bezier(.2,.75,.2,1) ${index * 0.08}s both`, '@keyframes itemIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}
            >
              <Box component="img" src={photo(item.image, 120, 120)} alt="" sx={{ width: 52, height: 52, borderRadius: '10px', objectFit: 'cover' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontFamily: sans, fontWeight: 800, fontSize: 13, color: ink }}>{item.name}</Typography>
                <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 12, color: brand.color }}>{formatPrice(item.cents)}</Typography>
              </Box>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: brand.color, color: white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 16 }}>+</Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ p: 4 }}>
          <Box sx={{ height: 46, borderRadius: 999, bgcolor: brand.color, color: white, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 5, fontFamily: sans, fontWeight: 800, fontSize: 13, boxShadow: '0 14px 24px -14px rgba(0,0,0,.6)', ...fade }}>
            <span>Enviar pedido</span>
            <span>{formatPrice(total)}</span>
          </Box>
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, fontFamily: sans, fontWeight: 600, fontSize: 10, color: muted }}>
            <BrandMark sx={{ fontSize: 12 }} /> tecnologia Pede Aí
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function ProductSection() {
  const [current, setCurrent] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hold || reduceMotion()) return undefined;
    const timer = window.setInterval(() => setCurrent((value) => (value + 1) % BRANDS.length), 3400);
    return () => window.clearInterval(timer);
  }, [hold]);

  const brand = BRANDS[current];

  return (
    <Box component="section" id="produto" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 12, md: 10 }, alignItems: 'center' }}>
        <Reveal from="left">
          <Box onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} sx={{ position: 'relative', height: { xs: 640, md: 690 }, borderRadius: '32px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: ink }}>
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
              <Clip id={CLIPS.eggs} quality={360} sx={{ animation: `${drift} 16s ease-in-out infinite alternate`, ...motionSafe }} />
            </Box>
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 50% at 50% 50%, ${brand.color}88 0%, rgba(10,10,10,.78) 78%)`, transition: 'background .8s ease' }} />
            <Box sx={{ position: 'relative', mt: -6, '--tilt': '-2deg', animation: `${bob} 7s ease-in-out infinite`, ...motionSafe }}>
              <PhoneMock brand={brand} />
              <Box sx={{ position: 'absolute', right: { xs: -50, md: -78 }, top: { xs: 150, md: 170 }, zIndex: 2 }}>
                <ChefMascot size={{ xs: 90, md: 120 }} color={white} flip tilt={-14} phrases={[`Essa é a ${brand.name}!`, 'Troque a marca aqui embaixo', 'Mesmo sistema, outra cara']} />
              </Box>
            </Box>
            <Box sx={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', display: 'flex', gap: 1.5, p: 1.5, borderRadius: 999, bgcolor: 'rgba(255,255,255,.14)', backdropFilter: 'blur(10px)' }}>
              {BRANDS.map((item, index) => (
                <ButtonBase
                  key={item.name}
                  onClick={() => setCurrent(index)}
                  aria-label={`Ver marca ${item.name}`}
                  sx={{ height: 30, px: index === current ? 3 : 0, minWidth: 30, borderRadius: 999, bgcolor: index === current ? white : 'transparent', color: ink, gap: 2, fontFamily: sans, fontWeight: 800, fontSize: 11.5, whiteSpace: 'nowrap', transition: 'all .4s ease' }}
                >
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: item.color, boxShadow: '0 0 0 2px rgba(255,255,255,.75)' }} />
                  {index === current && item.name}
                </ButtonBase>
              ))}
            </Box>
          </Box>
        </Reveal>
        <Box>
          <Reveal from="right">
            <Box sx={{ display: 'inline-flex', px: 3, py: 1.25, borderRadius: 999, bgcolor: peach, fontFamily: sans, fontWeight: 800, fontSize: 11, letterSpacing: 1.4, color: accent }}>WHITE-LABEL</Box>
            <Box sx={{ mt: 4 }}>
              <Title align="left" accent="cara de cada casa" size={40}>
                Uma plataforma com a
              </Title>
            </Box>
            <Sub align="left" sx={{ mt: 4, maxWidth: 470 }}>
              O Pede Aí é o sistema de comandas digitais que o restaurante coloca com a própria marca. O cliente vê o seu logo, as suas cores e o seu cardápio. A gente cuida da tecnologia por trás.
            </Sub>
          </Reveal>
          <Reveal from="right" delay={150}>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 7, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              <Check>Logo, nome, frase e cor principal da casa</Check>
              <Check>QR code próprio em cada mesa, sem app para baixar</Check>
              <Check>Mesa, balcão e entrega ligados conforme a operação</Check>
              <Check>Cardápio com fotos e itens pausados em tempo real</Check>
            </Box>
            <Typography sx={{ mt: 7, fontFamily: sans, fontWeight: 600, fontSize: 13, color: muted }}>Troque a marca no celular ao lado e veja o cardápio se adaptar.</Typography>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

export function StatsStrip() {
  const stats = [
    { to: 23, prefix: '+', suffix: '%', label: 'no ticket médio por mesa' },
    { to: 41, prefix: '−', suffix: '%', label: 'de espera até o primeiro pedido' },
    { to: 8, prefix: '', suffix: '', label: 'módulos integrados' },
    { to: 0, prefix: 'R$ ', suffix: '', label: 'de taxa por pedido' },
  ];
  return (
    <Box sx={{ position: 'relative', mt: { xs: -8, md: -12 }, pb: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Reveal>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, borderRadius: '24px', bgcolor: white, border: `1px solid ${line}`, overflow: 'hidden', boxShadow: '0 40px 70px -55px rgba(0,0,0,.5)' }}>
            {stats.map((stat, index) => (
              <Box key={stat.label} sx={{ p: { xs: 5, md: 7 }, borderLeft: { md: index ? `1px solid ${line}` : 'none' }, borderTop: { xs: index > 1 ? `1px solid ${line}` : 'none', md: 'none' }, borderRight: { xs: index % 2 === 0 ? `1px solid ${line}` : 'none', md: 'none' } }}>
                <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: { xs: 32, md: 44 }, lineHeight: 1, letterSpacing: '-0.04em', color: index === 0 ? accent : ink }}>
                  <CountUp to={stat.to} prefix={stat.prefix} suffix={stat.suffix} />
                </Typography>
                <Typography sx={{ mt: 2, fontFamily: sans, fontWeight: 600, fontSize: 13, color: body }}>{stat.label}</Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: 3, textAlign: 'center', fontFamily: sans, fontWeight: 500, fontSize: 11.5, color: muted }}>Projeções do time com base em operações simuladas. Os resultados variam de casa para casa.</Typography>
        </Reveal>
      </Container>
    </Box>
  );
}

const REASONS = [
  { cutout: 'cappuccino' as const, tilt: '-8deg', title: 'Sem app, sem atrito', text: 'O cliente aponta a câmera para o QR da mesa e o cardápio abre no navegador. Menos passos, mais pedidos.', glow: '#FFD9C7' },
  { cutout: 'peppers' as const, tilt: '8deg', title: 'Comanda dividida de verdade', text: 'Cada pessoa abre a sua comanda ou entra na do amigo com um código de quatro números. No fim, cada um paga o que pediu.', glow: '#FFE9B8' },
  { cutout: 'avocado' as const, tilt: '-6deg', title: 'Sem taxa por pedido', text: 'Mensalidade fixa, sem comissão em cima das vendas. Quanto mais a casa vende, mais rápido o sistema se paga.', glow: '#D7F0DD' },
];

export function WhySection() {
  return (
    <Box component="section" id="por-que" sx={{ position: 'relative', py: { xs: 14, md: 18 }, scrollMarginTop: 90, overflow: 'hidden' }}>
      <Box aria-hidden sx={{ position: 'absolute', left: '-10%', top: '30%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(235,90,36,.10), rgba(235,90,36,0) 70%)' }} />
      <Box aria-hidden sx={{ position: 'absolute', right: '-8%', top: '10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(150,120,255,.10), rgba(150,120,255,0) 70%)' }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Reveal>
          <Title accent="Pede Aí?">Por que escolher o</Title>
          <Sub sx={{ mt: 2 }}>Pedido rápido. Cozinha organizada. Conta que fecha.</Sub>
        </Reveal>
        <Box sx={{ mt: { xs: 14, md: 18 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 16, md: 6 } }}>
          {REASONS.map((reason, index) => (
            <Reveal key={reason.title} delay={index * 140}>
              <TiltCard>
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    pt: 16,
                    px: 6,
                    pb: 6,
                    borderRadius: '22px',
                    bgcolor: 'rgba(255,255,255,.72)',
                    border: `1px solid ${line}`,
                    backgroundImage: `radial-gradient(90% 70% at 85% 10%, ${reason.glow} 0%, rgba(255,255,255,0) 60%), radial-gradient(70% 60% at 0% 100%, #EFE9FF 0%, rgba(255,255,255,0) 60%)`,
                    boxShadow: '0 30px 60px -45px rgba(0,0,0,.4)',
                  }}
                >
                  <Box sx={{ position: 'absolute', left: 20, top: -64, transform: 'translateZ(40px)' }}>
                    <Cutout name={reason.cutout} size={140} sx={{ '--tilt': reason.tilt, animation: `${bob} ${5 + index}s ease-in-out infinite`, ...motionSafe }} />
                  </Box>
                  <Typography component="h3" sx={{ fontFamily: sans, fontWeight: 800, fontSize: 20, lineHeight: 1.25, color: ink, transform: 'translateZ(20px)' }}>
                    {reason.title}
                  </Typography>
                  <Typography sx={{ mt: 3, fontFamily: sans, fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, color: body }}>{reason.text}</Typography>
                </Box>
              </TiltCard>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const TICKER = ['White-label', 'QR na mesa', 'Comanda dividida', 'Cozinha ao vivo', 'Sem taxa por pedido', 'Caixa fechado', 'Curva ABC', 'Tela grande na TV', 'Sem app para instalar'];

function Ribbon({ tilt, dark = false }: { tilt: number; dark?: boolean }) {
  const items = [...TICKER, ...TICKER];
  return (
    <Box sx={{ mx: '-4%', py: 3.5, transform: `rotate(${tilt}deg)`, bgcolor: dark ? ink : accent, color: white, overflow: 'hidden', boxShadow: '0 24px 40px -28px rgba(0,0,0,.7)' }}>
      <Box sx={{ display: 'flex', width: 'max-content', animation: `${marquee} ${dark ? 50 : 40}s linear infinite ${dark ? 'reverse' : 'normal'}`, ...motionSafe }}>
        {items.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 5, pr: 5, fontFamily: sans, fontWeight: 800, fontSize: { xs: 17, md: 22 }, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {index % 3 === 1 ? <Em color={white}>{item}</Em> : item}
            {index % 3 === 0 ? <BrandMark sx={{ fontSize: '1.15em', color: dark ? accent : ink }} /> : <Box component="span" sx={{ fontSize: '0.75em', color: dark ? accent : ink }}>✦</Box>}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function MarqueeBand() {
  return (
    <Box aria-hidden sx={{ position: 'relative', py: { xs: 12, md: 16 }, overflow: 'hidden' }}>
      <Ribbon tilt={-2.5} />
      <Box sx={{ mt: -10 }}>
        <Ribbon tilt={2} dark />
      </Box>
    </Box>
  );
}

const MODULES = [
  { name: 'Cardápio digital', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', clip: CLIPS.garlic, text: 'Cardápio por QR com fotos, categorias e itens pausados na hora em que acabam.', features: ['QR code por mesa', 'Fotos e descrições', 'Disponibilidade em tempo real'] },
  { name: 'Comanda compartilhada', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', clip: CLIPS.cocktail, text: 'Cada pessoa da mesa pede no próprio celular e entra na comanda do grupo com um código.', features: ['Código de 4 números', 'Cada um vê o que pediu', 'Taxa de serviço automática'] },
  { name: 'Produção', icon: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', clip: CLIPS.porkChop, text: 'A fila da cozinha por status, com atrasos destacados e tela grande para a TV.', features: ['Recebido, em preparo e pronto', 'Alerta de atraso', 'Modo tela grande'] },
  { name: 'Salão', icon: 'M4 10h16M6 10v9M18 10v9M8 6h8', clip: CLIPS.waiter, text: 'Mapa das mesas, entregas prontas para levar e contas abertas na mão do garçom.', features: ['Mapa de mesas', 'Entregas prontas', 'Contas abertas'] },
  { name: 'Caixa e pagamentos', icon: 'M3 7h18v10H3zM7 12h.01M12 12a2 2 0 1 0 0-.01', clip: CLIPS.bar, text: 'Fechamento por Pix, dinheiro e cartão, sangrias e conferência do caixa no fim do dia.', features: ['Pix, débito e crédito', 'Sangria registrada', 'Fechamento conferido'] },
  { name: 'Gestão e relatórios', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2', clip: CLIPS.finishing, text: 'Faturamento por dia, semana e mês, curva ABC do cardápio e histórico de cada comanda.', features: ['Dashboard por período', 'Curva ABC', 'Histórico com busca'] },
  { name: 'Equipe e comissões', icon: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', clip: CLIPS.brigade, text: 'Perfis de dono, gerente, salão e cozinha, convites para a equipe e comissão do garçom.', features: ['4 perfis de acesso', 'Convite com senha temporária', 'Comissão por período'] },
  { name: 'Marca própria', icon: 'M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z', clip: CLIPS.guests, text: 'Nome, frase, cor e modos de atendimento da casa em todas as telas do cliente.', features: ['Logo e cores da casa', 'Mesa, balcão e entrega', 'Telefone do cliente opcional'] },
];

function ModuleIcon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d={d} />
    </Box>
  );
}

export function ModulesSection() {
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hold || reduceMotion()) return undefined;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % MODULES.length), 5200);
    return () => window.clearInterval(timer);
  }, [hold]);

  const module = MODULES[active];
  const radius = 205;

  return (
    <Box component="section" id="modulos" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg">
        <Reveal>
          <Title accent="um só lugar">Oito módulos, a operação inteira em</Title>
          <Sub sx={{ mt: 2 }}>Da leitura do QR ao fechamento do caixa. Escolha um módulo para ver o que ele faz.</Sub>
        </Reveal>
        <Box onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} sx={{ mt: 12, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 8, md: 10 }, alignItems: 'center' }}>
          <Reveal from="zoom">
            <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'relative', width: 500, height: 500, mx: 'auto' }}>
              <Box aria-hidden sx={{ position: 'absolute', inset: 45, borderRadius: '50%', border: '1.5px dashed #E2D9D0' }} />
              <Box aria-hidden sx={{ position: 'absolute', inset: 120, borderRadius: '50%', background: 'conic-gradient(from 0deg, #FFD9C7, #EFE4FF, #D7F0DD, #FFE9B8, #FFD9C7)', filter: 'blur(26px)', opacity: 0.9, animation: `${turn} 12s linear infinite`, ...motionSafe }} />
              <Box sx={{ position: 'absolute', inset: 140, borderRadius: '50%', bgcolor: white, boxShadow: '0 30px 60px -30px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChefMascot size={150} />
              </Box>
              <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', '& button': { pointerEvents: 'auto' }, animation: `${turn} 80s linear infinite`, animationPlayState: hold ? 'paused' : 'running', ...motionSafe }}>
                {MODULES.map((item, index) => {
                  const angle = (index / MODULES.length) * Math.PI * 2 - Math.PI / 2;
                  const selected = index === active;
                  return (
                    <Box key={item.name} sx={{ position: 'absolute', left: 250 + Math.cos(angle) * radius - 32, top: 250 + Math.sin(angle) * radius - 32 }}>
                      <Box sx={{ animation: `${turn} 80s linear infinite reverse`, animationPlayState: hold ? 'paused' : 'running', ...motionSafe }}>
                        <ButtonBase
                          aria-label={item.name}
                          onClick={() => setActive(index)}
                          sx={{ width: 64, height: 64, borderRadius: '20px', bgcolor: selected ? accent : white, color: selected ? white : ink, border: `1px solid ${selected ? accent : line}`, boxShadow: selected ? '0 18px 30px -12px rgba(235,90,36,.7)' : '0 14px 24px -18px rgba(0,0,0,.4)', transform: selected ? 'scale(1.14)' : 'none', transition: 'all .35s ease', '&:hover': { transform: 'scale(1.14)' } }}
                        >
                          <ModuleIcon d={item.icon} size={26} />
                        </ButtonBase>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 2, overflowX: 'auto', pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
              {MODULES.map((item, index) => (
                <ButtonBase key={item.name} onClick={() => setActive(index)} sx={{ flexShrink: 0, gap: 2, px: 3.5, height: 42, borderRadius: 999, bgcolor: index === active ? accent : white, color: index === active ? white : ink, border: `1px solid ${index === active ? accent : line}`, fontFamily: sans, fontWeight: 700, fontSize: 13 }}>
                  <ModuleIcon d={item.icon} size={17} />
                  {item.name}
                </ButtonBase>
              ))}
            </Box>
          </Reveal>
          <Reveal from="right">
            <Box sx={{ borderRadius: '26px', overflow: 'hidden', bgcolor: white, border: `1px solid ${line}`, boxShadow: '0 40px 70px -50px rgba(0,0,0,.45)' }}>
              <Box sx={{ position: 'relative', height: { xs: 200, md: 240 }, bgcolor: ink, overflow: 'hidden' }}>
                <Clip key={module.clip} id={module.clip} quality={360} alt={module.name} sx={{ animation: 'clipIn .8s ease both', '@keyframes clipIn': { from: { opacity: 0, transform: 'scale(1.06)' }, to: { opacity: 1, transform: 'none' } } }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.72))' }} />
                <Box sx={{ position: 'absolute', left: 20, bottom: 18, display: 'flex', alignItems: 'center', gap: 3, color: white }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ModuleIcon d={module.icon} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 11, letterSpacing: 1.4, opacity: 0.8 }}>MÓDULO {String(active + 1).padStart(2, '0')}</Typography>
                    <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>{module.name}</Typography>
                  </Box>
                </Box>
              </Box>
              <Box key={module.name} sx={{ p: { xs: 5, md: 7 }, animation: 'textIn .6s ease both', '@keyframes textIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}>
                <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 15, lineHeight: 1.7, color: body }}>{module.text}</Typography>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {module.features.map((feature) => (
                    <Check key={feature}>{feature}</Check>
                  ))}
                </Box>
                <Box sx={{ mt: 6, display: 'flex', gap: 1.5 }}>
                  {MODULES.map((item, index) => (
                    <Box key={item.name} sx={{ height: 4, flex: 1, borderRadius: 2, bgcolor: index === active ? accent : index < active ? '#F4C9B5' : line, transition: 'background-color .4s ease' }} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

const SEGMENTS: Showcase[] = [
  { image: PHOTOS.bar, name: 'Bar e choperia', category: 'Bebidas', tag: 'Comanda aberta', banner: 'Cada um na sua comanda', metrics: ['+3 rodadas', 'Conta dividida'] },
  { image: PHOTOS.hall, name: 'Restaurante', category: 'À la carte', tag: 'Mesa', banner: 'Cozinha no ritmo certo', metrics: ['−9 min de espera', 'Tela na cozinha'] },
  { image: PHOTOS.sushi, name: 'Japonês', category: 'Rodízio e à la carte', tag: 'Mesa', banner: 'Rodízio sem papel', metrics: ['−35% de erros', '+2 pedidos por mesa'] },
  { image: PHOTOS.pasta, name: 'Cantina', category: 'Massas', tag: 'Mesa e entrega', banner: 'Segunda rodada em um toque', metrics: ['+21% no ticket', '78% pela mesa'] },
  { image: PHOTOS.tacos, name: 'Lanchonete', category: 'Para dividir', tag: 'Mesa e balcão', banner: 'Pediu, chegou', metrics: ['+18% de giro', 'Pix na mesa'] },
  { image: PHOTOS.cake, name: 'Confeitaria', category: 'Bolos e doces', tag: 'Balcão', banner: 'Retirada com senha', metrics: ['Fila menor', 'Pedido pelo QR'] },
  { image: PHOTOS.iceCream, name: 'Sorveteria', category: 'Sobremesas', tag: 'Balcão', banner: 'Monte do seu jeito', metrics: ['Adicionais no cardápio', 'Senha no balcão'] },
  { image: PHOTOS.crowd, name: 'Praça de alimentação', category: 'Várias marcas', tag: 'Balcão', banner: 'Uma marca por loja', metrics: ['White-label', 'Painel por loja'] },
];

export function SegmentsSection() {
  return (
    <Box component="section" id="segmentos" sx={{ position: 'relative', py: { xs: 14, md: 18 }, scrollMarginTop: 90, overflow: 'hidden' }}>
      <PeekChef side="right" top="12%" phrases={['Tem casa de todo tipo aqui!', 'A sua é qual?']} />
      <Container maxWidth="lg">
        <Reveal>
          <Title accent="tipo de casa">Feito para todo</Title>
          <Sub sx={{ mt: 2 }}>O mesmo sistema se ajusta ao jeito de atender de cada segmento.</Sub>
        </Reveal>
        <Reveal delay={150} sx={{ mt: 10 }}>
          <ShowcaseCarousel items={SEGMENTS} />
        </Reveal>
      </Container>
    </Box>
  );
}

export function GallerySection() {
  return (
    <Box component="section" aria-label="Galeria" sx={{ py: { xs: 6, md: 8 } }}>
      <CurvedGallery
        images={[
          { id: PHOTOS.chefPlating, alt: 'Cozinheiro finalizando o prato' },
          { id: 'clip-bacon', alt: 'Bacon dourando na frigideira', clip: CLIPS.bacon },
          { id: PHOTOS.friendsCooking, alt: 'Equipe cozinhando junta' },
          { id: 'clip-ceviche', alt: 'Ceviche sendo montado', clip: CLIPS.ceviche },
          { id: 'clip-roast', alt: 'Carne assada com batatas', clip: CLIPS.roast },
          { id: PHOTOS.chefWoman, alt: 'Cozinheira montando os pratos' },
          { id: 'clip-flour', alt: 'Massa sendo enfarinhada', clip: CLIPS.flour },
        ]}
      />
    </Box>
  );
}
