import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, ButtonBase, Container, Typography } from '@mui/material';
import BrandMark from '../../components/BrandMark';
import { Cta, Eyebrow, Heading, Img, Lead, PHOTOS, Reveal, landing } from './landingKit';

const { accent, ink, body, muted, line, paper, white, serif, sans, radius } = landing;

function Section({ id, children, tone = 'paper' }: { id?: string; children: ReactNode; tone?: 'paper' | 'white' }) {
  return (
    <Box component="section" id={id} sx={{ py: { xs: 14, md: 24 }, bgcolor: tone === 'white' ? white : paper, scrollMarginTop: 72 }}>
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}

function Screenshot({ src, alt, sx }: { src: string; alt: string; sx?: object }) {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      sx={{ display: 'block', width: '100%', height: 'auto', borderRadius: radius, border: `1px solid ${line}`, bgcolor: white, ...sx }}
    />
  );
}

function PhoneFrame({ src, alt, sx }: { src: string; alt: string; sx?: object }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '30px', bgcolor: ink, boxShadow: '0 24px 48px -28px rgba(0,0,0,.45)', ...sx }}>
      <Box component="img" src={src} alt={alt} loading="lazy" sx={{ display: 'block', width: '100%', height: 'auto', borderRadius: '22px' }} />
    </Box>
  );
}

const PARTS = [
  { title: 'Cliente', text: 'Lê o QR da mesa, abre a comanda e pede pelo navegador do celular.' },
  { title: 'Cozinha', text: 'Recebe o pedido na fila e marca o preparo e o pronto com um toque.' },
  { title: 'Gestão', text: 'Fecha contas e caixa e acompanha faturamento, produtos e equipe.' },
];

export function ProductSection() {
  return (
    <Section id="sobre" tone="white">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' }, gap: { xs: 10, md: 14 }, alignItems: 'center' }}>
        <Reveal>
          <Eyebrow>O que é</Eyebrow>
          <Box sx={{ mt: 3 }}>
            <Heading>Um sistema para as três pontas do atendimento</Heading>
          </Box>
          <Lead sx={{ mt: 5 }}>
            O Pede Aí liga o celular do cliente à cozinha e ao caixa. Sem papel no meio do caminho, sem pedido perdido e sem conta que não fecha.
          </Lead>
          <Box component="dl" sx={{ mt: 8, mb: 0 }}>
            {PARTS.map((part) => (
              <Box key={part.title} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 4, py: 4, borderTop: `1px solid ${line}` }}>
                <Typography component="dt" sx={{ fontFamily: sans, fontWeight: 800, fontSize: 15, color: ink }}>
                  {part.title}
                </Typography>
                <Typography component="dd" sx={{ m: 0, fontFamily: sans, fontWeight: 500, fontSize: 15, lineHeight: 1.6, color: body }}>
                  {part.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Reveal>
        <Reveal>
          <Box sx={{ position: 'relative', pb: { xs: 10, md: 0 } }}>
            <Screenshot src="/landing/cozinha.webp" alt="Painel de produção com os pedidos por status" />
            <PhoneFrame
              src="/landing/cliente.webp"
              alt="Cardápio da casa aberto no celular do cliente"
              sx={{ position: 'absolute', width: { xs: '38%', md: '34%' }, right: { xs: 8, md: -28 }, bottom: { xs: -20, md: -56 } }}
            />
          </Box>
        </Reveal>
      </Box>
    </Section>
  );
}

const FLOWS = [
  {
    key: 'cliente',
    label: 'Cliente',
    screen: '/landing/capa.webp',
    phone: true,
    title: 'Pede pelo celular, sem instalar nada',
    steps: ['Lê o QR code da mesa ou digita o número dela', 'Abre a própria comanda ou entra na do amigo com um código', 'Escolhe no cardápio e envia direto para a cozinha', 'Acompanha a conta com a taxa de serviço calculada'],
    to: '/t/triunfo-lanches?mesa=t05-000a',
    cta: 'Abrir como cliente',
  },
  {
    key: 'cozinha',
    label: 'Cozinha',
    screen: '/landing/cozinha.webp',
    phone: false,
    title: 'Uma fila clara, por status',
    steps: ['O pedido entra em Recebido assim que é enviado', 'A cozinha marca Em preparo e depois Pronto', 'Pedidos com mais de 15 minutos ficam destacados', 'A tela grande pode ficar aberta numa TV'],
    to: '/producao',
    cta: 'Abrir painel da cozinha',
  },
  {
    key: 'salao',
    label: 'Salão',
    screen: '/landing/salao.webp',
    phone: false,
    title: 'Mesas, entregas e contas',
    steps: ['Mapa das mesas livres e ocupadas', 'Lista do que está pronto para levar', 'Conta de cada comanda com os pedidos', 'Fechamento no Pix, dinheiro, débito ou crédito'],
    to: '/salao',
    cta: 'Abrir painel do salão',
  },
  {
    key: 'gestao',
    label: 'Gestão',
    screen: '/landing/gestao.webp',
    phone: false,
    title: 'Os números da casa por dia, semana ou mês',
    steps: ['Faturamento, ticket médio e produtos mais pedidos', 'Curva ABC para revisar o cardápio', 'Caixa com sangria e conferência por forma de pagamento', 'Equipe, comissões e configuração da casa'],
    to: '/gestao',
    cta: 'Abrir a gestão',
  },
];

export function HowItWorksSection() {
  const [current, setCurrent] = useState(0);
  const flow = FLOWS[current];

  return (
    <Section id="como-funciona">
      <Reveal>
        <Box sx={{ maxWidth: 640 }}>
          <Eyebrow>Como funciona</Eyebrow>
          <Box sx={{ mt: 3 }}>
            <Heading>Cada pessoa vê só o que precisa</Heading>
          </Box>
          <Lead sx={{ mt: 4 }}>As telas abaixo são do sistema rodando com a casa de demonstração. Os botões abrem cada uma delas.</Lead>
        </Box>
      </Reveal>

      <Box role="tablist" aria-label="Perfis" sx={{ mt: 10, display: 'flex', gap: { xs: 5, md: 8 }, borderBottom: `1px solid ${line}`, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {FLOWS.map((item, index) => (
          <ButtonBase
            key={item.key}
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={index === current}
            aria-controls={`painel-${item.key}`}
            onClick={() => setCurrent(index)}
            sx={{
              pb: 4,
              mb: '-1px',
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 16,
              whiteSpace: 'nowrap',
              color: index === current ? ink : muted,
              borderBottom: `2px solid ${index === current ? accent : 'transparent'}`,
              transition: 'color .2s ease, border-color .2s ease',
              '&:hover': { color: ink },
            }}
          >
            {item.label}
          </ButtonBase>
        ))}
      </Box>

      <Box
        role="tabpanel"
        id={`painel-${flow.key}`}
        aria-labelledby={`tab-${flow.key}`}
        sx={{ mt: 10, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: { xs: 8, md: 12 }, alignItems: 'center' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: '#F2EEEA', borderRadius: radius, p: { xs: 4, md: 8 } }}>
          {flow.phone ? (
            <PhoneFrame src={flow.screen} alt={flow.title} sx={{ width: { xs: '62%', md: '42%' } }} />
          ) : (
            <Screenshot src={flow.screen} alt={flow.title} />
          )}
        </Box>
        <Box>
          <Heading size="item" component="h3">
            {flow.title}
          </Heading>
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 6 }}>
            {flow.steps.map((step, index) => (
              <Box component="li" key={step} sx={{ display: 'grid', gridTemplateColumns: '36px 1fr', py: 3, borderTop: `1px solid ${line}` }}>
                <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: muted }}>{String(index + 1).padStart(2, '0')}</Typography>
                <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 15.5, lineHeight: 1.55, color: body }}>{step}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 6 }}>
            <Cta to={flow.to} variant="secondary">
              {flow.cta}
            </Cta>
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

const REASONS = [
  { title: 'Nada para instalar', text: 'O cardápio abre no navegador do celular a partir do QR da mesa. Se a plaquinha estiver apagada, o cliente digita o número.' },
  { title: 'Conta dividida desde o começo', text: 'Cada pessoa pode ter a sua comanda ou entrar na de outra com um código de quatro números. No fim, cada um paga o que pediu.' },
  { title: 'Com a cara da sua casa', text: 'Nome, frase de apresentação e cor da casa aparecem nas telas do cliente. Os modos de atendimento ligam e desligam na configuração.' },
];

export function ReasonsSection() {
  return (
    <Section tone="white">
      <Reveal>
        <Box sx={{ maxWidth: 640 }}>
          <Eyebrow>Por que usar</Eyebrow>
          <Box sx={{ mt: 3 }}>
            <Heading>Menos atrito no pedido, menos erro na conta</Heading>
          </Box>
        </Box>
      </Reveal>
      <Box sx={{ mt: 12, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 8, md: 10 } }}>
        {REASONS.map((reason, index) => (
          <Reveal key={reason.title}>
            <Box sx={{ pt: 5, borderTop: `1px solid ${ink}` }}>
              <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: muted }}>{String(index + 1).padStart(2, '0')}</Typography>
              <Typography component="h3" sx={{ mt: 4, fontFamily: sans, fontWeight: 800, fontSize: 20, color: ink }}>
                {reason.title}
              </Typography>
              <Typography sx={{ mt: 3, fontFamily: sans, fontWeight: 500, fontSize: 15.5, lineHeight: 1.65, color: body }}>{reason.text}</Typography>
            </Box>
          </Reveal>
        ))}
      </Box>
    </Section>
  );
}

const MODES = [
  { image: PHOTOS.tableSpread, title: 'Pedido na mesa', text: 'QR em cada mesa, comanda compartilhada e taxa de serviço no fechamento.', status: '' },
  { image: PHOTOS.burgers, title: 'Retirada no balcão', text: 'O cliente pede e a cozinha prepara. A retirada é pela senha.', status: '' },
  { image: PHOTOS.spread, title: 'Entrega', text: 'O mesmo cardápio indo até o endereço do cliente.', status: 'Próxima versão' },
];

export function ModesSection() {
  return (
    <Section id="atendimento">
      <Reveal>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
          <Box sx={{ maxWidth: 560 }}>
            <Eyebrow>Atendimento</Eyebrow>
            <Box sx={{ mt: 3 }}>
              <Heading>Do jeito que a casa já trabalha</Heading>
            </Box>
          </Box>
          <Lead sx={{ maxWidth: 380 }}>Cada modo liga e desliga na configuração. O cliente só vê o que estiver ativo.</Lead>
        </Box>
      </Reveal>
      <Box sx={{ mt: 12, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 10, md: 6 } }}>
        {MODES.map((mode) => (
          <Reveal key={mode.title}>
            <Box sx={{ aspectRatio: '4 / 3', overflow: 'hidden', borderRadius: radius, '& img': { transition: 'transform .6s ease' }, '&:hover img': { transform: 'scale(1.03)' } }}>
              <Img id={mode.image} alt={mode.title} width={800} height={600} sx={{ borderRadius: 0 }} />
            </Box>
            <Box sx={{ mt: 5, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 3 }}>
              <Typography component="h3" sx={{ fontFamily: sans, fontWeight: 800, fontSize: 19, color: ink }}>
                {mode.title}
              </Typography>
              {mode.status && <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: muted }}>{mode.status}</Typography>}
            </Box>
            <Typography sx={{ mt: 2, fontFamily: sans, fontWeight: 500, fontSize: 15, lineHeight: 1.6, color: body }}>{mode.text}</Typography>
          </Reveal>
        ))}
      </Box>
    </Section>
  );
}

const QUESTIONS = [
  { q: 'O cliente precisa baixar algum aplicativo?', a: 'Não. Ele lê o QR code da mesa com a câmera do celular e o cardápio abre no navegador. Também é possível digitar o número da mesa.' },
  { q: 'Como funciona a comanda compartilhada?', a: 'Quem abre a comanda recebe um código de quatro números. Quem está na mesma mesa entra com esse código, e tudo o que pedir cai na mesma conta. O dono da comanda pode remover quem entrou por engano.' },
  { q: 'O pedido vai direto para a cozinha?', a: 'Sim. Assim que o cliente envia, o pedido aparece como Recebido no painel de produção, que se atualiza sozinho a cada 15 segundos.' },
  { q: 'Dá para usar a identidade da minha casa?', a: 'Dá. Na configuração você define nome, frase de apresentação, cor principal e modos de atendimento. Essas informações aparecem nas telas do cliente.' },
  { q: 'Como fecham a conta e o caixa?', a: 'O salão registra o pagamento em Pix, dinheiro, débito ou crédito. No fim do dia, a gestão confere cada forma de pagamento, registra as sangrias e fecha o caixa, que não fecha enquanto houver conta aberta.' },
  { q: 'Quem da equipe vê o quê?', a: 'São quatro perfis: dono, gerente, salão e cozinha. Cada um vê só as telas do seu trabalho, e o dono convida, edita e desliga pessoas na tela de equipe.' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | false>(false);
  return (
    <Section id="duvidas" tone="white">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 7fr' }, gap: { xs: 8, md: 14 }, alignItems: 'start' }}>
        <Reveal>
          <Eyebrow>Dúvidas</Eyebrow>
          <Box sx={{ mt: 3 }}>
            <Heading>Perguntas frequentes</Heading>
          </Box>
          <Lead sx={{ mt: 4 }}>Ficou alguma pergunta? Teste o fluxo completo na casa de demonstração.</Lead>
        </Reveal>
        <Box sx={{ borderTop: `1px solid ${line}` }}>
          {QUESTIONS.map((item, index) => (
            <Accordion
              key={item.q}
              disableGutters
              elevation={0}
              square
              expanded={open === index}
              onChange={(_, expanded) => setOpen(expanded ? index : false)}
              sx={{ bgcolor: 'transparent', borderBottom: `1px solid ${line}`, '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      position: 'relative',
                      '&:before, &:after': { content: '""', position: 'absolute', bgcolor: ink, borderRadius: 1 },
                      '&:before': { left: 0, right: 0, top: 6, height: 2 },
                      '&:after': { top: 0, bottom: 0, left: 6, width: 2, transform: open === index ? 'scaleY(0)' : 'none', transition: 'transform .2s ease' },
                    }}
                  />
                }
                sx={{ px: 0, minHeight: 68, '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'none' } }}
              >
                <Typography sx={{ pr: 4, fontFamily: sans, fontWeight: 700, fontSize: 17, color: ink }}>{item.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 6 }}>
                <Typography sx={{ maxWidth: 640, fontFamily: sans, fontWeight: 500, fontSize: 15.5, lineHeight: 1.7, color: body }}>{item.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

export function CtaSection() {
  return (
    <Box component="section" id="contato" sx={{ bgcolor: ink, color: white, scrollMarginTop: 72 }}>
      <Container maxWidth="lg" sx={{ py: { xs: 14, md: 20 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 10, md: 14 }, alignItems: 'center' }}>
        <Box>
          <Typography component="h2" sx={{ fontFamily: serif, fontWeight: 600, fontSize: { xs: 34, md: 48 }, lineHeight: 1.1 }}>
            Veja o fluxo inteiro em poucos minutos
          </Typography>
          <Typography sx={{ mt: 5, maxWidth: 460, fontFamily: sans, fontWeight: 500, fontSize: 17, lineHeight: 1.65, color: 'rgba(255,255,255,.7)' }}>
            Faça um pedido como cliente na casa de demonstração e acompanhe ele passando pela cozinha, pelo salão e pela gestão.
          </Typography>
          <Box sx={{ mt: 8, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Cta to="/t/triunfo-lanches?mesa=t05-000a">Fazer um pedido de teste</Cta>
            <Cta to="/login" variant="inverse">
              Entrar como equipe
            </Cta>
          </Box>
        </Box>
        <Box sx={{ aspectRatio: '4 / 3', borderRadius: radius, overflow: 'hidden' }}>
          <Img id={PHOTOS.bar} alt="Balcão de um bar com mesas ao fundo" width={1000} height={750} sx={{ borderRadius: 0 }} />
        </Box>
      </Container>
    </Box>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 14, color: ink }}>{title}</Typography>
      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 14,
          color: body,
          '& a': { color: body, textDecoration: 'none', '&:hover': { color: ink, textDecoration: 'underline' } },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: paper, borderTop: `1px solid ${line}` }}>
      <Container maxWidth="lg" sx={{ py: { xs: 12, md: 16 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr 1fr' }, gap: 8 }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BrandMark sx={{ fontSize: 32, color: ink }} />
              <Typography sx={{ fontFamily: serif, fontWeight: 600, fontSize: 22, color: ink }}>Pede Aí</Typography>
            </Box>
            <Typography sx={{ mt: 4, maxWidth: 300, fontFamily: sans, fontWeight: 500, fontSize: 14, lineHeight: 1.65, color: body }}>
              Pedidos digitais para bares e restaurantes, do QR na mesa ao fechamento do caixa.
            </Typography>
          </Box>
          <FooterColumn title="Site">
            <li>
              <a href="#sobre">O que é</a>
            </li>
            <li>
              <a href="#como-funciona">Como funciona</a>
            </li>
            <li>
              <a href="#atendimento">Atendimento</a>
            </li>
            <li>
              <a href="#duvidas">Dúvidas</a>
            </li>
          </FooterColumn>
          <FooterColumn title="Sistema">
            <li>
              <RouterLink to="/t/triunfo-lanches">Casa de demonstração</RouterLink>
            </li>
            <li>
              <RouterLink to="/login">Entrar como equipe</RouterLink>
            </li>
          </FooterColumn>
          <FooterColumn title="Projeto">
            <li>Projeto Integrador IV, Time 5</li>
            <li>PUC-Campinas</li>
            <li>
              <a href="https://github.com/PresetyX/PI_IV-Time-5" target="_blank" rel="noreferrer">
                Código no GitHub
              </a>
            </li>
          </FooterColumn>
        </Box>
        <Box sx={{ mt: 12, pt: 6, borderTop: `1px solid ${line}`, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 3 }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 13, color: muted }}>© {new Date().getFullYear()} Pede Aí</Typography>
          <Typography sx={{ fontFamily: sans, fontWeight: 500, fontSize: 13, color: muted }}>Fotos de comida: Unsplash</Typography>
        </Box>
      </Container>
    </Box>
  );
}
