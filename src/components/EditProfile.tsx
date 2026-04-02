import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { VALID_ZONES } from '../lib/constants';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

export const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, error: authError, clearError } = useAuth();
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setZone((user as any).zone || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Completá tu nombre para guardar los cambios.');
      return;
    }

    setLoading(true);
    setError('');
    clearError();

    try {
      const success = await updateProfile({ name, zone: zone || null });

      if (!success) {
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar tus cambios. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <PageHeader
        onBack={() => navigate('/profile')}
        eyebrow="Perfil"
        heading="Editá tu perfil"
        description="Actualizá tus datos básicos para que tu perfil se vea prolijo y la app te muestre opciones más alineadas con vos."
        contentClassName="mx-auto w-full max-w-2xl"
      />

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <SectionTitle
          eyebrow="Datos principales"
          as="h2"
          heading="Mantené tus datos al día"
          description="Con tu nombre y tu zona preferida alcanza para ordenar mejor la experiencia."
        />

        {success && (
          <NoticeBanner tone="success" heading="Ya guardamos los cambios de tu perfil." />
        )}

        {(error || authError) && (
          <NoticeBanner tone="error" heading={error || authError || ''} />
        )}

        <Card padding="lg" className="space-y-6 dark:border-slate-800 dark:bg-slate-900">
          <FormField label="Nombre" htmlFor="profile-name">
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder="Tu nombre completo"
            />
          </FormField>

          <FormField label="Zona para explorar" hint="Opcional" htmlFor="profile-zone">
            <select
              id="profile-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              disabled={loading}
              className="app-control px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Sin preferencia</option>
              {VALID_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </FormField>

          <div className="rounded-[var(--app-radius-control)] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="app-form-label">Para qué usamos esta información</p>
            <p className="mt-2 app-body-sm app-text-muted dark:text-slate-400">
              La zona preferida nos ayuda a mostrarte resultados y sugerencias más alineadas con lo que buscás. No se publica si no querés usarla.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" size="lg" onClick={() => navigate('/profile')} className="sm:flex-1">
            Volver al perfil
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            success={success}
            loadingLabel="Guardando..."
            successLabel="Cambios guardados"
            size="lg"
            className="sm:flex-[1.2]"
          >
            <>
              <Icons.Check className="w-5 h-5" />
              Guardar cambios
            </>
          </Button>
        </div>
      </main>
    </div>
  );
};
