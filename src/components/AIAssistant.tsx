import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { chatWithAssistant } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { NoticeBanner } from './ui/NoticeBanner';

type AssistantMessage = { role: 'user' | 'model'; parts: { text: string }[] };

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [assistantError, isLoading, messages]);

  const sendPrompt = async (prompt: string, options?: { appendUserMessage?: boolean }) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isLoading) return;

    const shouldAppendUserMessage = options?.appendUserMessage !== false;
    const userMsg: AssistantMessage = { role: 'user', parts: [{ text: trimmedPrompt }] };
    const nextHistory = shouldAppendUserMessage ? [...messages, userMsg] : messages;

    setAssistantError(null);
    setLastPrompt(trimmedPrompt);

    if (shouldAppendUserMessage) {
      setMessages(nextHistory);
      setInputText('');
    }

    setIsLoading(true);

    try {
      const response = await chatWithAssistant(trimmedPrompt, nextHistory);
      const cleanResponse = response?.trim();

      if (!cleanResponse) {
        throw new Error('empty-response');
      }

      setMessages(prev => [...prev, { role: 'model', parts: [{ text: cleanResponse }] }]);
    } catch (error) {
      console.error(error);
      setAssistantError('No pudimos responder ahora. Probá de nuevo en unos segundos o reformulá la consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    void sendPrompt(inputText);
  };

  const handleRetry = () => {
    if (!lastPrompt) {
      return;
    }

    void sendPrompt(lastPrompt, { appendUserMessage: false });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Abrir asistente de Alquiler Real"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 md:flex"
      >
        <Icons.MessageCircle className="w-7 h-7" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-label="Asistente de Alquiler Real"
            className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[400px] sm:h-[600px] bg-white dark:bg-slate-950 sm:rounded-3xl shadow-2xl flex flex-col z-50 border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Icons.Verified className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">Asistente de Alquiler Real</h3>
                  <p className="text-[10px] opacity-80 uppercase font-bold tracking-widest">Información real para decidir mejor</p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar asistente" onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <Icons.ChevronRight className="w-6 h-6 rotate-90" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Icons.Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">¿En qué te puedo ayudar?</p>
                    <p className="text-xs text-slate-500">Preguntame por zonas, señales de confianza o qué revisar antes de reservar.</p>
                  </div>
                </div>
              )}
              {assistantError && (
                <div className="space-y-3">
                  <NoticeBanner
                    tone="warning"
                    heading="No pudimos responder ahora."
                    description={assistantError}
                    className="shadow-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={isLoading}
                      loadingLabel="Reintentando..."
                      disabled={!lastPrompt}
                      onClick={handleRetry}
                    >
                      Reintentar última consulta
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => setAssistantError(null)}
                    >
                      Ocultar aviso
                    </Button>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white self-end ml-auto rounded-tr-none" 
                    : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white self-start rounded-tl-none border border-slate-200 dark:border-slate-800"
                )}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {msg.parts[0].text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 self-start">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estoy armando una respuesta...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (assistantError) {
                      setAssistantError(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribí tu consulta..."
                  disabled={isLoading}
                  aria-label="Consulta para el asistente"
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50"
                />
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  loading={isLoading}
                  loadingLabel="Consultando..."
                  className="rounded-full bg-blue-600 px-4 py-2.5 text-sm shadow-lg hover:bg-blue-700 disabled:bg-blue-600"
                >
                  <>
                    <Icons.Send className="h-4 w-4" />
                    Enviar
                  </>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
