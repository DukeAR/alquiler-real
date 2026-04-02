import React, { useEffect, useState } from 'react';
import { LoginPanel } from './LoginPanel';

export const LoginModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener('open-login', onOpen as EventListener);
    window.addEventListener('close-login', onClose as EventListener);
    return () => {
      window.removeEventListener('open-login', onOpen as EventListener);
      window.removeEventListener('close-login', onClose as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Acceso a tu cuenta"
    >
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <LoginPanel
        context="modal"
        className="relative z-10 w-full max-w-lg"
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </div>
  );
};

export default LoginModal;
