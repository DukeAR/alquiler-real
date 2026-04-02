import React, { useState } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/apiConfig';
import { Icons } from './Icons';

interface GeoLocationVerifyProps {
  onVerified: (coords: { lat: number; lng: number }) => void;
  onCancel: () => void;
}

export const GeoLocationVerify: React.FC<GeoLocationVerifyProps> = ({ onVerified, onCancel }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  const requestLocation = () => {
    setStatus('loading');
    setError('');

    if (!navigator.geolocation) {
      setError('Tu navegador no permite obtener la ubicación');
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setStatus('success');
        
        // Enviar al servidor
        void apiFetch('/api/verify-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
            timestamp: new Date().toISOString()
          }),
        }).catch(err => console.error('Error saving location:', err));
      },
      (err) => {
        setStatus('error');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permiso de ubicación denegado. Habilitá la ubicación en tu navegador.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('No se pudo obtener la ubicación. Intentá de nuevo.');
            break;
          case err.TIMEOUT:
            setError('Tiempo de espera agotado. Intentá de nuevo.');
            break;
          default:
            setError('Error desconocido al obtener ubicación.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center">
          <Icons.Navigation className="w-7 h-7 text-brand" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Verificación por ubicación</h3>
          <p className="text-sm text-slate-500">Confirmá que estás en la ubicación de la propiedad</p>
        </div>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>¿Cómo funciona?</strong><br />
              Vamos a tomar tu ubicación actual usando el GPS del dispositivo. Esa coordenada se guarda como señal de que estuviste en el lugar.
            </p>
          </div>
          <button
            onClick={requestLocation}
            className="w-full py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand/90 transition-all flex items-center justify-center gap-2"
          >
            <Icons.Navigation className="w-5 h-5" />
            Obtener mi ubicación
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="text-center py-8 space-y-4">
          <Icons.Loader2 className="w-12 h-12 animate-spin text-brand mx-auto" />
          <p className="text-slate-600 dark:text-slate-400">Obteniendo tu ubicación...</p>
          <p className="text-xs text-slate-400">Aceptá el permiso de ubicación en tu navegador</p>
        </div>
      )}

      {status === 'success' && coords && (
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
            <div className="flex items-center gap-3 mb-3">
              <Icons.CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span className="font-bold text-emerald-800 dark:text-emerald-300">¡Ubicación verificada!</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Latitud</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{coords.lat.toFixed(6)}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Longitud</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{coords.lng.toFixed(6)}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => onVerified(coords)}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <Icons.Check className="w-5 h-5" />
            Confirmá y seguí
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800/30">
            <div className="flex items-center gap-3">
              <Icons.AlertTriangle className="w-6 h-6 text-red-500" />
              <span className="text-red-800 dark:text-red-300">{error}</span>
            </div>
          </div>
          <button
            onClick={requestLocation}
            className="w-full py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand/90 transition-all"
          >
            Probar de nuevo
          </button>
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full py-3 text-slate-500 font-medium hover:text-slate-700 transition-colors"
      >
        Cancelar
      </button>
    </motion.div>
  );
};
