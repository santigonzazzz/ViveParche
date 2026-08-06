import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusinessDashboard } from '../../hooks/useBusinessDashboard';
import { DashboardSummary } from '../../components/business/DashboardSummary';
import { SalesChart } from '../../components/business/SalesChart';
import { ProfileCompletionWidget } from '../../components/business/ProfileCompletionWidget';
import { FeaturedPerks } from '../../components/business/FeaturedPerks';
import { Loader2 } from 'lucide-react';
import { businessApi } from '../../services/businessApi';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwner = user.role === 'owner';
    const {
        summary,
        salesData,
        loading,
        summaryLoading,
        chartLoading,
        error,
        refreshSales
    } = useBusinessDashboard(venueId);

    const [venueProfile, setVenueProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        const fetchVenueProfile = async () => {
            try {
                const data = await businessApi.getVenueProfile(venueId);
                setVenueProfile(data);
            } catch (err) {
                console.error('Failed to fetch venue profile:', err);
            } finally {
                setProfileLoading(false);
            }
        };
        fetchVenueProfile();
    }, [venueId]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (error && !summary) {
        return <div style={{ color: '#ef4444', padding: '2rem' }}>Error cargando los datos del dashboard.</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            {/* Global Loading Overlay for initial fetch */}
            {loading && !summary && !salesData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(5, 5, 5, 0.9)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    color: 'white',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <Loader2 className="animate-spin" size={isMobile ? 32 : 48} color="var(--color-neon-purple)" style={{ marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Preparando tu VibeMap...</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: isMobile ? '0.85rem' : '1rem' }}>Este proceso tomará unos segundos...</p>
                </div>
            )}

            <div style={{
                marginBottom: '2.5rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.1rem' }}>Bienvenido de nuevo. Esto es lo que está pasando en tu local.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                    {isOwner && (
                        <button
                            onClick={() => navigate(`/business/onboarding${venueId ? `?venue_id=${venueId}` : ''}`)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '0.75rem 1.25rem',
                                borderRadius: '14px',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flex: isMobile ? 1 : 'none'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            Editar Perfil
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Row */}
            {summaryLoading && !summary ? (
                <div style={{ height: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin" color="rgba(255,255,255,0.1)" />
                </div>
            ) : summary && (
                <>
                    {venueProfile?.subscription_tier === 'FREE' && (
                        <div style={{
                            background: 'rgba(111, 66, 193, 0.1)',
                            border: '1px solid rgba(111, 66, 193, 0.2)',
                            borderRadius: '16px',
                            padding: '1rem 1.5rem',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                        }}>
                            <p style={{ color: 'white', fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>
                                ¿Quieres ver a qué hora llegan tus clientes y fidelizarlos con Parché Monedas?
                            </p>
                            <button
                                onClick={() => navigate('/business/subscription?showUpgrade=true')}
                                style={{
                                    background: 'var(--color-neon-purple)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '10px',
                                    fontWeight: '800',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Actualiza a 'El Parche' por $110k
                            </button>
                        </div>
                    )}
                    <DashboardSummary data={summary} />
                </>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 350px',
                gap: '2rem',
                alignItems: 'start'
            }}>
                <div style={{ position: 'relative' }}>
                    {/* Chart Loading Overlay */}
                    {chartLoading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 10,
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <Loader2 className="animate-spin" color="var(--color-neon-purple)" style={{ margin: '0 auto 10px' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'white', opacity: 0.6 }}>Actualizando datos...</span>
                            </div>
                        </div>
                    )}

                    {/* FREE TIER BLUR OVERLAY */}
                    {venueProfile?.subscription_tier === 'FREE' && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 20,
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(5, 5, 5, 0.4)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Desbloquea Analíticas Avanzadas</h3>
                                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', maxWidth: '300px', margin: '0 auto 1.5rem' }}>
                                    Mira gráficos detallados de comportamiento y ventas de tus clientes.
                                </p>
                                <button
                                    onClick={() => navigate('/business/subscription?showUpgrade=true')}
                                    style={{
                                        background: 'var(--color-neon-purple)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.8rem 2rem',
                                        borderRadius: '14px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 24px rgba(111, 66, 193, 0.4)'
                                    }}
                                >
                                    Obtener Acceso
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ filter: venueProfile?.subscription_tier === 'FREE' ? 'blur(4px)' : 'none', transition: 'filter 0.3s' }}>
                        <SalesChart
                            data={salesData}
                            period={salesData?.period || 'week'}
                            onPeriodChange={refreshSales}
                        />
                    </div>
                </div>

                {/* Profile Completion Widget */}
                {profileLoading ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '24px',
                        padding: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '400px'
                    }}>
                        <Loader2 className="animate-spin" color="rgba(255,255,255,0.1)" />
                    </div>
                ) : venueProfile ? (
                    <ProfileCompletionWidget
                        completion={venueProfile.completion_percentage || 0}
                        venueData={{
                            description: venueProfile.description,
                            opening_hours: venueProfile.opening_hours,
                            image_url: venueProfile.image_url,
                            address: venueProfile.address,
                            whatsapp_number: venueProfile.whatsapp_number,
                            items_count: venueProfile._items_count,
                            special_offers_json: venueProfile.special_offers_json,
                            special_offers_pdf_url: venueProfile.special_offers_pdf_url
                        }}
                    />
                ) : (
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(255, 193, 7, 0.1) 0%, rgba(10, 10, 12, 0.05) 100%)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '24px',
                        padding: '2rem',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '1rem'
                        }}>🏪</div>
                        <h3 style={{
                            fontSize: '1.2rem',
                            fontWeight: '800',
                            color: 'white',
                            marginBottom: '0.75rem'
                        }}>Completa la Configuración de tu Local</h3>
                        <p style={{
                            color: 'rgba(255,255,255,0.6)',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6'
                        }}>
                            Aún no has configurado tu local. ¡Haz clic abajo para completar tu registro y empezar a ser descubierto por los clientes!
                        </p>
                        <button
                            onClick={() => navigate(`onboarding${venueId ? `?venue_id=${venueId}` : ''}`)}
                            style={{
                                background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '12px',
                                color: '#000',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                            }}
                        >
                            Completar Configuración →
                        </button>
                    </div>
                )}
            </div>

            {/* Featured Perks Section */}
            {!loading && summary && (
                <div style={{ position: 'relative' }}>
                    {/* FREE TIER BLUR OVERLAY FOR PERKS */}
                    {venueProfile?.subscription_tier === 'FREE' && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 20,
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(5, 5, 5, 0.4)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            marginTop: '3rem'
                        }}>
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Desbloquea Fidelización Parché</h3>
                                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', maxWidth: '300px', margin: '0 auto 1.5rem' }}>
                                    Crea gangazos, recompensas y retén a tus clientes más fieles.
                                </p>
                                <button
                                    onClick={() => navigate('/business/subscription?showUpgrade=true')}
                                    style={{
                                        background: 'var(--color-neon-purple)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.8rem 2rem',
                                        borderRadius: '14px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 24px rgba(111, 66, 193, 0.4)'
                                    }}
                                >
                                    Mejorar Plan
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ filter: venueProfile?.subscription_tier === 'FREE' ? 'blur(4px)' : 'none', transition: 'filter 0.3s' }}>
                        <FeaturedPerks />
                    </div>
                </div>
            )}

        </div>
    );
};
