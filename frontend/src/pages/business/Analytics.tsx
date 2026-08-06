
import React from 'react';
import { SalesChart } from '../../components/business/SalesChart';
import { useBusinessDashboard } from '../../hooks/useBusinessDashboard';
import { Lock, Download } from 'lucide-react';

import { useSearchParams } from 'react-router-dom';

export const Analytics: React.FC = () => {
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;
    const { 
        salesData, 
        refreshSales, 
        venueProfile,
        summary,
        summaryLoading
    } = useBusinessDashboard(venueId);
    const isChartLocked = ['FREE', 'ARRANQUE'].includes(venueProfile?.subscription_tier || 'FREE');
    const isProTier = ['PRO', 'VIP'].includes(venueProfile?.subscription_tier || '');
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
    const [exporting, setExporting] = React.useState(false);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const downloadCSV = () => {
        setExporting(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const venueName = venueProfile?.name || 'mi-local';
            const filename = `analytics-viveparche-${today}.csv`;

            const rows: string[] = [];

            // ── Section 1: Resumen de Métricas ──────────────────────────────
            rows.push('SECCIÓN,MÉTRICA,VALOR,UNIDAD');
            rows.push(`Resumen,Nombre del Local,"${venueName}",`);
            rows.push(`Resumen,Fecha de Exportación,"${today}",`);
            rows.push(`Resumen,Visitantes Totales,${summary?.total_attendees ?? ''},visitas`);
            rows.push(`Resumen,Promedio Últimas 2 Semanas (Visitantes),${summary?.avg_attendees_2weeks ?? ''},visitas`);
            rows.push(`Resumen,Tendencia Visitantes,${summary?.attendees_trend === 'up' ? 'Subiendo' : 'Bajando'},`);
            rows.push(`Resumen,Ingresos Totales,${summary?.total_revenue ?? ''},COP`);
            rows.push(`Resumen,Crecimiento Ingresos Mes,${summary?.revenue_growth_month ?? ''},%`);
            rows.push(`Resumen,Calificación Promedio,${summary?.avg_satisfaction != null ? Number(summary.avg_satisfaction).toFixed(1) : ''},/ 5.0`);
            rows.push(`Resumen,Tendencia Satisfacción 2 Semanas,${summary?.satisfaction_trend_2weeks != null ? Number(summary.satisfaction_trend_2weeks).toFixed(2) : ''},puntos`);

            // ── Section 2: Serie Temporal (Gráfica) ─────────────────────────
            rows.push('');
            rows.push('SECCIÓN,FECHA / PERÍODO,VALOR,UNIDAD');
            if (salesData?.labels && salesData?.data) {
                const periodLabel = salesData.period === 'week' ? 'semana' : 'mes';
                salesData.labels.forEach((label, i) => {
                    const value = salesData.data[i] ?? 0;
                    rows.push(`Gráfica (${periodLabel}),"${label}",${value},visitantes`);
                });
            } else {
                rows.push('Gráfica,Sin datos de serie temporal,,');
            }

            const csvContent = '\uFEFF' + rows.join('\r\n'); // BOM for Excel UTF-8
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '2.2rem' : '2.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Analíticas</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.1rem' }}>Profundiza en el rendimiento de tu local.</p>
                </div>

                {/* CSV Export — visible only for PRO / Dueño del Parche */}
                {isProTier && !summaryLoading && (
                    <button
                        onClick={downloadCSV}
                        disabled={exporting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '100px',
                            background: exporting
                                ? 'rgba(255,255,255,0.05)'
                                : 'linear-gradient(135deg, #6f42c1 0%, #00f3ff 100%)',
                            border: 'none',
                            color: 'white',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            boxShadow: exporting ? 'none' : '0 4px 20px rgba(111,66,193,0.3)',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            opacity: exporting ? 0.6 : 1,
                        }}
                    >
                        <Download size={16} />
                        {exporting ? 'Exportando...' : 'Exportar CSV'}
                    </button>
                )}
            </div>

            {/* Métricas rápidas */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>

                {/* Tarjeta 1 — Visitantes Totales */}
                <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>Visitantes Totales</span>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginTop: '0.5rem' }}>
                        {summaryLoading ? '...' : (summary?.total_attendees ?? '—')}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px', color: summary?.attendees_trend === 'up' ? '#22c55e' : '#ef4444' }}>
                        {summaryLoading ? '' : summary?.avg_attendees_2weeks != null
                            ? `${summary.avg_attendees_2weeks >= 0 ? '+' : ''}${summary.avg_attendees_2weeks} últimas 2 semanas`
                            : 'Sin datos previos'
                        }
                    </div>
                </div>

                {/* Tarjeta 2 — Calificación Promedio */}
                <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>Calificación Promedio</span>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginTop: '0.5rem' }}>
                        {summaryLoading ? '...' : summary?.avg_satisfaction != null
                            ? `${Number(summary.avg_satisfaction).toFixed(1)} ⭐`
                            : '—'
                        }
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px', color: summary?.satisfaction_trend_2weeks != null && summary.satisfaction_trend_2weeks >= 0 ? '#22c55e' : '#eab308' }}>
                        {summaryLoading ? '' : summary?.satisfaction_trend_2weeks != null
                            ? `${summary.satisfaction_trend_2weeks >= 0 ? '+' : ''}${Number(summary.satisfaction_trend_2weeks).toFixed(2)} últimas 2 semanas`
                            : 'Sin reseñas aún'
                        }
                    </div>
                </div>

                {/* Tarjeta 3 — Ingresos Totales */}
                <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>Ingresos Totales</span>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginTop: '0.5rem' }}>
                        {summaryLoading ? '...' : summary?.total_revenue != null
                            ? `$${Number(summary.total_revenue).toLocaleString('es-CO')}`
                            : '—'
                        }
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'rgba(255,255,255,0.4)' }}>
                        {summaryLoading ? '' : 'COP acumulado'}
                    </div>
                </div>

            </div>

            <div style={{ position: 'relative' }}>
                {isChartLocked && (
                    <div style={{
                        position: 'absolute',
                        inset: '-1rem',
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 100,
                        borderRadius: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1.5rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ background: 'var(--color-neon-purple)', padding: '16px', borderRadius: '20px', boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}>
                            <Lock size={32} color="white" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>Analíticas Premium</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', maxWidth: '300px' }}>
                                Desbloquea gráficas avanzadas e historial completo de rendimiento con el plan <strong>El Parche</strong>.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/business/subscription?showUpgrade=true'}
                            style={{ background: 'white', color: 'black', padding: '12px 32px', borderRadius: '100px', fontWeight: '900', border: 'none', cursor: 'pointer' }}
                        >
                            Ver Planes de Venta
                        </button>
                    </div>
                )}
                <SalesChart
                    data={salesData}
                    period={salesData?.period || 'week'}
                    onPeriodChange={refreshSales}
                />
            </div>
        </div>
    );
};


