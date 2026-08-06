import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PerkCard from '../perks/PerkCard';
import { businessApi } from '../../services/businessApi';

export const FeaturedPerks: React.FC = () => {
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;
    const navigate = useNavigate();
    const [perks, setPerks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPerks = async () => {
            try {
                const data = await businessApi.getActivePerks(venueId);
                setPerks(data);
            } catch (err) {
                console.error("Failed to fetch featured perks:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPerks();
    }, []);

    if (loading) {
        return (
            <div style={{ marginTop: '3rem', padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                Cargando gangazos...
            </div>
        );
    }

    return (
        <div style={{ marginTop: '3rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '0 0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        padding: '8px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        borderRadius: '12px'
                    }}>
                        <Sparkles size={18} color="#a78bfa" />
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'white' }}>Gangazos y Hype Activos</h3>
                </div>
                <button
                    onClick={() => navigate(`/business/events${venueId ? `?venue_id=${venueId}` : ''}`)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                    }}
                    onMouseOver={e => e.currentTarget.style.color = 'white'}
                    onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                    Gestionar <ArrowRight size={14} />
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem'
            }}>
                {perks.map(perk => (
                    <PerkCard key={perk.id} perk={perk} readOnly />
                ))}

                {/* Create Shortcut Card */}
                <div
                    onClick={() => navigate(`/business/events${venueId ? `?venue_id=${venueId}` : ''}`)}
                    style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '2px dashed rgba(255, 255, 255, 0.05)',
                        borderRadius: '28px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        minHeight: '220px'
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                >
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.2)'
                    }}>
                        <Plus size={24} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', color: 'white', fontWeight: '800', fontSize: '1rem' }}>Crear Gangazo</span>
                        <span style={{ display: 'block', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: '600', marginTop: '4px' }}>Añade beneficios a tus parches.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
