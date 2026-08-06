import React, { useState } from 'react';
import { Tag, Ticket, Star, X, Plus, Loader2, Sparkles } from 'lucide-react';
import { businessApi } from '../../services/businessApi';

interface PerkFormProps {
    eventId: string;
    onSuccess: (perk: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const PerkForm: React.FC<PerkFormProps> = ({ eventId, onSuccess, onCancel, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        type: (initialData?.type?.toLowerCase() || 'discount') as 'discount' | 'freebie' | 'access' | 'bonus',
        conditions: initialData?.conditions || '',
        active: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newPerk = await businessApi.createPerk({
                ...formData,
                event_id: eventId
            });
            onSuccess(newPerk);
        } catch (error) {
            console.error("Failed to create perk:", error);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '2px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '32px',
            padding: '3rem',
            backdropFilter: 'blur(30px)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            color: 'white'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                <div>
                    <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                        Crear Nuevo Gangazo
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: '1rem' }}>Diseña una oferta irresistible para tus fans.</p>
                </div>
                <button
                    onClick={onCancel}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '16px', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Title */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                        Nombre de la Oferta
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="Ej. 2x1 EN TRAGOS TODA LA NOCHE"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '1.25rem 1.5rem',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            color: 'white',
                            outline: 'none',
                            transition: 'all 0.3s'
                        }}
                        onFocus={e => e.currentTarget.style.border = '1px solid #8b5cf6'}
                        onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
                    />
                </div>

                {/* Description */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                        Descripción
                    </label>
                    <textarea
                        required
                        rows={3}
                        placeholder="Explica la vibra de este gangazo..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '1.25rem 1.5rem',
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: 'rgba(255,255,255,0.8)',
                            outline: 'none',
                            transition: 'all 0.3s',
                            resize: 'none'
                        }}
                        onFocus={e => e.currentTarget.style.border = '1px solid #8b5cf6'}
                        onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
                    />
                </div>

                {/* Type Selection */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                        Tipo de Oferta
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {(['discount', 'freebie', 'access', 'bonus'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: type as any })}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1rem',
                                    borderRadius: '20px',
                                    background: formData.type === type ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                                    border: formData.type === type ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                                    color: formData.type === type ? 'white' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {type === 'discount' && <Tag size={18} />}
                                {type === 'freebie' && <Ticket size={18} />}
                                {type === 'access' && <Star size={18} />}
                                {type === 'bonus' && <Sparkles size={18} />}
                                <span style={{ fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase' }}>
                                    {type === 'discount' ? 'Descuento' : type === 'freebie' ? 'Gratis' : type === 'access' ? 'Acceso VIP' : 'Bono'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conditions */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                        Detalles de Validez
                    </label>
                    <input
                        type="text"
                        placeholder="Ej. Válido hasta las 12:00 PM"
                        value={formData.conditions}
                        onChange={e => setFormData({ ...formData, conditions: e.target.value })}
                        style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '1.25rem 1.5rem',
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{ flex: 1, padding: '1.25rem', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '900', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                        Descartar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            flex: 2,
                            padding: '1.25rem',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            border: 'none',
                            color: 'white',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 10px 25px rgba(109, 40, 217, 0.4)'
                        }}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        Lanzar Gangazo
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PerkForm;
