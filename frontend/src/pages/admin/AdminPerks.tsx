import React, { useState, useEffect, useCallback } from 'react';
import { Search, Award, Edit, Trash2, Loader2, X, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';
const getAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}` });

const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none', width: '100%' };
const btn = (color = 'rgba(255,255,255,0.06)', border = '1px solid rgba(255,255,255,0.1)'): React.CSSProperties => ({ background: color, border, padding: '0.4rem 0.9rem', borderRadius: '10px', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem' });

export const AdminPerks: React.FC = () => {
    const [perks, setPerks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editPerk, setEditPerk] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchPerks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            const res = await fetch(`${API_BASE}/x-mgmt/perks?${params}`, { headers: getAuth() });
            if (res.ok) setPerks(await res.json());
        } catch { }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchPerks(); }, [fetchPerks]);

    const openEdit = (p: any) => { setEditPerk(p); setEditForm({ title: p.title, description: p.description, coin_price: p.coin_price, is_active: p.is_active }); };
    const closeEdit = () => setEditPerk(null);

    const saveEdit = async () => {
        if (!editPerk) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/x-mgmt/perks/${editPerk.id}`, {
                method: 'PATCH', headers: { ...getAuth(), 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Beneficio actualizado');
            closeEdit(); fetchPerks();
        } catch { showToast('error', 'Error al guardar'); }
        finally { setSaving(false); }
    };

    const deletePerk = async (id: string) => {
        if (!window.confirm('¿Eliminar este beneficio?')) return;
        setDeleting(id);
        try {
            const res = await fetch(`${API_BASE}/x-mgmt/perks/${id}`, { method: 'DELETE', headers: getAuth() });
            if (!res.ok) throw new Error();
            showToast('success', 'Beneficio eliminado');
            fetchPerks();
        } catch { showToast('error', 'Error al eliminar'); }
        finally { setDeleting(null); }
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
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Gestión de <span style={{ color: '#a855f7' }}>Beneficios</span></h1>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{perks.length} perks</span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre del beneficio..." style={{ ...input, paddingLeft: '2.75rem' }} />
                </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={36} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Beneficio', 'Precio (Coins)', 'Estado', 'Establecimiento', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {perks.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.3)' }}>Sin beneficios</td></tr>}
                            {perks.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Award size={18} color="#a855f7" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800' }}>{p.title}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{(p.description || '').slice(0, 40)}{p.description?.length > 40 ? '...' : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontWeight: '900', color: '#fbbf24' }}>{(p.coin_price || 0).toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        {p.is_active !== false
                                            ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e', fontSize: '0.82rem', fontWeight: '800' }}><ToggleRight size={16} /> Activo</span>
                                            : <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontSize: '0.82rem', fontWeight: '800' }}><ToggleLeft size={16} /> Inactivo</span>}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '700' }}>
                                        {p.venue?.name || '—'}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={() => openEdit(p)} style={{ ...btn(), display: 'flex', alignItems: 'center', gap: '5px' }}><Edit size={13} /> Editar</button>
                                            <button onClick={() => deletePerk(p.id)} disabled={deleting === p.id} style={{ ...btn('rgba(239,68,68,0.08)', '1px solid rgba(239,68,68,0.2)'), color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                                {deleting === p.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editPerk && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '460px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                            <h2 style={{ fontWeight: '900', fontSize: '1.4rem' }}>Editar Beneficio</h2>
                            <button onClick={closeEdit} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Título</label>
                                <input style={input} value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Descripción</label>
                                <textarea style={{ ...input, minHeight: '80px', resize: 'none' }} value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                            </div>
                            <div><label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Precio en Coins</label>
                                <input type="number" min="1" style={input} value={editForm.coin_price || ''} onChange={e => setEditForm({ ...editForm, coin_price: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                                <span style={{ fontWeight: '700' }}>¿Activo?</span>
                                <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: editForm.is_active ? '#22c55e' : '#ef4444' }}>
                                    {editForm.is_active ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button onClick={closeEdit} style={{ ...btn(), flex: 1 }}>Cancelar</button>
                                <button onClick={saveEdit} disabled={saving} style={{ ...btn('#a855f7', 'none'), flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />} Guardar
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
