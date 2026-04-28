import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { RequireAuth } from './app/guards/AuthGuards';
import { apiJson } from './lib/apiConfig';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { Icons } from './components/Icons';
import { LoadingState } from './components/LoadingState';
import { ExplorePage } from './components/explore/ExplorePage';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { useAuth } from './hooks/useAuth';
import { type HostProfile, type ReservationRequestContext } from './services/geminiService';

const LazyAboutPage = lazy(() => import('./components/AboutPage.tsx'));
const LazyChangePassword = lazy(() => import('./components/ChangePassword').then((module) => ({ default: module.ChangePassword })));
const LazyEditProfile = lazy(() => import('./components/EditProfile').then((module) => ({ default: module.EditProfile })));
const LazyFavoritesView = lazy(() => import('./components/FavoritesView').then((module) => ({ default: module.FavoritesView })));
const LazyFAQPage = lazy(() => import('./components/FAQPage').then((module) => ({ default: module.FAQPage })));
const LazyHostDashboard = lazy(() => import('./components/HostDashboard').then((module) => ({ default: module.HostDashboard })));
const LazyHostProfileView = lazy(() => import('./components/HostProfileView').then((module) => ({ default: module.HostProfileView })));
const LazyMyBookings = lazy(() => import('./components/MyBookings').then((module) => ({ default: module.MyBookings })));
const LazyOnsiteVerificationPage = lazy(() => import('./components/OnsiteVerificationPage').then((module) => ({ default: module.OnsiteVerificationPage })));
const LazyPrivacyPage = lazy(() => import('./components/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const LazyProfileViewNew = lazy(() => import('./components/ProfileViewNew.tsx'));
const LazyPropertyDetail = lazy(() => import('./components/PropertyDetail'));
const LazyRegister = lazy(() => import('./components/Register').then((module) => ({ default: module.Register })));
const LazySecureChat = lazy(() => import('./components/SecureChat').then((module) => ({ default: module.SecureChat })));
const LazyTermsPage = lazy(() => import('./components/TermsPage').then((module) => ({ default: module.TermsPage })));
const LazyDocumentVerificationFlow = lazy(() => import('./components/verification/DocumentVerificationFlow').then((module) => ({ default: module.DocumentVerificationFlow })));

const HOST_PROFILE_NOT_FOUND_MESSAGE = 'No encontramos lo que buscás.';

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center px-4">
    <LoadingState
      compact
      message="Estamos abriendo esta sección..."
      description="Cargando la vista para que sigas sin cortar lo que venías haciendo."
    />
  </div>
);

const GuestOnly = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Cargando tu cuenta..."
        description="Estamos preparando tu sesión, tus preferencias y tus accesos para que entres directo a la app."
      />
    );
  }

  return (
    <ErrorBoundary>
      <FavoritesProvider>
        <AppShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<ExplorePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/detail/:id" element={<LazyPropertyDetail />} />
              <Route path="/about" element={<AboutPageWrapper />} />
              <Route path="/verificacion-presencial" element={<OnsiteVerificationPageWrapper />} />
              <Route path="/faq" element={<FAQPageWrapper />} />
              <Route path="/terms" element={<TermsPageWrapper />} />
              <Route path="/privacy" element={<PrivacyPageWrapper />} />
              <Route path="/host/:id" element={<HostProfileWrapper />} />
              <Route path="/login" element={<GuestOnly><LazyRegister key="login" mode="login" /></GuestOnly>} />
              <Route path="/register" element={<GuestOnly><LazyRegister key="register" mode="register" /></GuestOnly>} />
              <Route path="/favorites" element={<RequireAuth><LazyFavoritesView /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><LazyProfileViewNew /></RequireAuth>} />
              <Route path="/edit-profile" element={<RequireAuth><LazyEditProfile /></RequireAuth>} />
              <Route path="/change-password" element={<RequireAuth><LazyChangePassword /></RequireAuth>} />
              <Route path="/verification" element={<RequireAuth><DocumentVerificationFlowWrapper /></RequireAuth>} />
              <Route path="/verify" element={<Navigate to="/verification" replace />} />
              <Route path="/chat/:id" element={<RequireAuth><SecureChatWrapper /></RequireAuth>} />
              <Route path="/my-bookings" element={<RequireAuth><LazyMyBookings /></RequireAuth>} />
              <Route path="/host-dashboard" element={<RequireAuth><HostDashboardWrapper /></RequireAuth>} />
              <Route path="/tenant-profile" element={<Navigate to="/profile" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </FavoritesProvider>
    </ErrorBoundary>
  );
}

const SecureChatWrapper = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialRequestContext = (location.state as { requestContext?: ReservationRequestContext } | null)?.requestContext ?? null;

  return (
    <div className="flex h-screen flex-col pt-4 md:pt-0">
      <div className="flex-1 overflow-hidden">
        <LazySecureChat initialConversationId={id === 'all' ? undefined : id} initialRequestContext={initialRequestContext} />
      </div>
    </div>
  );
};

const AboutPageWrapper = () => {
  const navigate = useNavigate();
  return <LazyAboutPage onBack={() => navigate(-1)} />;
};

const OnsiteVerificationPageWrapper = () => {
  const navigate = useNavigate();
  return <LazyOnsiteVerificationPage onBack={() => navigate(-1)} />;
};

const HostDashboardWrapper = () => {
  const navigate = useNavigate();
  return <LazyHostDashboard onBack={() => navigate(-1)} />;
};

const HostProfileWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    if (!id) {
      setProfile(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const nextProfile = await apiJson<HostProfile>(`/api/hosts/${id}`);

      if (!nextProfile) {
        setProfile(null);
        setNotFound(true);
        return;
      }

      setProfile(nextProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos cargar este perfil.';

      if (message === HOST_PROFILE_NOT_FOUND_MESSAGE) {
        setProfile(null);
        setNotFound(true);
        return;
      }

      console.error(error);
      setProfile(null);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [id]);

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Cargando perfil del anfitrión..."
        description="Estamos reuniendo su historial, sus reseñas y lo que ya se verificó para mostrarte el perfil con claridad."
      />
    );
  }

  if (loadError) {
    return (
      <ErrorState
        fullScreen
        title="No pudimos cargar este perfil"
        description={loadError}
        onRetry={() => void loadProfile()}
        onDismiss={() => navigate(-1)}
        dismissLabel="Volver"
      />
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            eyebrow="Perfil del anfitrión"
            tone="soft"
            visual={<Icons.User className="h-10 w-10" />}
            title="No encontramos este anfitrión"
            description="Puede que el perfil ya no esté disponible, que el enlace haya vencido o que necesites volver a explorar para seguir comparando opciones."
            action={{
              label: 'Explorá propiedades',
              onClick: () => navigate('/'),
            }}
            secondaryAction={{
              label: 'Volver',
              onClick: () => navigate(-1),
              variant: 'secondary',
            }}
          />
        </div>
      </div>
    );
  }

  return <LazyHostProfileView profile={profile} onBack={() => navigate(-1)} />;
};

const FAQPageWrapper = () => {
  const navigate = useNavigate();
  return <LazyFAQPage onBack={() => navigate(-1)} />;
};

const TermsPageWrapper = () => {
  const navigate = useNavigate();
  return <LazyTermsPage onBack={() => navigate(-1)} />;
};

const PrivacyPageWrapper = () => {
  const navigate = useNavigate();
  return <LazyPrivacyPage onBack={() => navigate(-1)} />;
};

const DocumentVerificationFlowWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode') === 'onsite' ? 'onsite' : 'documentary';
  const orderId = searchParams.get('orderId');
  const propertyId = searchParams.get('propertyId');
  const propertyTitle = searchParams.get('propertyTitle');
  const returnTo = searchParams.get('returnTo') || '/profile';

  return (
    <LazyDocumentVerificationFlow
      mode={mode}
      orderId={orderId}
      propertyId={propertyId}
      propertyTitle={propertyTitle}
      onComplete={async () => {
        await refresh();
        navigate(returnTo);
      }}
    />
  );
};