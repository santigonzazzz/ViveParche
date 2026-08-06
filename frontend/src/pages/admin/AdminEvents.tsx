import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Loader2, ChevronRight, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';
const getAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}` });

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Activo', color: '#22c55e' },
    upcoming: { label: 'Próximo', color: '#00f3ff' },
    finished: { label: 'Finalizado', color: 'rgba(255,255,255,0.4)' },
    canceled: { label: 'Cancelado', color: '#ef4444' },
    draft: { label: 'Borrador', color: '#f59e0b' },
};

const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none', width: '100%' };

export const AdminEvents: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selected, setSelected] = useState<any | null>(null);
    const [updating, setUpdating] = useState(false);

    const toggleEventStatus = async (e: any) => {
        if (!e) return;
        const newStatus = !e.is_active;
        if (!window.confirm(`¿Estás seguro de que quieres ${newStatus ? 'activar' : 'suspender'} este evento?`)) return;
        
        setUpdating(true);
        try {
            const res = await fetch(`${API_BASE}/x-mgmt/events/${e.id}`, {
                method: 'PATCH',
                headers: { ...getAuth(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newStatus })
            });
            if (res.ok) {
                const updatedEvent = { ...e, is_active: newStatus };
                setSelected(updatedEvent);
                setEvents(prev => prev.map(ev => ev.id === e.id ? updatedEvent : ev));
            } else {
                alert('Error al actualizar el evento');
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setUpdating(false);
        }
    };

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter !== 'all') params.set('event_status', statusFilter);
            const res = await fetch(`${API_BASE}/x-mgmt/events?${params}`, { headers: getAuth() });
            if (res.ok) setEvents(await res.json());
        } catch { }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Gestión de <span style={{ color: '#f59e0b' }}>Eventos</span></h1>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{events.length} eventos</span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre del evento..." style={{ ...input, paddingLeft: '2.75rem' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...input, width: 'auto', cursor: 'pointer' }}>
                    <option value="all">Todos los estados</option>
                    <option value="upcoming">Próximos</option>
                    <option value="active">Activos</option>
                    <option value="finished">Finalizados</option>
                    <option value="canceled">Cancelados</option>
                    <option value="draft">Borradores</option>
                </select>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={36} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Evento', 'Estado', 'Fecha', 'Establecimiento', 'Ver'].map(h => (
                                    <th key={h} style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', textAlign: h === 'Ver' ? 'right' : 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.3)' }}>Sin eventos</td></tr>}
                            {events.map(e => {
                                const sc = STATUS_CONFIG[e.status] || { label: e.status, color: 'rgba(255,255,255,0.4)' };
                                return (
                                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => setSelected(e)}>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Calendar size={18} color="#f59e0b" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800' }}>{e.title || 'Sin título'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>ID: {e.id.slice(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', background: `${sc.color}22`, color: sc.color }}>{sc.label}</span>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                                            {e.event_date ? new Date(e.event_date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ fontWeight: '700', fontSize: '0.82rem', color: 'white' }}>{e.venues?.name || '—'}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>ID: {e.venue_id?.slice(0, 8)}...</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                            <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detail Panel */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontWeight: '900', fontSize: '1.4rem' }}>Detalle del Evento</h2>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button 
                                    onClick={() => toggleEventStatus(selected)} 
                                    disabled={updating}
                                    style={{ 
                                        background: selected.is_active ? '#ef4444' : '#22c55e', 
                                        border: 'none', 
                                        color: 'white', 
                                        padding: '0.5rem 1rem', 
                                        borderRadius: '10px', 
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {updating && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {selected.is_active ? 'Suspender' : 'Activar'}
                                </button>
                                <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                ['Título', selected.title],
                                ['Estado de Suspensión', selected.is_active ? 'Activo' : 'Suspendido'],
                                ['Descripción', selected.description || 'Sin descripción'],
                                ['Fecha', selected.event_date ? new Date(selected.event_date).toLocaleString('es-CO') : '—'],
                                ['Establecimiento', `${selected.venues?.name || '—'} (ID: ${selected.venue_id})`],
                                ['Creado', new Date(selected.created_at).toLocaleString('es-CO')],
                            ].map(([label, value]) => (
                                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                                    <div style={{ fontWeight: '700', wordBreak: 'break-word' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
