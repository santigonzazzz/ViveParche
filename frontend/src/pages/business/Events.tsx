import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { Search, Plus, Calendar, Users, DollarSign, ChevronRight, QrCode, Tag, Lock } from 'lucide-react';
import { CreateEventModal } from '../../components/business/CreateEventModal';
import { RestrictedFeature } from '../../components/business/RestrictedFeature';
import { businessApi } from '../../services/businessApi';

export const Events: React.FC = () => {
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;
    const { events, loading, error, refreshEvents } = useEvents(venueId);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [venueTier, setVenueTier] = useState<string>('FREE');
    const [user] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

    const isFreeLimitReached = venueTier === 'FREE' && events.length >= 1;
    const isArranqueLimitReached = venueTier === 'ARRANQUE' && events.length >= 3;
    const isLimitReached = isFreeLimitReached || isArranqueLimitReached;

    const handleCreateClick = () => {
        if (isLimitReached) {
            navigate('/business/subscription?showUpgrade=true');
        } else {
            setIsCreateModalOpen(true);
        }
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);

        const fetchVenue = async () => {
            try {
                const data = await businessApi.getVenueProfile(venueId);
                setVenueTier(data.subscription_tier || 'FREE');
            } catch (err) {
                console.error("Venue profile error:", err);
            }
        };
        fetchVenue();

        return () => window.removeEventListener('resize', handleResize);
    }, [venueId]);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Cargando parches...</div>;
    if (error) return <div style={{ color: '#ef4444', padding: '2rem' }}>{error}</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: '2.5rem',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Parches</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.1rem' }}>Planea, rastrea y organiza todos tus parches.</p>
                </div>
                <button
                    onClick={handleCreateClick}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: isLimitReached ? 'rgba(255,255,255,0.05)' : 'var(--color-neon-purple)',
                        color: isLimitReached ? 'rgba(255,255,255,0.4)' : 'white',
                        border: isLimitReached ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        padding: '0.85rem 1.5rem',
                        borderRadius: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        width: isMobile ? '100%' : 'auto',
                        boxShadow: isLimitReached ? 'none' : '0 8px 16px rgba(111, 66, 193, 0.2)'
                    }}
                >
                    {isLimitReached ? <><Lock size={16} /> Límite {venueTier === 'ARRANQUE' ? 'Arranque' : 'Free'} Alcanzado</> : <><Plus size={18} /> Crear Parche</>}
                </button>
            </div>

            {/* Filters & Search */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '0.75rem' : '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        placeholder="Buscar por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '14px',
                            padding: '0.85rem 1rem 0.85rem 2.8rem',
                            color: 'white',
                            outline: 'none',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '4px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}>
                    {(['all', 'upcoming', 'completed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: statusFilter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                                color: statusFilter === f ? 'white' : 'rgba(255,255,255,0.4)',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                flex: isMobile ? 1 : 'none',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            {f === 'all' ? 'Todos' : f === 'upcoming' ? 'Próximos' : 'Completados'}
                        </button>
                    ))}
                </div>
            </div>

            
            {/* Events List */}
            {events.length === 0 && !searchQuery && statusFilter === 'all' ? (
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    padding: isMobile ? '2rem 1.5rem' : '4rem 2rem',
                    textAlign: 'center',
                    maxWidth: '800px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'rgba(111, 66, 193, 0.1)',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(111, 66, 193, 0.3)',
                        marginBottom: '1rem'
                    }}>
                        <Calendar size={40} color="var(--color-neon-purple)" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>
                            ¡Bienvenido a tu Dashboard! 🚀
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
                            Tu cuenta está lista. Sigue estos 3 pasos para empezar a promocionar tu negocio y atraer más clientes.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        gap: '1.5rem',
                        width: '100%',
                        marginTop: '1.5rem'
                    }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}>1</div>
                            <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Completa tu perfil</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '1rem' }}>Agrega tu logo, redes sociales y detalles.</p>
                            <button onClick={() => navigate('/business/settings')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>Ir a Ajustes</button>
                        </div>
                        <div style={{ background: 'rgba(111, 66, 193, 0.08)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(111, 66, 193, 0.2)' }}>
                            <div style={{ background: 'var(--color-neon-purple)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}>2</div>
                            <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Crea tu primer parche</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '1rem' }}>Publica tu primer evento o promoción.</p>
                            <button onClick={handleCreateClick} style={{ background: isLimitReached ? 'rgba(255,255,255,0.05)' : 'var(--color-neon-purple)', border: isLimitReached ? '1px solid rgba(255,255,255,0.1)' : 'none', color: isLimitReached ? 'rgba(255,255,255,0.4)' : 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', width: '100%', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                {isLimitReached ? <><Lock size={14} /> Mejorar Plan</> : 'Crear Parche'}
                            </button>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}>3</div>
                            <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Comparte tu página</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '1rem' }}>Muestra tu vitrina a todos tus clientes.</p>
                            <button onClick={() => navigate(venueId ? `/p/${venueId}` : '/')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>Ver Perfil Público</button>
                        </div>
                    </div>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Search size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>No se encontraron parches</h3>
                    <p>No hay eventos que coincidan con tu búsqueda o filtro actual.</p>
                </div>
            ) : (

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '2rem'
            }}>
                {filteredEvents.map(event => (
                    <div key={event.id}
                        onClick={() => navigate(`/business/events/${event.id}`)}
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            transition: 'transform 0.2s, border-color 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'rgba(111, 66, 193, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ height: '180px', position: 'relative' }}>
                            <img src={event.image || '/assets/placeholder_event.jpg'} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: event.status === 'upcoming' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255,255,255,0.2)',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                backdropFilter: 'blur(4px)'
                            }}>
                                {event.status}
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>{event.title}</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={16} color="rgba(255,255,255,0.3)" />
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{event.date}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={16} color="rgba(255,255,255,0.3)" />
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{(event.attendees || 0).toLocaleString()} Parceros</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <DollarSign size={16} color="rgba(255,255,255,0.3)" />
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>${(event.revenue || 0).toLocaleString()} Ganancia</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Tag size={16} color="var(--color-neon-purple)" />
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{event.perks_count || 0} Gangazos</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <RestrictedFeature
                                    tier={venueTier}
                                    requiredTier="PRO"
                                    userRole={user.role}
                                    fallback={
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/business/subscription?showUpgrade=true');
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.8rem',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'rgba(255,255,255,0.4)',
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                cursor: 'pointer'
                                            }}>
                                            <Lock size={14} /> Mejora el Plan
                                        </button>
                                    }
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const path = `/business/events/${event.id}`;
                                            navigate(venueId ? `${path}?venue_id=${venueId}` : path);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '0.8rem',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white',
                                            fontWeight: '700',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            cursor: 'pointer'
                                        }}>
                                        Gestionar <ChevronRight size={16} />
                                    </button>
                                </RestrictedFeature>

                                <RestrictedFeature
                                    tier={venueTier}
                                    requiredTier="PRO"
                                    userRole={user.role}
                                    fallback={
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/business/subscription');
                                            }}
                                            style={{
                                                padding: '0.8rem 1.2rem',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'rgba(255,255,255,0.4)',
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                cursor: 'pointer'
                                            }}>
                                            <Lock size={14} /> Check-in
                                        </button>
                                    }
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Redirect to the loyalty/scanner page instead of missing check-in route
                                            navigate('/business/loyalty');
                                        }}
                                        style={{
                                            padding: '0.8rem 1.2rem',
                                            borderRadius: '12px',
                                            background: 'var(--color-neon-purple)',
                                            border: 'none',
                                            color: 'white',
                                            fontWeight: '800',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(111, 66, 193, 0.2)'
                                        }}>
                                        <QrCode size={18} /> Check-in
                                    </button>
                                </RestrictedFeature>
                            </div>
                        </div>
                    </div>
                ))}
            </div>


            )}
            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={refreshEvents}
                venueId={venueId}
            />
        </div>
    );
};
