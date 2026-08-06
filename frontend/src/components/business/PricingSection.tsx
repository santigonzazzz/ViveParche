import React from 'react';
import { PricingCard } from './PricingCard';

interface PricingSectionProps {
    onSelectPlan?: (planId: string) => void;
    currentPlanId?: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan, currentPlanId }) => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1200;

    const plans = [
        {
            id: 'FREE',
            name: 'Vitrina',
            price: 'Gratis',
            features: [
                { text: 'Aparece en el mapa básico', included: true },
                { text: 'Acceso al Dashboard', included: false },
                { text: '1 parche al mes (Sin gestión)', included: true },
                { text: 'Fidelización (Rewards)', included: false },
                { text: 'Cuentas para meseros: Ninguna', included: true }
            ]
        },
        {
            id: 'ARRANQUE',
            name: 'Arranque',
            price: '40.000',
            features: [
                { text: 'Mapa + Lista de recomendados', included: true },
                { text: 'Acceso básico (Vistas del perfil)', included: true },
                { text: '3 parches al mes (WhatsApp)', included: true },
                { text: 'Pasaporte Digital (1 sello)', included: true },
                { text: '1 cuenta para el dueño', included: true }
            ],
            isPopular: false
        },
        {
            id: 'EL PARCHE',
            name: 'El Parche',
            price: '110.000',
            features: [
                { text: 'Prioridad en búsquedas de IA', included: true },
                { text: 'Acceso completo (Gráficas)', included: true },
                { text: 'Parches ilimitados (WhatsApp)', included: true },
                { text: 'Pasaporte + Monedas Base', included: true },
                { text: 'Hasta 3 cuentas para meseros', included: true }
            ],
            isPopular: true
        },
        {
            id: 'PRO',
            name: 'Dueño del Parche',
            price: '450.000',
            features: [
                { text: 'Perfil VIP con diseño personalizado', included: true },
                { text: 'Analítica avanzada + Exportación', included: true },
                { text: 'Gestión de tickets in-app', included: true },
                { text: 'Sistema de Canje + Tienda', included: true },
                { text: 'Staff ilimitado', included: true }
            ],
            isVIP: true
        }
    ];

    return (
        <div style={{ padding: '2rem 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', color: 'white', marginBottom: '1rem' }}>
                    Planes que impulsan <span style={{ color: 'var(--color-neon-purple)' }}>tu Vibra</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    Escoge el nivel de visibilidad y herramientas que tu negocio necesita para crecer en Parché.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
                gap: '2rem',
                alignItems: 'stretch'
            }}>
                {plans.map((plan, i) => (
                    <PricingCard
                        key={i}
                        name={plan.name}
                        price={plan.price}
                        features={plan.features}
                        isPopular={plan.isPopular}
                        isVIP={plan.isVIP}
                        currentPlan={currentPlanId === plan.id}
                        onSelect={() => onSelectPlan && onSelectPlan(plan.id)}
                    />
                ))}
            </div>

            <div style={{
                marginTop: '4rem',
                padding: '2rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                textAlign: 'center'
            }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    ¿Necesitas algo a medida? <a href="https://wa.me/573167812838" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-neon-teal)', fontWeight: '800', cursor: 'pointer', textDecoration: 'none' }}>Contáctanos</a> para planes Enterprise y parches masivos.
                </p>
            </div>
        </div>
    );
};
