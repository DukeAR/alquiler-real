export * from "../types";
import { apiJson } from "../lib/apiConfig";
import {
  Property, Review, Booking, HostProfile,
  TraceabilityReport, TraceabilityFactor, TraceabilityLevel,
  Conversation, Message, type ReservationRequestContext
} from "../types";

// Note: In a real production app, we would remove direct AI initialization from frontend

export function calculateTraceability(property: Partial<Property>): TraceabilityReport {
  let score = 0;
  const factors: TraceabilityFactor[] = [];

  // 1. Identidad
  if (property.identityValidated) {
    score += 30;
    factors.push({ label: 'Identidad confirmada', value: 'Validación de identidad aprobada', impact: 'positive' });
  } else {
    factors.push({ label: 'Identidad', value: 'Pendiente de validación', impact: 'neutral' });
  }

  // 2. Ubicación
  if (property.locationVerified) {
    score += 20;
    factors.push({ label: 'Ubicación confirmada', value: 'Ubicación validada digitalmente', impact: 'positive' });
  }

  // 3. Video del lugar
  if (property.videoValidated) {
    score += 20;
    factors.push({ label: 'Video del lugar', value: 'Recorrido visual del inmueble', impact: 'positive' });
  }

  // 4. Antigüedad
  const expYears = property.hostExperienceYears || 0;
  const expScore = Math.min(expYears * 4, 20);
  score += expScore;
  if (expYears > 0) {
    factors.push({ label: 'Antigüedad', value: `${expYears} años en la plataforma`, impact: 'positive' });
  }

  // 5. Consistencia Histórica
  const consistency = property.historicalConsistency || 0;
  if (consistency > 90) {
    score += 10;
    factors.push({ label: 'Consistencia', value: 'Historial de comportamiento estable', impact: 'positive' });
  }

  // 6. Conflictos (Penalización)
  const unresolved = property.unresolvedReviewsCount || 0;
  if (unresolved > 0) {
    score -= (unresolved * 15);
    factors.push({ label: 'Alertas de usuarios', value: `${unresolved} reportes pendientes`, impact: 'negative' });
  }

  // Final Level
  let level: TraceabilityLevel = 'low';
  if (score >= 80) level = 'high';
  else if (score >= 45) level = 'medium';

  return {
    level,
    score: Math.max(0, Math.min(100, score)),
    factors
  };
}

// API Calls to Backend
export async function fetchProperties(): Promise<Property[]> {
  return apiJson<Property[]>('/api/properties');
}

export async function analyzeChatMessage(message: string) {
  try {
    return await apiJson('/api/chat/analyze', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  } catch {
    return { isScam: false, reason: "", riskLevel: "low" };
  }
}

export async function submitReview(review: Partial<Review>) {
  return apiJson('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(review)
  });
}

export async function fetchReviews(propertyId: string): Promise<Review[]> {
  return apiJson<Review[]>(`/api/reviews/${propertyId}`);
}

export async function fetchMyBookings(): Promise<Booking[]> {
  return apiJson<Booking[]>('/api/bookings');
}

export async function fetchHostProfile(hostId: string): Promise<HostProfile> {
  return apiJson<HostProfile>(`/api/hosts/${hostId}`);
}

export async function chatWithAssistant(message: string, history: any[] = []): Promise<string> {
  const data = await apiJson<{ text: string }>('/api/chat/assistant', {
    method: 'POST',
    body: JSON.stringify({ message, history })
  });
  return data.text;
}

export async function fetchConversations(): Promise<Conversation[]> {
  return apiJson<Conversation[]>('/api/conversations');
}

export async function fetchMessages(convId: string): Promise<Message[]> {
  return apiJson<Message[]>(`/api/conversations/${convId}/messages`);
}

export async function sendMessage(convId: string, content: string, receiverId: string): Promise<Message> {
  return apiJson<Message>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: convId, content, receiver_id: receiverId })
  });
}

type ConversationRequestPayload = Pick<ReservationRequestContext, 'mode' | 'startDate' | 'endDate' | 'guests' | 'totalPrice'> & {
  requestStatus?: ReservationRequestContext['requestStatus'];
};

export async function startConversation(
  propertyId: string,
  hostId: string,
  bookingId?: string,
  requestContext?: ConversationRequestPayload,
): Promise<Conversation> {
  return apiJson<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      propertyId,
      hostId,
      bookingId,
      requestMode: requestContext?.mode,
      requestStatus: requestContext?.requestStatus,
      startDate: requestContext?.startDate,
      endDate: requestContext?.endDate,
      guests: requestContext?.guests,
      totalPrice: requestContext?.totalPrice,
    })
  });
}

export async function acceptConversationRequest(conversationId: string): Promise<Conversation> {
  return apiJson<Conversation>(`/api/conversations/${conversationId}/accept-request`, {
    method: 'POST'
  });
}

export async function reportDirectDeposit(conversationId: string): Promise<Conversation> {
  return apiJson<Conversation>(`/api/conversations/${conversationId}/report-direct-deposit`, {
    method: 'POST'
  });
}

export async function confirmDirectDeposit(conversationId: string): Promise<Conversation> {
  return apiJson<Conversation>(`/api/conversations/${conversationId}/confirm-direct-deposit`, {
    method: 'POST'
  });
}

export async function acceptContract(bookingId: string) {
  return apiJson(`/api/bookings/${bookingId}/accept-contract`, {
    method: 'POST'
  });
}

export async function payProtectedDeposit(bookingId: string): Promise<Booking> {
  const response = await apiJson<{ booking: Booking }>(`/api/bookings/${bookingId}/pay-deposit`, {
    method: 'POST'
  });

  return response.booking;
}

export async function confirmArrival(bookingId: string): Promise<Booking> {
  const response = await apiJson<{ booking: Booking }>(`/api/bookings/${bookingId}/confirm-arrival`, {
    method: 'POST'
  });

  return response.booking;
}

export async function reportArrivalProblem(bookingId: string): Promise<Booking> {
  const response = await apiJson<{ booking: Booking }>(`/api/bookings/${bookingId}/report-arrival-problem`, {
    method: 'POST'
  });

  return response.booking;
}

export async function reportNoShow(bookingId: string): Promise<Booking> {
  const response = await apiJson<{ booking: Booking }>(`/api/bookings/${bookingId}/report-no-show`, {
    method: 'POST'
  });

  return response.booking;
}

export async function cancelBookingAsHost(bookingId: string): Promise<Booking> {
  const response = await apiJson<{ booking: Booking }>(`/api/bookings/${bookingId}/cancel-as-host`, {
    method: 'POST'
  });

  return response.booking;
}

export async function cancelBooking(bookingId: string) {
  return apiJson<{ booking: Booking }>(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST'
  });
}
