import * as React from 'react';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '../services/geminiService';



interface PropertyMapProps {
    properties: Property[];
    onPropertyClick: (id: string) => void;
}

// Map bounds updater component
const MapUpdater: React.FC<{ properties: Property[] }> = ({ properties }) => {
    const map = useMap();
    useEffect(() => {
        if (properties.length > 0) {
            const bounds = L.latLngBounds(properties.map(p => [p.coordinates.lat, p.coordinates.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [properties, map]);
    return null;
};

export const PropertyMap: React.FC<PropertyMapProps> = ({ properties, onPropertyClick }) => {
    // Custom Marker Icon
    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); transform: rotate(-45deg);"><div style="transform: rotate(45deg); display: flex;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Use a default center if no properties, otherwise first property
    const defaultCenter: [number, number] = properties.length > 0
        ? [properties[0].coordinates.lat, properties[0].coordinates.lng]
        : [-36.3536, -56.7196]; // Default to San Clemente approx

    // Add click handler for the button inside the popup
    // We need to stop propagation to prevent Map from interfering
    const handleDetailClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onPropertyClick(id);
    };

    return (
        <div className="w-full h-[300px] md:h-[500px] rounded-[32px] overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 relative z-0">
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
                <MapUpdater properties={properties} />
                {properties.map(property => (
                    <Marker
                        key={property.id}
                        position={[property.coordinates.lat, property.coordinates.lng]}
                        icon={customIcon}
                    >
                        <Popup className="property-popup">
                            <div className="flex flex-col gap-3 min-w-[200px] md:min-w-[220px]">
                                <div className="relative h-32 w-full rounded-xl overflow-hidden shadow-sm">
                                    <img
                                        src={property.imageUrl}
                                        alt={property.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {property.traceabilityLevel === 'high' && (
                                        <div className="absolute top-2 right-2 bg-brand/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-brand/20 shadow-sm text-[10px] font-bold text-white uppercase flex items-center gap-1">
                                            Verificada
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900 leading-tight m-0 text-base">{property.title}</h3>
                                    <p className="text-sm font-black text-brand m-0">
                                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(property.price)}
                                        <span className="text-slate-400 text-xs font-normal ml-1">/ noche</span>
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDetailClick(e, property.id)}
                                    className="mt-1 w-full bg-brand text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                                >
                                    Ver más
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
        .leaflet-container { z-index: 10 !important; font-family: inherit; }
        .property-popup .leaflet-popup-content-wrapper { border-radius: 20px; padding: 0; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3); }
        .property-popup .leaflet-popup-content { margin: 16px; width: auto !important; }
        .property-popup .leaflet-popup-tip { box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3); }
        .leaflet-popup-close-button { top: 12px !important; right: 12px !important; background: white !important; border-radius: 50%; width: 24px !important; height: 24px !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10;}
        .leaflet-popup-close-button span { margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #333 !important; }
      `}</style>
        </div>
    );
};
