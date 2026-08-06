import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PricingSection } from '../../components/business/PricingSection';
import { businessApi } from '../../services/businessApi';
import { BillingFlow } from '../../components/business/BillingFlow';

export const SubscriptionSettings: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [venue, setVenue] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showBillingFlow, setShowBillingFlow] = useState(searchParams.get('showUpgrade') === 'true');
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

    const handleSelectPlan = (planId: string) => {
        if (planId === 'FREE') return;
        setSelectedPlanId(planId);
        setShowBillingFlow(true);
    };

    const handleCloseBillingFlow = () => {
        setShowBillingFlow(false);
        setSelectedPlanId(undefined);
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);

        const fetchVenue = async () => {
            try {
                const data = await businessApi.getVenueProfile(venueId);
                setVenue(data);
            } catch (err) {
                console.error("Error fetching venue:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVenue();

        return () => window.removeEventListener('resize', handleResize);
    }, [venueId]);

    const handleUpgradeSuccess = () => {
        setShowBillingFlow(false);
        setSearchParams({}); // Clear query params
        // Refresh venue data
        setLoading(true);
        businessApi.getVenueProfile(venueId).then(data => {
            setVenue(data);
            setLoading(false);
        });
    };

    if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Cargando información de suscripción...</div>;

    const tier = venue?.subscription_tier || 'FREE';
    const subStatus = venue?.subscription_status || 'inactive';
    const isPending = subStatus === 'pending_approval';
    const isPaid = subStatus === 'active';
    const isRejected = subStatus === 'rejected';

    const PLAN_NAMES_FRIENDLY: Record<string, string> = {
        'FREE': 'Vitrina (Free)',
        'VITRINA': 'Vitrina (Free)',
        'ARRANQUE': 'Arranque',
        'EL PARCHE': 'El Parche',
        'PRO': 'Dueño del Parche',
        'active': 'Activo',
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            {showBillingFlow && (
                <BillingFlow
                    venueId={venue?.id}
                    onClose={handleCloseBillingFlow}
                    onSuccess={handleUpgradeSuccess}
                    initialPlanId={selectedPlanId}
                />
            )}

            {/* Header section with glassmorphism header */}
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: isMobile ? '2.1rem' : '3.5rem', fontWeight: '900', color: 'white', marginBottom: '0.75rem', letterSpacing: '-1px' }}>
                    Plan y <span style={{ color: 'var(--color-neon-purple)' }}>Suscripción</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '500' }}>
                    {isPaid ? 'Estás en el plan premium.' : 'Escala tu negocio con las herramientas avanzadas de Parché.'}
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

                {isPending && (
                    <div style={{
                        padding: '1.5rem', background: 'rgba(111, 66, 193, 0.1)',
                        border: '1px solid var(--color-neon-purple)', borderRadius: '24px',
                        display: 'flex', alignItems: 'center', gap: '1.5rem',
                        boxShadow: '0 0 30px rgba(111, 66, 193, 0.1)'
                    }}>
                        <div style={{ background: 'var(--color-neon-purple)', padding: '10px', borderRadius: '12px' }}>
                            <TrendingUp size={24} color="white" />
                        </div>
                        <div>
                            <h4 style={{ color: 'white', fontWeight: '800', marginBottom: '4px' }}>Pago en Revisión</h4>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Tu comprobante está siendo verificado. Tendrás acceso completo en menos de 24 horas.</p>
                        </div>
                    </div>
                )}

                {isRejected && (
                    <div style={{
                        padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444', borderRadius: '24px',
                        display: 'flex', alignItems: 'center', gap: '1.5rem',
                        boxShadow: '0 0 30px rgba(239, 68, 68, 0.1)'
                    }}>
                        <div style={{ background: '#ef4444', padding: '10px', borderRadius: '12px' }}>
                            <AlertCircle size={24} color="white" />
                        </div>
                        <div>
                            <h4 style={{ color: 'white', fontWeight: '800', marginBottom: '4px' }}>Problema con el comprobante</h4>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                Hubo un problema con tu comprobante de pago. Intenta de nuevo o escríbenos al <a href="https://wa.me/573001234567" target="_blank" rel="noreferrer" style={{ color: '#ef4444', fontWeight: '700' }}>WhatsApp de soporte</a>.
                            </p>
                        </div>
                    </div>
                )}

                {isPaid && (
                    <div style={{
                        padding: '1.5rem', background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid #22c55e', borderRadius: '24px',
                        display: 'flex', alignItems: 'center', gap: '1.5rem',
                        boxShadow: '0 0 30px rgba(34, 197, 94, 0.1)'
                    }}>
                        <div style={{ background: '#22c55e', padding: '10px', borderRadius: '12px' }}>
                            <CheckCircle2 size={24} color="white" />
                        </div>
                        <div>
                            <h4 style={{ color: 'white', fontWeight: '800', marginBottom: '4px' }}>Plan Activo</h4>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>¡Todo salió bien! Disfruta de tu plan {PLAN_NAMES_FRIENDLY[tier] || tier}.</p>
                        </div>
                    </div>
                )}

                {/* Billing Summary Bar */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: '1.5rem'
                }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ background: 'rgba(111, 66, 193, 0.1)', padding: '12px', borderRadius: '16px' }}>
                            <CreditCard size={24} color="var(--color-neon-purple)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>Plan Actual</div>
                            <div style={{ fontWeight: '800', color: 'white', fontSize: '1.1rem' }}>{PLAN_NAMES_FRIENDLY[tier] || tier}</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ background: 'rgba(0, 243, 255, 0.1)', padding: '12px', borderRadius: '16px' }}>
                            <Clock size={24} color="var(--color-neon-teal)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>Vencimiento</div>
                            <div style={{ fontWeight: '800', color: 'white', fontSize: '1rem' }}>
                                {venue?.expiry_date ? new Date(venue.expiry_date).toLocaleDateString() : 
                                    (tier === 'FREE' ? 'De por vida' : 'Renovación Mensual')
                                }
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: isPaid ? 'rgba(34, 197, 94, 0.05)' : isPending ? 'rgba(111, 66, 193, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                        border: `1px solid ${isPaid ? 'rgba(34, 197, 94, 0.2)' : isPending ? 'rgba(111, 66, 193, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        borderRadius: '24px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem'
                    }}>
                        <div style={{
                            background: isPaid ? 'rgba(34, 197, 94, 0.1)' : isPending ? 'rgba(111, 66, 193, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            padding: '12px', borderRadius: '16px'
                        }}>
                            {isPaid ? <CheckCircle2 size={24} color="#22c55e" /> : isPending ? <TrendingUp size={24} color="var(--color-neon-purple)" /> : <AlertCircle size={24} color="#ef4444" />}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: isPaid ? '#22c55e' : isPending ? 'var(--color-neon-purple)' : '#ef4444', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>
                                Estado de Cuenta
                            </div>
                            <div style={{ fontWeight: '800', color: 'white', fontSize: '1rem' }}>
                                {isPaid ? 'Al día' : isPending ? 'En revisión' : isRejected ? 'Rechazado' : 'Pago pendiente'}
                            </div>
                        </div>
                    </div>
                </div>

                {!isPaid && !isPending && (
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={() => setShowBillingFlow(true)}
                            style={{
                                padding: '1.2rem 3rem', borderRadius: '18px',
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                color: 'white',
                                fontWeight: '900', fontSize: '1.1rem', border: 'none', cursor: 'pointer',
                                boxShadow: '0 0 40px rgba(168,85,247,0.3)',
                                transition: 'all 0.2s',
                                display: 'inline-flex', alignItems: 'center', gap: '12px'
                            }}
                            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            🚀 Mejorar Mi Plan
                        </button>
                    </div>
                )}

                {/* Main Interactive Pricing Section */}
                <div>
                    <PricingSection
                        onSelectPlan={handleSelectPlan}
                        currentPlanId={tier}
                    />
                </div>

                {/* FAQ or Help segment */}
                <div style={{ textAlign: 'center', opacity: 0.6 }}>
                    <p style={{ fontSize: '0.9rem' }}>
                        Todos los precios están en COP. Puedes cancelar o cambiar tu plan en cualquier momento.
                        Los cambios de nivel se aplican inmediatamente después de la verificación del comprobante.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionSettings;
