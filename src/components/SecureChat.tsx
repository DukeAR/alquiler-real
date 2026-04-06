import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { showToast } from '../lib/toast';
import { LoadingState } from './LoadingState';
import { cn } from '../lib/utils';
import { 
  fetchConversations, fetchMessages, sendMessage, 
  Conversation, Message 
} from '../services/geminiService';
import { ReportModal } from './ReportModal';
import { useAuth } from '../hooks/useAuth';
import { type ReservationRequestContext } from '../types';

const formatRequestDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
};

const getNightCount = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const getActiveRequestContext = (
  activeConversation: Conversation | null,
  initialConversationId?: string,
  initialRequestContext?: ReservationRequestContext | null,
): ReservationRequestContext | null => {
  if (!activeConversation) {
    return null;
  }

  if (activeConversation.booking_id && activeConversation.startDate && activeConversation.endDate) {
    const nights = getNightCount(activeConversation.startDate, activeConversation.endDate);
    const totalPrice = Number(activeConversation.totalPrice) || 0;

    return {
      propertyId: activeConversation.property_id,
      propertyTitle: activeConversation.propertyTitle || 'Propiedad',
      hostName: activeConversation.hostName || 'Anfitrión',
      startDate: activeConversation.startDate,
      endDate: activeConversation.endDate,
      guests: Number(activeConversation.guests) || 1,
      nightly: nights > 0 ? totalPrice / nights : 0,
      nights,
      totalPrice,
      mode: 'protected',
      bookingId: activeConversation.booking_id,
      bookingStatus: activeConversation.bookingStatus,
    };
  }

  if (initialConversationId && activeConversation.id === initialConversationId && initialRequestContext) {
    return initialRequestContext;
  }

  return null;
};

const getSuggestionTexts = (requestContext: ReservationRequestContext | null, isTenant: boolean) => {
  if (!requestContext) {
    return [] as string[];
  }

  if (requestContext.mode === 'protected') {
    return isTenant
      ? [
          '¿Te sirven estas fechas?',
          '¿Hay algo importante que deba tener en cuenta antes de avanzar?',
          'Si te cierra, seguimos por la reserva protegida.',
        ]
      : [
          'Sí, estas fechas me sirven.',
          'Antes de responder, quiero confirmar estos puntos:',
          'Si te parece, lo seguimos por la reserva protegida.',
        ];
  }

  return isTenant
    ? [
        '¿Te sirven estas fechas?',
        '¿Qué incluye el precio?',
        '¿Hay algo del ingreso o de la estadía que convenga coordinar ahora?',
      ]
    : [
        'Sí, esas fechas están disponibles.',
        'Te cuento qué incluye el precio:',
        'Si querés, coordinamos los detalles por acá.',
      ];
};

export const SecureChat: React.FC<{ initialConversationId?: string; initialRequestContext?: ReservationRequestContext | null }> = ({
  initialConversationId,
  initialRequestContext = null,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) setActiveConv(conv);
    }
  }, [initialConversationId, conversations]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      const interval = setInterval(() => loadMessages(activeConv.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeConv]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      setError(null);
      const data = await fetchConversations();
      setConversations(data || []);
    } catch (err: any) {
      const errorMsg = err?.message || 'No pudimos cargar los mensajes. Probá de nuevo más tarde.';
      console.error('[SecureChat] Error loading conversations:', err);
      setError(errorMsg);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (id: string) => {
    try {
      setError(null);
      const data = await fetchMessages(id);
      setMessages(data || []);
    } catch (err: any) {
      console.error('[SecureChat] Error loading messages:', err);
      setError(err?.message || 'No pudimos cargar los mensajes.');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeConv || !user) return;

    const receiverId = user.id === activeConv.tenant_id ? activeConv.host_id : activeConv.tenant_id;
    const messageText = inputText;
    const optimisticId = `opt-${Date.now()}`;
    
    // Optimistic update - show message immediately
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: activeConv.id,
      sender_id: user.id,
      receiver_id: receiverId,
      content: messageText,
      created_at: new Date().toISOString(),
      is_optimistic: true
    };
    
    setInputText('');
    setMessages(prev => [...prev, optimisticMessage]);
    setSendingMessageId(optimisticId);

    try {
      setError(null);
      const newMsg = await sendMessage(activeConv.id, messageText, receiverId);
      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(msg => msg.id === optimisticId ? newMsg : msg));
    } catch (err: any) {
      setError(err?.message || 'No pudimos enviar el mensaje. Intentá de nuevo.');
      setInputText(messageText); // Restore input on error
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      console.error('[SecureChat] Error sending message:', err);
    } finally {
      setSendingMessageId(null);
    }
  };

  if (loading) return <LoadingState message="Cargando conversaciones..." description="Estamos trayendo tus mensajes para que retomes la charla desde donde quedó." />;

  const activeRequestContext = getActiveRequestContext(activeConv, initialConversationId, initialRequestContext);
  const isTenantConversation = Boolean(user && activeConv && user.id === activeConv.tenant_id);
  const suggestionTexts = getSuggestionTexts(activeRequestContext, isTenantConversation);
  const requestDateLabel = activeRequestContext
    ? `${formatRequestDate(activeRequestContext.startDate)} al ${formatRequestDate(activeRequestContext.endDate)}`
    : null;
  const requestHeading = activeRequestContext
    ? activeRequestContext.mode === 'protected'
      ? activeRequestContext.bookingStatus === 'confirmed'
        ? 'Reserva protegida confirmada'
        : 'Solicitud protegida pendiente'
      : 'Propuesta abierta por chat'
    : null;
  const requestDescription = activeRequestContext
    ? activeRequestContext.mode === 'protected'
      ? 'La solicitud ya quedó asentada en la app mientras seguís conversando por acá con el anfitrión.'
      : 'Todavía no bloquea fechas ni deja una reserva protegida. Sirve para conversar antes de decidir cómo seguir.'
    : 'Dejá por acá fechas, montos y cambios importantes para que la conversación quede clara.';

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden pt-4 md:pt-0">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all",
        activeConv ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black uppercase tracking-tight">Mensajes</h2>
        </div>

        {error && !activeConv && (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-2">
            <Icons.AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 && !error ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">Todavía no tenés conversaciones</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConv(c)}
                className={cn(
                  "w-full p-4 rounded-3xl text-left transition-all flex items-center gap-4",
                  activeConv?.id === c.id 
                    ? "bg-brand text-white shadow-xl shadow-brand/20" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  <img src={c.propertyImage} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate text-sm">
                    {user?.id === c.tenant_id ? c.hostName : c.tenantName}
                  </p>
                  <p className={cn(
                    "text-[10px] truncate uppercase font-black tracking-widest leading-tight",
                    activeConv?.id === c.id ? "text-white/70" : "text-slate-400"
                  )}>
                    {c.propertyTitle}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all",
        !activeConv ? "hidden md:flex bg-slate-50 dark:bg-slate-900/10 items-center justify-center" : "flex"
      )}>
        {!activeConv ? (
          <div className="text-center space-y-4 opacity-30 select-none">
            <Icons.MessageSquare className="w-20 h-20 mx-auto text-slate-400" />
            <p className="text-sm font-black uppercase tracking-widest">Elegí una conversación para ver el historial</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between glass">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveConv(null)} className="md:hidden p-2">
                  <Icons.ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                   <h3 className="font-black text-sm uppercase tracking-tight">
                     {user?.id === activeConv.tenant_id ? activeConv.hostName : activeConv.tenantName}
                   </h3>
                   <p className="text-[10px] font-bold text-brand uppercase tracking-widest">{activeConv.propertyTitle || 'Disponible en la app'}</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(true)} className="p-3 text-slate-400 hover:text-red-500 transition-colors">
                <Icons.AlertTriangle className="w-5 h-5" />
              </button>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mx-auto max-w-3xl space-y-3">
                {activeRequestContext ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <span className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                              activeRequestContext.mode === 'protected'
                                ? 'bg-brand/10 text-brand'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                            )}>
                              {activeRequestContext.mode === 'protected' ? <Icons.ShieldCheck className="h-3.5 w-3.5" /> : <Icons.MessageSquare className="h-3.5 w-3.5" />}
                              <span>{activeRequestContext.mode === 'protected' ? 'Reserva protegida' : 'Chat directo'}</span>
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">{requestHeading}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{requestDescription}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Fechas</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{requestDateLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Huéspedes</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{activeRequestContext.guests} {activeRequestContext.guests === 1 ? 'huésped' : 'huéspedes'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Total estimado</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(activeRequestContext.totalPrice || 0)}
                          </p>
                        </div>
                      </div>

                      {suggestionTexts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {suggestionTexts.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setInputText(suggestion)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <Icons.ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
                  <p className="leading-5">Dejá por acá fechas, montos y cambios importantes. Si después necesitás revisar algo, queda todo mucho más claro.</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/30 dark:bg-transparent">
              {error && activeConv && (
                <div className="flex items-start gap-3 max-w-2xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
                  <Icons.AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    <button
                      onClick={() => activeConv && loadMessages(activeConv.id)}
                      className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                    >
                      Reintentar
                    </button>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {messages.length === 0 && !error && (
                <div className="text-center py-12 text-slate-400">
                  <Icons.MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Todavía no hay mensajes</p>
                  <p className="text-xs opacity-70">Escribí el primero</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col gap-1 max-w-[80%]",
                  msg.sender_id === user?.id ? "self-end" : "self-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-[28px] text-sm font-medium leading-relaxed shadow-sm relative",
                    msg.sender_id === user?.id
                      ? "bg-brand text-white rounded-tr-none shadow-brand/10"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-800"
                  )}>
                    {msg.content}
                    {sendingMessageId === msg.id && (
                      <Icons.Loader2 className="w-3 h-3 animate-spin absolute -right-6 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest text-slate-400 px-2",
                    msg.sender_id === user?.id ? "text-right" : "text-left",
                    sendingMessageId === msg.id && "opacity-50"
                  )}>
                    {(msg as any).is_optimistic ? 'Enviando...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribí un mensaje..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-brand/20 transition-all shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sendingMessageId !== null}
                  className="bg-brand text-white p-4 rounded-2xl shadow-xl shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessageId !== null ? (
                    <Icons.Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icons.Send className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showReportModal && (
        <ReportModal 
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            showToast('Reporte recibido', 'Gracias. Ya recibimos tu reporte.', 'success');
          }}
        />
      )}
    </div>
  );
};
