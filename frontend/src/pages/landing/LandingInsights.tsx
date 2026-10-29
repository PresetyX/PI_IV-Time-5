import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, ButtonBase, Container, Typography } from '@mui/material';
import ChefMascot from './ChefMascot';
import { Check, reduceMotion } from './LandingSections';
import { CLIPS, Clip, CountUp, Em, PHOTOS, Photo, Reveal, Sub, Title, bob, drift, formatPrice, landing, motionSafe, turn, useInView } from './landingKit';

const { accent, accentDark, peach, ink, body, muted, line, white, sans } = landing;

export const DEMO_PATH = '/t/triunfo-lanches?mesa=t05-000a';

function PillButton({ to, href, children, tone = 'accent' }: { to?: string; href?: string; children: ReactNode; tone?: 'accent' | 'white' | 'outline' | 'dark' }) {
  const styles = {
    accent: { bgcolor: accent, color: white, '&:hover': { bgcolor: accentDark } },
    white: { bgcolor: white, color: ink, '&:hover': { bgcolor: peach } },
    outline: { color: white, border: '1px solid rgba(255,255,255,.35)', '&:hover': { borderColor: white } },
    dark: { bgcolor: ink, color: white, '&:hover': { bgcolor: '#2A2A2A' } },
  }[tone];
  const shared = { ...styles, height: 46, px: 6, flexShrink: 0, whiteSpace: 'nowrap', borderRadius: 999, fontFamily: sans, fontWeight: 700, fontSize: 14, transition: 'all .25s ease' };
  if (href) {
    return (
      <ButtonBase component="a" href={href} sx={shared}>
        {children}
      </ButtonBase>
    );
  }
  return (
    <ButtonBase component={RouterLink} to={to ?? DEMO_PATH} sx={shared}>
      {children}
    </ButtonBase>
  );
}

const FUNNEL = [
  { label: 'Leram o QR da mesa', value: 100 },
  { label: 'Abriram o cardápio', value: 93 },
  { label: 'Colocaram item no carrinho', value: 72 },
  { label: 'Enviaram o pedido', value: 64 },
  { label: 'Pediram uma segunda rodada', value: 38 },
];

function FloatStat({ title, from, to, tone, delay, sx }: { title: string; from: string; to: string; tone: string; delay: number; sx: object }) {
  return (
    <Box sx={{ position: 'absolute', ...sx, px: 4, py: 3, borderRadius: '16px', bgcolor: 'rgba(255,255,255,.95)', boxShadow: '0 24px 40px -22px rgba(0,0,0,.55)', '--tilt': '0deg', animation: `${bob} 6s ease-in-out ${delay}s infinite`, ...motionSafe }}>
      <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 11.5, color: muted }}>{title}</Typography>
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: muted, textDecoration: 'line-through' }}>{from}</Typography>
        <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color: tone }}>{to}</Typography>
      </Box>
    </Box>
  );
}

export function ConversionSection() {
  const { ref, visible } = useInView<HTMLDivElement>(0.3);
  return (
    <Box component="section" id="conversao" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 10, md: 10 }, alignItems: 'center' }}>
        <Box>
          <Reveal from="left">
            <Title align="left" accent="em cada mesa" size={40}>
              Mais conversão
            </Title>
            <Sub align="left" sx={{ mt: 4, maxWidth: 460 }}>
              Quando pedir fica fácil, a mesa pede mais. O cliente não espera o garçom passar, repete a rodada em um toque e vê sugestões do cardápio na hora certa.
            </Sub>
          </Reveal>
          <Box ref={ref} sx={{ mt: 8, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {FUNNEL.map((step, index) => (
              <Box key={step.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontWeight: 700, fontSize: 13, color: ink }}>
                  <span>{step.label}</span>
                  <Box component="span" sx={{ color: index === FUNNEL.length - 1 ? accent : ink }}>{visible ? <CountUp to={step.value} suffix="%" /> : '0%'}</Box>
                </Box>
                <Box sx={{ mt: 1.5, height: 12, borderRadius: 999, bgcolor: '#EFE8E1', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: visible ? `${step.value}%` : '0%',
                      borderRadius: 999,
                      background: `linear-gradient(90deg, #F7B26A, ${accent})`,
                      opacity: 1 - index * 0.1,
                      transition: `width 1.3s cubic-bezier(.2,.75,.2,1) ${index * 0.15}s`,
                    }}
                  />
                </Box>
              </Box>
            ))}
            <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 11.5, color: muted }}>Funil de uma noite simulada com 120 mesas. Números ilustrativos.</Typography>
          </Box>
        </Box>
        <Reveal from="right">
          <Box sx={{ position: 'relative', height: { xs: 460, md: 560 }, borderRadius: '28px', overflow: 'hidden', bgcolor: ink }}>
            <Clip id={CLIPS.meatballs} quality={720} alt="Almôndegas sendo preparadas" sx={{ animation: `${drift} 18s ease-in-out infinite alternate`, ...motionSafe }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.45))' }} />
            <FloatStat title="Ticket médio por mesa" from="R$ 87" to="R$ 107" tone={accent} delay={0} sx={{ left: { xs: 16, md: 24 }, top: { xs: 20, md: 32 } }} />
            <FloatStat title="Tempo até o 1º pedido" from="6 min" to="1,5 min" tone="#2E9E5B" delay={1.2} sx={{ right: { xs: 16, md: 24 }, top: { xs: 150, md: 200 } }} />
            <FloatStat title="Pedidos errados por noite" from="7" to="1" tone="#2456B8" delay={2.2} sx={{ left: { xs: 16, md: 40 }, bottom: { xs: 24, md: 40 } }} />
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}

const ALERTS = [
  { tone: '#FF6B4A', text: 'Mesa 12 esperando há 18 min' },
  { tone: '#F7B26A', text: 'Batata rústica acabou e foi pausada' },
  { tone: '#5FD08A', text: 'Caixa conferido sem diferença' },
  { tone: '#9DB4FF', text: 'Pico de pedidos às 20h, cozinha no limite' },
  { tone: '#FF6B4A', text: 'Pedido #0187 atrasado na produção' },
  { tone: '#5FD08A', text: 'Mesa 04 fechou a conta no Pix' },
];

const STATUS = [
  { label: 'Recebido', color: '#F7B26A' },
  { label: 'Em preparo', color: '#FF7A45' },
  { label: 'Pronto', color: '#5FD08A' },
];

function sparkline(points: number[], width: number, height: number) {
  const max = Math.max(...points) + 4;
  const min = Math.min(...points) - 4;
  const step = width / (points.length - 1);
  const coords = points.map((point, index) => [index * step, height - ((point - min) / (max - min)) * height]);
  const lineD = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { lineD, areaD: `${lineD} L${width} ${height} L0 ${height} Z`, last: coords[coords.length - 1] };
}

function Panel({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ p: 4, borderRadius: '16px', bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', ...sx }}>{children}</Box>;
}

function Kpi({ label, value, hint, tone = white }: { label: string; value: ReactNode; hint: string; tone?: string }) {
  return (
    <Panel>
      <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{label}</Typography>
      <Typography sx={{ mt: 1, fontFamily: sans, fontWeight: 800, fontSize: { xs: 18, md: 22 }, letterSpacing: '-0.03em', color: tone, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 10.5, color: '#5FD08A' }}>{hint}</Typography>
    </Panel>
  );
}

export function ObservabilitySection() {
  const { ref, visible } = useInView<HTMLDivElement>(0.2);
  const [tick, setTick] = useState(0);
  const [revenue, setRevenue] = useState(482_390);
  const [series, setSeries] = useState([18, 22, 21, 27, 25, 31, 29, 34, 33, 38, 36, 41]);

  useEffect(() => {
    if (!visible || reduceMotion()) return undefined;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      setRevenue((value) => value + 1800 + Math.round(Math.random() * 7400));
      setSeries((values) => [...values.slice(1), Math.max(16, Math.min(46, values[values.length - 1] + Math.round(Math.random() * 10 - 5)))]);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [visible]);

  const chart = sparkline(series, 520, 120);
  const alerts = [0, 1, 2].map((offset) => ALERTS[(tick + ALERTS.length - offset) % ALERTS.length]);
  const occupied = 14 + (tick % 5);
  const prep = 11 + ((tick * 7) % 4);

  return (
    <Box component="section" id="observabilidade" sx={{ px: { xs: 0, md: 5 }, py: { xs: 0, md: 6 }, scrollMarginTop: 90 }}>
      <Box ref={ref} sx={{ position: 'relative', maxWidth: 1240, mx: 'auto', borderRadius: { xs: 0, md: '32px' }, clipPath: { md: 'inset(0 round 32px)' }, overflow: 'hidden', bgcolor: '#0C0C0C', color: white }}>
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, opacity: 0.32 }}>
          <Clip id={CLIPS.grill} quality={360} sx={{ animation: `${drift} 20s ease-in-out infinite alternate`, ...motionSafe }} />
        </Box>
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 90% at 80% 50%, rgba(12,12,12,.6), rgba(12,12,12,.95) 70%)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 14, md: 16 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.85fr 1.15fr' }, gap: { xs: 10, md: 8 }, alignItems: 'center' }}>
          <Reveal from="left">
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, px: 3, py: 1.5, borderRadius: 999, bgcolor: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', fontFamily: sans, fontWeight: 800, fontSize: 11, letterSpacing: 1.6 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF4D3D', boxShadow: '0 0 0 4px rgba(255,77,61,.25)', animation: 'live 1.4s ease infinite', '@keyframes live': { '50%': { opacity: 0.35 } }, ...motionSafe }} />
              OBSERVABILIDADE AO VIVO
            </Box>
            <Typography component="h2" sx={{ mt: 5, fontFamily: sans, fontWeight: 800, fontSize: { xs: 30, md: 42 }, lineHeight: 1.12, letterSpacing: '-0.03em' }}>
              A operação inteira <Em color="#F7B26A">na palma da mão</Em>
            </Typography>
            <Typography sx={{ mt: 4, maxWidth: 440, fontFamily: sans, fontWeight: 500, fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,.7)' }}>
              Cada pedido, comanda e pagamento vira um dado em tempo real. A gestão enxerga gargalos antes de virar reclamação e decide com número, não com achismo.
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Check dark>Alertas de atraso por pedido e por mesa</Check>
              <Check dark>Faturamento, ticket e pedidos por hora ao vivo</Check>
              <Check dark>Itens que acabam saem do cardápio na hora</Check>
              <Check dark>Histórico de cada comanda para auditoria</Check>
            </Box>
          </Reveal>
          <Reveal from="right" delay={150}>
            <Box sx={{ borderRadius: '22px', bgcolor: 'rgba(20,20,20,.75)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(16px)', boxShadow: '0 50px 90px -40px rgba(0,0,0,.9)', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 4, py: 3, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map((color) => (
                  <Box key={color} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                ))}
                <Typography sx={{ ml: 3, fontFamily: sans, fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.55)' }}>Gestão · hoje</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: sans, fontWeight: 700, fontSize: 11, color: '#5FD08A' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#5FD08A' }} />
                  ao vivo
                </Box>
              </Box>
              <Box sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                  <Kpi label="Faturamento" value={formatPrice(revenue)} hint="+12% vs. ontem" tone="#F7B26A" />
                  <Kpi label="Ticket médio" value="R$ 104,80" hint="+R$ 9 na semana" />
                  <Kpi label="Preparo médio" value={`${prep} min`} hint="meta: 15 min" />
                  <Kpi label="Mesas ocupadas" value={`${occupied}/20`} hint={`${Math.round((occupied / 20) * 100)}% do salão`} />
                </Box>
                <Panel sx={{ p: 0, overflow: 'hidden' }}>
                  <Box sx={{ px: 4, pt: 3, display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                    <span>Pedidos por hora</span>
                    <Box component="span" sx={{ color: white }}>{series[series.length - 1]} agora</Box>
                  </Box>
                  <Box component="svg" viewBox="0 0 520 130" preserveAspectRatio="none" sx={{ display: 'block', width: '100%', height: 130 }}>
                    <defs>
                      <linearGradient id="obs-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#EB5A24" stopOpacity=".45" />
                        <stop offset="1" stopColor="#EB5A24" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(0 6)">
                      <path d={chart.areaD} fill="url(#obs-area)" style={{ transition: 'd .8s ease' }} />
                      <path d={chart.lineD} fill="none" stroke="#FF7A45" strokeWidth="2.5" strokeLinejoin="round" style={{ transition: 'd .8s ease' }} />
                      <circle cx={chart.last[0] - 3} cy={chart.last[1]} r="5" fill="#FF7A45" />
                    </g>
                  </Box>
                </Panel>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr .9fr' }, gap: 3 }}>
                  <Panel>
                    <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Alertas</Typography>
                    <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {alerts.map((alert, index) => (
                        <Box
                          key={`${tick}-${index}`}
                          sx={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: sans, fontWeight: 600, fontSize: 12.5, color: index ? 'rgba(255,255,255,.6)' : white, animation: index ? 'none' : 'alertIn .5s cubic-bezier(.2,.75,.2,1) both', '@keyframes alertIn': { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}
                        >
                          <Box sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: alert.tone }} />
                          {alert.text}
                        </Box>
                      ))}
                    </Box>
                  </Panel>
                  <Panel>
                    <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Fila da cozinha</Typography>
                    <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {['#0185 · Mesa 05', '#0186 · Balcão', '#0187 · Mesa 12'].map((order, index) => {
                        const status = STATUS[(tick + index) % STATUS.length];
                        return (
                          <Box key={order} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, fontFamily: sans, fontWeight: 700, fontSize: 12.5 }}>
                            {order}
                            <Box sx={{ px: 2, py: 0.5, borderRadius: 999, bgcolor: `${status.color}26`, color: status.color, fontSize: 11, transition: 'all .5s ease' }}>{status.label}</Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Panel>
                </Box>
              </Box>
            </Box>
          </Reveal>
        </Container>
      </Box>
    </Box>
  );
}

const PLANS = [
  { name: 'Essencial', monthly: 14900, text: 'Para a casa que quer tirar o pedido do papel.', features: ['Cardápio digital com QR', 'Comanda compartilhada', 'Produção e salão', 'Até 15 mesas', 'Suporte por e-mail'], cta: 'Testar a demonstração' },
  { name: 'Profissional', monthly: 29900, text: 'A operação inteira, do pedido ao caixa.', features: ['Tudo do Essencial', 'Caixa e pagamentos', 'Gestão, curva ABC e histórico', 'Equipe e comissões', 'Marca própria completa', 'Mesas ilimitadas'], cta: 'Testar a demonstração', featured: true },
  { name: 'Rede', monthly: 0, text: 'Para grupos com várias lojas e marcas.', features: ['Tudo do Profissional', 'Várias lojas em um painel', 'Domínio próprio', 'Implantação acompanhada', 'Suporte prioritário'], cta: 'Falar com o time' },
];

export function PlansSection() {
  const [yearly, setYearly] = useState(true);
  return (
    <Box component="section" id="planos" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg">
        <Reveal>
          <Title accent="sem taxa por pedido">Planos simples,</Title>
          <Sub sx={{ mt: 2 }}>Mensalidade fixa. O que a casa vende fica com a casa.</Sub>
          <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ position: 'relative', display: 'flex', p: 1, borderRadius: 999, bgcolor: white, border: `1px solid ${line}` }}>
              <Box sx={{ position: 'absolute', top: 4, bottom: 4, left: yearly ? '50%' : 4, width: 'calc(50% - 4px)', borderRadius: 999, bgcolor: ink, transition: 'left .35s cubic-bezier(.2,.75,.2,1)' }} />
              {[
                { value: false, label: 'Mensal' },
                { value: true, label: 'Anual −20%' },
              ].map((option) => (
                <ButtonBase key={option.label} onClick={() => setYearly(option.value)} sx={{ position: 'relative', width: 130, height: 40, borderRadius: 999, fontFamily: sans, fontWeight: 800, fontSize: 13, color: yearly === option.value ? white : ink, transition: 'color .3s ease' }}>
                  {option.label}
                </ButtonBase>
              ))}
            </Box>
          </Box>
        </Reveal>
        <Box sx={{ mt: 10, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 5, alignItems: 'stretch' }}>
          {PLANS.map((plan, index) => {
            const dark = Boolean(plan.featured);
            const price = yearly ? Math.round((plan.monthly * 0.8) / 100) * 100 : plan.monthly;
            return (
              <Reveal key={plan.name} delay={index * 120} sx={{ height: '100%' }}>
                <Box sx={{ position: 'relative', height: '100%', p: { xs: 6, md: 7 }, borderRadius: '26px', bgcolor: dark ? ink : white, color: dark ? white : ink, border: `1px solid ${dark ? ink : line}`, boxShadow: dark ? '0 50px 80px -40px rgba(0,0,0,.6)' : '0 30px 60px -50px rgba(0,0,0,.4)', transform: { md: dark ? 'translateY(-14px)' : 'none' }, display: 'flex', flexDirection: 'column', transition: 'transform .4s ease', '&:hover': { transform: { md: dark ? 'translateY(-20px)' : 'translateY(-6px)' } } }}>
                  {dark && (
                    <Box sx={{ position: 'absolute', top: 22, right: 22, px: 3, py: 1, borderRadius: 999, bgcolor: accent, fontFamily: sans, fontWeight: 800, fontSize: 11 }}>Mais escolhido</Box>
                  )}
                  <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 18 }}>{plan.name}</Typography>
                  <Typography sx={{ mt: 1.5, fontFamily: sans, fontWeight: 500, fontSize: 13.5, lineHeight: 1.6, color: dark ? 'rgba(255,255,255,.65)' : body }}>{plan.text}</Typography>
                  <Box sx={{ mt: 6, display: 'flex', alignItems: 'baseline', gap: 1.5, minHeight: 52 }}>
                    {plan.monthly ? (
                      <>
                        <Typography key={price} sx={{ fontFamily: sans, fontWeight: 800, fontSize: 44, lineHeight: 1, letterSpacing: '-0.04em', animation: 'priceIn .5s ease both', '@keyframes priceIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}>
                          {formatPrice(price).replace(',00', '')}
                        </Typography>
                        <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: dark ? 'rgba(255,255,255,.55)' : muted }}>/mês por loja</Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: 36, lineHeight: 1 }}>
                        <Em color={dark ? '#F7B26A' : accent}>Sob consulta</Em>
                      </Typography>
                    )}
                  </Box>
                  <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 6, mb: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {plan.features.map((feature) => (
                      <Check key={feature} dark={dark}>
                        {feature}
                      </Check>
                    ))}
                  </Box>
                  <Box sx={{ mt: 'auto', display: 'flex', '& > *': { flex: 1 } }}>
                    {plan.monthly ? <PillButton tone={dark ? 'accent' : 'dark'}>{plan.cta}</PillButton> : <PillButton href="#contato" tone="dark">{plan.cta}</PillButton>}
                  </Box>
                </Box>
              </Reveal>
            );
          })}
        </Box>
        <Typography sx={{ mt: 6, textAlign: 'center', fontFamily: sans, fontWeight: 500, fontSize: 11.5, color: muted }}>Valores de referência do projeto acadêmico.</Typography>
      </Container>
    </Box>
  );
}

const QUESTIONS = [
  { q: 'O que quer dizer white-label?', a: 'Que o cliente final vê a marca do restaurante, não a nossa. Logo, nome, frase e cores da casa aparecem no cardápio, na comanda e na conta.' },
  { q: 'O cliente precisa baixar algum aplicativo?', a: 'Não. Ele lê o QR code da mesa com a câmera do celular e o cardápio abre no navegador. Também dá para digitar o número da mesa.' },
  { q: 'Tem taxa por pedido?', a: 'Não. O Pede Aí cobra uma mensalidade fixa por loja. O que a casa vende fica com a casa.' },
  { q: 'Quanto tempo leva para começar a usar?', a: 'Um dia. Cadastre o cardápio, configure a marca, imprima os QR codes das mesas e convide a equipe.' },
  { q: 'Preciso comprar algum equipamento?', a: 'Não. A cozinha usa qualquer tela com navegador, como uma TV ou tablet, e o salão usa o próprio celular.' },
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
          <Box sx={{ position: 'relative', mt: 12, width: { xs: 260, md: 340 }, height: { xs: 260, md: 340 }, mx: { xs: 'auto', md: 0 } }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, #FFD9C7, #EFE4FF, #D7F0DD, #FFE9B8, #FFD9C7)', filter: 'blur(28px)', opacity: 0.85, animation: `${turn} 14s linear infinite`, ...motionSafe }} />
            <Box sx={{ position: 'absolute', inset: '12%', borderRadius: '50%', bgcolor: 'rgba(255,255,255,.8)' }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefMascot size={{ xs: 170, md: 220 }} phrases={['Pode perguntar!', 'Sem taxa por pedido', 'Sem app para baixar', 'Pronto em um dia']} />
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
                  <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: ink }}>{item.q}</Typography>
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

export function CtaSection() {
  return (
    <Box component="section" id="contato" sx={{ scrollMarginTop: 90, py: { xs: 0, md: 8 } }}>
      <Box sx={{ position: 'relative', maxWidth: 1220, mx: 'auto', bgcolor: '#0F0F0F', color: white, borderRadius: { xs: 0, md: '28px' }, overflow: 'hidden', minHeight: { md: 400 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr 300px' }, alignItems: 'center' }}>
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
          <Clip id={CLIPS.stirFry} quality={360} sx={{ filter: 'grayscale(.4)' }} />
        </Box>
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(50% 80% at 50% 50%, rgba(15,15,15,.5), rgba(15,15,15,.92))' }} />
        <Box sx={{ position: 'relative', display: { xs: 'none', md: 'flex' }, alignSelf: 'end', justifyContent: 'center', pt: 10 }}>
          <Box sx={{ width: 250, pt: 8, pb: 8, borderRadius: '125px 125px 0 0', bgcolor: white, color: ink, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ChefMascot size={170} phrases={['Bora vender mais?', 'Me leva pra sua casa!', 'Clica em testar!']} />
            <Typography sx={{ mt: 4, fontFamily: sans, fontWeight: 800, fontSize: 16 }}>O chef do Pede Aí</Typography>
          </Box>
        </Box>
        <Reveal sx={{ position: 'relative', textAlign: 'center', px: { xs: 6, md: 4 }, py: { xs: 14, md: 12 } }}>
          <Typography component="h2" sx={{ fontFamily: sans, fontWeight: 800, fontSize: { xs: 30, md: 40 }, lineHeight: 1.12, letterSpacing: '-0.03em' }}>
            Leve o Pede Aí para
            <br />
            <Em>o seu restaurante</Em>
          </Typography>
          <Typography sx={{ mt: 4, mx: 'auto', maxWidth: 400, fontFamily: sans, fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,255,255,.65)' }}>
            Entre numa mesa da demonstração, faça um pedido e veja ele chegar na cozinha e no painel da gestão em segundos.
          </Typography>
          <Box sx={{ mt: 7, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            <PillButton>Testar a demonstração</PillButton>
            <PillButton to="/login" tone="outline">
              Entrar como equipe
            </PillButton>
          </Box>
        </Reveal>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignSelf: 'stretch', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ position: 'absolute', inset: '0 0 0 30px', bgcolor: accent, borderRadius: '0 0 0 180px' }} />
          <Box sx={{ position: 'relative', textAlign: 'center' }}>
            <Typography sx={{ mb: 5, fontFamily: sans, fontWeight: 800, fontSize: 16 }}>O seu prato aqui</Typography>
            <Box sx={{ width: 200, height: 200, mx: 'auto', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 24px 40px -18px rgba(0,0,0,.6)', animation: `${turn} 40s linear infinite`, ...motionSafe }}>
              <Photo id={PHOTOS.fries} alt="Porção de batata frita" width={400} height={400} />
            </Box>
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

export function Footer() {
  return (
    <Box component="footer" sx={{ position: 'relative', mt: 10, overflow: 'hidden', bgcolor: white, borderTop: `1px solid ${line}` }}>
      <Box aria-hidden sx={{ position: 'absolute', right: -120, top: -80, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(235,90,36,.10), rgba(235,90,36,0) 70%)' }} />
      <Container maxWidth="lg" sx={{ position: 'relative', pt: 14, pb: 6 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1fr 1fr 1.3fr' }, gap: 8 }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ChefMascot size={48} steam={false} float={false} />
              <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: ink }}>Pede Aí</Typography>
            </Box>
            <Typography sx={{ mt: 3, maxWidth: 270, fontFamily: sans, fontWeight: 500, fontSize: 14, lineHeight: 1.7, color: body }}>
              Plataforma white-label de comandas digitais para bares e restaurantes.
            </Typography>
          </Box>
          <FooterColumn title="Produto">
            <li><a href="#produto">White-label</a></li>
            <li><a href="#modulos">Módulos</a></li>
            <li><a href="#conversao">Conversão</a></li>
            <li><a href="#observabilidade">Observabilidade</a></li>
            <li><a href="#planos">Planos</a></li>
          </FooterColumn>
          <FooterColumn title="Sistema">
            <li><RouterLink to={DEMO_PATH}>Demonstração</RouterLink></li>
            <li><RouterLink to="/producao">Painel da cozinha</RouterLink></li>
            <li><RouterLink to="/salao">Painel do salão</RouterLink></li>
            <li><RouterLink to="/gestao">Gestão</RouterLink></li>
          </FooterColumn>
          <FooterColumn title="Contato">
            <li>Campinas, SP</li>
            <li>PUC-Campinas · Projeto Integrador IV</li>
            <Box component="li" sx={{ display: 'flex', gap: 2, mt: 1 }}>
              {[
                { href: 'https://github.com/PresetyX/PI_IV-Time-5', label: 'GitHub', icon: 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21' },
                { href: DEMO_PATH, label: 'Demonstração', icon: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6' },
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
          © {new Date().getFullYear()} Pede Aí. Feito pelo Time 5 da PUC-Campinas. Fotos: Unsplash. Vídeos: Mixkit.
        </Typography>
      </Container>
    </Box>
  );
}
