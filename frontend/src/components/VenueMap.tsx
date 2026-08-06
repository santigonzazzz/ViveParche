import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet en Vite/React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icono personalizado para el usuario
const userIcon = L.divIcon({
    html: `<div style="
        width: 20px;
        height: 20px;
        background: var(--color-neon-purple, #9333ea);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(147,51,234,0.8);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: ''
});

// Icono personalizado para venues
const venueIcon = L.divIcon({
    html: `<div style="
        width: 16px;
        height: 16px;
        background: var(--color-neon-teal, #00f3ff);
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(0,243,255,0.8);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: ''
});

// Componente para centrar el mapa en la ubicación del usuario
const MapCenterController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 14);
    }, [center, map]);
    return null;
};

interface VenueMapProps {
    venues: Array<{
        id: string;
        name: string;
        latitude?: number;
        longitude?: number;
        address?: string;
        slug?: string;
    }>;
    userLocation?: { lat: number; lng: number } | null;
    onVenueClick?: (slug: string) => void;
}

const VenueMap = ({ venues, userLocation, onVenueClick }: VenueMapProps) => {
    // Centro por defecto: Colombia
    const defaultCenter: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [4.7110, -74.0721];

    // Filtrar solo venues con coordenadas válidas
    const venuesWithCoords = venues.filter(
        v => v.latitude != null && v.longitude != null
    );

    return (
        <div style={{
            width: '100%',
            height: '500px',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative'
        }}>
            {venuesWithCoords.length === 0 && !userLocation ? (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.4)',
                    gap: '1rem'
                }}>
                    <span style={{ fontSize: '2rem' }}>🗺️</span>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Activa tu ubicación para ver los locales en el mapa
                    </p>
                </div>
            ) : (
                <MapContainer
                    center={defaultCenter}
                    zoom={14}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Centrar mapa si cambia la ubicación del usuario */}
                    {userLocation && (
                        <MapCenterController 
                            center={[userLocation.lat, userLocation.lng]} 
                        />
                    )}

                    {/* Marcador del usuario */}
                    {userLocation && (
                        <Marker
                            position={[userLocation.lat, userLocation.lng]}
                            icon={userIcon}
                        >
                            <Popup>
                                <div style={{ 
                                    textAlign: 'center',
                                    padding: '0.25rem'
                                }}>
                                    <strong>📍 Tú estás aquí</strong>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Marcadores de venues */}
                    {venuesWithCoords.map(venue => (
                        <Marker
                            key={venue.id}
                            position={[venue.latitude!, venue.longitude!]}
                            icon={venueIcon}
                            eventHandlers={{
                                click: () => {
                                    if (venue.slug && onVenueClick) {
                                        onVenueClick(venue.slug);
                                    }
                                }
                            }}
                        >
                            <Popup>
                                <div style={{ 
                                    minWidth: '150px',
                                    textAlign: 'center',
                                    padding: '0.25rem'
                                }}>
                                    <strong style={{ 
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.9rem'
                                    }}>
                                        {venue.name}
                                    </strong>
                                    {venue.address && (
                                        <span style={{ 
                                            fontSize: '0.75rem',
                                            color: '#666',
                                            display: 'block',
                                            marginBottom: '0.5rem'
                                        }}>
                                            📍 {venue.address}
                                        </span>
                                    )}
                                    {venue.slug && onVenueClick && (
                                        <button
                                            onClick={() => onVenueClick(venue.slug!)}
                                            style={{
                                                background: '#9333ea',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '4px 12px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                fontWeight: '700'
                                            }}
                                        >
                                            Ver local
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            )}
        </div>
    );
};

export default VenueMap;
