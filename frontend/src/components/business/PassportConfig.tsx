import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, CheckCircle, XCircle, Loader2, Edit3, Save, ToggleLeft, ToggleRight, Star, Lock } from 'lucide-react';
import { loyaltyService } from '../../services/api';

interface StampReward {
    id: string;
    title: string;
    description?: string;
    conditions?: string;
    stamps_required: number;
    active: boolean;
    expires_at?: string;
    expires_modified_at?: string;
}

interface PassportConfigProps {
    venueId: string;
    subscriptionTier?: string;
}

const EMPTY_FORM = { title: '', description: '', conditions: '', stamps_required: 5, active: true, expires_at: '' };

export const PassportConfig: React.FC<PassportConfigProps> = ({ venueId, subscriptionTier = 'VITRINA' }) => {
    const [rewards, setRewards] = useState<StampReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fetchRewards = async () => {
        try {
            const data = await loyaltyService.getVenueStampRewards(venueId);
            setRewards(data);
        } catch { /* noop */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRewards(); }, [venueId]);

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleAiGenerate = async () => {
        setAiLoading(true);
        setError(null);
        try {
            const res = await loyaltyService.aiGenerateStampRewards(venueId);
            setAiSuggestions(res.suggestions || []);
        } catch (e: any) {
            setError('No se pudieron generar sugerencias. Intenta de nuevo.');
        } finally { setAiLoading(false); }
    };

    const applySuggestion = (s: any) => {
        setForm({ title: s.title, description: s.description || '', conditions: s.conditions || '', stamps_required: s.stamps_required || 5, active: true, expires_at: s.expires_at || '' });
        setAiSuggestions([]);
        setShowForm(true);
        setEditingId(null);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) { setError('El título es requerido.'); return; }
        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                await loyaltyService.updateStampReward(venueId, editingId, {
                    ...form,
                    expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined
                });
                showSuccess('Recompensa actualizada.');
            } else {
                await loyaltyService.createStampReward(venueId, {
                    ...form,
                    expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined
                });
                showSuccess('Recompensa creada.');
            }
            setShowForm(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
            fetchRewards();
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Error al guardar.');
        } finally { setSaving(false); }
    };

    const handleToggleActive = async (reward: StampReward) => {
        try {
            await loyaltyService.updateStampReward(venueId, reward.id, { ...reward, active: !reward.active });
            fetchRewards();
        } catch { setError('Error al cambiar estado.'); }
    };

    const handleDelete = async (rewardId: string) => {
        if (!confirm('¿Eliminar esta recompensa?')) return;
        try {
            await loyaltyService.deleteStampReward(venueId, rewardId);
            showSuccess('Recompensa eliminada.');
            fetchRewards();
        } catch { setError('Error al eliminar.'); }
    };

    const startEdit = (r: StampReward) => {
        setForm({ title: r.title, description: r.description || '', conditions: r.conditions || '', stamps_required: r.stamps_required, active: r.active, expires_at: r.expires_at ? r.expires_at.split('T')[0] : '' });
        setEditingId(r.id);
        setShowForm(true);
        setAiSuggestions([]);
    };

    const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.25rem' };
    const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase' as const, display: 'block', marginBottom: '0.5rem' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h3 style={{ fontWeight: '900', color: 'white', marginBottom: '4px' }}>Recompensas del Pasaporte</h3>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Configura qué premio recibe el cliente al completar su pasaporte de sellos.</p>
                    {(subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE') && (
                        <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={12} /> Plan Vitrina (Gratis): Mejora tu plan para activar el Pasaporte.
                        </p>
                    )}
                    {subscriptionTier === 'ARRANQUE' && (
                        <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '6px', fontWeight: '800' }}>
                            Plan Arranque: Límite de 1 recompensa (activa o inactiva).
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleAiGenerate}
                        disabled={aiLoading || (subscriptionTier === 'ARRANQUE' && rewards.length >= 1) || ((subscriptionTier === 'EL PARCHE' || subscriptionTier === 'PRO') && rewards.length >= 10) || subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE'}
                        style={{
                            padding: '0.65rem 1.25rem',
                            borderRadius: '12px',
                            background: 'rgba(168,85,247,0.15)',
                            border: '1px solid rgba(168,85,247,0.4)',
                            color: '#d8b4fe',
                            fontWeight: '800',
                            cursor: (aiLoading || (subscriptionTier === 'ARRANQUE' && rewards.length >= 1) || ((subscriptionTier === 'EL PARCHE' || subscriptionTier === 'PRO') && rewards.length >= 10) || subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE') ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            opacity: ((subscriptionTier === 'ARRANQUE' && rewards.length >= 1) || ((subscriptionTier === 'EL PARCHE' || subscriptionTier === 'PRO') && rewards.length >= 10) || subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE') ? 0.5 : 1
                        }}
                    >
                        {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {aiLoading ? 'Generando...' : 'Sugerir con IA'}
                    </button>
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); setAiSuggestions([]); }}
                        disabled={(subscriptionTier === 'ARRANQUE' && rewards.length >= 1) || ((subscriptionTier === 'EL PARCHE' || subscriptionTier === 'PRO') && rewards.length >= 10) || subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE'}
                        style={{
                            padding: '0.65rem 1.25rem',
                            borderRadius: '12px',
                            background: 'var(--color-neon-teal)',
                            border: 'none',
                            color: 'black',
                            fontWeight: '800',
                            cursor: ((subscriptionTier === 'ARRANQUE' && rewards.length >= 1) || ((subscriptionTier === 'EL PARCHE' || subscriptionTier === 'PRO') && rewards.length >= 10) || subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE') ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            opacity: ((subscriptionTier === 'ARRANQUE' && rewards.length >= 1) || ((subscriptionTier === 'EL PARCHE' || subscriptionTier === 'PRO') && rewards.length >= 10) || subscriptionTier === 'VITRINA' || subscriptionTier === 'FREE') ? 0.5 : 1
                        }}
                    >
                        <Plus size={16} /> Agregar Manual
                    </button>
                </div>
            </div>

            {/* Feedback */}
            {error && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={16} />{error}
                </div>
            )}
            {successMsg && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} />{successMsg}
                </div>
            )}

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="#a855f7" /> Sugerencias de IA — Haz clic para aplicar
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {aiSuggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => applySuggestion(s)}
                                style={{ ...cardStyle, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontWeight: '800', color: 'white', marginBottom: '4px' }}>{s.title}</div>
                                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{s.description}</div>
                                        {s.conditions && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>📋 {s.conditions}</div>}
                                    </div>
                                    <div style={{ background: 'rgba(168,85,247,0.2)', padding: '4px 12px', borderRadius: '8px', whiteSpace: 'nowrap', color: '#d8b4fe', fontWeight: '900', fontSize: '0.8rem' }}>
                                        {s.stamps_required} sellos
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Create / Edit Form */}
            {showForm && (
                <div style={{ ...cardStyle, border: '1px solid rgba(0,243,255,0.3)' }}>
                    <h4 style={{ fontWeight: '800', color: 'white', marginBottom: '1.25rem' }}>
                        {editingId ? 'Editar Recompensa' : 'Nueva Recompensa'}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Título del Premio *</label>
                            <input style={inputStyle} placeholder="Ej: 2x1 en Cervezas Artesanales" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Descripción</label>
                            <input style={inputStyle} placeholder="¿Qué recibe el cliente?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Condiciones</label>
                            <input style={inputStyle} placeholder="Ej: Válido de lunes a jueves, no acumulable" value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Sellos Necesarios</label>
                            <input type="number" min={1} max={50} style={inputStyle} value={form.stamps_required} onChange={e => setForm({ ...form, stamps_required: parseInt(e.target.value) || 5 })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Fecha de Caducidad (Opcional)</label>
                            <input type="date" style={inputStyle} value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                            {editingId && (
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                    Solo modificable 10 días tras el último cambio.
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '1.5rem', gridColumn: '1 / -1' }}>
                            <button
                                onClick={() => setForm({ ...form, active: !form.active })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                {form.active ? <ToggleRight size={36} color="var(--color-neon-teal)" /> : <ToggleLeft size={36} color="rgba(255,255,255,0.2)" />}
                            </button>
                            <span style={{ fontSize: '0.85rem', color: form.active ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.3)', fontWeight: '700' }}>
                                {form.active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: '0.65rem 1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontWeight: '700', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button onClick={handleSubmit} disabled={saving} style={{ padding: '0.65rem 1.5rem', borderRadius: '12px', background: 'var(--color-neon-teal)', border: 'none', color: 'black', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Rewards List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
                    <Loader2 className="animate-spin" size={24} />
                </div>
            ) : rewards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px', color: 'rgba(255,255,255,0.3)' }}>
                    <Star size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Sin recompensas configuradas</div>
                    <div style={{ fontSize: '0.85rem' }}>Usa IA para sugerir ideas o crea una manual.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {rewards.map(r => (
                        <div key={r.id} style={{ ...cardStyle, border: r.active ? '1px solid rgba(0,243,255,0.2)' : '1px solid rgba(255,255,255,0.05)', opacity: r.active ? 1 : 0.5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '800', color: 'white' }}>{r.title}</span>
                                        <span style={{ background: r.active ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.05)', color: r.active ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.3)', padding: '2px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800' }}>
                                            {r.active ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </div>
                                    {r.description && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{r.description}</div>}
                                    {r.conditions && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '4px' }}>📋 {r.conditions}</div>}
                                    {r.expires_at && <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '800' }}>Vence el: {new Date(r.expires_at).toLocaleDateString()}</div>}
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {'★ '.repeat(Math.min(r.stamps_required, 10)).split(' ').filter(Boolean).map((_, i) => (
                                            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-neon-teal)' }}></div>
                                        ))}
                                        {r.stamps_required > 10 && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>+{r.stamps_required - 10}</span>}
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>{r.stamps_required} sellos para desbloquear</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                    <button onClick={() => handleToggleActive(r)} style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>
                                        {r.active ? <ToggleRight size={18} color="var(--color-neon-teal)" /> : <ToggleLeft size={18} />}
                                    </button>
                                    <button onClick={() => startEdit(r)} style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>
                                        <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(r.id)} style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
