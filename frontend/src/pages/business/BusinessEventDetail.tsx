
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Calendar, MapPin, DollarSign,
    MessageSquare, Send, Loader2, BrainCircuit, ChevronDown, ChevronUp,
    Save, X, Plus, Percent, Ticket
} from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import type { EventData } from '../../services/businessApi';
import PerksManager from './PerksManager';
import { RestrictedFeature } from '../../components/business/RestrictedFeature';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export const BusinessEventDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'analytics' | 'perks' | 'edit'>('analytics');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [showAISuggestions, setShowAISuggestions] = useState(false);
    const [venueTier, setVenueTier] = useState<string>('FREE');
    const [user] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

    // Datos de ventas del evento
    const [analytics, setAnalytics] = useState<any>(null);
    const [ticketStats, setTicketStats] = useState<any>(null);

    // Edit event state
    const [editForm, setEditForm] = useState({ title: '', date: '', price: '', location_address: '', description: '', status: 'active', ticket_contact_type: '' as '' | 'whatsapp' | 'url', ticket_contact_value: '' });
    const [editImages, setEditImages] = useState<File[]>([]);
    const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editStatus, setEditStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const editImageInputRef = React.useRef<HTMLInputElement>(null);

    const handleUpdateManualSales = async (num: number) => {
        if (!id) return;
        try {
            await businessApi.updateEvent(id, { manual_tickets_sold: num });

            // Re-fetch all relevant stats to ensure everything is in sync
            const [analData, statsData, eventData] = await Promise.all([
                businessApi.getEventAnalytics(id),
                businessApi.getEventTicketingStats(id),
                businessApi.getEventDetail(id)
            ]);

            setAnalytics(analData);
            setTicketStats(statsData);
            setEvent(eventData);

            setEditStatus({ type: 'success', message: 'Ventas manuales actualizadas' });
        } catch (err) {
            console.warn('Error al actualizar ventas manuales:', err);
            setEditStatus({ type: 'error', message: 'Error al actualizar ventas' });
        }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Map real analytics data to chart format
    const chartData = analytics?.sales_chart?.labels.map((label: string, i: number) => ({
        name: label,
        sales: analytics.sales_chart.data[i],
        revenue: analytics.sales_chart.data[i] * (event?.price || 0)
    })) || [];

    useEffect(() => {
        if (id) {
            const loadData = async () => {
                try {
                    setLoading(true);
                    const [data, analData, statsData] = await Promise.all([
                        businessApi.getEventDetail(id),
                        businessApi.getEventAnalytics(id),
                        businessApi.getEventTicketingStats(id)
                    ]);
                    setEvent(data);
                    setAnalytics(analData);
                    setTicketStats(statsData);
                    // Prefill edit form
                    const rawDate = (data as any).event_date || data.date || '';
                    let formattedDate = '';
                    if (rawDate) {
                        try {
                            const d = new Date(rawDate);
                            // Format to YYYY-MM-DDThh:mm for datetime-local
                            formattedDate = d.toISOString().slice(0, 16);
                        } catch (e) {
                            console.warn('Error al formatear la fecha:', e);
                            formattedDate = rawDate;
                        }
                    }

                    setEditForm({
                        title: data.title || '',
                        date: formattedDate,
                        price: data.price?.toString() || '',
                        location_address: (data as any).location_address || '',
                        description: (data as any).description || '',
                        status: data.status || 'active',
                        ticket_contact_type: (data as any).ticket_contact_type || '',
                        ticket_contact_value: (data as any).ticket_contact_value || '',
                    });

                    // Fetch venue tier if venue_id exists (it should be on the event)
                    if (data.venue_id) {
                        const venue = await businessApi.getVenueProfile(data.venue_id);
                        setVenueTier(venue.subscription_tier || 'FREE');
                    }
                } catch (err) {
                    console.warn('Error al cargar los datos del evento:', err);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }
    }, [id]);

    // Edit event handlers
    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const valid = files.filter(f => allowed.includes(f.type)).slice(0, 5 - editImages.length);
        setEditImages(prev => [...prev, ...valid].slice(0, 5));
        valid.forEach(f => {
            const reader = new FileReader();
            reader.onload = ev => setEditImagePreviews(prev => [...prev, ev.target?.result as string].slice(0, 5));
            reader.readAsDataURL(f);
        });
        e.target.value = '';
    };

    const handleSaveEdit = async () => {
        if (!id) return;
        setIsSavingEdit(true);
        setEditStatus(null);
        try {
            let imageUrl = event?.image_url;

            // 1. Upload new image if selected
            if (editImages.length > 0) {
                const uploadRes = await businessApi.uploadVenueFile(editImages[0], 'event_image', user.id);
                imageUrl = uploadRes.url;
            }

            // 2. Update event details
            await businessApi.updateEvent(id, {
                title: editForm.title,
                event_date: editForm.date,
                price: parseFloat(editForm.price) || 0,
                status: editForm.status,
                location_address: editForm.location_address,
                description: editForm.description,
                image_url: imageUrl,
                ticket_contact_type: editForm.ticket_contact_type || undefined,
                ticket_contact_value: editForm.ticket_contact_value || undefined,
            });

            setEvent(prev => prev ? {
                ...prev,
                title: editForm.title,
                event_date: editForm.date,
                price: parseFloat(editForm.price) || prev.price,
                status: editForm.status as any,
                image_url: imageUrl || prev.image_url
            } : prev);

            setEditStatus({ type: 'success', message: '¡Parche actualizado con éxito!' });

            // Clear selected images after success
            setEditImages([]);
        } catch (err: any) {
            console.warn('Error al guardar los cambios del evento:', err);
            setEditStatus({ type: 'error', message: err.response?.data?.detail || 'Error al actualizar el parche' });
        } finally {
            setIsSavingEdit(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-neon-purple)" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Analizando Rendimiento del Parche...</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Este proceso tomará unos segundos...</p>
            </div>
        );
    }

    if (!event) return <div style={{ color: 'white', padding: '2rem' }}>Parche no encontrado.</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 1rem 2rem 1rem' : '0 0 2.5rem 0' }}>
            <button
                onClick={() => navigate('/business/events')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '700' }}
            >
                <ChevronLeft size={18} /> Volver a Parches
            </button>

            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-start',
                marginBottom: '2.5rem',
                gap: '1.5rem'
            }}>
                <div style={{ width: isMobile ? '100%' : 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', color: 'white' }}>{event.title}</h1>
                        <span style={{ padding: '4px 12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid rgba(34, 197, 94, 0.2)' }}>{(event.status || 'draft').toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.75rem' : '2rem', color: 'rgba(255,255,255,0.4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {event.date}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {(event as any).location_address || 'Ubicación por confirmar'}</div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Carousel on Mobile */}
            <div style={{
                display: isMobile ? 'flex' : 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                marginBottom: '2.5rem',
                overflowX: isMobile ? 'auto' : 'visible',
                paddingBottom: isMobile ? '1rem' : '0',
                marginLeft: isMobile ? '-1rem' : '0',
                marginRight: isMobile ? '-1rem' : '0',
                paddingLeft: isMobile ? '1rem' : '0',
                paddingRight: isMobile ? '1rem' : '0',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <div style={{ ...statCardStyle, minWidth: isMobile ? '240px' : 'auto', flexShrink: 0, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={statIconStyle('#6f42c1')}><Ticket size={20} color="var(--color-neon-purple)" /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>{ticketStats?.tickets_sold || 0}</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Boletas Vendidas</div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const val = prompt('¿Cuántas boletas adicionales se vendieron?', (ticketStats?.manual_tickets_sold || 0).toString());
                            if (val !== null) {
                                const num = parseInt(val);
                                if (!isNaN(num)) {
                                    handleUpdateManualSales(num);
                                }
                            }
                        }}
                        style={{ background: 'rgba(111,66,193,0.1)', border: '1px solid rgba(111,66,193,0.2)', color: 'var(--color-neon-purple)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                        + Añadir
                    </button>
                </div>
                <div style={{ ...statCardStyle, minWidth: isMobile ? '240px' : 'auto', flexShrink: 0 }}>
                    <div style={statIconStyle('#22c55e')}><DollarSign size={20} color="#22c55e" /></div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>${((ticketStats?.tickets_sold || 0) * (event?.price || 0)).toLocaleString()}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Ingresos Est.</div>
                    </div>
                </div>
                <div style={{ ...statCardStyle, minWidth: isMobile ? '240px' : 'auto', flexShrink: 0, gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <div style={statIconStyle('#eab308')}><Percent size={20} color="#eab308" /></div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>{ticketStats?.view_count || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Interesados en el evento</div>
                    </div>
                </div>
            </div>

            {/* Tabs - with horizontal scroll on mobile */}
            <div style={{
                display: 'flex',
                gap: '2rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '2.5rem',
                overflowX: isMobile ? 'auto' : 'visible',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none'
            }}>
                <button onClick={() => setActiveTab('analytics')} style={tabStyle(activeTab === 'analytics')}>Rendimiento</button>
                <button onClick={() => setActiveTab('perks')} style={tabStyle(activeTab === 'perks')}>Gangazos y Cupones</button>
                <button onClick={() => setActiveTab('edit')} style={tabStyle(activeTab === 'edit')}>✏️ Editar Parche</button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', gap: '2rem' }}>
                    <div style={{ ...cardStyle, padding: isMobile ? '1.25rem' : '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white', marginBottom: '1.5rem' }}>Rendimiento de Ventas (Últimos 7 Días)</h3>
                        <div style={{ height: isMobile ? '220px' : '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-neon-purple)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-neon-purple)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.2)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ color: 'white' }}
                                        formatter={(value: any, name: any) => [
                                            name === 'revenue' ? `$${value.toLocaleString()}` : value,
                                            name === 'revenue' ? 'Ingresos' : 'Ventas'
                                        ]}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="var(--color-neon-purple)" fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {isMobile && (
                            <RestrictedFeature tier={venueTier} requiredTier="PRO" userRole={user.role}>
                                <button
                                    onClick={() => setShowAISuggestions(!showAISuggestions)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        padding: '1rem', background: 'rgba(111, 66, 193, 0.1)', color: 'var(--color-neon-purple)',
                                        border: '1px solid var(--color-neon-purple)', borderRadius: '16px', fontWeight: '800', cursor: 'pointer'
                                    }}
                                >
                                    <BrainCircuit size={20} />
                                    {showAISuggestions ? 'Ocultar Sugerencias de IA' : 'Mostrar Sugerencias de IA'}
                                    {showAISuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </RestrictedFeature>
                        )}

                        {(!isMobile || showAISuggestions) && (
                            <RestrictedFeature
                                tier={venueTier}
                                requiredTier="PRO"
                                userRole={user.role}
                                fallback={!isMobile ? <div style={{ ...cardStyle, opacity: 0.5, textAlign: 'center', padding: '2rem' }}>Upgrade to PRO for AI Suggestions</div> : null}
                            >
                                <div style={{ ...cardStyle, padding: isMobile ? '1.5rem' : '2rem', background: 'linear-gradient(135deg, rgba(111, 66, 193, 0.1) 0%, rgba(5, 5, 5, 0) 100%)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                        <MessageSquare size={20} color="var(--color-neon-purple)" />
                                        <h4 style={{ fontWeight: '800' }}>Sugerencias del Copiloto IA</h4>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={suggestionStyle}>
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                                Ejemplo de mensaje post-evento:
                                            </p>
                                            <p style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.75rem' }}>
                                                "¡Gracias por ser parte de {event.title}! Nos encantó tenerte."
                                            </p>
                                            <button style={actionButtonStyle}><Send size={14} /> Enviar a Invitados</button>
                                        </div>
                                        <div style={suggestionStyle}>
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                                Ejemplo de mensaje de fidelización:
                                            </p>
                                            <p style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.75rem' }}>
                                                "¡No te pierdas nuestro próximo parche! Aquí tienes un 10% de descuento para nuestro próximo evento."
                                            </p>
                                            <button style={actionButtonStyle}><Send size={14} /> Enviar a Clientes Fieles</button>
                                        </div>
                                    </div>
                                </div>
                            </RestrictedFeature>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'perks' && (
                <div style={{ ...cardStyle, padding: isMobile ? '1rem' : '2rem' }}>
                    <PerksManager event={event} />
                </div>
            )}

            {/* ── EDIT PARCHE TAB ── */}
            {activeTab === 'edit' && (
                <div style={{ ...cardStyle, padding: isMobile ? '1.25rem' : '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '800', color: 'white', margin: 0 }}>Editar Parche</h3>

                    {/* Status toast */}
                    {editStatus && (
                        <div style={{
                            padding: '0.85rem 1.25rem', borderRadius: '12px',
                            background: editStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${editStatus.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            color: editStatus.type === 'success' ? '#22c55e' : '#f87171',
                            fontSize: '0.88rem', fontWeight: '600'
                        }}>
                            {editStatus.message}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                        {/* Title */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={editLabelStyle}>Nombre del Parche</label>
                            <input
                                value={editForm.title}
                                onFocus={e => e.target.select()}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                style={editInputStyle}
                                placeholder="Nombre del evento"
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label style={editLabelStyle}>Fecha y Hora</label>
                            <input
                                type="datetime-local"
                                value={editForm.date}
                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                style={editInputStyle}
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label style={editLabelStyle}>Precio (COP)</label>
                            <input
                                type="number" min="0"
                                value={editForm.price}
                                onFocus={e => e.target.select()}
                                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                style={editInputStyle}
                                placeholder="0"
                            />
                        </div>

                        {/* Location */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={editLabelStyle}>Dirección</label>
                            <input
                                value={editForm.location_address}
                                onFocus={e => e.target.select()}
                                onChange={e => setEditForm({ ...editForm, location_address: e.target.value })}
                                style={editInputStyle}
                                placeholder="Calle 10 #5-20, Bello"
                            />
                        </div>

                        {/* Description */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={editLabelStyle}>Descripción</label>
                            <textarea
                                rows={isMobile ? 3 : 4}
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                style={{ ...editInputStyle, resize: 'vertical', minHeight: '80px', borderRadius: '12px' }}
                                placeholder="Cuéntales de qué va este parche..."
                            />
                        </div>

                        {/* Status toggle */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={editLabelStyle}>Estado del Parche</label>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {(['active', 'cancelled', 'draft'] as const).map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, status: s })}
                                        style={{
                                            padding: '0.6rem 1.25rem', borderRadius: '100px',
                                            border: `1px solid ${editForm.status === s ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.1)'}`,
                                            background: editForm.status === s ? 'rgba(111,66,193,0.15)' : 'transparent',
                                            color: editForm.status === s ? 'white' : 'rgba(255,255,255,0.4)',
                                            fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {s === 'active' ? '✅ Activo' : s === 'cancelled' ? '❌ Cancelado' : '📝 Borrador'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ticket Contact Channel */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <label style={editLabelStyle}>📲 Canal de Venta de Boletas</label>
                            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>¿Cómo quieres que los usuarios te contacten para comprar boletas?</p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {(['', 'whatsapp', 'url'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, ticket_contact_type: type, ticket_contact_value: '' })}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            borderRadius: '100px',
                                            border: editForm.ticket_contact_type === type ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                            background: editForm.ticket_contact_type === type ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.04)',
                                            color: 'white', fontWeight: '700', fontSize: '0.85rem',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                    >
                                        {type === '' ? '⭕ Sin configurar' : type === 'whatsapp' ? '💬 WhatsApp' : '🔗 URL'}
                                    </button>
                                ))}
                            </div>
                            {editForm.ticket_contact_type === 'whatsapp' && (
                                <input
                                    value={editForm.ticket_contact_value}
                                    onChange={e => setEditForm({ ...editForm, ticket_contact_value: e.target.value })}
                                    placeholder="Número WhatsApp con código de país: +573001234567"
                                    style={editInputStyle}
                                />
                            )}
                            {editForm.ticket_contact_type === 'url' && (
                                <input
                                    value={editForm.ticket_contact_value}
                                    onChange={e => setEditForm({ ...editForm, ticket_contact_value: e.target.value })}
                                    placeholder="https://tu-plataforma.com/comprar-boletas"
                                    style={editInputStyle}
                                />
                            )}
                        </div>

                        {/* Images */}
                        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                            <label style={editLabelStyle}>Imágenes del Evento (máx. 5)</label>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                {editImagePreviews.map((src, i) => (
                                    <div key={i} style={{ position: 'relative' }}>
                                        <img src={src} alt="" style={{ width: isMobile ? '70px' : '85px', height: isMobile ? '70px' : '85px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditImages(p => p.filter((_, idx) => idx !== i));
                                                setEditImagePreviews(p => p.filter((_, idx) => idx !== i));
                                            }}
                                            style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: '2px solid #050505', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                                {editImages.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => editImageInputRef.current?.click()}
                                        style={{ width: isMobile ? '70px' : '85px', height: isMobile ? '70px' : '85px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Plus size={18} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>Añadir</span>
                                    </button>
                                )}
                            </div>
                            <input ref={editImageInputRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleEditImageChange} />
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>JPG/PNG/WEBP. La subida de imágenes del evento estará disponible próximamente.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleSaveEdit}
                            disabled={isSavingEdit}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--color-neon-purple)', color: 'white', border: 'none',
                                padding: '0.85rem 2rem', borderRadius: '14px', fontWeight: '900',
                                cursor: isSavingEdit ? 'wait' : 'pointer', opacity: isSavingEdit ? 0.7 : 1,
                                width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(111,66,193,0.3)', fontSize: '0.95rem'
                            }}
                        >
                            {isSavingEdit ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles
const statCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '24px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
};

const statIconStyle = (color: string): React.CSSProperties => ({
    background: `${color}15`,
    padding: '12px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '32px',
    padding: '2rem'
};

const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '1rem 0',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-neon-purple)' : '2px solid transparent',
    color: active ? 'white' : 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
});

const suggestionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '1rem'
};

const actionButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer'
};

const editLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.5rem'
};

const editInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '100px',
    padding: '0.75rem 1.25rem',
    color: 'white',
    outline: 'none',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
};
