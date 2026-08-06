import React, { useState, useEffect, useCallback } from 'react';
import { Search, ArrowUpRight, CheckCircle, XCircle, Loader2, X, Mail, Image as ImageIcon, AlertCircle, Download } from 'lucide-react';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';
const getAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}` });

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Activo', color: '#22c55e' },
    pending_approval: { label: 'Aprobación pendiente', color: '#f59e0b' },
    inactive: { label: 'Inactivo', color: 'rgba(255,255,255,0.4)' },
    expired: { label: 'Expirado', color: '#ef4444' },
    rejected: { label: 'Negado', color: '#f43f5e' },
};

const PLAN_PRICES: Record<string, string> = {
    el_parche: '$110.000',
    arranque: '$40.000',
    dueno_del_chuzo: '$450.000',
    pro: '$450.000',
    vitrina: 'Gratis',
    free: 'Gratis',
};

const PLAN_NAMES: Record<string, string> = {
    el_parche: 'El Parche',
    arranque: 'Arranque',
    dueno_del_chuzo: 'Dueño del Parche',
    pro: 'Dueño del Parche',
    vitrina: 'Vitrina',
    free: 'Vitrina',
};

const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none', width: '100%' };

export const AdminBills: React.FC = () => {
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selected, setSelected] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [fullImage, setFullImage] = useState<string | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchBills = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter !== 'all') params.set('billing_status', statusFilter);
            const res = await fetch(`${API_BASE}/x-mgmt/bills?${params}`, { headers: getAuth() });
            if (res.ok) setBills(await res.json());
        } catch { }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { fetchBills(); }, [fetchBills]);

    const handleAction = async (venueId: string, action: 'approve' | 'reject') => {
        setActionLoading(`${venueId}-${action}`);
        try {
            const res = await fetch(`${API_BASE}/x-mgmt/bills/${action}/${venueId}`, { method: 'POST', headers: getAuth() });
            if (!res.ok) throw new Error();
            showToast('success', action === 'approve' ? '✅ Suscripción aprobada y activada' : '❌ Suscripción rechazada');
            setSelected(null);
            fetchBills();
        } catch { showToast('error', 'Error al procesar la acción'); }
        finally { setActionLoading(null); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {toast && (
                <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 3000, padding: '1rem 1.5rem', borderRadius: '16px', background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '700' }}>
                    {toast.type === 'success' ? <CheckCircle size={18} color="#22c55e" /> : <AlertCircle size={18} color="#ef4444" />}
                    {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Facturación y <span style={{ color: '#22c55e' }}>Suscripciones</span></h1>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{bills.length} registros</span>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                {['active', 'pending_approval', 'expired', 'inactive', 'rejected'].map(st => {
                    const count = bills.filter(b => b.subscription_status === st).length;
                    const sc = STATUS_CONFIG[st];
                    return (
                        <div key={st} onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${statusFilter === st ? sc.color + '44' : 'rgba(255,255,255,0.05)'}`, borderRadius: '16px', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{sc.label}</div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: sc.color }}>{count}</div>
                        </div>
                    );
                })}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre del local..." style={{ ...input, paddingLeft: '2.75rem' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...input, width: 'auto', cursor: 'pointer' }}>
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="pending_approval">Pendientes</option>
                    <option value="inactive">Inactivos</option>
                    <option value="expired">Expirados</option>
                    <option value="rejected">Negados</option>
                </select>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={36} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Establecimiento', 'Plan', 'Precio', 'Estado', 'Comprobante', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.3)' }}>Sin registros de facturación</td></tr>}
                            {bills.map(b => {
                                const sc = STATUS_CONFIG[b.subscription_status] || { label: b.subscription_status, color: 'rgba(255,255,255,0.4)' };
                                return (
                                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{b.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(b.created_at).toLocaleDateString('es-CO')}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', color: '#a855f7', fontWeight: '800', fontSize: '0.85rem', textTransform: 'capitalize' }}>{PLAN_NAMES[b.plan_type?.toLowerCase()] || b.plan_type || 'Invitado'}</td>
                                        <td style={{ padding: '1rem 1.25rem', fontWeight: '900', color: 'white' }}>{PLAN_PRICES[b.plan_type?.toLowerCase()] || 'N/A'}</td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', background: `${sc.color}22`, color: sc.color }}>{sc.label}</span>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            {b.last_payment_proof ?
                                                <button onClick={() => setFullImage(b.last_payment_proof)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', fontSize: '0.78rem' }}>
                                                    <ImageIcon size={14} /> Ver imagen
                                                </button>
                                                : <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>Sin imagen</span>}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                            <button onClick={() => setSelected(b)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.9rem', borderRadius: '10px', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                <ArrowUpRight size={14} /> Acciones
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Actions Modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '560px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontWeight: '900', fontSize: '1.4rem' }}>{selected.name}</h2>
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginTop: '4px' }}>Acciones de Facturación</p>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                        </div>

                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {[
                                ['Plan', PLAN_NAMES[selected.plan_type?.toLowerCase()] || selected.plan_type || 'Invitado'],
                                ['Precio', PLAN_PRICES[selected.plan_type?.toLowerCase()] || 'N/A'],
                                ['Estado', STATUS_CONFIG[selected.subscription_status]?.label || selected.subscription_status],
                                ['Vence', selected.expiry_date ? new Date(selected.expiry_date).toLocaleDateString('es-CO') : 'Sin fecha'],
                            ].map(([label, value]) => (
                                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                                    <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Payment Proof */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Comprobante de Pago</div>
                            {selected.last_payment_proof ? (
                                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }} onClick={() => setFullImage(selected.last_payment_proof)}>
                                    <img src={selected.last_payment_proof} alt="Comprobante" style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                                        <span style={{ fontWeight: '900', fontSize: '0.85rem' }}>Ver en pantalla completa</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center' }}>
                                    <ImageIcon size={32} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
                                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', fontWeight: '700' }}>Sin comprobante adjunto</p>
                                    <a href={`mailto:?subject=Recordatorio de pago - ${selected.name}&body=Estimado dueño de ${selected.name}, le recordamos que su suscripción requiere pago. Plan: ${selected.plan_type}. Precio: ${PLAN_PRICES[selected.plan_type] || 'N/A'}.`}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.6rem 1.25rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', fontWeight: '800', fontSize: '0.82rem' }}>
                                        <Mail size={14} /> Enviar recordatorio
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => handleAction(selected.id, 'reject')}
                                disabled={!!actionLoading}
                                style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                {actionLoading === `${selected.id}-reject` ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><XCircle size={18} /> RECHAZAR</>}
                            </button>
                            <button
                                onClick={() => handleAction(selected.id, 'approve')}
                                disabled={!!actionLoading}
                                style={{ flex: 2, padding: '0.9rem', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: actionLoading ? 'none' : '0 0 20px rgba(34,197,94,0.15)' }}>
                                {actionLoading === `${selected.id}-approve` ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={18} /> APROBAR Y ACTIVAR</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Image Viewer */}
            {fullImage && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setFullImage(null)}>
                    <img src={fullImage} alt="Comprobante completo" style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
                    <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '0.75rem', cursor: 'pointer', color: 'white' }}>
                        <X size={22} />
                    </button>
                    <a href={fullImage} target="_blank" rel="noopener noreferrer" download style={{ position: 'absolute', top: '1.5rem', right: '5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '0.75rem', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <Download size={22} />
                    </a>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
