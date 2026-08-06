
import React, { useState } from 'react';
import { X, Clock, Users, Loader } from 'lucide-react';

interface CreateCouponModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateCouponModal: React.FC<CreateCouponModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        discount_type: 'percentage',
        value: '',
        target: 'all',
        expiry: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Mock API call for coupon creation
            await new Promise(resolve => setTimeout(resolve, 800));
            onSuccess();
            onClose();
        } catch (err) {
            setError("Error al crear el gangazo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>Crear Gangazo</h2>
                    <button onClick={onClose} style={closeButtonStyle}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} style={formStyle}>
                    {error && <div style={errorBannerStyle}>{error}</div>}

                    <div style={gridStyle}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Título del Gangazo</label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ej. 2x1 en Cerveza, 20% Descuento"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Descripción / Recompensa</label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                placeholder="Detalles de la oferta (ej. válido antes de las 10 PM)"
                                style={textAreaStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Tipo de Oferta</label>
                            <select
                                value={formData.discount_type}
                                onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="percentage">Porcentaje (%)</option>
                                <option value="fixed">Monto Fijo ($)</option>
                                <option value="bogo">2x1</option>
                                <option value="custom">Gangazo Personalizado</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Valor</label>
                            <input
                                type="text"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                placeholder="Ej. 20, 10.00"
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Público Objetivo</label>
                            <div style={{ position: 'relative' }}>
                                <Users size={18} style={iconInputStyle} />
                                <select
                                    value={formData.target}
                                    onChange={e => setFormData({ ...formData, target: e.target.value })}
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                >
                                    <option value="all">Todos los Parceros</option>
                                    <option value="loyal">Parceros Frecuentes (Top 50)</option>
                                    <option value="new">Nuevos en el Local</option>
                                    <option value="vip">Parceros con VIP</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Fecha de Vencimiento</label>
                            <div style={{ position: 'relative' }}>
                                <Clock size={18} style={iconInputStyle} />
                                <input
                                    type="datetime-local"
                                    value={formData.expiry}
                                    onChange={e => setFormData({ ...formData, expiry: e.target.value })}
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={footerStyle}>
                        <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancelar</button>
                        <button type="submit" disabled={loading} style={submitButtonStyle}>
                            {loading ? <Loader className="animate-spin" size={20} /> : 'Activar Gangazo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Reuse styles from CreateEventModal for consistency (simplified here for brevity)
const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '2rem'
};
const modalStyle: React.CSSProperties = {
    background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'
};
const headerStyle: React.CSSProperties = {
    padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' };
const formStyle: React.CSSProperties = { padding: '2rem' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' };
const labelStyle: React.CSSProperties = { display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '0.8rem 1rem', color: 'white', outline: 'none' };
const textAreaStyle: React.CSSProperties = { ...inputStyle, resize: 'none' };
const iconInputStyle: React.CSSProperties = { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' };
const footerStyle: React.CSSProperties = { marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' };
const cancelButtonStyle: React.CSSProperties = { padding: '0.8rem 1.5rem', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '700', cursor: 'pointer' };
const submitButtonStyle: React.CSSProperties = { padding: '0.8rem 2rem', borderRadius: '14px', border: 'none', background: '#eab308', color: 'black', fontWeight: '900', cursor: 'pointer' };
const errorBannerStyle: React.CSSProperties = { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '1rem', color: '#ef4444', marginBottom: '1.5rem' };
