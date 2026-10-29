import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, TextField, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import BackHeader from '../../components/client/BackHeader';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import FootNote from '../../components/client/FootNote';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatPhone, isValidPhone, phoneDigits } from '../../services/phone';
import { createSession } from '../../services/sessions';
import type { Store } from '../../services/store';
import type { TableInfo } from '../../services/tables';
import { readVisit, updateVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const FORM_ID = 'identification-form';
const { colors, fontSize, fontWeight, radius } = tokens;

export default function IdentificationPage() {
  const { slug = '' } = useParams();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const visit = readVisit(slug);
  const table = visit.table;

  if (visit.sessionId && visit.guestToken && table) return <Navigate to={`/t/${slug}/comandas`} replace />;
  if (!table) return <Navigate to={`/t/${slug}/mesa?next=identificacao`} replace />;
  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (!state.store.status.acceptingOrders) return <ClosedStoreScreen store={state.store} />;
  return <IdentificationForm store={state.store} table={table} />;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Essa mesa não está mais disponível. Volte e informe a mesa de novo.';
    if (error.status === 409) return 'A casa parou de aceitar pedidos agora.';
    if (error.status === 400) return 'Confira o nome e o celular.';
  }
  return 'Não foi possível continuar agora. Verifique sua conexão e tente de novo.';
}

function IdentificationForm({ store, table }: { store: Store; table: TableInfo }) {
  const navigate = useNavigate();
  const [name, setName] = useState(readVisit(store.slug).customerName ?? '');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = submitted && name.trim() === '' ? 'Conte como podemos te chamar.' : null;
  const phoneMissing = store.requireCustomerPhone && phoneDigits(phone) === '';
  const phoneInvalid = phoneDigits(phone) !== '' && !isValidPhone(phone);
  const phoneError = submitted && (phoneMissing || phoneInvalid) ? 'Informe o celular com DDD.' : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (name.trim() === '' || phoneMissing || phoneInvalid || sending) return;

    setSending(true);
    setError(null);
    try {
      const session = await createSession({
        storeSlug: store.slug,
        mode: 'TABLE',
        tableToken: table.token,
        name: name.trim(),
        phone: phoneDigits(phone) || undefined,
      });
      updateVisit(store.slug, {
        sessionId: session.id,
        guestToken: session.token,
        customerName: session.name,
        table: session.table ?? table,
      });
      navigate(`/t/${store.slug}/mesa`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) updateVisit(store.slug, { table: undefined });
      setError(describeError(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <ClientScreen
      footer={
        <>
          <ActionButton type="submit" form={FORM_ID} disabled={sending}>
            {sending ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : 'Continuar'}
          </ActionButton>
          <FootNote>Ao continuar você concorda com o uso dos dados para este atendimento, conforme a LGPD.</FootNote>
        </>
      }
    >
      <BackHeader title={store.name} tableNumber={table.number} onBack={() => navigate(`/t/${store.slug}/entrada`)} />
      <Box component="form" id={FORM_ID} onSubmit={handleSubmit} noValidate sx={{ px: 5, pt: 7, pb: 6 }}>
        <Typography variant="h2" component="h1">
          Como podemos te chamar?
        </Typography>
        <Typography sx={{ mt: 3, color: colors.textSecondary }}>
          A comanda fica no seu nome. Cada pessoa da mesa tem a sua, então ninguém divide conta na mão.
        </Typography>

        <Field label="Nome" htmlFor="customer-name">
          <TextField
            id="customer-name"
            placeholder="Ana"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="given-name"
            inputProps={{ maxLength: 60 }}
            error={Boolean(nameError)}
            helperText={nameError}
            fullWidth
          />
        </Field>

        <Field label={store.requireCustomerPhone ? 'Celular' : 'Celular (opcional)'} htmlFor="customer-phone">
          <TextField
            id="customer-phone"
            type="tel"
            placeholder="(19) 99999-0000"
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            autoComplete="tel-national"
            inputProps={{ inputMode: 'numeric' }}
            error={Boolean(phoneError)}
            helperText={phoneError ?? 'Usamos só para avisar quando o pedido ficar pronto.'}
            fullWidth
          />
        </Field>

        {error && (
          <Alert severity="error" sx={{ mt: 5, borderRadius: `${radius.button}px` }}>
            {error}
          </Alert>
        )}
      </Box>
    </ClientScreen>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <Box sx={{ mt: 7 }}>
      <Typography
        component="label"
        htmlFor={htmlFor}
        sx={{ display: 'block', mb: 2, fontSize: fontSize.button, fontWeight: fontWeight.extraBold }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}
