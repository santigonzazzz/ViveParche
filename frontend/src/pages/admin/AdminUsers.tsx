import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Trash2, Edit, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';
const getAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}` });

const input: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none', width: '100%'
};
const btn = (color = 'rgba(255,255,255,0.06)', border = '1px solid rgba(255,255,255,0.1)'): React.CSSProperties => ({
    background: color, border, padding: '0.5rem 1.2rem', borderRadius: '10px', color: 'white',
    fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem'
});

const ROLE_COLORS: Record<string, string> = {
    admin: '#a855f7', owner: '#00f3ff', worker: '#fbbf24', customer: 'rgba(255,255,255,0.5)', user: 'rgba(255,255,255,0.5)'
};

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [editUser, setEditUser] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (roleFilter !== 'all') params.set('role', roleFilter);
            const res = await fetch(`${API_BASE}/x-mgmt/users?${params}`, { headers: getAuth() });
            if (!res.ok) throw new Error();
            setUsers(await res.json());
        } catch { showToast('error', 'Error al cargar usuarios'); }
        finally { setLoading(false); }
    }, [search, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openEdit = (u: any) => { setEditUser(u); setEditForm({ full_name: u.full_name, role: u.role, vibe_coins: u.vibe_coins ?? 0 }); };
    const closeEdit = () => setEditUser(null);

    const saveEdit = async () => {
        if (!editUser) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/x-mgmt/users/${editUser.id}`, {
                method: 'PATCH', headers: { ...getAuth(), 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Usuario actualizado');
            closeEdit();
            fetchUsers();
        } catch { showToast('error', 'Error al guardar cambios'); }
        finally { setSaving(false); }
    };

    const deleteUser = async (u: any) => {
        if (!u.email) {
            showToast('error', 'El usuario no tiene email registrado, no se puede verificar');
            return;
        }
        const input = window.prompt(`Para eliminar al usuario ${u.full_name || 'Sin nombre'}, escribe su email exactamente:\n${u.email}`);
        if (input !== u.email) {
            if (input !== null) showToast('error', 'Email incorrecto, operación cancelada');
            return;
        }
        setDeleting(u.id);
        try {
            const res = await fetch(`${API_BASE}/x-mgmt/users/${u.id}`, { method: 'DELETE', headers: getAuth() });
            if (!res.ok) throw new Error();
            showToast('success', 'Usuario eliminado');
            fetchUsers();
        } catch { showToast('error', 'Error al eliminar usuario'); }
        finally { setDeleting(null); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 3000, padding: '1rem 1.5rem', borderRadius: '16px', background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '700' }}>
                    {toast.type === 'success' ? <CheckCircle size={18} color="#22c55e" /> : <AlertCircle size={18} color="#ef4444" />}
                    {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '900' }}>Gestión de <span style={{ color: '#a855f7' }}>Usuarios</span></h1>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{users.length} registros</span>
            </div>

            {/* Filters */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                    <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre..." style={{ ...input, paddingLeft: '2.75rem' }} />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...input, width: 'auto', cursor: 'pointer' }}>
                    <option value="all">Todos los roles</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Dueño</option>
                    <option value="worker">Staff</option>
                    <option value="customer">Cliente</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <Loader2 size={36} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Usuario', 'Rol', 'VibeCoins', 'Registro', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', textAlign: h === 'Acciones' ? 'right' : 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.3)' }}>Sin resultados</td></tr>
                            )}
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${ROLE_COLORS[u.role] || 'rgba(255,255,255,0.1)'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={18} color={ROLE_COLORS[u.role] || 'rgba(255,255,255,0.5)'} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{u.full_name || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{u.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <span style={{ padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', background: `${ROLE_COLORS[u.role] || 'rgba(255,255,255,0.1)'}22`, color: ROLE_COLORS[u.role] || 'rgba(255,255,255,0.5)' }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: '#fbbf24' }}>{(u.vibe_coins || 0).toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={() => openEdit(u)} style={{ ...btn(), display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem' }}><Edit size={14} /> Editar</button>
                                            <button onClick={() => deleteUser(u)} disabled={deleting === u.id} style={{ ...btn('rgba(239,68,68,0.08)', '1px solid rgba(239,68,68,0.2)'), color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem' }}>
                                                {deleting === u.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit Modal */}
            {editUser && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '480px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                            <h2 style={{ fontWeight: '900', fontSize: '1.4rem' }}>Editar Usuario</h2>
                            <button onClick={closeEdit} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Nombre Completo</label>
                                <input style={input} value={editForm.full_name || ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Rol</label>
                                <select style={{ ...input, cursor: 'pointer' }} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                    <option value="customer">Cliente</option>
                                    <option value="owner">Dueño de Local</option>
                                    <option value="worker">Staff / Mesero</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>VibeCoins</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" max="10000000" style={{ ...input, paddingRight: '5rem' }} value={editForm.vibe_coins} onChange={e => setEditForm({ ...editForm, vibe_coins: parseInt(e.target.value) || 0 })} />
                                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>COINS</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button onClick={closeEdit} style={{ ...btn(), flex: 1 }}>Cancelar</button>
                                <button onClick={saveEdit} disabled={saving} style={{ ...btn('#a855f7', 'none'), flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
