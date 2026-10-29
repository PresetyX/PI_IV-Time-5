import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Container, Typography } from '@mui/material';
import { Reveal, Sub, Title, landing, motionSafe } from './landingKit';

const { accent, accentDark, peach, ink, body, muted, line, white, sans } = landing;

type Access = 'full' | 'view' | 'none';
type Screen = 'dashboard' | 'abc' | 'tables' | 'kitchen';

const ROLES: { key: string; name: string; icon: string; summary: string; screen: Screen; to: string; screenLabel: string }[] = [
  { key: 'owner', name: 'Dono', icon: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z', summary: 'Visão completa do negócio: vendas, caixa, equipe e a marca da casa.', screen: 'dashboard', to: '/gestao', screenLabel: 'Gestão · dashboard' },
  { key: 'manager', name: 'Gerente', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2', summary: 'Toca a operação do dia, confere o caixa e acompanha o que vende mais.', screen: 'abc', to: '/gestao/curva-abc', screenLabel: 'Gestão · curva ABC' },
  { key: 'waiter', name: 'Salão', icon: 'M4 10h16M6 10v9M18 10v9M8 6h8', summary: 'Atende as mesas, leva o que ficou pronto e fecha as contas.', screen: 'tables', to: '/salao', screenLabel: 'Salão · mapa de mesas' },
  { key: 'kitchen', name: 'Cozinha', icon: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', summary: 'Recebe os pedidos na ordem certa e avisa quando sai cada prato.', screen: 'kitchen', to: '/producao', screenLabel: 'Produção · fila' },
];

const MATRIX: { name: string; access: Access[] }[] = [
  { name: 'Fila da produção', access: ['full', 'full', 'view', 'full'] },
  { name: 'Mapa de mesas', access: ['full', 'full', 'full', 'none'] },
  { name: 'Fechar conta', access: ['full', 'full', 'full', 'none'] },
  { name: 'Cardápio e produtos', access: ['full', 'full', 'none', 'none'] },
  { name: 'Caixa e sangrias', access: ['full', 'full', 'none', 'none'] },
  { name: 'Dashboard e curva ABC', access: ['full', 'full', 'none', 'none'] },
  { name: 'Comissões', access: ['full', 'full', 'none', 'none'] },
  { name: 'Equipe e convites', access: ['full', 'full', 'none', 'none'] },
  { name: 'Marca e configuração', access: ['full', 'view', 'none', 'none'] },
];

function Glyph({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: size, height: size, flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d={d} />
    </Box>
  );
}

function AccessMark({ value, active }: { value: Access; active: boolean }) {
  if (value === 'none') return <Box sx={{ width: 14, height: 2, borderRadius: 1, bgcolor: '#D9D2CB', mx: 'auto' }} />;
  const full = value === 'full';
  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        mx: 'auto',
        borderRadius: '50%',
        bgcolor: full ? (active ? accent : peach) : 'transparent',
        border: full ? 'none' : `2px solid ${active ? accent : '#F0B79C'}`,
        color: full ? (active ? white : accent) : accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: active ? 'scale(1.12)' : 'none',
        transition: 'all .35s ease',
      }}
    >
      {full ? <Glyph d="M5 12l5 5L19 7" size={13} /> : <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />}
    </Box>
  );
}

function grow(delay: number) {
  return { animation: `barGrow .9s cubic-bezier(.2,.75,.2,1) ${delay}s both`, '@keyframes barGrow': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } }, transformOrigin: 'bottom', ...motionSafe };
}

function DashboardScreen() {
  const bars = [42, 58, 51, 74, 66, 88, 95];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {[
          ['Faturamento', 'R$ 8.940'],
          ['Ticket médio', 'R$ 104'],
          ['Contas', '86'],
        ].map(([label, value]) => (
          <Box key={label} sx={{ p: 3, borderRadius: '12px', bgcolor: '#F7F3EF' }}>
            <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 10.5, color: muted }}>{label}</Typography>
            <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 17, color: ink, letterSpacing: '-0.02em' }}>{value}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ p: 3, borderRadius: '12px', bgcolor: '#F7F3EF' }}>
        <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 10.5, color: muted }}>Vendas da semana</Typography>
        <Box sx={{ mt: 2, height: 110, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {bars.map((value, index) => (
            <Box key={index} sx={{ flex: 1, height: `${value}%`, borderRadius: '6px 6px 2px 2px', bgcolor: index === bars.length - 1 ? accent : '#F2B48E', ...grow(index * 0.07) }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function AbcScreen() {
  const rows = [
    ['Smash duplo', 92, 'A'],
    ['Batata rústica', 74, 'A'],
    ['Chope 500 ml', 58, 'B'],
    ['Milk-shake', 36, 'B'],
    ['Salada da casa', 14, 'C'],
  ] as const;
  const tone = { A: '#2E9E5B', B: '#E8A23A', C: '#C9C1B8' };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {rows.map(([name, value, grade], index) => (
        <Box key={name} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 28px', alignItems: 'center', gap: 3 }}>
          <Typography noWrap sx={{ fontFamily: sans, fontWeight: 700, fontSize: 12, color: ink }}>{name}</Typography>
          <Box sx={{ height: 10, borderRadius: 5, bgcolor: '#F1EBE5', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${value}%`, borderRadius: 5, bgcolor: tone[grade], transformOrigin: 'left', animation: `barX .9s cubic-bezier(.2,.75,.2,1) ${index * 0.08}s both`, '@keyframes barX': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } }, ...motionSafe }} />
          </Box>
          <Box sx={{ width: 24, height: 24, borderRadius: '8px', bgcolor: `${tone[grade]}22`, color: tone[grade], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 12 }}>{grade}</Box>
        </Box>
      ))}
    </Box>
  );
}

function TablesScreen({ tick }: { tick: number }) {
  const states = [
    { label: 'Livre', color: '#E9E3DD', text: muted },
    { label: 'Ocupada', color: '#FBD9C7', text: accentDark },
    { label: 'Pronto', color: '#CBEFD9', text: '#2E9E5B' },
    { label: 'Conta', color: '#DCE6FB', text: '#2456B8' },
  ];
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        {Array.from({ length: 12 }).map((_, index) => {
          const state = states[(index * 7 + tick + (index % 3)) % states.length];
          const ready = state.label === 'Pronto';
          return (
            <Box key={index} sx={{ position: 'relative', height: 58, borderRadius: '12px', bgcolor: state.color, color: state.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background-color .6s ease, color .6s ease' }}>
              {ready && <Box sx={{ position: 'absolute', inset: -3, borderRadius: '14px', border: '2px solid #5FD08A', animation: 'ring 1.4s ease-out infinite', '@keyframes ring': { from: { opacity: 1, transform: 'scale(.96)' }, to: { opacity: 0, transform: 'scale(1.08)' } }, ...motionSafe }} />}
              <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 14 }}>{String(index + 1).padStart(2, '0')}</Typography>
              <Typography sx={{ fontFamily: sans, fontWeight: 700, fontSize: 9.5 }}>{state.label}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function KitchenScreen({ tick }: { tick: number }) {
  const orders = ['#0412 · 2× Smash', '#0413 · Batata', '#0414 · Shake', '#0415 · Chope', '#0416 · Costela', '#0417 · Salada'];
  const columns = [
    { title: 'Recebido', color: '#F7B26A' },
    { title: 'Em preparo', color: accent },
    { title: 'Pronto', color: '#2E9E5B' },
  ];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {columns.map((column, columnIndex) => (
        <Box key={column.title} sx={{ p: 2, borderRadius: '12px', bgcolor: '#F7F3EF', minHeight: 196 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, fontFamily: sans, fontWeight: 800, fontSize: 11, color: ink }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: column.color }} />
            {column.title}
          </Box>
          {orders
            .map((order, index) => ({ order, column: (index + tick) % 3, index }))
            .filter((item) => item.column === columnIndex)
            .map((item) => (
              <Box key={item.order} sx={{ mb: 1.5, p: 2, borderRadius: '9px', bgcolor: white, borderLeft: `3px solid ${column.color}`, fontFamily: sans, fontWeight: 700, fontSize: 10.5, color: ink, animation: 'cardIn .5s cubic-bezier(.2,.75,.2,1) both', '@keyframes cardIn': { from: { opacity: 0, transform: 'translateX(-14px)' }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}>
                {item.order}
              </Box>
            ))}
        </Box>
      ))}
    </Box>
  );
}

export function RolesSection() {
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(timer);
  }, []);

  const role = ROLES[active];
  const allowed = MATRIX.filter((row) => row.access[active] !== 'none');
  const blocked = MATRIX.filter((row) => row.access[active] === 'none');

  return (
    <Box component="section" id="equipe" sx={{ py: { xs: 14, md: 18 }, scrollMarginTop: 90 }}>
      <Container maxWidth="lg">
        <Reveal>
          <Title accent="só o que precisa">Cada perfil vê</Title>
          <Sub sx={{ mt: 2 }}>Quatro perfis de acesso com permissões prontas. Escolha um para ver a tela dele e o que pode fazer.</Sub>
        </Reveal>

        <Reveal delay={100} sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', p: 1, borderRadius: 999, bgcolor: white, border: `1px solid ${line}`, width: { xs: '100%', sm: 520 } }}>
            <Box sx={{ position: 'absolute', top: 4, bottom: 4, left: `calc(${active * 25}% + 4px)`, width: 'calc(25% - 8px)', borderRadius: 999, bgcolor: ink, transition: 'left .4s cubic-bezier(.2,.75,.2,1)' }} />
            {ROLES.map((item, index) => (
              <ButtonBase key={item.key} onClick={() => setActive(index)} sx={{ position: 'relative', height: 44, gap: 1.5, borderRadius: 999, fontFamily: sans, fontWeight: 800, fontSize: 13, color: index === active ? white : ink, transition: 'color .3s ease' }}>
                <Glyph d={item.icon} size={16} />
                {item.name}
              </ButtonBase>
            ))}
          </Box>
        </Reveal>

        <Box sx={{ mt: 8, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.9fr 1.1fr' }, gap: 5, alignItems: 'stretch' }}>
          <Reveal from="left">
            <Box key={role.key} sx={{ height: '100%', p: { xs: 5, md: 7 }, borderRadius: '24px', bgcolor: white, border: `1px solid ${line}`, display: 'flex', flexDirection: 'column', animation: 'roleIn .5s ease both', '@keyframes roleIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } }, ...motionSafe }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ width: 46, height: 46, borderRadius: '14px', bgcolor: peach, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph d={role.icon} size={22} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 11, letterSpacing: 1.4, color: accent }}>PERFIL</Typography>
                  <Typography sx={{ fontFamily: sans, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: ink }}>{role.name}</Typography>
                </Box>
              </Box>
              <Typography sx={{ mt: 4, fontFamily: sans, fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, color: body }}>{role.summary}</Typography>
              <Typography sx={{ mt: 5, fontFamily: sans, fontWeight: 800, fontSize: 12, color: ink }}>Pode usar</Typography>
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {allowed.map((row) => (
                  <Box key={row.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1, borderRadius: 999, bgcolor: peach, color: accentDark, fontFamily: sans, fontWeight: 700, fontSize: 12 }}>
                    <Glyph d="M5 12l5 5L19 7" size={12} />
                    {row.name}
                    {row.access[active] === 'view' && <Box component="span" sx={{ opacity: 0.7 }}>· só vê</Box>}
                  </Box>
                ))}
              </Box>
              {blocked.length > 0 && (
                <>
                  <Typography sx={{ mt: 4, fontFamily: sans, fontWeight: 800, fontSize: 12, color: ink }}>Não aparece para ele</Typography>
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {blocked.map((row) => (
                      <Box key={row.name} sx={{ px: 2.5, py: 1, borderRadius: 999, border: `1px dashed ${line}`, color: muted, fontFamily: sans, fontWeight: 600, fontSize: 12, textDecoration: 'line-through', textDecorationColor: '#D9D2CB' }}>
                        {row.name}
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              <ButtonBase component={RouterLink} to={role.to} sx={{ mt: 'auto', pt: 6, alignSelf: 'flex-start', background: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 5, height: 44, borderRadius: 999, bgcolor: ink, color: white, fontFamily: sans, fontWeight: 700, fontSize: 13.5, transition: 'background-color .25s ease', '&:hover': { bgcolor: accent } }}>
                  Abrir a tela de {role.name.toLowerCase()}
                  <Glyph d="M5 12h14M13 6l6 6-6 6" size={16} />
                </Box>
              </ButtonBase>
            </Box>
          </Reveal>
          <Reveal from="right">
            <Box sx={{ height: '100%', borderRadius: '24px', overflow: 'hidden', bgcolor: white, border: `1px solid ${line}`, boxShadow: '0 40px 70px -50px rgba(0,0,0,.45)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 4, py: 3, borderBottom: `1px solid ${line}`, bgcolor: '#FBFAF8' }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map((color) => (
                  <Box key={color} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                ))}
                <Typography sx={{ ml: 3, fontFamily: sans, fontWeight: 700, fontSize: 12, color: muted }}>{role.screenLabel}</Typography>
              </Box>
              <Box key={role.screen} sx={{ p: { xs: 4, md: 5 }, animation: 'roleIn .5s ease both', ...motionSafe }}>
                {role.screen === 'dashboard' && <DashboardScreen />}
                {role.screen === 'abc' && <AbcScreen />}
                {role.screen === 'tables' && <TablesScreen tick={tick} />}
                {role.screen === 'kitchen' && <KitchenScreen tick={tick} />}
              </Box>
            </Box>
          </Reveal>
        </Box>

        <Reveal sx={{ mt: 5 }}>
          <Box sx={{ borderRadius: '24px', bgcolor: white, border: `1px solid ${line}`, overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontFamily: sans }}>
              <thead>
                <tr>
                  <Box component="th" sx={{ textAlign: 'left', px: 5, py: 4, fontWeight: 800, fontSize: 12, color: muted }}>Permissões</Box>
                  {ROLES.map((item, index) => (
                    <Box component="th" key={item.key} onClick={() => setActive(index)} sx={{ width: '15%', py: 4, cursor: 'pointer', fontWeight: 800, fontSize: 13, color: index === active ? accent : ink, bgcolor: index === active ? '#FFF6F1' : 'transparent', transition: 'all .35s ease' }}>
                      {item.name}
                    </Box>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <Box component="tr" key={row.name} sx={{ borderTop: `1px solid ${line}`, '&:hover': { bgcolor: '#FCFAF8' } }}>
                    <Box component="td" sx={{ px: 5, py: 3, fontWeight: 700, fontSize: 13.5, color: ink }}>{row.name}</Box>
                    {row.access.map((value, index) => (
                      <Box component="td" key={index} sx={{ py: 3, textAlign: 'center', bgcolor: index === active ? '#FFF6F1' : 'transparent', transition: 'background-color .35s ease' }}>
                        <AccessMark value={value} active={index === active} />
                      </Box>
                    ))}
                  </Box>
                ))}
              </tbody>
            </Box>
            <Box sx={{ display: 'flex', gap: 5, px: 5, py: 3, borderTop: `1px solid ${line}`, fontFamily: sans, fontWeight: 600, fontSize: 12, color: muted }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccessMark value="full" active={false} /> usa e altera
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccessMark value="view" active={false} /> só visualiza
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AccessMark value="none" active={false} /> sem acesso
              </Box>
            </Box>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
