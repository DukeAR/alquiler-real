type FrontendFunnelEvent = 'availability_cta_clicked' | 'chat_composer_opened';

type FrontendFunnelPayload = {
  propertyId: string;
  hostId: string;
  conversationId?: string;
  viewerRole?: 'guest' | 'host';
};

const isBrowser = () => typeof window !== 'undefined';

export const trackFrontendFunnelEvent = (event: FrontendFunnelEvent, payload: FrontendFunnelPayload) => {
  if (!isBrowser() || import.meta.env.MODE === 'test' || !payload.propertyId || !payload.hostId) {
    return;
  }

  void fetch('/api/funnel/events', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      propertyId: payload.propertyId,
      hostId: payload.hostId,
      ...(payload.conversationId ? { conversationId: payload.conversationId } : {}),
      ...(payload.viewerRole ? { viewerRole: payload.viewerRole } : {}),
    }),
  }).catch(() => undefined);
};