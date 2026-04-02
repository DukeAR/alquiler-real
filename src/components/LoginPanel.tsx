import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPostAuthRedirect, preserveAuthRedirectState } from '../lib/authRedirect';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';
import { SectionTitle } from './ui/SectionTitle';

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

type LoginPanelProps = {
  context?: 'page' | 'modal';
  className?: string;
  onClose?: () => void;
  onSuccess?: () => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPanel = ({ context = 'page', className, onClose, onSuccess }: LoginPanelProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isModal = context === 'modal';
  const redirectTarget = getPostAuthRedirect(location.state);

  useEffect(() => {
    clearError();

    return () => {
      clearError();
    };
  }, []);

  const clearFieldError = (field: keyof LoginFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      return { ...prev, [field]: undefined };
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearFieldError('email');

    if (error) {
      clearError();
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    clearFieldError('password');

    if (error) {
      clearError();
    }
  };

  const handleClose = () => {
    clearError();
    onClose?.();
  };

  const handleSwitchToRegister = () => {
    clearError();
    onClose?.();
    navigate('/register', { state: preserveAuthRedirectState(location.state) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const nextFieldErrors: LoginFieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextFieldErrors.email = 'Ingresá el email con el que te registraste.';
    } else if (!emailPattern.test(trimmedEmail)) {
      nextFieldErrors.email = 'Revisá el formato del email.';
    }

    if (!password) {
      nextFieldErrors.password = 'Ingresá tu contraseña.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const success = await login(trimmedEmail, password);

      if (success) {
        if (onSuccess) {
          onSuccess();
          return;
        }

        if (isModal) {
          handleClose();
          return;
        }

        navigate(redirectTarget, { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const authErrorBanner = error ? (
    <NoticeBanner
      tone="error"
      heading="Revisá los datos e intentá de nuevo."
      description={error}
      className="shadow-[0_18px_40px_-30px_rgba(185,28,28,0.45)]"
    />
  ) : null;

  return (
    <Card
      variant="elevated"
      padding="none"
      className={cn(
        'relative overflow-hidden border-slate-200/85 bg-white/96 shadow-[0_36px_80px_-42px_rgba(15,23,42,0.42)]',
        isModal ? 'p-5 sm:p-6' : 'p-6 sm:p-8',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-sky-500/60 to-emerald-400/60" />

      {isModal ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar acceso"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full text-slate-500"
        >
          <Icons.X className="h-4 w-4" />
        </Button>
      ) : null}

      <SectionTitle
        eyebrow="Acceso seguro"
        heading="Ingresá a tu cuenta"
        description={
          isModal
            ? 'Entrá para guardar propiedades, seguir tus reservas y hablar con anfitriones con más contexto.'
            : 'Entrá para guardar propiedades, retomar conversaciones y seguir tus reservas.'
        }
        as="h2"
        visualLevel={isModal ? 'h4' : 'h3'}
        className={isModal ? 'pr-12' : 'pr-8'}
      />

      <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="mt-8 space-y-5">
        {authErrorBanner}

        <Input
          id={isModal ? 'login-modal-email' : 'auth-email'}
          type="email"
          required
          autoComplete="email"
          autoFocus={!isModal}
          disabled={isSubmitting}
          value={email}
          onChange={handleEmailChange}
          label="Email"
          error={fieldErrors.email}
          icon={<Icons.Mail className="h-5 w-5" />}
          placeholder="vos@ejemplo.com"
          className="bg-white"
        />

        <Input
          id={isModal ? 'login-modal-password' : 'auth-password'}
          type="password"
          required
          autoComplete="current-password"
          disabled={isSubmitting}
          value={password}
          onChange={handlePasswordChange}
          label="Contraseña"
          hint="Usá la que cargaste al registrarte"
          error={fieldErrors.password}
          icon={<Icons.Lock className="h-5 w-5" />}
          placeholder="••••••••"
          className="bg-white"
        />

        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <Icons.ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p>Tu cuenta te permite guardar propiedades, seguir tus reservas y hablar con anfitriones dentro de Alquiler Real.</p>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingLabel="Ingresando..."
          className="mt-2 rounded-[1.2rem] px-5 shadow-[var(--app-shadow-brand)]"
        >
          <>
            <Icons.ArrowRight className="h-4 w-4" />
            Ingresá
          </>
        </Button>
      </form>

      <Card variant="muted" padding="none" className="mt-6 border-slate-200/80 bg-slate-50/90 p-4">
        <p className="text-sm font-semibold tracking-tight text-slate-900">¿Todavía no tenés cuenta?</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Creala en pocos pasos para guardar propiedades, hablar con anfitriones y reservar con más contexto.
        </p>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={isSubmitting}
          className="mt-4"
          onClick={handleSwitchToRegister}
        >
          Creá tu cuenta
        </Button>
      </Card>

      {isModal ? (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          disabled={isSubmitting}
          className="mt-3"
          onClick={handleClose}
        >
          Seguir explorando
        </Button>
      ) : null}
    </Card>
  );
};

export default LoginPanel;