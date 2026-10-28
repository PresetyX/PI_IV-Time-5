import { useEffect, useState } from 'react';
import { Alert, Box, Button, ButtonBase, FormControlLabel, Switch, TextField, Typography } from '@mui/material';
import ManagementLayout, { Card, LoadState } from '../../components/management/ManagementLayout';
import { useLoader } from '../../hooks/useLoader';
import { ApiError } from '../../services/api';
import { fetchStoreSettings, saveStoreSettings } from '../../services/management';
import type { ServiceMode, StoreSettings } from '../../services/management';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;
const PALETTE = ['#D62F1F', '#1F6FD6', '#157A4A', '#7B3FC4'];
const MODES: { value: ServiceMode; label: string; hint: string }[] = [
  { value: 'TABLE', label: 'Pedido na mesa', hint: 'QR code nas mesas do salão' },
  { value: 'COUNTER', label: 'Retirada no balcão', hint: 'Senha e pagamento antecipado' },
  { value: 'DELIVERY', label: 'Entrega', hint: 'Fora do escopo desta versão' },
];

export default function SettingsPage() {
  const { data, setData, error, reload } = useLoader(fetchStoreSettings);
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await saveStoreSettings({
        name: form.name,
        tagline: form.tagline,
        primaryColor: form.primaryColor,
        serviceModes: form.serviceModes,
        requireCustomerPhone: form.requireCustomerPhone,
      });
      setData(saved);
      setMessage({ tone: 'success', text: 'Configuração salva. O cliente já vê as mudanças.' });
    } catch (caught) {
      setMessage({
        tone: 'error',
        text: caught instanceof ApiError && caught.status === 403 ? 'Só o dono pode mudar a configuração.' : 'Confira os campos e tente de novo.',
      });
    } finally {
      setBusy(false);
    }
  }

  function toggleMode(mode: ServiceMode) {
    setForm((current) =>
      current && {
        ...current,
        serviceModes: current.serviceModes.includes(mode)
          ? current.serviceModes.filter((value) => value !== mode)
          : [...current.serviceModes, mode],
      },
    );
  }

  return (
    <ManagementLayout
      title="Configuração da casa"
      subtitle="É isso que o cliente vê quando abre o cardápio"
      actions={
        form && (
          <Button variant="contained" disabled={busy || !form.name.trim() || form.serviceModes.length === 0} onClick={save} sx={{ minHeight: 48, px: 6 }}>
            Salvar
          </Button>
        )
      }
    >
      {message && (
        <Alert severity={message.tone} sx={{ mb: 4 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {!form ? (
        <LoadState error={error} onRetry={reload} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 6, alignItems: 'start' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Card>
              <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 4 }}>Identidade</Typography>
              <TextField label="Nome da casa" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} fullWidth />
              <TextField
                label="Frase de apresentação"
                value={form.tagline ?? ''}
                onChange={(event) => setForm({ ...form, tagline: event.target.value })}
                fullWidth
                sx={{ mt: 4 }}
              />
              <TextField label="Endereço do cardápio" value={`${window.location.host}/t/${form.slug}`} fullWidth disabled sx={{ mt: 4 }} />
              <Typography sx={{ mt: 4, mb: 2, fontWeight: fontWeight.bold }}>Cor principal</Typography>
              <Box sx={{ display: 'flex', gap: 3 }}>
                {PALETTE.map((color) => (
                  <ButtonBase
                    key={color}
                    aria-label={`Usar a cor ${color}`}
                    onClick={() => setForm({ ...form, primaryColor: color })}
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      bgcolor: color,
                      outline: form.primaryColor.toUpperCase() === color ? `3px solid ${colors.text}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </Box>
            </Card>
            <Card>
              <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 2 }}>Como a casa atende</Typography>
              {MODES.map((mode) => (
                <Toggle
                  key={mode.value}
                  label={mode.label}
                  hint={mode.hint}
                  checked={form.serviceModes.includes(mode.value)}
                  onChange={() => toggleMode(mode.value)}
                />
              ))}
              <Toggle
                label="Exigir telefone do cliente"
                hint="Usado para avisar quando fica pronto"
                checked={form.requireCustomerPhone}
                onChange={() => setForm({ ...form, requireCustomerPhone: !form.requireCustomerPhone })}
              />
            </Card>
          </Box>
          <Card>
            <Typography sx={{ fontWeight: fontWeight.extraBold, mb: 4 }}>Prévia no celular</Typography>
            <Box sx={{ border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px`, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: form.primaryColor, color: colors.background, p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: colors.background }} />
                <Typography sx={{ fontWeight: fontWeight.extraBold, flex: 1 }}>{form.name || 'Sua casa'}</Typography>
                <Box sx={{ px: 2, py: 1, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.25)', fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>
                  Mesa 05
                </Box>
              </Box>
              {[
                ['Porção de fritas', 'R$ 32,00'],
                ['Chopp 500 ml', 'R$ 14,00'],
                ['Pastel de queijo', 'R$ 9,00'],
              ].map(([name, price]) => (
                <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 4, borderTop: `1px solid ${colors.divider}` }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: colors.surface }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: fontWeight.bold }}>{name}</Typography>
                    <Typography sx={{ fontWeight: fontWeight.extraBold, fontSize: fontSize.body }}>{price}</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: `2px solid ${form.primaryColor}`,
                      color: form.primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: fontWeight.extraBold,
                    }}
                  >
                    +
                  </Box>
                </Box>
              ))}
            </Box>
            <Typography sx={{ mt: 4, fontSize: fontSize.body, color: colors.textSecondary }}>
              A cor vale para o cabeçalho, os destaques e a tela de pedido pronto.
            </Typography>
          </Card>
        </Box>
      )}
    </ManagementLayout>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: () => void }) {
  return (
    <FormControlLabel
      labelPlacement="start"
      control={<Switch checked={checked} onChange={onChange} />}
      label={
        <Box>
          <Typography sx={{ fontWeight: fontWeight.bold }}>{label}</Typography>
          <Typography sx={{ fontSize: fontSize.small, color: colors.textMuted }}>{hint}</Typography>
        </Box>
      }
      sx={{ m: 0, py: 2, width: '100%', justifyContent: 'space-between' }}
    />
  );
}
