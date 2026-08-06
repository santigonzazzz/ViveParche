
import React from 'react';
import { Users, TrendingUp, Star } from 'lucide-react';
import type { DashboardSummaryData } from '../../services/businessApi';

interface DashboardSummaryProps {
    data: DashboardSummaryData;
}

function formatCOP(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${Math.round(amount / 1000)}K`;
    return `$${amount.toLocaleString('es-CO')}`;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ data }) => {

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

            {/* Total Parceros */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(111, 66, 193, 0.1)', padding: '10px', borderRadius: '14px' }}>
                        <Users size={20} color="var(--color-neon-purple)" />
                    </div>
                    <span style={{
                        fontSize: '0.72rem', fontWeight: '700',
                        color: (data.attendees_trend === 'up' || (data.avg_attendees_2weeks ?? 0) >= 0) ? '#22c55e' : '#ef4444',
                        background: (data.attendees_trend === 'up' || (data.avg_attendees_2weeks ?? 0) >= 0) ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '4px 8px', borderRadius: '100px'
                    }}>
                        +{Math.abs(data.avg_attendees_2weeks ?? 0)} últimas 2 sem.
                    </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem' }}>
                    {data.total_attendees.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Total Parceros</div>
            </div>

            {/* Ingresos Totales (COP) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: '14px' }}>
                        <span style={{ fontSize: '1.1rem', lineHeight: 1, color: '#22c55e', fontWeight: '900' }}>$</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: '100px' }}>
                        COP
                    </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem' }}>
                    {formatCOP(data.total_revenue)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Ingresos Totales</div>
            </div>

            {/* Calificación Promedio (Stars) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '10px', borderRadius: '14px' }}>
                        <Star size={20} color="#eab308" />
                    </div>
                    <span style={{
                        fontSize: '0.72rem', fontWeight: '700',
                        color: (data.satisfaction_trend_2weeks ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                        background: (data.satisfaction_trend_2weeks ?? 0) >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '4px 8px', borderRadius: '100px'
                    }}>
                        {(data.satisfaction_trend_2weeks ?? 0) >= 0 ? '+' : ''}{data.satisfaction_trend_2weeks?.toFixed(1) ?? '0.0'} ★
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white' }}>
                        {data.avg_satisfaction > 0 ? data.avg_satisfaction.toFixed(1) : '—'}
                    </div>
                    {data.avg_satisfaction > 0 && (
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>/5</div>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Calificación Promedio</div>
            </div>

            {/* Nivel de Plan */}
            <div style={{ background: 'linear-gradient(135deg, rgba(111, 66, 193, 0.2) 0%, rgba(111, 66, 193, 0.05) 100%)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(111, 66, 193, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--color-neon-purple)', padding: '10px', borderRadius: '14px' }}>
                        <TrendingUp size={20} color="white" />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Activo
                    </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem' }}>
                    {data.subscription_plan || 'Gratis'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: '1rem' }}>Nivel de Plan</div>
                <button
                    onClick={() => window.location.href = '/business/subscription?showUpgrade=true'}
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'white',
                        padding: '0.5rem',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    Mejorar Plan →
                </button>
            </div>
        </div>
    );
};
