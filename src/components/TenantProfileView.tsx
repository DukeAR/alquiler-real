import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { ValidationBadgeLarge } from './ValidationBadge';
import { ValidationProgress } from './ValidationProgress';
import { ProfileSkeleton } from './ProfileSkeleton';
import { apiJson } from '../lib/apiConfig';

interface TenantProfileViewProps {
  onBack: () => void;
}

interface ValidationStatus {
  level: string;
  levelNumber: number;
  nextLevel: string | null;
  progress: number;
  levelLabel?: string;
  summary?: string;
  checks: {
    emailVerified: boolean;
    phoneVerified: boolean;
    profileComplete: boolean;
    platformActivity: boolean;
    historyVerified: boolean;
    reviewsVerified: boolean;
    documentarySubmitted: boolean;
    documentaryVerified: boolean;
  };
  missingRequirements: string[];
  benefits: {
    current: string[];
    next: string[];
  };
}

export const TenantProfileView: React.FC<TenantProfileViewProps> = ({ onBack }) => {
  const { user, updateProfile } = useAuth();
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showEditInterests, setShowEditInterests] = useState(false);

  // Estado para editar intereses
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editBio, setEditBio] = useState('');

  const interestsList = [
    '🏖️ Playa y Mar', '🎣 Pesca', '🏇 Caballos', '🏍️ Cuatriciclos',
    '👨‍👩‍👧‍👦 Familia', '🎵 Recitales', '🍲 Gastronomía', '📸 Fotografía',
    '🏃 Deportes', '📚 Lectura', '🎨 Arte', '🌿 Naturaleza'
  ];

  useEffect(() => {
    if (user) {
      fetchValidationStatus();
      if (user.interests) {
        try {
          setEditInterests(JSON.parse(user.interests));
        } catch (e) {
          setEditInterests([]);
        }
      }
      if (user.bio) {
        setEditBio(user.bio);
      }
    }
  }, [user]);

  const fetchValidationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiJson<ValidationStatus>('/api/verification/status', { includeCredentials: true });
      setValidationStatus(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'No pudimos cargar tu verificación.';
      setError(errorMsg);
      console.error('[TenantProfileView] Error fetching validation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setEditInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const saveInterests = async () => {
    try {
      const success = await updateProfile({ interests: editInterests, bio: editBio });

      if (!success) {
        throw new Error('No pudimos actualizar tu perfil.');
      }

      setShowEditInterests(false);
    } catch (error) {
      console.error('Error saving interests:', error);
    }
  };

  if (!user) return <div className="p-8">Iniciá sesión para ver tu perfil.</div>;

  const parseInterests = (interestsStr: string | undefined): string[] => {
    if (!interestsStr) return [];
    try {
      return JSON.parse(interestsStr);
    } catch {
      return [];
    }
  };

  const userInterests = parseInterests(user.interests);

  return (
    <div className="pb-24 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button onClick={onBack} className="p-2 text-slate-600 dark:text-slate-400">
          <Icons.ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Mi perfil</h1>
      </header>

      {loading && <ProfileSkeleton />}

      {!loading && (
      <main className="max-w-2xl mx-auto p-6 space-y-6">

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[24px] space-y-4">
            <div className="flex items-start gap-4">
              <Icons.AlertTriangle className="w-6 h-6 text-slate-500 dark:text-slate-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">No pudimos cargar tu verificación</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                <button
                  onClick={fetchValidationStatus}
                  className="px-4 py-2 bg-brand text-white rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors flex items-center gap-2"
                >
                  <Icons.ArrowRight className="w-4 h-4" />
                  Intentar de nuevo
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* HEADER: Avatar + Nombre */}
            <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
            <Icons.User className="w-12 h-12 text-slate-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="px-2 py-1 bg-brand/10 text-brand text-xs font-bold rounded-lg uppercase tracking-wider">
                {user.role === 'host' ? 'Anfitrión' : 'Huésped'}
              </span>
              {(user as any).zone && (
                 <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1">
                   <Icons.MapPin className="w-3 h-3" />
                   {(user as any).zone}
                 </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-2">{user.email}</p>
            {user.phone && <p className="text-xs text-slate-400 mt-1">{user.phone}</p>}
          </div>
        </div>

        {/* ESTADO DE COMPROBACIONES */}
        {validationStatus && (
          <section className="space-y-4">
            <ValidationBadgeLarge
              level={validationStatus.level}
              levelNumber={validationStatus.levelNumber}
              progress={validationStatus.progress}
            />

            {/* Explicación del estado según el usuario */}
            {validationStatus.level === 'NIVEL_3' && (
              <div className="p-4 bg-brand/5 dark:bg-brand/10 rounded-2xl border border-brand/10 dark:border-brand/20">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <strong>Historial consistente:</strong> Llegaste a esta etapa por tu actividad, tu historial y las reseñas que fuiste sumando dentro de la plataforma.
                </p>
              </div>
            )}

            {validationStatus.level === 'NIVEL_1' && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  <strong>Contacto confirmado:</strong> Ya confirmaste los datos de contacto que forman la base visible de tu cuenta.
                </p>
              </div>
            )}

            {validationStatus.level === 'INICIAL' && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <strong>Primeras comprobaciones:</strong> Empezá por confirmar email y teléfono. La documentación queda para después y es opcional.
                </p>
              </div>
            )}

            {validationStatus.summary ? (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-300">{validationStatus.summary}</p>
              </div>
            ) : null}

            {/* Checklist de validación */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Icons.Shield className="w-4 h-4" />
                  Estado de comprobaciones
                </h3>
                <button
                  onClick={() => setShowDocUpload(!showDocUpload)}
                  className="text-xs font-bold text-brand hover:text-brand/80 transition-colors"
                >
                  {showDocUpload ? 'Ocultar' : 'Ver comprobación documental'}
                </button>
              </div>

              <ValidationProgress
                checks={validationStatus.checks}
                progress={validationStatus.progress}
                missingRequirements={validationStatus.missingRequirements}
                userRole={user.role.toUpperCase() as 'TENANT' | 'HOST'}
              />

              {showDocUpload && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Si querés sumar respaldo extra, activá la comprobación documental adicional desde tu perfil y seguí desde ahí.
                  </p>
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-colors"
                  >
                    Ir al perfil
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* INTERESES Y GUSTOS */}
        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Icons.Heart className="w-4 h-4" />
              Tus intereses
            </h3>
            <button
              onClick={() => setShowEditInterests(!showEditInterests)}
              className="text-xs font-bold text-brand hover:text-brand/80 transition-colors"
            >
              {showEditInterests ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {!showEditInterests ? (
            <>
              {userInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userInterests.map((interest, i) => (
                    <span key={i} className="px-3 py-2 bg-brand/10 text-brand text-sm font-medium rounded-xl">
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Todavía no cargaste tus intereses.</p>
              )}

              {user.bio && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sobre vos</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{user.bio}</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Qué plan buscás
                </label>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map((interest) => (
                    <button
                      type="button"
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${editInterests.includes(interest)
                        ? 'bg-brand text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand/20'
                        }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Presentación breve
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 font-medium focus:ring-2 focus:ring-brand outline-none resize-none text-slate-900 dark:text-white"
                  placeholder="Contá cómo viajás o qué buscás cuando reservás..."
                />
              </div>

              <button
                onClick={saveInterests}
                className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-colors"
              >
                Guardar cambios
              </button>
            </div>
          )}
        </section>

        {/* INFORMACIÓN DE CONTACTO */}
        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datos de contacto</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Icons.MessageSquare className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
              </div>
              <span className="text-sm text-slate-500">{user.email}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Icons.Phone className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono</span>
              </div>
              <span className="text-sm text-slate-500">{user.phone || 'Sin cargar'}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Icons.Calendar className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Miembro desde</span>
              </div>
              <span className="text-sm text-slate-500">
                {user.memberSince || user.createdAt
                  ? new Date(user.memberSince || user.createdAt || '').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                  : 'Sin dato'}
              </span>
            </div>
          </div>
        </section>

        {/* DISCLAIMER */}
        <div className="p-6 bg-slate-100 dark:bg-slate-900/50 rounded-[32px] border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center font-medium">
            La verificación de identidad confirma quién sos. No garantiza cómo te vas a comportar ni reemplaza el trato entre personas.
          </p>
        </div>
          </>
        )}
      </main>
      )}
    </div>
  );
};
