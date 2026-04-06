import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPostAuthRedirect, preserveAuthRedirectState } from '../lib/authRedirect';
import { Icons } from './Icons';
import { LoginPanel } from './LoginPanel';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { SectionTitle } from './ui/SectionTitle';

type RegisterProps = {
    mode?: 'login' | 'register';
};

const loginHighlights = [
    {
        icon: Icons.Heart,
        title: 'Guardá propiedades para revisar después',
        description: 'Retomá la búsqueda sin arrancar de cero cada vez.',
    },
    {
        icon: Icons.Calendar,
        title: 'Seguí tus reservas',
        description: 'Consultá fechas, confirmaciones y próximos pasos desde un mismo lugar.',
    },
    {
        icon: Icons.ShieldCheck,
        title: 'Mirá qué ya está verificado',
        description: 'Entrá a perfiles y datos clave antes de avanzar.',
    },
];

export const Register = ({ mode = 'login' }: RegisterProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isLogin = mode === 'login';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'tenant' | 'host'>('tenant');
    const [zone, setZone] = useState('San Clemente del Tuyú');
    const [bio, setBio] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const { register, error, clearError } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const interestsList = [
        '🏖️ Playa y Mar', '🎣 Pesca', '🏇 Caballos', '🏍️ Cuatriciclos',
        '👨‍👩‍👧‍👦 Familia', '🎵 Recitales', '🍲 Gastronomía', '📸 Fotografía',
        '🏃 Deportes', '📚 Lectura', '🎨 Arte', '🌿 Naturaleza'
    ];

    const handleModeChange = (targetMode: 'login' | 'register') => {
        clearError();
        navigate(targetMode === 'login' ? '/login' : '/register', { state: preserveAuthRedirectState(location.state) });
    };

    const handleInterestToggle = (interest: string) => {
        setInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setIsSubmitting(true);

        try {
            const success = await register(email.trim(), password, role, fullName.trim(), zone, phone.trim(), bio.trim(), interests);

            if (success) {
                navigate(getPostAuthRedirect(location.state, '/profile'), { replace: true });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const authErrorBanner = error ? (
        <div
            role="alert"
            className="flex items-start gap-3 rounded-[1.25rem] border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-[0_18px_40px_-30px_rgba(185,28,28,0.45)]"
        >
            <Icons.AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="space-y-1">
                <p className="font-semibold tracking-tight">Revisá los datos e intentá de nuevo.</p>
                <p className="text-red-700/85">{error}</p>
            </div>
        </div>
    ) : null;

    if (isLogin) {
        return (
            <div className="app-page flex min-h-[100svh] items-center py-8 sm:py-12 lg:py-16">
                <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,440px)] lg:items-center lg:gap-8">
                    <section className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                aria-label="Ir al inicio de Alquiler Real"
                                className="flex items-center gap-3 rounded-full pr-3 text-left transition-transform duration-200 hover:scale-[1.01]"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_35px_-22px_rgba(15,23,42,0.85)]">
                                    <Icons.ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Antes de reservar</div>
                                    <div className="font-display text-[1.2rem] font-semibold tracking-tight text-slate-900">Alquiler Real</div>
                                </div>
                            </button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="auto"
                                className="rounded-full px-3 py-2 text-sm text-slate-600"
                                onClick={() => navigate('/')}
                            >
                                <Icons.ArrowLeft className="h-4 w-4" />
                                Volver a explorar
                            </Button>
                        </div>

                        <Card
                            variant="elevated"
                            padding="none"
                            className="overflow-hidden border-slate-200/85 bg-white/95 p-5 shadow-[0_32px_70px_-38px_rgba(15,23,42,0.35)] sm:p-7"
                        >
                            <div className="rounded-[1.75rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-6 sm:p-7">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)]">
                                    <Icons.ShieldCheck className="h-7 w-7" />
                                </div>

                                <SectionTitle
                                    className="mt-6"
                                    eyebrow="Tu cuenta"
                                    heading="Entrá y retomá lo que estabas revisando."
                                    description="Guardá propiedades, seguí reservas y hablá con anfitriones desde el mismo lugar donde explorás."
                                    as="h1"
                                    visualLevel="h2"
                                />

                                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-[var(--app-shadow-subtle)]">
                                    <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    Guardados, reservas y mensajes para no perder el hilo.
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {loginHighlights.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div key={item.title} className="flex items-start gap-4 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4">
                                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-[var(--app-shadow-subtle)]">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold tracking-tight text-slate-900">{item.title}</p>
                                                <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </section>

                    <LoginPanel />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
                        <Icons.ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Alquiler Real
                    </h1>
                    <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">
                        Empezá a revisar mejor antes de reservar
                    </p>
                </div>

                {authErrorBanner ? <div className="mb-6">{authErrorBanner}</div> : null}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Email" htmlFor="auth-email">
                        <Input
                            id="auth-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={<Icons.MessageSquare className="h-5 w-5" />}
                            className="border-0 bg-slate-50 dark:bg-slate-800 dark:focus:bg-slate-900 focus:bg-white"
                            placeholder="tu@email.com"
                        />
                    </FormField>

                    <FormField label="Contraseña" htmlFor="auth-password">
                        <Input
                            id="auth-password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<Icons.Lock className="h-5 w-5" />}
                            className="border-0 bg-slate-50 dark:bg-slate-800 dark:focus:bg-slate-900 focus:bg-white"
                            placeholder="••••••"
                        />
                    </FormField>

                    <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setRole('tenant')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 outline-none ${role === 'tenant'
                                ? 'border-brand bg-brand/5 text-brand'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand/30'
                                }`}
                        >
                            <Icons.User className="w-6 h-6" />
                            <span className="text-xs font-bold uppercase tracking-wider">Huésped</span>
                            <span className="text-[10px] text-center opacity-80 font-medium">Quiero reservar</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setRole('host')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 outline-none ${role === 'host'
                                ? 'border-brand bg-brand/5 text-brand'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand/30'
                                }`}
                        >
                            <Icons.Home className="w-6 h-6" />
                            <span className="text-xs font-bold uppercase tracking-wider">Anfitrión</span>
                            <span className="text-[10px] text-center opacity-80 font-medium">Quiero publicar una propiedad</span>
                        </button>
                    </div>

                    {role === 'host' && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/30 text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-bold mb-1">📋 Para publicar con datos verificables vas a necesitar:</p>
                            <ul className="text-xs space-y-1">
                                <li>• DNI (frente y dorso)</li>
                                <li>• Selfie con DNI</li>
                                <li>• Comprobante de servicios a tu nombre</li>
                            </ul>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <FormField label="Nombre completo" htmlFor="register-full-name">
                                <Input
                                    id="register-full-name"
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    icon={<Icons.User className="h-5 w-5" />}
                                    className="border-0 bg-slate-50 dark:bg-slate-800"
                                    placeholder="Juan Pérez"
                                />
                            </FormField>
                        </div>

                        <div>
                            <FormField
                                label="Teléfono"
                                htmlFor="register-phone"
                                helperText="Solo visible cuando te contactes con alguien."
                            >
                                <Input
                                    id="register-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    icon={<Icons.MessageSquare className="h-5 w-5" />}
                                    className="border-0 bg-slate-50 dark:bg-slate-800"
                                    placeholder="+54 9 11 1234-5678"
                                />
                            </FormField>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                                Zona para empezar a explorar
                            </label>
                            <div className="relative">
                                <Icons.MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <select
                                    value={zone}
                                    onChange={(e) => setZone(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-medium focus:ring-2 focus:ring-brand outline-none appearance-none cursor-pointer text-slate-900 dark:text-white"
                                >
                                    <option value="San Clemente del Tuyú">San Clemente del Tuyú</option>
                                    <option value="Las Toninas">Las Toninas</option>
                                    <option value="Santa Teresita">Santa Teresita</option>
                                    <option value="Mar del Tuyú">Mar del Tuyú</option>
                                    <option value="Costa del Este">Costa del Este</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                                Qué plan buscás (opcional)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {interestsList.map((interest) => (
                                    <button
                                        type="button"
                                        key={interest}
                                        onClick={() => handleInterestToggle(interest)}
                                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${interests.includes(interest)
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
                                Presentación breve (opcional)
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 font-medium focus:ring-2 focus:ring-brand outline-none resize-none text-slate-900 dark:text-white"
                                placeholder="Contá cómo viajás o cómo recibís huéspedes..."
                            />
                            <p className="text-[10px] text-brand mt-1 flex items-center gap-1">
                                <Icons.Sparkles className="w-3 h-3" />
                                Una presentación breve ayuda a que sepan con quién hablan
                            </p>
                        </div>
                    </div>

                    <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                        />
                        <span>
                            Acepto los <strong className="text-brand">términos y condiciones</strong> y la{' '}
                            <strong className="text-brand">política de privacidad</strong>.
                        </span>
                    </label>

                    <Button
                        type="submit"
                        disabled={!acceptedTerms}
                        loading={isSubmitting}
                        loadingLabel="Creando tu cuenta..."
                        size="lg"
                        fullWidth
                        className="mt-6 shadow-xl shadow-brand/20"
                    >
                        Creá tu cuenta
                        <Icons.ArrowRight className="w-5 h-5" />
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => handleModeChange('login')}
                        className="text-sm font-bold text-slate-500 hover:text-brand transition-colors"
                    >
                        ¿Ya tenés cuenta? Ingresá
                    </button>
                </div>
            </div>
        </div>
    );
};
