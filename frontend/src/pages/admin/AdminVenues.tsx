import React, { useState, useEffect, useCallback } from 'react';
import { Search, Store, MapPin, ExternalLink, Edit, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';
const getAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}` });

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Activo', color: '#22c55e' },
    pending_approval: { label: 'Pendiente', color: '#f59e0b' },
    inactive: { label: 'Inactivo', color: 'rgba(255,255,255,0.4)' },
    expired: { label: 'Expirado', color: '#ef4444' },
};

const PLAN_CONFIG: Record<string, { label: string; price: string }> = {
    vitrina: { label: 'Vitrina (Free)', price: 'Gratis' },
    free: { label: 'Vitrina (Free)', price: 'Gratis' },
    arranque: { label: 'Arranque', price: '$40.000' },
    el_parche: { label: 'El Parche', price: '$140.000' },
    dueno_del_chuzo: { label: 'Dueño del Parche', price: '$450.000' },
};

const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none', width: '100%' };
const btn = (color = 'rgba(255,255,255,0.06)', border = '1px solid rgba(255,255,255,0.1)'): React.CSSProperties => ({ background: color, border, padding: '0.45rem 1rem', borderRadius: '10px', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem' });

export const AdminVenues: React.FC = () => {
    const navigate = useNavigate();
    const [venues, setVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editVenue, setEditVenue] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchVenues = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter !== 'all') params.set('billing_status', statusFilter);
            const res = await fetch(`${API_BASE}/x-mgmt/venues?${params}`, { headers: getAuth() });
            if (!res.ok) throw new Error();
            setVenues(await res.json());
        } catch { showToast('error', 'Error al cargar establecimientos'); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { fetchVenues(); }, [fetchVenues]);

    const openEdit = (v: any) => {
        setEditVenue(v);
        setEditForm({
            name: v.name,
            address: v.address,
            subscription_status: v.subscription_status,
            plan_type: v.plan_type || 'free',
            description: v.description || '',
            vibe_tags: Array.isArray(v.vibe_tags) ? v.vibe_tags.join(', ') : (v.vibe_tags || '')
        });
    };
    const closeEdit = () => setEditVenue(null);

    const saveEdit = async () => {
        if (!editVenue) return;
        setSaving(true);
        try {
            const payload = {
                ...editForm,
                vibe_tags: typeof editForm.vibe_tags === 'string'
                    ? editForm.vibe_tags.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : editForm.vibe_tags
            };
            const res = await fetch(`${API_BASE}/x-mgmt/venues/${editVenue.id}`, {
                method: 'PATCH', headers: { ...getAuth(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Establecimiento actualizado');
            closeEdit();
            fetchVenues();
        } catch { showToast('error', 'Error al guardar cambios'); }
        finally { setSaving(false); }
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
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Gestión de <span style={{ color: '#00f3ff' }}>Establecimientos</span></h1>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{venues.length} establecimientos</span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={36} color="#00f3ff" style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {venues.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Sin resultados</p>}
                    {venues.map(v => {
                        const sc = STATUS_CONFIG[v.subscription_status] || STATUS_CONFIG.inactive;
                        return (
                            <div key={v.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,243,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Store size={22} color="#00f3ff" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '1rem' }}>{v.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                <MapPin size={10} />{v.address || 'Sin dirección'}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', background: `${sc.color}22`, color: sc.color }}>{sc.label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '10px', flex: 1 }}>
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>Plan</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#a855f7' }}>{PLAN_CONFIG[v.plan_type?.toLowerCase()]?.label || v.plan_type || 'Invitado'}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '10px', flex: 1 }}>
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>Registrado</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>{new Date(v.created_at).toLocaleDateString('es-CO')}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button onClick={() => openEdit(v)} style={{ ...btn(), display: 'flex', alignItems: 'center', gap: '5px', flex: 1, justifyContent: 'center' }}><Edit size={14} /> Editar</button>
                                    <button onClick={() => navigate(`/business?venue_id=${v.id}`)} style={{ ...btn('rgba(0,243,255,0.08)', '1px solid rgba(0,243,255,0.2)'), color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '5px', flex: 1, justifyContent: 'center' }}><ExternalLink size={14} /> Dashboard</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editVenue && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                            <h2 style={{ fontWeight: '900', fontSize: '1.4rem' }}>Editar Local</h2>
                            <button onClick={closeEdit} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Nombre</label>
                                <input style={input} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Dirección</label>
                                <input style={input} value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Estado de Suscripción</label>
                                <select style={{ ...input, cursor: 'pointer' }} value={editForm.subscription_status} onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })}>
                                    <option value="inactive">Inactivo</option>
                                    <option value="pending_approval">Pendiente</option>
                                    <option value="active">Activo</option>
                                    <option value="expired">Expirado</option>
                                </select>
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Tipo de Plan</label>
                                <select style={{ ...input, cursor: 'pointer' }} value={editForm.plan_type} onChange={e => setEditForm({ ...editForm, plan_type: e.target.value })}>
                                    <option value="vitrina">Vitrina (Free)</option>
                                    <option value="arranque">Arranque</option>
                                    <option value="el_parche">El Parche</option>
                                    <option value="dueno_del_chuzo">Dueño del Parche</option>
                                    <option value="pro">Dueño del Parche (Alt)</option>
                                </select>
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Bio (Descripción)</label>
                                <textarea style={{ ...input, height: '80px', resize: 'none' }} value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Vibes (Separadas por coma)</label>
                                <input style={input} value={editForm.vibe_tags || ''} onChange={e => setEditForm({ ...editForm, vibe_tags: e.target.value })} placeholder="ej: Moderno, Elegante, Tech" />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button onClick={closeEdit} style={{ ...btn(), flex: 1 }}>Cancelar</button>
                                <button onClick={saveEdit} disabled={saving} style={{ ...btn('#00f3ff', 'none'), color: 'black', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
