import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../services/geminiService';
import { getPropertyVerificationDetails } from '../lib/propertyVerification';
import { formatCurrency } from '../lib/utils';
import { Icons } from './Icons';
import { VerificationBadgePremium } from './ui/VerificationBadgePremium';



interface PropertyMapProps {
    properties: Property[];
    onPropertyClick: (id: string) => void;
}

const normalizePropertyText = (value?: string) => (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getPropertyTypeLabel = (property: Property) => {
    const explicitType = normalizePropertyText(property.propertyType);

    if (explicitType.includes('house') || explicitType.includes('casa')) return 'Casa';
    if (explicitType.includes('apartment') || explicitType.includes('depto') || explicitType.includes('depart')) return 'Departamento';
    if (explicitType.includes('room') || explicitType.includes('habitacion') || explicitType.includes('habitación')) return 'Habitación';
    if (explicitType.includes('cabin') || explicitType.includes('caba')) return 'Cabaña';

    const title = normalizePropertyText(property.title);

    if (title.includes('casa')) return 'Casa';
    if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'Casa';
    if (title.includes('monoambiente')) return 'Departamento';
    if (title.includes('depto') || title.includes('depart')) return 'Departamento';
    if (title.includes('habitacion') || title.includes('habitación') || title.includes('cuarto')) return 'Habitación';
    if (title.includes('caba')) return 'Cabaña';

    return 'Alojamiento';
};

const getGuestCapacityLabel = (maxGuests?: number | null) => {
    if (!maxGuests || maxGuests < 1) {
        return null;
    }

    return `Hasta ${maxGuests} ${maxGuests === 1 ? 'huésped' : 'huéspedes'}`;
};

const hasValidCoordinates = (property: Property) => (
    Number.isFinite(property.coordinates?.lat) && Number.isFinite(property.coordinates?.lng)
);

const buildMarkerIcon = (isHighlighted: boolean, isPresencialVerified: boolean) => L.divIcon({
    className: 'map-pin-icon',
    html: `
            <div class="map-pin${isHighlighted ? ' is-active' : ''}${isPresencialVerified ? ' is-onsite' : ''}">
        <span class="map-pin__icon" aria-hidden="true">
                    ${isPresencialVerified
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'}
        </span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -20],
});

// Map bounds updater component
const MapUpdater: React.FC<{ properties: Property[] }> = ({ properties }) => {
    const map = useMap();
    useEffect(() => {
        if (properties.length === 0) {
            return;
        }

        if (properties.length === 1) {
            map.setView([properties[0].coordinates.lat, properties[0].coordinates.lng], 13, { animate: false });
            return;
        }

        const bounds = L.latLngBounds(properties.map((property) => [property.coordinates.lat, property.coordinates.lng]));
        map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 13,
            animate: false,
        });
    }, [properties, map]);
    return null;
};

export const PropertyMap: React.FC<PropertyMapProps> = ({ properties, onPropertyClick }) => {
    const mappableProperties = properties.filter(hasValidCoordinates);
    const markerRefs = useRef<Record<string, L.Marker | null>>({});
    const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

    // Use a default center if no properties, otherwise first property
    const defaultCenter: [number, number] = mappableProperties.length > 0
        ? [mappableProperties[0].coordinates.lat, mappableProperties[0].coordinates.lng]
        : [-36.3536, -56.7196]; // Default to San Clemente approx

    useEffect(() => {
        if (!activePropertyId) {
            return;
        }

        markerRefs.current[activePropertyId]?.openPopup();
    }, [activePropertyId]);

    useEffect(() => {
        if (!activePropertyId) {
            return;
        }

        if (!mappableProperties.some((property) => property.id === activePropertyId)) {
            setActivePropertyId(null);
        }
    }, [activePropertyId, mappableProperties]);

    // Add click handler for the button inside the popup
    // We need to stop propagation to prevent Map from interfering
    const handleDetailClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onPropertyClick(id);
    };

    return (
        <div className="relative z-0 h-full w-full overflow-hidden">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%', zIndex: 10 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapUpdater properties={mappableProperties} />
                {mappableProperties.map((property) => {
                    const verification = getPropertyVerificationDetails(property);
                    const isHighlighted = activePropertyId === property.id || hoveredPropertyId === property.id;
                    const isPresencialVerified = verification.isFullyVerified;
                    const propertyTypeLabel = getPropertyTypeLabel(property);
                    const guestCapacityLabel = getGuestCapacityLabel(Number(property.maxGuests) || null);

                    return (
                    <Marker
                        key={property.id}
                        position={[property.coordinates.lat, property.coordinates.lng]}
                        ref={(instance) => {
                            markerRefs.current[property.id] = instance;
                        }}
                        icon={buildMarkerIcon(isHighlighted, isPresencialVerified)}
                        zIndexOffset={isHighlighted ? 240 : 0}
                        eventHandlers={{
                            click: () => setActivePropertyId(property.id),
                            mouseover: () => setHoveredPropertyId(property.id),
                            mouseout: () => setHoveredPropertyId((current) => current === property.id ? null : current),
                            popupopen: () => setActivePropertyId(property.id),
                            popupclose: () => setActivePropertyId((current) => current === property.id ? null : current),
                        }}
                    >
                        <Popup
                            className="property-popup"
                            closeButton={false}
                            offset={[0, -6]}
                            autoPan
                            keepInView
                            autoPanPadding={[28, 28]}
                        >
                            <div className="w-[17rem] p-3">
                                <div className="flex flex-col gap-3">
                                <div className="relative h-20 w-full overflow-hidden rounded-[1rem] bg-slate-100">
                                    <img
                                        src={property.imageUrl || property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80&auto=format&fit=crop'}
                                        alt={property.title}
                                        className="h-full w-full object-cover"
                                    />

                                    {isPresencialVerified ? (
                                        <VerificationBadgePremium className="absolute left-4 top-4 z-20" />
                                    ) : null}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="m-0 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                            {propertyTypeLabel}
                                        </p>
                                        <h3 className="mt-1 m-0 overflow-hidden text-[0.96rem] font-semibold leading-5 text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                            {property.title}
                                        </h3>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="m-0 text-[1rem] font-semibold leading-none tracking-tight text-slate-900">
                                            {formatCurrency(Number(property.price) || 0)}
                                            <span className="ml-1 text-[0.72rem] font-medium tracking-normal text-slate-500">/ noche</span>
                                        </p>

                                        {!isPresencialVerified ? (
                                            <p className="m-0 text-[0.74rem] leading-5 text-slate-500">
                                                {verification.countLabel}
                                            </p>
                                        ) : null}

                                        {!isPresencialVerified ? (
                                            <div className="space-y-2">
                                                <p className="m-0 text-[0.74rem] leading-5 text-slate-500">
                                                    {verification.countLabel}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="border-t border-gray-200" />

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-3 text-[0.72rem] font-medium leading-5 text-slate-600">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Icons.MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{property.location}</span>
                                                </span>
                                                {guestCapacityLabel ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Icons.Users className="h-3.5 w-3.5 text-slate-400" />
                                                        <span>{guestCapacityLabel}</span>
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => handleDetailClick(e, property.id)}
                                            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.12)] transition-all duration-200 hover:bg-slate-50 hover:border-slate-300"
                                        >
                                            Ver detalle
                                        </button>
                                    </div>
                                </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                    );
                })}
            </MapContainer>

            <style>{`
        .leaflet-container { z-index: 10 !important; font-family: inherit; background: #f8fafc; }
        .map-pin-icon { background: transparent; border: 0; }
        .map-pin {
          display: flex;
          height: 36px;
          width: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 14px 14px 14px 5px;
          border: 2px solid rgba(255, 255, 255, 0.96);
          background: linear-gradient(180deg, #4338ca 0%, #3730a3 100%);
          box-shadow: 0 16px 28px -18px rgba(67, 56, 202, 0.54);
          color: white;
          transform: rotate(-45deg);
          transform-origin: center;
          transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .map-pin:hover,
        .map-pin.is-active {
          transform: rotate(-45deg) translateY(-2px) scale(1.04);
          box-shadow: 0 22px 34px -20px rgba(67, 56, 202, 0.62);
          background: linear-gradient(180deg, #4f46e5 0%, #3730a3 100%);
        }
                .map-pin.is-onsite {
                    background: linear-gradient(180deg, #10b981 0%, #047857 100%);
                    box-shadow: 0 18px 30px -20px rgba(5, 150, 105, 0.58);
                }
                .map-pin.is-onsite:hover,
                .map-pin.is-onsite.is-active {
                    background: linear-gradient(180deg, #34d399 0%, #047857 100%);
                    box-shadow: 0 24px 34px -20px rgba(5, 150, 105, 0.62);
                }
        .map-pin__icon {
          display: flex;
          transform: rotate(45deg);
        }
        .property-popup.leaflet-popup {
          margin-bottom: 12px;
        }
        .property-popup .leaflet-popup-content-wrapper {
          border-radius: 22px;
          padding: 0;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 24px 52px -32px rgba(15, 23, 42, 0.34);
        }
        .property-popup .leaflet-popup-content {
          margin: 0;
                    width: 272px !important;
        }
        .property-popup .leaflet-popup-tip-container {
          margin-top: -2px;
        }
        .property-popup .leaflet-popup-tip {
          width: 16px;
          height: 16px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 18px 32px -26px rgba(15, 23, 42, 0.34);
        }
        .property-popup .leaflet-popup-close-button {
          display: none;
        }
      `}</style>
        </div>
    );
};
