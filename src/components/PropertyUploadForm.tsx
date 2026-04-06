import React, { useState } from 'react';
import { showToast } from '../lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

type VerificationType = 'digital' | 'presencial';
type PaymentMethod = 'efectivo' | 'transferencia' | 'mercadopago';

interface TimeSlot {
    day: string;
    date: string;
    time: string;
    available: boolean;
}

export const PropertyUploadForm: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [showPresencialModal, setShowPresencialModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        address: '',
        city: '',
        price: '',
        guests: 1,
        description: '',
        amenities: [] as string[],
        verificationType: 'digital' as VerificationType,
        selectedSlots: [] as string[],
        paymentMethod: null as PaymentMethod | null,
        acceptedCost: false,
        // GEOLOCALIZACIÓN
        latitude: null as number | null,
        longitude: null as number | null,
        locationSet: false
    });
    const [legalAccepted, setLegalAccepted] = useState(false);

    const VERIFICATION_COST = 5000;
    const amenitiesList = ['WiFi', 'Aire Acondicionado', 'Pileta', 'Parrilla', 'Cochera', 'Mascotas', 'TV Cable', 'Parque', 'Patio'];

    const [availableSlots] = useState<TimeSlot[]>(() => {
        const slots: TimeSlot[] = [];
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

        for (let i = 1; i <= 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = days[date.getDay()];
            const dateStr = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

            times.forEach(time => {
                const isAvailable = Math.random() > 0.3;
                slots.push({ day: dayName, date: dateStr, time: time, available: isAvailable });
            });
        }
        return slots;
    });

    const handleAmenityToggle = (amenity: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const handleSlotToggle = (slotId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedSlots: prev.selectedSlots.includes(slotId)
                ? prev.selectedSlots.filter(s => s !== slotId)
                : [...prev.selectedSlots, slotId]
        }));
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    };

    // Obtener ubicación actual
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        locationSet: true
                    }));
                },
                (_error) => {
                    showToast('Ubicación', 'No pudimos obtener tu ubicación. Revisá los permisos del navegador e intentá de nuevo.', 'warning');
                }
            );
        } else {
            showToast('Ubicación', 'Este navegador no permite compartir tu ubicación.', 'warning');
        }
    };

    const handleSubmit = () => {
        if (formData.verificationType === 'presencial') {
            if (formData.selectedSlots.length === 0) {
                showToast('Falta información', 'Seleccioná al menos un horario disponible.', 'warning');
                return;
            }
            if (!formData.paymentMethod) {
                showToast('Falta información', 'Elegí una forma de pago.', 'warning');
                return;
            }
            if (!formData.acceptedCost) {
                showToast('Falta información', 'Aceptá el costo del servicio de verificación.', 'warning');
                return;
            }
        }

        // VERIFICAR GEOLOCALIZACIÓN OBLIGATORIA
        if (!formData.locationSet || formData.latitude === null || formData.longitude === null) {
            showToast('Ubicación', 'Necesitamos la ubicación exacta de la propiedad para seguir.', 'warning');
            setStep(5); // Volver al paso de geolocalización
            return;
        }

        showToast('Propiedad', 'Ya recibimos tu propiedad. La vamos a publicar cuando termine la validación.', 'success');
        onComplete();
    };

    const PresencialModal = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPresencialModal(false)}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] p-6 space-y-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Validación presencial</h3>
                    <button onClick={() => setShowPresencialModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <Icons.X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Costo del servicio</span>
                        <span className="text-2xl font-bold text-brand">{formatCurrency(VERIFICATION_COST)}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                        Incluye la visita, fotos y video del lugar, y el cierre de la validación.
                    </p>
                </div>

                <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white">Forma de pago para la visita</h4>
                    <div className="space-y-2">
                        {[
                            { id: 'efectivo', label: 'Efectivo', icon: '💵', desc: 'Pago en efectivo al momento de la visita' },
                            { id: 'transferencia', label: 'Transferencia', icon: '🏦', desc: 'Transferencia bancaria antes de la visita' },
                            { id: 'mercadopago', label: 'Mercado Pago', icon: '📱', desc: 'Pago digital mediante QR o link' }
                        ].map(method => (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMethod: method.id as PaymentMethod })}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${formData.paymentMethod === method.id
                                    ? 'border-brand bg-brand/5'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-brand/50'
                                    }`}
                            >
                                <span className="text-2xl">{method.icon}</span>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-900 dark:text-white">{method.label}</p>
                                    <p className="text-xs text-slate-500">{method.desc}</p>
                                </div>
                                {formData.paymentMethod === method.id && <Icons.Check className="w-5 h-5 text-brand" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 dark:text-white">Elegí horarios disponibles</h4>
                        <span className="text-xs text-slate-500">{formData.selectedSlots.length} elegidos</span>
                    </div>
                    <p className="text-xs text-slate-500">Elegí los horarios en los que podrías recibir la visita.</p>

                    <div className="grid grid-cols-4 gap-2 text-center">
                        {availableSlots.slice(0, 28).map((slot, index) => {
                            const slotId = `${slot.day}-${slot.date}-${slot.time}`;
                            const isSelected = formData.selectedSlots.includes(slotId);
                            const isAvailable = slot.available;

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={!isAvailable}
                                    onClick={() => handleSlotToggle(slotId)}
                                    className={`p-2 rounded-xl text-xs font-medium transition-all ${!isAvailable
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed line-through'
                                        : isSelected
                                            ? 'bg-brand text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand/20'
                                        }`}
                                >
                                    <div className="font-bold">{slot.day}</div>
                                    <div>{slot.date}</div>
                                    <div className="text-[10px] opacity-70">{slot.time}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.acceptedCost}
                        onChange={(e) => setFormData({ ...formData, acceptedCost: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        Acepto pagar <strong>{formatCurrency(VERIFICATION_COST)}</strong> al validador en el momento de la visita presencial.
                    </span>
                </label>

                <button
                    type="button"
                    onClick={() => setShowPresencialModal(false)}
                    disabled={formData.selectedSlots.length === 0 || !formData.paymentMethod || !formData.acceptedCost}
                    className={`w-full py-4 rounded-2xl font-bold transition-all ${formData.selectedSlots.length > 0 && formData.paymentMethod && formData.acceptedCost
                        ? 'bg-brand text-white hover:bg-brand/90'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    Confirmar horarios
                </button>
            </motion.div>
        </motion.div>
    );

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[32px] shadow-xl p-8 space-y-8">

            {/* Progress Bar - 5 PASOS */}
            <div className="flex justify-between items-center mb-8">
                {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-brand text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {step > s ? <Icons.Check className="w-5 h-5" /> : s}
                        </div>
                        {s < 5 && <div className={`w-8 h-1 rounded ${step > s ? 'bg-brand' : 'bg-slate-200'}`} />}
                    </div>
                ))}
            </div>

            {/* Labels de pasos */}
            <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-4 px-1">
                <span>Datos</span>
                <span>Servicios</span>
                <span>Fotos</span>
                <span>Verificación</span>
                <span className={step === 5 ? 'text-brand font-bold' : ''}>Ubicación</span>
            </div>

            <form className="space-y-6">

                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Datos de la propiedad</h2>

                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500">Título del Anuncio</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-brand mt-1 outline-none"
                                placeholder="Ej: Depto 2 ambientes frente al mar"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Dirección exacta</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl mt-1 outline-none focus:ring-2 focus:ring-brand"
                                    placeholder="Calle Nº Piso Depto"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Ciudad</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl mt-1 outline-none focus:ring-2 focus:ring-brand"
                                    placeholder="San Clemente"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Huéspedes máx.</label>
                                <input
                                    type="number"
                                    value={formData.guests}
                                    onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                                    className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl mt-1 outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Precio por noche (ARS)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl mt-1 outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Comodidades</h2>
                        <p className="text-sm text-slate-500">Marcá qué ofrece tu propiedad.</p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {amenitiesList.map((amenity) => (
                                <button
                                    type="button"
                                    key={amenity}
                                    onClick={() => handleAmenityToggle(amenity)}
                                    className={`p-4 rounded-2xl border text-left font-semibold transition-all flex items-center gap-3 outline-none ${formData.amenities.includes(amenity)
                                        ? 'border-brand bg-brand/10 text-brand'
                                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                        }`}
                                >
                                    {formData.amenities.includes(amenity) && <Icons.Check className="w-5 h-5 flex-shrink-0" />}
                                    {amenity}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fotos y video</h2>

                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-brand transition-colors cursor-pointer bg-slate-50 dark:bg-slate-950">
                            <Icons.ImagePlus className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="font-bold text-slate-600 dark:text-slate-400">Arrastrá fotos acá o hacé clic</p>
                            <p className="text-xs text-slate-400">Mínimo 3 fotos. Aceptamos JPG, WebP.</p>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-brand transition-colors cursor-pointer bg-slate-50 dark:bg-slate-950">
                            <Icons.Video className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="font-medium text-slate-600 dark:text-slate-400">Subí un video de la propiedad</p>
                            <p className="text-xs text-slate-400">El video ayuda a mostrar cómo está el lugar</p>
                        </div>

                        <div className="bg-brand/5 dark:bg-brand/10 p-4 rounded-xl border border-brand/10 dark:border-brand/20 text-sm text-slate-700 dark:text-slate-200 flex gap-3">
                            <Icons.ShieldCheck className="w-5 h-5 flex-shrink-0 text-brand" />
                            <p><strong>Tip de confianza:</strong> Un video corto mostrando la propiedad reduce dudas y mejora la calidad de las consultas.</p>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cómo querés verificar tu propiedad</h2>
                        <p className="text-slate-500">Elegí la opción que mejor se ajuste a tu publicación.</p>

                        <div className="space-y-3">
                            <div
                                onClick={() => setFormData({ ...formData, verificationType: 'digital' })}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.verificationType === 'digital' ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-800'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.verificationType === 'digital' ? 'border-brand bg-brand' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {formData.verificationType === 'digital' && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className="font-bold text-lg text-slate-900 dark:text-white">Validación digital</span>
                                    </div>
                                    <span className="text-sm font-bold text-brand dark:text-brand-light">GRATIS</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-2 ml-7">
                                    Validamos tu DNI y un comprobante de domicilio. Demora estimada: 24 a 48 h.
                                </p>
                            </div>

                            <div
                                onClick={() => { setFormData({ ...formData, verificationType: 'presencial' }); setShowPresencialModal(true); }}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.verificationType === 'presencial' ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-800'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.verificationType === 'presencial' ? 'border-brand bg-brand' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {formData.verificationType === 'presencial' && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className="font-bold text-lg text-slate-900 dark:text-white">Validación presencial</span>
                                    </div>
                                    <span className="text-sm font-bold text-brand">{formatCurrency(VERIFICATION_COST)}</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-2 ml-7">
                                    Una persona visita tu propiedad. Es la señal más fuerte de confianza. <strong>Requerida para el nivel avanzado.</strong>
                                </p>

                                {formData.verificationType === 'presencial' && formData.selectedSlots.length > 0 && (
                                    <div className="mt-3 ml-7 p-3 bg-brand/5 dark:bg-brand/10 rounded-xl border border-brand/10 dark:border-brand/20">
                                        <div className="flex items-center gap-2 text-brand dark:text-brand-light text-sm">
                                            <Icons.CheckCircle2 className="w-4 h-4" />
                                            <span className="font-bold">{formData.selectedSlots.length} horarios elegidos</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                            Pago: {formData.paymentMethod === 'efectivo' ? 'Efectivo' : formData.paymentMethod === 'transferencia' ? 'Transferencia' : 'Mercado Pago'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PASO 5: GEOLOCALIZACIÓN OBLIGATORIA */}
                {step === 5 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ubicación de la propiedad</h2>
                            <span className="text-xs bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light px-2 py-1 rounded-full font-bold">OBLIGATORIO</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                <strong>Importante:</strong> La ubicación es obligatoria para publicar tu propiedad. Nos ayuda a confirmar que el lugar existe y a sumar confianza.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                className="w-full py-4 bg-brand text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand/90 transition-all"
                            >
                                <Icons.MapPin className="w-5 h-5" />
                                Usar mi ubicación actual
                            </button>

                            {formData.locationSet && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-2">
                                        <Icons.CheckCircle2 className="w-5 h-5" />
                                        <span className="font-bold">Ubicación cargada</span>
                                    </div>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                        Latitud: {formData.latitude?.toFixed(6)}<br />
                                        Longitud: {formData.longitude?.toFixed(6)}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Latitud</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={formData.latitude ?? ''}
                                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value), locationSet: true })}
                                        className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl mt-1 outline-none focus:ring-2 focus:ring-brand"
                                        placeholder="-36.357982"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Longitud</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={formData.longitude ?? ''}
                                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value), locationSet: true })}
                                        className="w-full p-3 border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl mt-1 outline-none focus:ring-2 focus:ring-brand"
                                        placeholder="-56.683224"
                                    />
                                </div>
                            </div>

                            {/* Mapa placeholder */}
                            <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                                <div className="text-center text-slate-400">
                                    <Icons.MapPin className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">Vista previa del mapa</p>
                                    <p className="text-xs">Coordenadas: {formData.latitude?.toFixed(4) || '---'}, {formData.longitude?.toFixed(4) || '---'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Disclaimer Legal Final */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input type="checkbox" checked={legalAccepted} onChange={(e) => setLegalAccepted(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand" />
                                <span>
                                    Declaro que soy titular o administrador del inmueble y que tengo facultades legales para alquilarlo. Entiendo que la información será validada y que, si es falsa, mi cuenta puede darse de baja.
                                </span>
                            </label>
                        </div>
                    </motion.div>
                )}

                {/* Navegación */}
                <div className="flex gap-4 pt-4">
                    {step > 1 && (
                        <button type="button" onClick={() => setStep(step - 1)} className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors outline-none">
                            Volver
                        </button>
                    )}

                    {step < 5 && (
                        <button
                            type="button"
                            onClick={() => setStep(step + 1)}
                            className="flex-1 py-3 bg-brand text-white rounded-xl font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all outline-none"
                        >
                            Siguiente
                        </button>
                    )}

                    {step === 5 && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!legalAccepted || !formData.locationSet}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all outline-none ${legalAccepted && formData.locationSet
                                ? 'bg-brand text-white shadow-lg shadow-brand/20 hover:scale-[1.02] hover:bg-brand-dark'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            Publicar propiedad
                        </button>
                    )}
                </div>
            </form>

            <AnimatePresence>
                {showPresencialModal && <PresencialModal />}
            </AnimatePresence>
        </div>
    );
};
