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

export const SecureChat: React.FC<{ initialConversationId?: string }> = ({ initialConversationId }) => {
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
                   <p className="text-[10px] font-bold text-brand uppercase tracking-widest">Disponible en la app</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(true)} className="p-3 text-slate-400 hover:text-red-500 transition-colors">
                <Icons.AlertTriangle className="w-5 h-5" />
              </button>
            </div>

            {/* Safety Alert */}
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border-b border-amber-100 dark:border-amber-900/30">
               <div className="flex gap-3 max-w-2xl mx-auto items-center">
                  <Icons.ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold leading-tight uppercase tracking-tight">
                    Antes de transferir dinero, dejá la conversación y la reserva registradas acá. Eso te deja todo más claro si necesitás revisar algo después.
                  </p>
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
