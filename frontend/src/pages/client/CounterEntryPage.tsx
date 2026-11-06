import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, TextField, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import FootNote from '../../components/client/FootNote';
import { InfoNote, ScreenHeader } from '../../components/client/TabParts';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatPhone, isValidPhone, phoneDigits } from '../../services/phone';
import { createSession } from '../../services/sessions';
import type { Store } from '../../services/store';
import { openTab } from '../../services/tabs';
import { readVisit, updateVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const FORM_ID = 'counter-form';
const { colors, fontSize, fontWeight, radius } = tokens;

/** [Mateus · Card 5] Entrada no balcão: nome e celular, sem mesa. Abre a comanda de balcão e leva ao cardápio. */
export default function CounterEntryPage() {
  const { slug = '' } = useParams();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const visit = readVisit(slug);
  // Link de convite: quem abre entra na comanda de outra pessoa (com o código) em vez de abrir a sua.
  const [params] = useSearchParams();
  const joinTabId = params.get('entrar');
  const joinPath = joinTabId ? `/t/${slug}/comandas/${encodeURIComponent(joinTabId)}/entrar` : null;

  if (visit.counter && visit.sessionId && visit.guestToken) {
    return <Navigate to={joinPath ?? `/t/${slug}/cardapio`} replace />;
  }
  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (!state.store.status.acceptingOrders) return <ClosedStoreScreen store={state.store} />;
  if (!state.store.serviceModes.includes('COUNTER')) return <Navigate to={`/t/${slug}/entrada`} replace />;
  return <CounterForm store={state.store} joinPath={joinPath} />;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'A casa parou de aceitar pedidos agora.';
    if (error.status === 400) return 'Confira o nome e o celular.';
  }
  return 'Não foi possível continuar agora. Verifique sua conexão e tente de novo.';
}

function CounterForm({ store, joinPath }: { store: Store; joinPath: string | null }) {
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
        mode: 'COUNTER',
        name: name.trim(),
        phone: phoneDigits(phone) || undefined,
      });
      updateVisit(store.slug, {
        sessionId: session.id,
        guestToken: session.token,
        customerName: session.name,
        table: undefined,
        counter: true,
      });
      if (joinPath) {
        navigate(joinPath, { replace: true });
        return;
      }
      await openTab(store.slug);
      navigate(`/t/${store.slug}/cardapio`, { replace: true });
    } catch (caught) {
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
      <ScreenHeader title="Retirar no balcão" subtitle={store.name} onBack={() => navigate(`/t/${store.slug}/entrada`)} />
      <Box component="form" id={FORM_ID} onSubmit={handleSubmit} noValidate sx={{ px: 5, pt: 7, pb: 6 }}>
        <Typography variant="h2" component="h1">
          Como podemos te chamar?
        </Typography>
        <Typography sx={{ mt: 3, color: colors.textSecondary }}>
          Você monta o pedido pelo celular, paga no caixa e retira no balcão quando a sua senha for chamada.
        </Typography>

        <Field label="Nome" htmlFor="counter-name">
          <TextField
            id="counter-name"
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

        <Field label={store.requireCustomerPhone ? 'Celular' : 'Celular (opcional)'} htmlFor="counter-phone">
          <TextField
            id="counter-phone"
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

        <InfoNote>No balcão não há taxa de serviço. A senha aparece depois que você enviar o primeiro pedido.</InfoNote>

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
