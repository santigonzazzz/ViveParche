
import React from 'react';
import type { SalesChartData } from '../../services/businessApi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface SalesChartProps {
    data: SalesChartData | null;
    period: 'week' | 'month';
    onPeriodChange: (period: 'week' | 'month') => void;
}

const BAR_COLORS = [
    'rgba(111, 66, 193, 0.9)',
    'rgba(139, 92, 246, 0.9)',
    'rgba(167, 139, 250, 0.9)',
    'rgba(111, 66, 193, 0.7)',
    'rgba(76, 29, 149, 0.9)',
];

export const SalesChart: React.FC<SalesChartProps> = ({ data, period, onPeriodChange }) => {
    if (!data) return (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
            Cargando gráfico...
        </div>
    );

    const chartData = data.labels.map((label, index) => ({
        name: label,
        tickets: data.data[index] ?? 0,
    }));

    const totalTickets = data.data.reduce((a, b) => a + b, 0);
    const peakSlot = data.labels[data.data.indexOf(Math.max(...data.data))];

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem' }}>Ventas de Tickets</h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                        {totalTickets > 0
                            ? `Día con más ventas: ${peakSlot} · ${period === 'week' ? 'Última semana' : 'Último mes'}`
                            : 'Aún no hay ventas registradas'}
                    </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', display: 'flex' }}>
                    <button
                        onClick={() => onPeriodChange('week')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: period === 'week' ? 'var(--color-neon-purple)' : 'transparent',
                            color: period === 'week' ? 'white' : 'rgba(255,255,255,0.4)',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => onPeriodChange('month')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: period === 'month' ? 'var(--color-neon-purple)' : 'transparent',
                            color: period === 'month' ? 'white' : 'rgba(255,255,255,0.4)',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Mes
                    </button>
                </div>
            </div>

            <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={(v) => `${v}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(111,66,193,0.08)' }}
                            contentStyle={{ background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem' }}
                            itemStyle={{ color: 'white', fontWeight: '700' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.25rem' }}
                            formatter={(value: any) => [`${value ?? 0} ticket${(value ?? 0) !== 1 ? 's vendidos' : ' vendido'}`, 'Total']}
                        />
                        <Bar dataKey="tickets" radius={[8, 8, 0, 0]}>
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {chartData.map((slot, i) => (
                    <div key={i} style={{
                        flex: '1 1 auto',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px',
                        padding: '0.5rem 0.75rem',
                        textAlign: 'center',
                        minWidth: '80px',
                    }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: 'white' }}>{slot.tickets}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{slot.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
