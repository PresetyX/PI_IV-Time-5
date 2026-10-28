import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, ButtonBase, Container, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import { Blob, CountUp, PHOTOS, Reveal, SectionTitle, float, landing, marquee, photo, spin } from './landingKit';

const { accent, accentSoft, ink, body, muted, line, serif, sans } = landing;

function Photo({ id, alt, width = 900, height, sx }: { id: string; alt: string; width?: number; height?: number; sx?: object }) {
  return <Box component="img" src={photo(id, width, height)} alt={alt} loading="lazy" sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...sx }} />;
}

export function AboutSection() {
  return (
    <Box component="section" id="sobre" sx={{ position: 'relative', py: { xs: 12, md: 18 }, scrollMarginTop: 80 }}>
      <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: { xs: 8, md: 10 }, alignItems: 'center' }}>
        <Reveal>
          <Box
            sx={{
              position: 'relative',
              height: { xs: 380, md: 480 },
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: '0 30px 60px -30px rgba(0,0,0,.45)',
              '&:hover img': { transform: 'scale(1.06)' },
              '& img': { transition: 'transform 1.2s cubic-bezier(.2,.7,.2,1)' },
            }}
          >
            <Photo id={PHOTOS.burger} alt="Hambúrguer artesanal servido na mesa" width={1100} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.78) 100%)' }} />
            <Box sx={{ position: 'absolute', left: 24, top: 24, px: 3, py: 2, borderRadius: '14px', bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(6px)' }}>
              <Typography sx={{ fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: accent }}>PEDIDO #128 · MESA 05</Typography>
              <Typography sx={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, color: ink }}>Saiu da cozinha agora</Typography>
            </Box>
            <Box sx={{ position: 'absolute', left: 24, right: 24, bottom: 24, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between', gap: 3 }}>
              <Typography sx={{ fontFamily: serif, fontSize: { xs: 26, md: 32 }, lineHeight: 1.15, color: '#fff' }}>
                Da mesa para a chapa,
                <br />
                sem papelzinho no caminho
              </Typography>
              <Button component={RouterLink} to="/t/triunfo-lanches" sx={{ flexShrink: 0, bgcolor: '#fff', color: ink, borderRadius: 999, px: 4, minHeight: 44, fontWeight: 800, '&:hover': { bgcolor: accentSoft } }}>
                Ver cardápio
              </Button>
            </Box>
          </Box>
        </Reveal>

        <Box>
          <Reveal>
            <Typography component="h2" sx={{ fontFamily: serif, fontSize: { xs: 32, md: 42 }, lineHeight: 1.15, color: ink }}>
              Conheça o <Box component="span" sx={{ color: accent }}>Pede Aí</Box>
            </Typography>
            <Typography sx={{ mt: 3, fontFamily: sans, fontWeight: 500, fontSize: 16, lineHeight: 1.75, color: body }}>
              O cliente lê o QR code da mesa, monta o pedido no próprio celular e envia. O pedido cai na hora no painel da cozinha, o salão sabe o que entregar e a gestão acompanha tudo em tempo real, do primeiro chopp ao fechamento do caixa.
            </Typography>
          </Reveal>
          <Reveal delay={150}>
            <Box sx={{ mt: 6, position: 'relative', borderRadius: '24px', overflow: 'hidden', height: 280 }}>
              <Photo id={PHOTOS.chefPlating} alt="Cozinheiro finalizando um prato" width={900} />
              <Box
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: 16,
                  bottom: 16,
                  width: { xs: 190, sm: 210 },
                  p: 4,
                  borderRadius: '18px',
                  bgcolor: 'rgba(255,255,255,.9)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                }}
              >
                {[
                  { value: 3, suffix: '', label: 'modos de atendimento' },
                  { value: 4, suffix: '', label: 'perfis de equipe' },
                  { value: 15, suffix: ' s', label: 'para a fila se atualizar' },
                ].map((stat) => (
                  <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '12px', bgcolor: accentSoft, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800 }}>✓</Box>
                    <Box>
                      <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 20, color: ink, lineHeight: 1.1 }}>
                        <CountUp to={stat.value} suffix={stat.suffix} />
                      </Typography>
                      <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 12, color: muted }}>{stat.label}</Typography>
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
  { icon: '▣', title: 'Sem app, só o QR', text: 'O cliente aponta a câmera para a plaquinha e já vê o cardápio da casa. Nada para baixar, nada para cadastrar.', tint: '#FFE7D6' },
  { icon: '⇄', title: 'Comanda dividida na mesa', text: 'Cada pessoa pode ter a sua comanda ou entrar na do amigo com um código de 4 números. A conta fecha certinha.', tint: '#E8F3EC' },
  { icon: '◐', title: 'Sua marca na tela', text: 'Nome, frase e cor da casa aparecem para o cliente. O sistema é o mesmo, a cara é a do seu bar ou restaurante.', tint: '#EEE8FB' },
];

export function WhySection() {
  return (
    <Box component="section" id="por-que" sx={{ position: 'relative', py: { xs: 12, md: 16 }, scrollMarginTop: 80, overflow: 'hidden' }}>
      <Blob color="#FFD9C4" size={420} sx={{ left: -160, top: 40 }} />
      <Blob color="#E3DBFF" size={380} sx={{ right: -120, bottom: 0 }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Reveal>
          <SectionTitle title="Por que escolher o" accent="Pede Aí?" lead="Feito para a correria de bar e restaurante: rápido para o cliente, claro para a cozinha e simples para quem fecha o caixa." />
        </Reveal>
        <Box sx={{ mt: 10, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 5 }}>
          {REASONS.map((reason, index) => (
            <Reveal key={reason.title} delay={index * 120}>
              <Box
                sx={{
                  height: '100%',
                  p: 6,
                  borderRadius: '26px',
                  background: `linear-gradient(160deg, ${reason.tint} 0%, rgba(255,255,255,.85) 60%)`,
                  border: `1px solid ${line}`,
                  transition: 'transform .35s ease, box-shadow .35s ease',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 24px 50px -28px rgba(232,86,42,.55)' },
                  '&:hover .reason-icon': { transform: 'rotate(-12deg) scale(1.1)' },
                }}
              >
                <Box className="reason-icon" sx={{ width: 64, height: 64, borderRadius: '20px', bgcolor: '#fff', color: accent, fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 24px -16px rgba(0,0,0,.35)', transition: 'transform .35s ease' }}>
                  {reason.icon}
                </Box>
                <Typography component="h3" sx={{ mt: 5, fontFamily: sans, fontWeight: 800, fontSize: 20, color: ink }}>{reason.title}</Typography>
                <Typography sx={{ mt: 2, fontFamily: sans, fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, color: body }}>{reason.text}</Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const FLOWS = [
  {
    key: 'cliente',
    label: 'Cliente',
    image: PHOTOS.diningTable,
    title: 'Lê o QR, escolhe e pede',
    points: ['Abre o cardápio da casa pelo QR da mesa', 'Abre a própria comanda ou entra na do amigo', 'Monta o carrinho e envia direto para a cozinha', 'Acompanha a conta com serviço calculado'],
    to: '/t/triunfo-lanches?mesa=t05-000a',
    cta: 'Testar como cliente',
  },
  {
    key: 'cozinha',
    label: 'Cozinha',
    image: PHOTOS.flames,
    title: 'Fila organizada por status',
    points: ['Pedido chega em Recebido na mesma hora', 'Um toque para iniciar o preparo e outro para marcar pronto', 'Pedido atrasado ganha borda vermelha', 'Tela grande para deixar aberta numa TV'],
    to: '/producao',
    cta: 'Ver painel da cozinha',
  },
  {
    key: 'salao',
    label: 'Salão',
    image: PHOTOS.hall,
    title: 'Mapa das mesas e entregas',
    points: ['Mesas livres, ocupadas e pedindo a conta', 'Lista do que já está pronto para levar', 'Detalhe da conta com cada pedido', 'Fecha a conta no Pix, dinheiro ou cartão'],
    to: '/salao',
    cta: 'Ver painel do salão',
  },
  {
    key: 'gestao',
    label: 'Gestão',
    image: PHOTOS.payment,
    title: 'Números do dia, da semana e do mês',
    points: ['Faturamento, ticket médio e mais pedidos', 'Curva ABC para enxugar o cardápio', 'Caixa com sangria e conferência por forma de pagamento', 'Equipe, comissões e configuração da casa'],
    to: '/gestao',
    cta: 'Ver painel da gestão',
  },
];

export function HowItWorksSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const flow = FLOWS[current];

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => setCurrent((index) => (index + 1) % FLOWS.length), 6000);
    return () => clearTimeout(timer);
  }, [current, paused]);

  return (
    <Box component="section" id="como-funciona" sx={{ py: { xs: 12, md: 16 }, scrollMarginTop: 80, bgcolor: '#fff' }}>
      <Container maxWidth="lg">
        <Reveal>
          <SectionTitle eyebrow="Como funciona" title="Um pedido, quatro telas," accent="zero ruído" lead="Toque em cada perfil para ver o que ele enxerga. Os botões abrem o sistema de verdade, com a casa de demonstração." />
        </Reveal>
        <Box onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} sx={{ mt: 8 }}>
          <Box role="tablist" sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
            {FLOWS.map((item, index) => (
              <ButtonBase
                key={item.key}
                role="tab"
                aria-selected={index === current}
                onClick={() => setCurrent(index)}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  px: 6,
                  minHeight: 48,
                  borderRadius: 999,
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 15,
                  color: index === current ? '#fff' : ink,
                  bgcolor: index === current ? ink : '#F4F1EE',
                  transition: 'background-color .3s ease, color .3s ease',
                }}
              >
                {item.label}
                {index === current && !paused && (
                  <Box key={current} sx={{ position: 'absolute', left: 0, bottom: 0, height: 3, bgcolor: accent, animation: 'grow 6s linear forwards', '@keyframes grow': { from: { width: 0 }, to: { width: '100%' } } }} />
                )}
              </ButtonBase>
            ))}
          </Box>

          <Box key={flow.key} sx={{ mt: 8, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 6, md: 10 }, alignItems: 'center', animation: 'fadeSwap .5s ease', '@keyframes fadeSwap': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } } }}>
            <Box sx={{ position: 'relative', height: { xs: 300, md: 400 }, borderRadius: '28px', overflow: 'hidden' }}>
              <Photo id={flow.image} alt={flow.title} width={1000} />
              <Box sx={{ position: 'absolute', right: 20, bottom: 20, px: 4, py: 2, borderRadius: 999, bgcolor: accent, color: '#fff', fontFamily: sans, fontWeight: 800, fontSize: 13 }}>
                {String(current + 1).padStart(2, '0')} / {String(FLOWS.length).padStart(2, '0')}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: sans, fontSize: 12, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>{flow.label}</Typography>
              <Typography component="h3" sx={{ mt: 2, fontFamily: serif, fontSize: { xs: 30, md: 38 }, lineHeight: 1.15, color: ink }}>{flow.title}</Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {flow.points.map((point, index) => (
                  <Box component="li" key={point} sx={{ display: 'flex', gap: 3, alignItems: 'center', opacity: 0, animation: `fadeSwap .45s ease ${120 + index * 90}ms forwards` }}>
                    <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', bgcolor: accentSoft, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 13 }}>{index + 1}</Box>
                    <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 15.5, color: body }}>{point}</Typography>
                  </Box>
                ))}
              </Box>
              <Button component={RouterLink} to={flow.to} sx={{ mt: 6, bgcolor: accent, color: '#fff', borderRadius: 999, px: 6, minHeight: 50, fontWeight: 800, '&:hover': { bgcolor: '#cf4720' } }}>
                {flow.cta} →
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

const MODES = [
  { image: PHOTOS.tableSpread, badge: 'Disponível', tag: 'Mais usado', title: 'Pedido na mesa', text: 'QR em cada mesa, comanda compartilhada e conta no fim.', meta: ['QR code', 'Comanda', 'Serviço 10%'] },
  { image: PHOTOS.burgers, badge: 'Disponível', tag: 'Rápido', title: 'Retirada no balcão', text: 'O cliente pede, a cozinha prepara e chama pela senha.', meta: ['Senha', 'Fila', 'Sem mesa'] },
  { image: PHOTOS.spread, badge: 'Em breve', tag: 'Próxima versão', title: 'Entrega', text: 'O mesmo cardápio indo até a casa do cliente.', meta: ['Endereço', 'Taxa', 'Rota'] },
];

export function ModesSection() {
  return (
    <Box component="section" id="atendimento" sx={{ py: { xs: 12, md: 16 }, scrollMarginTop: 80 }}>
      <Container maxWidth="lg">
        <Reveal>
          <SectionTitle title="Do jeito que a sua" accent="casa atende" lead="Liga e desliga cada modo na configuração. O cliente só vê o que está ativo." />
        </Reveal>
        <Box sx={{ mt: 10, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 5 }}>
          {MODES.map((mode, index) => (
            <Reveal key={mode.title} delay={index * 120}>
              <Box
                sx={{
                  borderRadius: '24px',
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  border: `1px solid ${line}`,
                  transition: 'transform .35s ease, box-shadow .35s ease',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 30px 50px -30px rgba(0,0,0,.4)' },
                  '&:hover img': { transform: 'scale(1.08)' },
                }}
              >
                <Box sx={{ position: 'relative', height: 220, overflow: 'hidden', '& img': { transition: 'transform .9s ease' } }}>
                  <Photo id={mode.image} alt={mode.title} width={800} />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.65))' }} />
                  <Box sx={{ position: 'absolute', right: 14, top: 14, px: 3, py: 1, borderRadius: 999, bgcolor: mode.badge === 'Em breve' ? ink : accent, color: '#fff', fontFamily: sans, fontWeight: 800, fontSize: 12 }}>{mode.badge}</Box>
                  <Typography sx={{ position: 'absolute', left: 18, bottom: 14, fontFamily: sans, fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>{mode.tag}</Typography>
                </Box>
                <Box sx={{ p: 5 }}>
                  <Typography component="h3" sx={{ fontFamily: sans, fontWeight: 800, fontSize: 19, color: ink }}>{mode.title}</Typography>
                  <Typography sx={{ mt: 1, fontFamily: sans, fontWeight: 500, fontSize: 14, color: body, minHeight: 44 }}>{mode.text}</Typography>
                  <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {mode.meta.map((item) => (
                      <Box key={item} sx={{ px: 3, py: 1, borderRadius: 999, bgcolor: '#F6F2EF', fontFamily: sans, fontWeight: 700, fontSize: 12, color: body }}>{item}</Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

function Chip({ title, text, tone }: { title: string; text: string; tone: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, pr: 4, borderRadius: '16px', bgcolor: '#fff', boxShadow: '0 16px 30px -22px rgba(0,0,0,.4)', transition: 'transform .3s ease', '&:hover': { transform: 'translateX(6px)' } }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '11px', bgcolor: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontWeight: 800 }}>●</Box>
      <Box>
        <Typography sx={{ fontFamily: serif, fontSize: 14, color: ink }}>{title}</Typography>
        <Typography sx={{ fontFamily: sans, fontSize: 11.5, fontWeight: 600, color: muted }}>{text}</Typography>
      </Box>
    </Box>
  );
}

export function ManagementSection() {
  return (
    <Box component="section" id="gestao" sx={{ position: 'relative', py: { xs: 12, md: 16 }, scrollMarginTop: 80, overflow: 'hidden', backgroundImage: 'linear-gradient(#f1ece8 1px, transparent 1px), linear-gradient(90deg, #f1ece8 1px, transparent 1px)', backgroundSize: '44px 44px' }}>
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 4 }}>
          <Reveal>
            <SectionTitle align="left" title="Domine a gestão da casa com" accent="confiança" />
          </Reveal>
          <Reveal delay={100}>
            <Typography sx={{ maxWidth: 360, fontFamily: sans, fontWeight: 500, fontSize: 15, lineHeight: 1.7, color: body }}>
              Tudo que sai da cozinha vira número: faturamento por hora, produtos campeões, comissão de cada garçom e o caixa batendo no fim da noite.
            </Typography>
          </Reveal>
        </Box>

        <Box sx={{ mt: 10, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1.1fr' }, gap: 4, alignItems: 'center' }}>
          <Reveal>
            <Box sx={{ position: 'relative', height: 230, borderRadius: '22px', overflow: 'hidden' }}>
              <Photo id={PHOTOS.chopping} alt="Preparo na cozinha" width={700} />
              <Box sx={{ position: 'absolute', left: 14, bottom: 14, px: 3, py: 1, borderRadius: 999, bgcolor: 'rgba(255,255,255,.9)', fontFamily: sans, fontWeight: 800, fontSize: 12 }}>Fila da cozinha</Box>
            </Box>
          </Reveal>
          <Reveal delay={100}>
            <Box sx={{ position: 'relative', p: 5, borderRadius: '22px', background: 'linear-gradient(150deg, #fff 0%, #FFF1E9 100%)', border: `1px solid ${line}`, transform: { md: 'rotate(-3deg)' }, transition: 'transform .4s ease', '&:hover': { transform: 'rotate(0deg) scale(1.03)' } }}>
              <Typography sx={{ fontFamily: serif, fontSize: 24, lineHeight: 1.25, color: ink }}>
                Pedido na tela da cozinha, não no papel pendurado na parede.
              </Typography>
              <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <BrandMark sx={{ fontSize: 34, color: ink }} />
                <Box>
                  <Typography sx={{ fontFamily: serif, fontSize: 14, color: ink }}>Painel de produção</Typography>
                  <Typography sx={{ fontFamily: sans, fontSize: 12, color: muted }}>atualiza a cada 15 segundos</Typography>
                </Box>
              </Box>
            </Box>
          </Reveal>
          <Reveal delay={200}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 4, borderRadius: '22px', bgcolor: 'rgba(255,255,255,.7)', border: `1px solid ${line}`, backdropFilter: 'blur(6px)' }}>
              <Chip title="Curva ABC" text="o que vende e o que sobra" tone="#FFE7D6" />
              <Chip title="Fechamento de caixa" text="sangria e conferência" tone="#E8F3EC" />
              <Chip title="Comissões" text="por garçom, em CSV" tone="#EEE8FB" />
            </Box>
          </Reveal>
          <Reveal delay={300}>
            <Box sx={{ position: 'relative', height: 330, borderRadius: '24px', overflow: 'hidden' }}>
              <Photo id={PHOTOS.plating} alt="Chef montando pratos" width={800} />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.7))' }} />
              <Box sx={{ position: 'absolute', right: 14, top: 14, px: 3, py: 1, borderRadius: 999, bgcolor: accent, color: '#fff', fontFamily: sans, fontWeight: 800, fontSize: 12 }}>Ao vivo</Box>
              <Typography sx={{ position: 'absolute', left: 20, bottom: 18, fontFamily: serif, fontSize: 26, lineHeight: 1.15, color: '#fff' }}>
                Gestão que
                <br />
                acompanha o salão
              </Typography>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

const GALLERY = [PHOTOS.flames, PHOTOS.friendsCooking, PHOTOS.plating, PHOTOS.chefPlating, PHOTOS.crowd, PHOTOS.bar, PHOTOS.pizza, PHOTOS.grill];

export function GallerySection() {
  const items = [...GALLERY, ...GALLERY];
  return (
    <Box component="section" aria-label="Galeria" sx={{ py: { xs: 6, md: 10 }, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', gap: 3, width: 'max-content', animation: `${marquee} 45s linear infinite`, '&:hover': { animationPlayState: 'paused' }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
        {items.map((id, index) => (
          <Box
            key={`${id}-${index}`}
            sx={{
              width: { xs: 200, md: 260 },
              height: { xs: 240, md: 300 },
              flexShrink: 0,
              borderRadius: '22px',
              overflow: 'hidden',
              transform: index % 2 ? 'translateY(24px)' : 'none',
              filter: 'saturate(.95)',
              transition: 'filter .3s ease, transform .4s ease',
              '&:hover': { filter: 'saturate(1.2)', transform: index % 2 ? 'translateY(14px) scale(1.03)' : 'translateY(-10px) scale(1.03)' },
            }}
          >
            <Photo id={id} alt="" width={520} height={600} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const QUESTIONS = [
  { q: 'O cliente precisa baixar algum aplicativo?', a: 'Não. Ele lê o QR code da mesa com a câmera do celular e o cardápio abre no navegador. Também dá para digitar o número da mesa se o QR estiver apagado.' },
  { q: 'Como funciona a comanda compartilhada?', a: 'Quem abre a comanda recebe um código de 4 números. Os amigos da mesma mesa entram com esse código e tudo que pedirem cai na mesma conta. O dono da comanda pode remover quem entrou por engano.' },
  { q: 'O pedido vai direto para a cozinha?', a: 'Sim. Assim que o cliente envia, o pedido aparece como Recebido no painel de produção, que se atualiza sozinho a cada 15 segundos. A cozinha marca o preparo e o pronto, e o salão vê o que precisa entregar.' },
  { q: 'Dá para colocar a cara da minha casa?', a: 'Dá. Na configuração você escolhe o nome, a frase de apresentação, a cor principal e os modos de atendimento. O cliente vê tudo isso nas telas dele.' },
  { q: 'Como fecha a conta e o caixa?', a: 'O salão registra o pagamento em Pix, dinheiro, débito ou crédito e a conta fecha. No fim da noite a gestão confere cada forma de pagamento, registra sangrias e fecha o caixa, que não fecha com conta aberta.' },
  { q: 'Quem da equipe vê o quê?', a: 'Existem quatro perfis: dono, gerente, salão e cozinha. Cada um vê só o que precisa, e o dono convida, edita e desliga pessoas na tela de equipe.' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | false>(0);
  return (
    <Box component="section" id="duvidas" sx={{ position: 'relative', py: { xs: 12, md: 16 }, scrollMarginTop: 80, overflow: 'hidden' }}>
      <Blob color="#FFE0CF" size={360} sx={{ left: -80, top: 120 }} />
      <Container maxWidth="lg" sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.2fr' }, gap: { xs: 8, md: 12 }, alignItems: 'start' }}>
        <Reveal>
          <SectionTitle align="left" title="Perguntas" accent="frequentes" />
          <Box sx={{ position: 'relative', mt: 8, width: { xs: 220, md: 280 }, height: { xs: 220, md: 280 }, mx: { xs: 'auto', md: 0 } }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from 90deg, ${accentSoft}, #EEE8FB, #E8F3EC, ${accentSoft})`, animation: `${spin} 18s linear infinite` }} />
            <Box sx={{ position: 'absolute', inset: 18, borderRadius: '50%', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px #f1ece8' }}>
              <BrandMark sx={{ fontSize: { xs: 120, md: 160 }, color: ink, animation: `${float} 5s ease-in-out infinite` }} />
            </Box>
          </Box>
        </Reveal>
        <Reveal delay={120}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {QUESTIONS.map((item, index) => (
              <Accordion
                key={item.q}
                disableGutters
                elevation={0}
                expanded={open === index}
                onChange={(_, expanded) => setOpen(expanded ? index : false)}
                sx={{ borderRadius: '18px !important', border: `1px solid ${open === index ? '#F6C9B6' : line}`, bgcolor: open === index ? '#FFF8F4' : '#fff', '&:before': { display: 'none' }, transition: 'background-color .3s ease, border-color .3s ease' }}
              >
                <AccordionSummary expandIcon={<Box sx={{ fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{open === index ? '−' : '+'}</Box>} sx={{ px: 5, minHeight: 60, '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'none' } }}>
                  <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 15.5, color: ink }}>{item.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 5, pt: 0, pb: 5 }}>
                  <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, color: body }}>{item.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}

function RoundDish({ id, label, sx }: { id: string; label: string; sx?: object }) {
  return (
    <Box sx={{ textAlign: 'center', ...sx }}>
      <Box sx={{ width: { xs: 150, md: 190 }, height: { xs: 150, md: 190 }, mx: 'auto', borderRadius: '50%', overflow: 'hidden', border: '6px solid #fff', boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)', animation: `${float} 6s ease-in-out infinite` }}>
        <Photo id={id} alt={label} width={400} height={400} />
      </Box>
      <Typography sx={{ mt: 3, fontFamily: sans, fontWeight: 800, fontSize: 16, color: 'inherit' }}>{label}</Typography>
    </Box>
  );
}

export function CtaSection() {
  return (
    <Box component="section" id="contato" sx={{ scrollMarginTop: 80, px: { xs: 0, md: 4 } }}>
      <Box sx={{ position: 'relative', maxWidth: 1240, mx: 'auto', bgcolor: '#111', color: '#fff', borderRadius: { xs: 0, md: '32px' }, overflow: 'hidden', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr 1fr' }, alignItems: 'center', gap: 6, px: { xs: 6, md: 10 }, py: { xs: 12, md: 14 } }}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', left: 40, bottom: -60, width: 280, height: 280, borderRadius: '50%', bgcolor: '#fff' }} />
        <RoundDish id={PHOTOS.ribs} label="Costela na brasa" sx={{ position: 'relative', color: { xs: '#fff', md: ink }, display: { xs: 'none', md: 'block' } }} />
        <Reveal sx={{ textAlign: 'center' }}>
          <Typography component="h2" sx={{ fontFamily: sans, fontWeight: 800, fontSize: { xs: 30, md: 40 }, lineHeight: 1.15 }}>
            Coloque a sua casa no
            <br />
            <Box component="span" sx={{ color: accent }}>Pede Aí</Box> hoje mesmo
          </Typography>
          <Typography sx={{ mt: 3, mx: 'auto', maxWidth: 420, fontFamily: sans, fontWeight: 500, fontSize: 15, color: 'rgba(255,255,255,.7)' }}>
            Veja o fluxo completo na casa de demonstração: pedido na mesa, cozinha, salão e gestão.
          </Typography>
          <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Button component={RouterLink} to="/t/triunfo-lanches?mesa=t05-000a" sx={{ bgcolor: accent, color: '#fff', borderRadius: 999, px: 6, minHeight: 50, fontWeight: 800, '&:hover': { bgcolor: '#cf4720' } }}>
              Fazer um pedido de teste
            </Button>
            <Button component={RouterLink} to="/login" sx={{ border: '1px solid rgba(255,255,255,.35)', color: '#fff', borderRadius: 999, px: 6, minHeight: 50, fontWeight: 800, '&:hover': { bgcolor: 'rgba(255,255,255,.08)' } }}>
              Entrar como equipe
            </Button>
          </Box>
        </Reveal>
        <Box sx={{ position: 'relative', alignSelf: 'stretch', display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ position: 'absolute', inset: '-120px -40px -120px 20px', bgcolor: accent, borderRadius: '0 0 0 160px' }} />
          <RoundDish id={PHOTOS.grill} label="Espetinho misto" sx={{ position: 'relative', color: '#fff' }} />
        </Box>
      </Box>
    </Box>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 15, color: ink }}>{title}</Typography>
      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, '& a': { fontFamily: sans, fontWeight: 600, fontSize: 14, color: body, textDecoration: 'none', width: 'fit-content', transition: 'color .2s ease', '&:hover': { color: accent } } }}>
        {children}
      </Box>
    </Box>
  );
}

export function Footer() {
  return (
    <Box component="footer" sx={{ position: 'relative', mt: { xs: 0, md: 10 }, pt: 12, pb: 6, overflow: 'hidden' }}>
      <Blob color="#FFE0CF" size={300} sx={{ right: -60, top: 0 }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1fr 1fr 1.2fr' }, gap: 6 }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BrandMark sx={{ fontSize: 40, color: ink }} />
              <Typography sx={{ fontFamily: serif, fontSize: 26, color: ink }}>Pede Aí</Typography>
            </Box>
            <Typography sx={{ mt: 3, maxWidth: 280, fontFamily: sans, fontWeight: 500, fontSize: 14, lineHeight: 1.7, color: body }}>
              Pedidos digitais para bares e restaurantes, do QR na mesa ao fechamento do caixa.
            </Typography>
          </Box>
          <FooterColumn title="Navegação">
            <a href="#sobre">Sobre</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#atendimento">Atendimento</a>
            <a href="#duvidas">Dúvidas</a>
          </FooterColumn>
          <FooterColumn title="Sistema">
            <RouterLink to="/t/triunfo-lanches">Casa de demonstração</RouterLink>
            <RouterLink to="/login">Entrar como equipe</RouterLink>
            <RouterLink to="/producao">Painel da cozinha</RouterLink>
            <RouterLink to="/gestao">Gestão</RouterLink>
          </FooterColumn>
          <FooterColumn title="Projeto">
            <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 14, color: body }}>Projeto Integrador IV · Time 5</Typography>
            <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 14, color: body }}>PUC-Campinas</Typography>
            <a href="https://github.com/PresetyX/PI_IV-Time-5" target="_blank" rel="noreferrer">
              Código no GitHub ↗
            </a>
          </FooterColumn>
        </Box>
        <Box sx={{ mt: 10, pt: 5, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 13, color: muted }}>
            © {new Date().getFullYear()} Pede Aí · Fotos: Unsplash
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
