export const DEMO_USER_ID = 'demo-user';

export const DEMO_ORDER_ID = 'demo-documentary-order';

export const DEMO_USER_INTERESTS = ['Casas con patio', 'Estadías largas', 'Cerca del mar'] as const;

export const DEMO_USER_PROFILE = {
  name: 'Valentina Ríos',
  email: 'valentina.rios@alquilerreal.app',
  phone: '+54 9 11 5555-1234',
  zone: 'Costa Atlántica',
  bio: 'Me gusta organizar con tiempo y revisar bien la información antes de reservar o publicar.',
  interests: [...DEMO_USER_INTERESTS],
  memberSince: '2024-01-12',
  createdAt: '2024-01-12T00:00:00.000Z',
} as const;

export const DEMO_USER_INTERESTS_JSON = JSON.stringify(DEMO_USER_INTERESTS);