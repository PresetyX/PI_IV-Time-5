import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, ButtonBase, Container, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import { CountUp, Cutout, PHOTOS, Photo, Reveal, Sub, Title, bob, landing, motionSafe, photo, turn } from './landingKit';
import type { MenuHighlight } from './landingEffects';
import { CurvedGallery, PersonaCard, TiltCard, TrendingCarousel } from './landingEffects';

const { accent, accentDark, peach, ink, body, muted, line, white, serif, sans, script } = landing;

function PillButton({ to, children, tone = 'accent' }: { to: string; children: ReactNode; tone?: 'accent' | 'white' | 'outline' }) {
  const styles = {
    accent: { bgcolor: accent, color: white, '&:hover': { bgcolor: accentDark } },
    white: { bgcolor: white, color: ink, '&:hover': { bgcolor: peach } },
    outline: { color: white, border: '1px solid rgba(255,255,255,.35)', '&:hover': { borderColor: white } },
  }[tone];
  return (
    <ButtonBase component={RouterLink} to={to} sx={{ ...styles, height: 44, px: 5, flexShrink: 0, whiteSpace: 'nowrap', borderRadius: 999, fontFamily: sans, fontWeight: 700, fontSize: 14, transition: 'all .25s ease' }}>
      {children}
    </ButtonBase>
  );
}

export function PersonaSection() {
  return (
    <Box component="section" id="sobre" sx={{ py: { xs: 14, md: 20 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' }, gap: { xs: 8, md: 8 }, alignItems: 'stretch' }}>
        <Reveal from="left">
          <Box sx={{ position: 'relative', height: { xs: 420, md: 470 }, borderRadius: '24px', overflow: 'hidden', bgcolor: ink, '&:hover .hero-burger': { transform: 'scale(1.06) rotate(-1deg)' } }}>
            <Box className="hero-burger" sx={{ position: 'absolute', inset: 0, transition: 'transform 1.4s cubic-bezier(.2,.75,.2,1)' }}>
              <Photo id={PHOTOS.burgerStack} alt="Triunfo duplo, o lanche da casa" width={1100} />
            </Box>
            <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,.75) 100%)' }} />
            {[...Array(14)].map((_, index) => (
              <Box
                key={index}
                aria-hidden
                sx={{
                  position: 'absolute',
                  left: `${(index * 37) % 100}%`,
                  top: `${(index * 23) % 45}%`,
                  width: 4 + (index % 3) * 2,
                  height: 4 + (index % 3) * 2,
                  borderRadius: '50%',
                  bgcolor: index % 2 ? '#F7B26A' : '#FFE1B8',
                  opacity: 0.8,
                  boxShadow: '0 0 12px 2px rgba(255,170,80,.6)',
                  animation: `${bob} ${4 + (index % 4)}s ease-in-out ${index * 0.3}s infinite`,
                  ...motionSafe,
                }}
              />
            ))}
            <Box sx={{ position: 'absolute', left: 24, top: { xs: 24, sm: 'auto' }, bottom: { xs: 'auto', sm: 104 }, px: 4, py: 3, borderRadius: '14px', bgcolor: 'rgba(255,255,255,.94)', boxShadow: '0 10px 30px -12px rgba(0,0,0,.5)' }}>
              <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, color: accent }}>DONO DA CASA</Typography>
              <Typography sx={{ fontFamily: script, fontSize: 32, lineHeight: 1.1, color: ink }}>Marcos Lima</Typography>
            </Box>
            <Box sx={{ position: 'absolute', left: 24, right: 24, bottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 3 }}>
              <Box>
                <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: '#F7B26A' }}>Triunfo duplo · R$ 39,00</Typography>
                <Typography sx={{ fontFamily: serif, fontSize: { xs: 22, md: 26 }, color: white }}>O lanche mais pedido da casa</Typography>
              </Box>
              <PillButton to="/t/triunfo-lanches/cardapio" tone="white">
                Ver cardápio
              </PillButton>
            </Box>
          </Box>
        </Reveal>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Reveal from="right">
            <Typography component="h2" sx={{ fontFamily: serif, fontWeight: 600, fontSize: { xs: 30, md: 38 }, lineHeight: 1.15, color: ink }}>
              Conheça a <Box component="span" sx={{ color: accent }}>Triunfo Lanches</Box>
            </Typography>
            <Sub align="left" sx={{ mt: 3 }}>
              A Triunfo é a casa de demonstração do Pede Aí, em Campinas. Tem salão com mesas, balcão de retirada e uma equipe de quatro pessoas. Tudo o que você vê aqui roda no sistema de verdade, com o cardápio e as mesas dela.
            </Sub>
          </Reveal>
          <Reveal from="right" delay={150} sx={{ flex: 1 }}>
            <Box sx={{ position: 'relative', height: '100%', minHeight: 280, borderRadius: '24px', overflow: 'hidden' }}>
              <Photo id={PHOTOS.chefWoman} alt="Cozinheira montando os pratos" width={900} />
              <Box sx={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: { xs: 200, sm: 220 }, px: 4, py: 5, gap: 5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,.94)', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px -20px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column' }}>
                {[
                  { to: 10, suffix: '', label: 'Mesas com QR', icon: 'M4 10h16M6 10v9M18 10v9M8 6h8' },
                  { to: 12, suffix: '', label: 'Itens no cardápio', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
                  { to: 12, suffix: ' min', label: 'Preparo médio', icon: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
                ].map((stat) => (
                  <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', bgcolor: peach, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                        <path d={stat.icon} />
                      </Box>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 20, lineHeight: 1.1, color: ink }}>
                        <CountUp to={stat.to} suffix={stat.suffix} />
                      </Typography>
                      <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: muted }}>{stat.label}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

const REASONS = [
  { cutout: 'chili' as const, tilt: '-18deg', title: 'O que faz o Pede Aí diferente', text: 'O cliente pede pelo navegador, sem baixar nada, e o pedido cai direto na fila da cozinha. Sem papel e sem pedido perdido.', glow: '#FFD9C7' },
  { cutout: 'peppers' as const, tilt: '8deg', title: 'Comanda dividida de verdade', text: 'Cada pessoa abre a sua comanda ou entra na do amigo com um código de quatro números. No fim, cada um paga o que pediu.', glow: '#FFE9B8' },
  { cutout: 'lettuce' as const, tilt: '-6deg', title: 'A cara da sua casa', text: 'Nome, frase e cor da casa aparecem nas telas do cliente. Mesa, balcão e entrega ligam e desligam na configuração.', glow: '#D7F0DD' },
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

const TRENDING: MenuHighlight[] = [
  { image: PHOTOS.burgerClassic, name: 'X-salada', category: 'Lanches', priceCents: 2800, prepMinutes: 12, banner: 'O clássico da casa' },
  { image: PHOTOS.fries, name: 'Batata frita', category: 'Porções', priceCents: 3200, prepMinutes: 15, banner: '500 g com sal grosso' },
  { image: PHOTOS.shake, name: 'Milk-shake', category: 'Bebidas', priceCents: 1800, prepMinutes: 8, banner: 'Chocolate, morango ou baunilha' },
  { image: PHOTOS.burgerStack, name: 'Triunfo duplo', category: 'Lanches', priceCents: 3900, prepMinutes: 15, banner: 'Dois hambúrgueres' },
  { image: PHOTOS.steakFries, name: 'Calabresa acebolada', category: 'Porções', priceCents: 3800, prepMinutes: 18, banner: 'Com pão de alho' },
  { image: PHOTOS.nuggets, name: 'Nuggets', category: 'Porções', priceCents: 2400, prepMinutes: 12, banner: '12 unidades com barbecue' },
  { image: PHOTOS.juice, name: 'Suco de laranja', category: 'Bebidas', priceCents: 1200, prepMinutes: 5, banner: 'Feito na hora' },
  { image: PHOTOS.brownie, name: 'Petit gateau', category: 'Sobremesas', priceCents: 2200, prepMinutes: 10, banner: 'Com sorvete de creme' },
];

export function TrendingSection() {
  return (
    <Box component="section" id="cardapio" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg">
        <Reveal>
          <Title>Os mais pedidos da Triunfo</Title>
          <Sub sx={{ mt: 2 }}>Cardápio real da casa de demonstração, com preço e tempo de preparo.</Sub>
        </Reveal>
        <Reveal delay={150} sx={{ mt: 10 }}>
          <TrendingCarousel items={TRENDING} />
        </Reveal>
      </Container>
    </Box>
  );
}

function FloatingChip({ icon, title, text, tone, delay }: { icon: string; title: string; text: string; tone: string; delay: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: 2.5, borderRadius: '14px', bgcolor: white, boxShadow: '0 18px 30px -22px rgba(0,0,0,.45)', animation: `${bob} 6s ease-in-out ${delay}s infinite`, '--tilt': '0deg', transition: 'transform .3s ease', ...motionSafe }}>
      <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: '10px', bgcolor: tone, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box component="svg" viewBox="0 0 24 24" sx={{ width: 17, height: 17, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d={icon} />
        </Box>
      </Box>
      <Box>
        <Typography sx={{ fontFamily: serif, fontSize: 14, color: ink }}>{title}</Typography>
        <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 11.5, color: muted }}>{text}</Typography>
      </Box>
    </Box>
  );
}

export function MasterSection() {
  return (
    <Box
      component="section"
      id="gestao"
      sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90, backgroundImage: 'linear-gradient(rgba(0,0,0,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.035) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
          <Reveal from="left">
            <Title align="left" accent="confiança" size={38}>
              Domine a arte de
              <br />
              atender com
            </Title>
          </Reveal>
          <Reveal from="right">
            <Sub align="left" sx={{ maxWidth: 340 }}>
              Do primeiro pedido ao fechamento do caixa, cada passo do atendimento fica registrado e visível para quem precisa.
            </Sub>
          </Reveal>
        </Box>

        <Box sx={{ mt: 12, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.1fr .9fr .9fr 1.1fr' }, gap: 4, alignItems: 'center' }}>
          <Reveal delay={0}>
            <Box sx={{ position: 'relative', height: 240, borderRadius: '18px', overflow: 'hidden', '&:hover img': { transform: 'scale(1.08)' }, '& img': { transition: 'transform 1s ease' } }}>
              <Photo id={PHOTOS.chopping} alt="Preparo na cozinha" width={700} />
              <Box sx={{ position: 'absolute', right: 12, top: 12, px: 3, py: 1, borderRadius: 999, bgcolor: 'rgba(0,0,0,.55)', color: white, fontFamily: sans, fontWeight: 700, fontSize: 11 }}>Passo 01</Box>
              <Box sx={{ position: 'absolute', left: 12, bottom: 12, px: 3, py: 1.5, borderRadius: 999, bgcolor: 'rgba(255,255,255,.9)', fontFamily: serif, fontSize: 13, color: ink }}>Pedido chega na fila</Box>
            </Box>
          </Reveal>
          <Reveal delay={120}>
            <Box sx={{ position: 'relative', p: 5, borderRadius: '18px', background: `linear-gradient(160deg, ${white} 0%, #FFF3EC 100%)`, border: `1px solid ${line}`, transform: { md: 'rotate(-2deg)' }, transition: 'transform .5s cubic-bezier(.2,.75,.2,1)', '&:hover': { transform: 'rotate(0deg) translateY(-6px)' } }}>
              <Box sx={{ position: 'absolute', right: 14, top: 14, width: 30, height: 30, borderRadius: '50%', bgcolor: peach, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>♥</Box>
              <Typography sx={{ fontFamily: serif, fontSize: 22, lineHeight: 1.3, color: ink }}>“A cozinha nunca foi tão organizada!”</Typography>
              <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box component="img" src={photo(PHOTOS.cook, 80, 80)} alt="" sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                <Box>
                  <Typography sx={{ fontFamily: serif, fontSize: 13.5, color: ink }}>Zé da Cozinha</Typography>
                  <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 11, color: muted }}>Persona · casa de demonstração</Typography>
                </Box>
              </Box>
            </Box>
          </Reveal>
          <Reveal delay={240}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3, borderRadius: '18px', bgcolor: 'rgba(255,255,255,.6)', border: `1px solid ${line}` }}>
              <FloatingChip icon="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" title="Fila ao vivo" text="Atualiza a cada 15 s" tone="#FFE7DC" delay={0} />
              <FloatingChip icon="M4 7h16M4 12h16M4 17h10" title="Comanda dividida" text="Código de 4 números" tone="#EEE8FB" delay={0.8} />
              <FloatingChip icon="M3 7h18v10H3zM7 12h.01M12 12a2 2 0 1 0 0-.01" title="Conta fechada" text="Pix, dinheiro ou cartão" tone="#E3F3E8" delay={1.6} />
            </Box>
          </Reveal>
          <Reveal delay={360}>
            <Box sx={{ position: 'relative', height: 330, borderRadius: '18px', overflow: 'hidden', '&:hover img': { transform: 'scale(1.06)' }, '& img': { transition: 'transform 1s ease' } }}>
              <Photo id={PHOTOS.plating} alt="Cozinheiro finalizando os pratos" width={800} />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.72))' }} />
              <Box sx={{ position: 'absolute', left: 14, top: 14, display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 1, borderRadius: 999, bgcolor: 'rgba(255,255,255,.9)', fontFamily: sans, fontWeight: 800, fontSize: 11, color: ink }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: accent, animation: 'pulse 1.6s ease infinite', '@keyframes pulse': { '50%': { opacity: 0.3 } }, ...motionSafe }} />
                Produção
              </Box>
              <Typography sx={{ position: 'absolute', left: 18, bottom: 16, fontFamily: serif, fontSize: 26, lineHeight: 1.15, color: white }}>
                Pronto para
                <br />
                ir para a mesa
              </Typography>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

export function GallerySection() {
  return (
    <Box component="section" aria-label="Galeria" sx={{ py: { xs: 6, md: 8 } }}>
      <CurvedGallery
        images={[
          { id: PHOTOS.flames, alt: 'Chapa com fogo alto' },
          { id: PHOTOS.friendsCooking, alt: 'Amigos cozinhando' },
          { id: PHOTOS.chefPlating, alt: 'Cozinheiro finalizando prato' },
          { id: PHOTOS.crowd, alt: 'Salão cheio' },
          { id: PHOTOS.bar, alt: 'Balcão do bar' },
          { id: PHOTOS.plating, alt: 'Pratos saindo da cozinha' },
          { id: PHOTOS.hall, alt: 'Salão do restaurante' },
          { id: PHOTOS.grill, alt: 'Espetinhos na brasa' },
        ]}
      />
    </Box>
  );
}

const PERSONAS = [
  { image: PHOTOS.owner, name: 'Marcos Lima', role: 'Dono', quote: 'Fecho o caixa sabendo exatamente o que vendi.', sees: ['Faturamento por dia, semana e mês', 'Curva ABC do cardápio', 'Caixa, comissões e equipe', 'Configuração da casa'], to: '/gestao' },
  { image: PHOTOS.manager, name: 'Paula Reis', role: 'Gerente', quote: 'Vejo quais produtos puxam o faturamento.', sees: ['Dashboard e histórico de contas', 'Produtos e disponibilidade', 'Fechamento de caixa', 'Mesas e salão'], to: '/gestao/curva-abc' },
  { image: PHOTOS.waiter, name: 'Rafa Souza', role: 'Salão', quote: 'Sei o que está pronto sem ir até a cozinha.', sees: ['Mapa das mesas', 'Entregas prontas para levar', 'Contas abertas', 'Fechamento no Pix ou cartão'], to: '/salao' },
  { image: PHOTOS.cook, name: 'Zé da Cozinha', role: 'Cozinha', quote: 'Os pedidos chegam na ordem certa.', sees: ['Fila por status', 'Pedidos atrasados destacados', 'Tela grande para a TV', 'Impressão da comanda'], to: '/producao' },
];

export function PersonasSection() {
  return (
    <Box component="section" id="equipe" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg">
        <Reveal>
          <Title accent="tela dela">Cada pessoa da equipe com a</Title>
          <Sub sx={{ mt: 2 }}>Personas da casa de demonstração. Passe o mouse para ver o que cada uma enxerga no sistema.</Sub>
        </Reveal>
        <Box sx={{ mt: 10, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4 }}>
          {PERSONAS.map((persona, index) => (
            <Reveal key={persona.name} delay={index * 110} from="zoom">
              <PersonaCard {...persona} />
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const QUESTIONS = [
  { q: 'O cliente precisa baixar algum aplicativo?', a: 'Não. Ele lê o QR code da mesa com a câmera do celular e o cardápio abre no navegador. Também dá para digitar o número da mesa.' },
  { q: 'Como funciona a comanda compartilhada?', a: 'Quem abre a comanda recebe um código de quatro números. Quem está na mesma mesa entra com esse código e tudo o que pedir cai na mesma conta.' },
  { q: 'O pedido vai direto para a cozinha?', a: 'Sim. Assim que o cliente envia, o pedido aparece como Recebido no painel de produção, que se atualiza sozinho a cada 15 segundos.' },
  { q: 'Dá para colocar a identidade da minha casa?', a: 'Dá. Na configuração você define nome, frase de apresentação, cor principal e modos de atendimento.' },
  { q: 'Como fecham a conta e o caixa?', a: 'O salão registra o pagamento em Pix, dinheiro, débito ou crédito. No fim do dia a gestão confere cada forma de pagamento, registra sangrias e fecha o caixa.' },
  { q: 'Quem da equipe vê o quê?', a: 'São quatro perfis: dono, gerente, salão e cozinha. Cada um vê só as telas do seu trabalho.' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | false>(0);
  return (
    <Box component="section" id="duvidas" sx={{ position: 'relative', py: { xs: 14, md: 18 }, scrollMarginTop: 90, overflow: 'hidden' }}>
      <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.9fr 1.2fr' }, gap: { xs: 8, md: 10 }, alignItems: 'center' }}>
        <Reveal from="left">
          <Title align="left" accent="frequentes" size={36}>
            Perguntas
          </Title>
          <Box sx={{ position: 'relative', mt: 8, width: { xs: 260, md: 340 }, height: { xs: 260, md: 340 }, mx: { xs: 'auto', md: 0 } }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, #FFD9C7, #EFE4FF, #D7F0DD, #FFE9B8, #FFD9C7)', filter: 'blur(28px)', opacity: 0.85, animation: `${turn} 14s linear infinite`, ...motionSafe }} />
            <Box sx={{ position: 'absolute', inset: '12%', borderRadius: '50%', bgcolor: 'rgba(255,255,255,.75)' }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BrandMark sx={{ fontSize: { xs: 150, md: 200 }, color: ink, '--tilt': '-4deg', animation: `${bob} 5s ease-in-out infinite`, ...motionSafe }} />
            </Box>
          </Box>
        </Reveal>
        <Reveal from="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {QUESTIONS.map((item, index) => (
              <Accordion
                key={item.q}
                disableGutters
                elevation={0}
                expanded={open === index}
                onChange={(_, expanded) => setOpen(expanded ? index : false)}
                sx={{ borderRadius: '14px !important', bgcolor: open === index ? white : 'rgba(255,255,255,.6)', border: `1px solid ${open === index ? '#F4C9B5' : line}`, '&:before': { display: 'none' }, transition: 'all .3s ease' }}
              >
                <AccordionSummary
                  expandIcon={<Box sx={{ fontFamily: sans, fontWeight: 600, fontSize: 22, lineHeight: 1, color: open === index ? accent : ink }}>{open === index ? '−' : '+'}</Box>}
                  sx={{ px: 5, minHeight: 58, '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'none' } }}
                >
                  <Typography sx={{ fontFamily: serif, fontSize: 15.5, color: ink }}>{item.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 5, pt: 0, pb: 5 }}>
                  <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 14, lineHeight: 1.7, color: body }}>{item.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}

function Plate({ id, label, size }: { id: string; label: string; size: number }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ width: size, height: size, mx: 'auto', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 24px 40px -18px rgba(0,0,0,.6)', animation: `${turn} 40s linear infinite`, ...motionSafe }}>
        <Photo id={id} alt={label} width={size * 2} height={size * 2} />
      </Box>
    </Box>
  );
}

export function CtaSection() {
  return (
    <Box component="section" id="contato" sx={{ scrollMarginTop: 90, py: { xs: 0, md: 8 } }}>
      <Box sx={{ position: 'relative', maxWidth: 1220, mx: 'auto', bgcolor: '#0F0F0F', color: white, borderRadius: { xs: 0, md: '28px' }, overflow: 'hidden', minHeight: { md: 380 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr 320px' }, alignItems: 'center' }}>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignSelf: 'end', justifyContent: 'center', pt: 10 }}>
          <Box sx={{ width: 260, pt: 6, pb: 8, borderRadius: '130px 130px 0 0', bgcolor: white, color: ink, textAlign: 'center' }}>
            <Plate id={PHOTOS.steakFries} label="Calabresa acebolada" size={190} />
            <Typography sx={{ mt: 4, fontFamily: sans, fontWeight: 800, fontSize: 18 }}>Calabresa acebolada</Typography>
          </Box>
        </Box>
        <Reveal sx={{ textAlign: 'center', px: { xs: 6, md: 4 }, py: { xs: 14, md: 10 } }}>
          <Typography component="h2" sx={{ fontFamily: sans, fontWeight: 800, fontSize: { xs: 30, md: 38 }, lineHeight: 1.15 }}>
            Faça um pedido
            <br />
            direto da <Box component="span" sx={{ color: accent }}>sua mesa</Box>
          </Typography>
          <Typography sx={{ mt: 4, mx: 'auto', maxWidth: 380, fontFamily: sans, fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,255,255,.65)' }}>
            Entre na mesa 05 da Triunfo, peça um lanche e acompanhe o pedido chegando na cozinha.
          </Typography>
          <Box sx={{ mt: 7, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            <PillButton to="/t/triunfo-lanches?mesa=t05-000a">Pedir agora</PillButton>
            <PillButton to="/login" tone="outline">
              Entrar como equipe
            </PillButton>
          </Box>
        </Reveal>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignSelf: 'stretch', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ position: 'absolute', inset: '0 0 0 30px', bgcolor: accent, borderRadius: '0 0 0 180px' }} />
          <Box sx={{ position: 'relative', textAlign: 'center' }}>
            <Typography sx={{ mb: 5, fontFamily: sans, fontWeight: 800, fontSize: 18 }}>Batata frita</Typography>
            <Plate id={PHOTOS.fries} label="Batata frita" size={200} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 15, color: ink }}>{title}</Typography>
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 4, display: 'flex', flexDirection: 'column', gap: 2.5, fontFamily: sans, fontWeight: 500, fontSize: 14, color: body, '& a': { color: body, textDecoration: 'none', transition: 'color .2s ease', '&:hover': { color: accent } } }}>
        {children}
      </Box>
    </Box>
  );
}

function ContactLine({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Box component="li" sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box component="svg" viewBox="0 0 24 24" sx={{ mt: '2px', width: 16, height: 16, flexShrink: 0, fill: 'none', stroke: accent, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <path d={icon} />
      </Box>
      <Box>{children}</Box>
    </Box>
  );
}

export function Footer() {
  return (
    <Box component="footer" sx={{ position: 'relative', mt: 10, overflow: 'hidden', bgcolor: white, borderTop: `1px solid ${line}` }}>
      <Box aria-hidden sx={{ position: 'absolute', right: -120, top: -80, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(235,90,36,.10), rgba(235,90,36,0) 70%)' }} />
      <Container maxWidth="lg" sx={{ position: 'relative', pt: 14, pb: 6 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1fr 1fr 1.3fr' }, gap: 8 }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BrandMark sx={{ fontSize: 36, color: ink }} />
              <Typography sx={{ fontFamily: serif, fontWeight: 600, fontSize: 24, color: ink }}>Pede Aí</Typography>
            </Box>
            <Typography sx={{ mt: 3, maxWidth: 260, fontFamily: sans, fontWeight: 500, fontSize: 14, lineHeight: 1.7, color: body }}>
              Pedidos digitais para bares e restaurantes, do QR na mesa ao fechamento do caixa.
            </Typography>
          </Box>
          <FooterColumn title="Navegação">
            <li><a href="#sobre">Sobre</a></li>
            <li><a href="#cardapio">Cardápio</a></li>
            <li><a href="#equipe">Equipe</a></li>
            <li><a href="#duvidas">Dúvidas</a></li>
          </FooterColumn>
          <FooterColumn title="Sistema">
            <li><RouterLink to="/t/triunfo-lanches">Casa de demonstração</RouterLink></li>
            <li><RouterLink to="/producao">Painel da cozinha</RouterLink></li>
            <li><RouterLink to="/salao">Painel do salão</RouterLink></li>
            <li><RouterLink to="/gestao">Gestão</RouterLink></li>
          </FooterColumn>
          <FooterColumn title="Contato">
            <ContactLine icon="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z">
              Rua das Palmeiras, 320
              <br />
              Centro, Campinas, SP
            </ContactLine>
            <ContactLine icon="M4 6h16v12H4zM4 7l8 6 8-6">PUC-Campinas · Projeto Integrador IV</ContactLine>
            <Box component="li" sx={{ display: 'flex', gap: 2, mt: 1 }}>
              {[
                { href: 'https://github.com/PresetyX/PI_IV-Time-5', label: 'GitHub', icon: 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21' },
                { href: '/t/triunfo-lanches', label: 'Casa de demonstração', icon: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6' },
                { href: '/login', label: 'Entrar', icon: 'M15 3h4v18h-4M10 17l5-5-5-5M15 12H3' },
              ].map((social) => (
                <Box
                  key={social.label}
                  component="a"
                  href={social.href}
                  aria-label={social.label}
                  {...(social.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                  sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: accent, color: `${white} !important`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .25s ease', '&:hover': { transform: 'translateY(-3px)' } }}
                >
                  <Box component="svg" viewBox="0 0 24 24" sx={{ width: 17, height: 17, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d={social.icon} />
                  </Box>
                </Box>
              ))}
            </Box>
          </FooterColumn>
        </Box>
        <Typography sx={{ mt: 12, pt: 5, borderTop: `1px solid ${line}`, textAlign: 'center', fontFamily: sans, fontWeight: 500, fontSize: 13, color: muted }}>
          © {new Date().getFullYear()} Pede Aí. Feito pelo Time 5 da PUC-Campinas. Fotos: Unsplash.
        </Typography>
      </Container>
    </Box>
  );
}

