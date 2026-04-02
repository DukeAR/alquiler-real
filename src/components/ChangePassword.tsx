import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/apiConfig';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

export const ChangePassword = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Completá todos los campos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiJson('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
        includeCredentials: true
      });

      setSuccess(true);
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar la contraseña. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <PageHeader
        onBack={() => navigate('/profile')}
        eyebrow="Seguridad"
        heading="Cambiá tu contraseña"
        description="Actualizá tu contraseña para mantener tu cuenta protegida sin salir del perfil."
        contentClassName="mx-auto w-full max-w-2xl"
      />

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <SectionTitle
          eyebrow="Acceso"
          as="h2"
          heading="Elegí una clave nueva"
          description="Cargala dos veces para confirmar el cambio. Cuando termine, volvés al perfil."
        />

        {success && (
          <NoticeBanner tone="success" heading="Ya actualizamos tu contraseña." />
        )}

        {error && (
          <NoticeBanner tone="error" heading={error} />
        )}

        <Card padding="lg" className="space-y-6 dark:border-slate-800 dark:bg-slate-900">
          <FormField label="Contraseña actual" hint="Requerida" htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Icons.Lock className="h-5 w-5" />}
              autoComplete="current-password"
              disabled={loading}
            />
          </FormField>

          <FormField label="Nueva contraseña" hint="Min. 6 caracteres" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Icons.Lock className="h-5 w-5" />}
              autoComplete="new-password"
              disabled={loading}
            />
          </FormField>

          <FormField label="Repetí la contraseña" hint="Tiene que coincidir" htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Icons.Lock className="h-5 w-5" />}
              autoComplete="new-password"
              disabled={loading}
            />
          </FormField>

          <div className="rounded-[var(--app-radius-control)] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="app-form-label">Tip de seguridad</p>
            <p className="mt-2 app-body-sm app-text-muted dark:text-slate-400">
              Usá una clave distinta a la del mail o tus redes y evitá datos obvios como fechas, nombres o repeticiones simples.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" size="lg" onClick={() => navigate('/profile')} className="sm:flex-1">
            Volver al perfil
          </Button>
          <Button
            onClick={handleChange}
            loading={loading}
            success={success}
            loadingLabel="Actualizando..."
            successLabel="Contraseña actualizada"
            size="lg"
            className="sm:flex-[1.2]"
          >
            <>
              <Icons.Lock className="w-5 h-5" />
              Actualizar contraseña
            </>
          </Button>
        </div>
      </main>
    </div>
  );
};
