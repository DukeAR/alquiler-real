import React, { useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HostDashboard } from '../components/HostDashboard';
import { ProfileViewNew } from '../components/ProfileViewNew';
import { PropertyDetailShell } from '../components/PropertyDetail';
import { SecureChat } from '../components/SecureChat';
import { DocumentVerificationFlow } from '../components/verification/DocumentVerificationFlow';
import { ExplorePage, buildLocationSuggestions } from '../components/explore/ExplorePage';
import { AuthContext, type AuthContextValue, type User } from '../contexts/AuthContext';
import { FavoritesContext } from '../contexts/FavoritesContext';
import { DEMO_ORDER_ID, DEMO_USER_PROFILE } from './mockIdentity';
import { getDemoAuditSnapshot, getDemoPropertyDetailSnapshot, type DemoAuditSnapshot } from './mockApi';
import type { Conversation } from '../types';

type StaticFavoritesContextValue = NonNullable<React.ContextType<typeof FavoritesContext>>;

export type DemoAuditRoute = {
  id: 'home' | 'profile' | 'property-detail' | 'chat' | 'host-dashboard' | 'verification';
  path: string;
  outputPath: string;
  interactivePath: string;
  title: string;
};

export const DEMO_AUDIT_ROUTES: DemoAuditRoute[] = [
  {
    id: 'home',
    path: '/demo',
    outputPath: 'demo/index.html',
    interactivePath: '/?demo=true',
    title: 'Alquiler Real',
  },
  {
    id: 'profile',
    path: '/demo/profile',
    outputPath: 'demo/profile/index.html',
    interactivePath: '/profile?demo=true',
    title: 'Alquiler Real',
  },
  {
    id: 'property-detail',
    path: '/demo/property/1',
    outputPath: 'demo/property/1/index.html',
    interactivePath: '/detail/1?demo=true',
    title: 'Alquiler Real',
  },
  {
    id: 'chat',
    path: '/demo/chat',
    outputPath: 'demo/chat/index.html',
    interactivePath: '/chat/all?demo=true',
    title: 'Alquiler Real',
  },
  {
    id: 'host-dashboard',
    path: '/demo/host-dashboard',
    outputPath: 'demo/host-dashboard/index.html',
    interactivePath: '/host-dashboard?demo=true',
    title: 'Alquiler Real',
  },
  {
    id: 'verification',
    path: '/demo/verification',
    outputPath: 'demo/verification/index.html',
    interactivePath: '/verification?mode=documentary&orderId=demo-documentary-order&returnTo=%2Fprofile&demo=true',
    title: 'Alquiler Real',
  },
];

const createStaticAuthValue = (user: User): AuthContextValue => ({
  user,
  loading: false,
  isAuthenticated: true,
  status: 'authenticated',
  error: null,
  sessionError: null,
  login: async () => true,
  register: async () => true,
  setActiveMode: async () => true,
  logout: async () => {},
  refresh: async () => ({ user, status: 'authenticated', error: null }),
  updateProfile: async () => true,
  clearError: () => {},
});

const createStaticFavoritesValue = (favoriteProperties: Array<{ id: string }>): StaticFavoritesContextValue => {
  const favoritesMap = new Map(favoriteProperties.map((property) => [property.id, property]));

  return {
    favoritesMap,
    isLoading: false,
    toggleFavorite: async () => 'unchanged',
    isFavorite: (propertyId: string) => favoritesMap.has(propertyId),
    getFavoriteIds: () => Array.from(favoritesMap.keys()),
    getFavoritesCount: () => favoritesMap.size,
    getUnseenFavoritesCount: () => 0,
    markFavoritesAsSeen: () => {},
    clearAllFavorites: async () => {},
  };
};

const buildAuditUser = (snapshot: DemoAuditSnapshot, activeMode: User['activeMode']): User => ({
  id: snapshot.user.id,
  name: snapshot.user.name,
  email: snapshot.user.email,
  role: 'host',
  canGuest: true,
  canHost: true,
  activeMode,
  memberSince: snapshot.user.memberSince,
  createdAt: DEMO_USER_PROFILE.createdAt,
  phone: snapshot.user.phone,
  bio: snapshot.user.bio,
  interests: JSON.stringify(snapshot.user.interests),
  zone: snapshot.user.zone,
  positiveReviews: 18,
  totalReviews: 19,
  rating: 4.9,
  totalProperties: snapshot.properties.filter((property) => property.hostId === snapshot.user.id).length,
  totalBookingsHosted: snapshot.hostBookings.length,
});

const normalizeConversation = (conversation: DemoAuditSnapshot['conversations'][number]): Conversation => ({
  ...conversation,
  booking_id: conversation.booking_id ?? undefined,
  depositType: conversation.depositType ?? undefined,
  depositStatus: conversation.depositStatus ?? undefined,
  propertyImage: conversation.propertyImageUrl,
  created_at: conversation.updated_at,
});

const StaticAuditProviders = ({
  route,
  user,
  favoriteProperties,
  children,
}: {
  route: string;
  user: User;
  favoriteProperties: Array<{ id: string }>;
  children: React.ReactNode;
}) => {
  const authValue = useMemo(() => createStaticAuthValue(user), [user]);
  const favoritesValue = useMemo(() => createStaticFavoritesValue(favoriteProperties), [favoriteProperties]);

  return (
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <FavoritesContext.Provider value={favoritesValue}>
          {children}
        </FavoritesContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const DemoAuditPropertyDetailPage = ({ propertyId, snapshot }: { propertyId: string; snapshot: DemoAuditSnapshot }) => {
  const property = getDemoPropertyDetailSnapshot(propertyId);
  const [mainIndex, setMainIndex] = useState(0);

  if (!property) {
    return null;
  }

  const images = Array.isArray(property.images) && property.images.length > 0 ? property.images : [property.imageUrl];
  const reviews = snapshot.propertyReviews[propertyId] ?? [];

  return (
    <PropertyDetailShell
      property={property}
      images={images}
      mainIndex={mainIndex}
      setMainIndex={setMainIndex}
      isFav={snapshot.favorites.includes(propertyId)}
      toggleFav={() => {}}
      reviews={reviews as any}
    />
  );
};

const renderAuditRouteTree = (route: DemoAuditRoute) => {
  const snapshot = getDemoAuditSnapshot();
  const favoriteProperties = snapshot.properties.filter((property) => snapshot.favorites.includes(property.id));

  switch (route.id) {
    case 'home': {
      const publicProperties = snapshot.properties.filter((property) => property.status === 'active');
      const auditUser = buildAuditUser(snapshot, 'guest');

      return (
        <StaticAuditProviders route={route.path} user={auditUser} favoriteProperties={favoriteProperties}>
          <ExplorePage
            initialProperties={publicProperties as any}
            initialLocationSuggestions={buildLocationSuggestions(publicProperties as any)}
            disableAutoLoad
          />
        </StaticAuditProviders>
      );
    }

    case 'profile': {
      const auditUser = buildAuditUser(snapshot, 'guest');

      return (
        <StaticAuditProviders route={route.path} user={auditUser} favoriteProperties={favoriteProperties}>
          <ProfileViewNew
            initialData={{
              validationData: snapshot.validationData,
              activity: snapshot.activity,
              reviews: snapshot.reviews,
              preferences: snapshot.preferences,
            }}
            disableAutoLoad
          />
        </StaticAuditProviders>
      );
    }

    case 'property-detail': {
      const auditUser = buildAuditUser(snapshot, 'guest');

      return (
        <StaticAuditProviders route={route.path} user={auditUser} favoriteProperties={favoriteProperties}>
          <DemoAuditPropertyDetailPage propertyId="1" snapshot={snapshot} />
        </StaticAuditProviders>
      );
    }

    case 'chat': {
      const auditUser = buildAuditUser(snapshot, 'guest');
      const conversations = snapshot.conversations.map(normalizeConversation);

      return (
        <StaticAuditProviders route={route.path} user={auditUser} favoriteProperties={favoriteProperties}>
          <div className="flex h-screen flex-col pt-4 md:pt-0">
            <div className="flex-1 overflow-hidden">
              <SecureChat initialConversations={conversations} disableAutoLoad />
            </div>
          </div>
        </StaticAuditProviders>
      );
    }

    case 'host-dashboard': {
      const auditUser = buildAuditUser(snapshot, 'host');
      const dashboardData = {
        properties: snapshot.properties.filter((property) => property.hostId === snapshot.user.id),
        recentBookings: snapshot.hostBookings,
      };

      return (
        <StaticAuditProviders route={route.path} user={auditUser} favoriteProperties={favoriteProperties}>
          <HostDashboard onBack={() => {}} initialDashboardData={dashboardData} disableAutoLoad />
        </StaticAuditProviders>
      );
    }

    case 'verification': {
      const auditUser = buildAuditUser(snapshot, 'guest');

      return (
        <StaticAuditProviders route={route.path} user={auditUser} favoriteProperties={favoriteProperties}>
          <DocumentVerificationFlow onComplete={() => {}} orderId={DEMO_ORDER_ID} />
        </StaticAuditProviders>
      );
    }
  }
};

export const renderDemoAuditRoute = (route: DemoAuditRoute) => renderToStaticMarkup(renderAuditRouteTree(route));

export const getDemoAuditManifest = () => DEMO_AUDIT_ROUTES.map((route) => ({
  id: route.id,
  path: route.path,
  interactivePath: route.interactivePath,
  title: route.title,
}));