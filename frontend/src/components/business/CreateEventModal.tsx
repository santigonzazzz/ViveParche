
import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Tag, Image as ImageIcon, Users, DollarSign, Loader } from 'lucide-react';
import { eventService, municipalityService, placeService } from '../../services/api';
import type { Municipality, EventCreate } from '../../types';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    venueId?: string;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSuccess, venueId: propVenueId }) => {
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        municipality_id: '',
        price: '',
        total_tickets: '100',
        vibe_tags: '',
        image_url: '',
        ticket_contact_type: '' as '' | 'whatsapp' | 'url',
        ticket_contact_value: ''
    });
    const [venueId, setVenueId] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
                alert('Solo se permiten imágenes JPG, PNG y WEBP.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen no puede superar los 5MB.');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                try {
                    const [muniData, venueData] = await Promise.all([
                        municipalityService.getAll(),
                        propVenueId
                            ? placeService.getById(propVenueId).catch(() => null)
                            : placeService.getProfile().catch(() => null)
                    ]);
                    setMunicipalities(muniData);
                    if (venueData) {
                        setVenueId(venueData.id);
                        // Auto-fill municipality and location if venue exists
                        setFormData(prev => ({
                            ...prev,
                            municipality_id: venueData.municipality_id || prev.municipality_id,
                            location: venueData.address || prev.location
                        }));
                    }
                } catch (err) {
                    console.error("Failed to load modal data", err);
                }
            };
            loadData();
        }
    }, [isOpen, propVenueId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) throw new Error("No user logged in");
            const user = JSON.parse(userStr);

            let finalImageUrl = formData.image_url || undefined;
            if (imageFile) {
                const uploadRes = await eventService.uploadImage(imageFile);
                finalImageUrl = uploadRes.image_url;
            }

            const eventData: EventCreate = {
                title: formData.title,
                description: formData.description,
                event_date: `${formData.date}T${formData.time}:00Z`,
                location_address: formData.location,
                municipality_id: formData.municipality_id,
                owner_id: user.id,
                venue_id: venueId || undefined,
                price: parseFloat(formData.price) || 0,
                vibe_tags: formData.vibe_tags.split(',').map(t => t.trim()).filter(t => t),
                image_url: finalImageUrl,
                ticket_contact_type: formData.ticket_contact_type || undefined,
                ticket_contact_value: formData.ticket_contact_value || undefined,
            };

            await eventService.create(eventData);
            setImageFile(null);
            setImagePreview(null);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error al crear el parche");
        } finally {
            setLoading(false);
        }
    };

    const responsiveOverlayStyle: React.CSSProperties = {
        ...overlayStyle,
        padding: isMobile ? '0' : '2rem',
        alignItems: isMobile ? 'flex-end' : 'center'
    };

    const responsiveModalStyle: React.CSSProperties = {
        ...modalStyle,
        borderRadius: isMobile ? '32px 32px 0 0' : '32px',
        maxHeight: isMobile ? '90vh' : '90vh',
    };

    const responsiveHeaderStyle: React.CSSProperties = {
        ...headerStyle,
        padding: isMobile ? '1.5rem' : '2rem'
    };

    const responsiveFormStyle: React.CSSProperties = {
        ...formStyle,
        padding: isMobile ? '1.5rem' : '2rem'
    };

    const responsiveGridStyle: React.CSSProperties = {
        ...gridStyle,
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '1rem' : '1.5rem'
    };

    return (
        <div style={responsiveOverlayStyle}>
            <div style={responsiveModalStyle}>
                <div style={responsiveHeaderStyle}>
                    <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900', color: 'white' }}>Crear Nuevo Parche</h2>
                    <button onClick={onClose} style={closeButtonStyle}><X size={isMobile ? 20 : 24} /></button>
                </div>

                <form onSubmit={handleSubmit} style={responsiveFormStyle}>
                    {error && <div style={errorBannerStyle}>{error}</div>}

                    <div style={responsiveGridStyle}>
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={labelStyle}>Título del Parche</label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ingresa un nombre brutal"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={labelStyle}>Descripción</label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                placeholder="¿De qué se trata este parche?"
                                style={textAreaStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Fecha</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={iconInputStyle} />
                                <input
                                    required
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Hora</label>
                            <input
                                required
                                type="time"
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={labelStyle}>Dirección del Local</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={iconInputStyle} />
                                <input
                                    required
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ej. Calle 10 # 35-42, El Poblado"
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Municipio</label>
                            <select
                                required
                                value={formData.municipality_id}
                                onChange={e => setFormData({ ...formData, municipality_id: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">Seleccionar Municipio</option>
                                {municipalities.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Etiquetas de Vibra</label>
                            <div style={{ position: 'relative' }}>
                                <Tag size={18} style={iconInputStyle} />
                                <input
                                    value={formData.vibe_tags}
                                    onChange={e => setFormData({ ...formData, vibe_tags: e.target.value })}
                                    placeholder="rumba, música, comida"
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Precio ($ COP)</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={18} style={iconInputStyle} />
                                <input
                                    required
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0"
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Total Boletas</label>
                            <div style={{ position: 'relative' }}>
                                <Users size={18} style={iconInputStyle} />
                                <input
                                    required
                                    type="number"
                                    value={formData.total_tickets}
                                    onChange={e => setFormData({ ...formData, total_tickets: e.target.value })}
                                    style={{ ...inputStyle, paddingLeft: '2.8rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={labelStyle}>Imagen del Parche (Opcional, Max 5MB)</label>
                            <div style={{
                                width: '100%',
                                height: '140px',
                                background: imagePreview ? 'none' : 'rgba(255,255,255,0.03)',
                                border: '2px dashed rgba(255,255,255,0.1)',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                    onChange={handleImageChange}
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        zIndex: 2
                                    }}
                                />
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.4 }}>
                                        <ImageIcon size={32} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Haz clic o arrastra la imagen aquí</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ticket Contact Channel */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.5rem' }}>
                            <label style={labelStyle}>📲 Canal de Venta de Boletas</label>
                            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>¿Cómo quieres que los usuarios te contacten para comprar boletas?</p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {(['', 'whatsapp', 'url'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, ticket_contact_type: type, ticket_contact_value: '' })}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            borderRadius: '100px',
                                            border: formData.ticket_contact_type === type ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                            background: formData.ticket_contact_type === type ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.04)',
                                            color: 'white', fontWeight: '700', fontSize: '0.85rem',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                    >
                                        {type === '' ? '⭕ Sin configurar' : type === 'whatsapp' ? '💬 WhatsApp' : '🔗 URL'}
                                    </button>
                                ))}
                            </div>
                            {formData.ticket_contact_type === 'whatsapp' && (
                                <input
                                    value={formData.ticket_contact_value}
                                    onChange={e => setFormData({ ...formData, ticket_contact_value: e.target.value })}
                                    placeholder="Número WhatsApp con código de país: +573001234567"
                                    style={inputStyle}
                                />
                            )}
                            {formData.ticket_contact_type === 'url' && (
                                <input
                                    value={formData.ticket_contact_value}
                                    onChange={e => setFormData({ ...formData, ticket_contact_value: e.target.value })}
                                    placeholder="https://tu-plataforma.com/comprar-boletas"
                                    style={inputStyle}
                                />
                            )}
                        </div>
                    </div>

                    <div style={{
                        ...footerStyle,
                        flexDirection: isMobile ? 'column-reverse' : 'row',
                        gap: isMobile ? '0.75rem' : '1rem'
                    }}>
                        <button type="button" onClick={onClose} style={{ ...cancelButtonStyle, width: isMobile ? '100%' : 'auto' }}>Cancelar</button>
                        <button type="submit" disabled={loading} style={{ ...submitButtonStyle, width: isMobile ? '100%' : 'auto' }}>
                            {loading ? <Loader className="animate-spin" size={20} /> : 'Crear Parche'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator,
                input[type="time"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
            `}</style>
        </div>
    );
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '2rem'
};

const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const modalStyle: React.CSSProperties = {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '32px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
};

const headerStyle: React.CSSProperties = {
    padding: '2rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    background: '#0a0a0a',
    zIndex: 10
};

const formStyle: React.CSSProperties = {
    padding: '2rem'
};

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    padding: '0.8rem 1rem',
    color: 'white',
    outline: 'none',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s'
};

const textAreaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'none'
};

const iconInputStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.3)'
};

const footerStyle: React.CSSProperties = {
    marginTop: '2.5rem',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem'
};

const cancelButtonStyle: React.CSSProperties = {
    padding: '0.8rem 1.5rem',
    borderRadius: '14px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontWeight: '700',
    cursor: 'pointer'
};

const submitButtonStyle: React.CSSProperties = {
    padding: '0.8rem 2rem',
    borderRadius: '14px',
    border: 'none',
    background: 'var(--color-neon-purple)',
    color: 'white',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(111, 66, 193, 0.2)'
};

const errorBannerStyle: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '1rem',
    color: '#ef4444',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600'
};
