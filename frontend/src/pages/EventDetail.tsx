import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Chatbot } from '../components/Chatbot';
import { eventService, viewService, ticketService } from '../services/api';
import type { Event } from '../types';
import {
    MapPin, Sparkles, Percent,
    Volume2, Users, Moon, Accessibility, ChevronRight,
    GlassWater, Zap, Info, Calendar, ExternalLink,
    MessageSquare, Store, ChevronLeft
} from 'lucide-react';
import { CustomerChatWindow } from '../components/CustomerChatWindow';
import { ImageLightbox } from '../components/ImageLightbox';
import { MobileNav } from '../components/MobileNav';

export const EventDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const [perks, setPerks] = useState<any[]>([]);
    const [showChat, setShowChat] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (slug) {
            setLoading(true);
            eventService.getById(slug)
                .then(eventData => {
                    setEvent(eventData);
                    // Track view (silent, logged-in users only)
                    if (eventData.id) {
                        viewService.trackEventView(eventData.id);
                    }

                    // Fetch perks using the actual ID
                    return eventService.getPerks(eventData.id);
                })
                .then(perksData => {
                    setPerks(perksData);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [slug]);

    // Map backend perks to UI format
    const displayPerks = perks.map(p => {
        let icon = <Sparkles size={20} />;
        let iconBg = 'rgba(189, 0, 255, 0.2)';
        let tagColor = 'var(--color-neon-purple)';

        switch (p.type) {
            case 'discount':
                icon = <Percent size={20} />;
                iconBg = 'rgba(34, 197, 94, 0.2)';
                tagColor = '#22c55e';
                break;
            case 'freebie':
                icon = <GlassWater size={20} />;
                iconBg = 'rgba(189, 0, 255, 0.2)';
                tagColor = 'var(--color-neon-purple)';
                break;
            case 'access':
                icon = <Zap size={20} />;
                iconBg = 'rgba(234, 179, 8, 0.2)';
                tagColor = '#eab308';
                break;
        }

        return {
            title: p.title,
            desc: p.description,
            icon: icon,
            tag: p.type ? p.type.toUpperCase() : 'GANGAZO',
            iconBg: iconBg,
            tagColor: tagColor
        };
    });

    // Ticket Contact Handler - replaces old checkout flow
    const handleGetTickets = async () => {
        if (!event) return;

        // CASO 1: Evento GRATUITO (precio = 0)
        if (event.price === 0) {
            // Require authentication
            const token = localStorage.getItem('access_token');
            if (!token) {
                navigate(`/login?redirect=/events/${slug}`);
                return;
            }
            try {
                const reservation = await ticketService.reserve(event.id, 1);
                navigate(`/checkout/${event.id}?res=${reservation.reservation_id}`);
            } catch (err: any) {
                const detail = err.response?.data?.detail || err.message || 'Error desconocido';
                alert(`No se pudo reservar el ticket: ${detail}`);
            }
            return;
        }

        // CASO 2: Evento DE PAGO (precio > 0)
        const contactType = (event as any).ticket_contact_type;
        const contactValue = (event as any).ticket_contact_value;

        if (contactType === 'whatsapp' && contactValue) {
            const phone = contactValue.replace(/\D/g, '');
            const msg = encodeURIComponent(`Hola, vengo de la aplicación Viveparché, quiero comprar boletas para "${event.title}"`);
            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        } else if (contactType === 'url' && contactValue) {
            window.open(contactValue, '_blank');
        }
        // If no contact — button is disabled, user can't click (handled in render)
    };

    const images = useMemo(() => {
        const list = [];
        if (event?.image_url) list.push(event.image_url);
        if ((event as any)?.gallery_images && Array.isArray((event as any).gallery_images)) {
            list.push(...(event as any).gallery_images);
        }
        if (list.length === 0) list.push('/assets/placeholder_event.jpg');
        return list;
    }, [event]);

    const dateStr = useMemo(() => {
        if (!event?.event_date) return 'TBD';
        return new Date(event.event_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
    }, [event]);

    const timeStr = useMemo(() => {
        if (!event?.event_date) return 'TBD';
        return new Date(event.event_date).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
    }, [event]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div className="neon-text-purple">Cargando evento...</div>
        </div>
    );

    if (!event) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div style={{ textAlign: 'center' }}>
                <h2>Parche no encontrado</h2>
                <Link to="/" className="btn-secondary">Volver al Inicio</Link>
            </div>
        </div>
    );

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };



    return (
        <div style={{ minHeight: '100vh', paddingBottom: '8rem', background: 'var(--color-bg)', color: 'white' }}>
            <Navbar />

            {/* Breadcrumbs */}
            <div className="container" style={{ paddingTop: '8rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Inicio</Link>
                    <ChevronRight size={14} />
                    <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Parches</Link>
                    <ChevronRight size={14} />
                    <span style={{ color: 'var(--color-neon-purple)' }}>{event.title}</span>
                </div>
            </div>

            {/* Hero Image Section */}
            <div className="container" style={{ marginBottom: '3rem' }}>
                {/* Gallery trigger button */}
                {event.image_url && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        <button
                            onClick={() => setLightboxOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white', padding: isMobile ? '0.6rem 1rem' : '0.7rem 1.4rem',
                                borderRadius: '100px', fontWeight: '800',
                                fontSize: isMobile ? '0.8rem' : '0.9rem',
                                cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em'
                            }}
                        >
                            🖼 {isMobile ? 'Ver Fotos' : 'Ver el Evento'}
                        </button>
                    </div>
                )}

                <div style={{
                    minHeight: isMobile ? '350px' : '550px',
                    width: '100%',
                    background: '#0d0d0d',
                    borderRadius: isMobile ? '24px' : '40px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {/* Background Images with transition */}
                    {images.map((img: string, idx: number) => (
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: `url(${img}) center/cover`,
                                opacity: idx === currentImageIndex ? 1 : 0,
                                transition: 'opacity 0.6s ease-in-out',
                                zIndex: 0
                            }}
                        />
                    ))}

                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)', zIndex: 1 }}></div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                style={{
                                    position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white', borderRadius: '50%', width: '48px', height: '48px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s'
                                }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={nextImage}
                                style={{
                                    position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white', borderRadius: '50%', width: '48px', height: '48px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s'
                                }}
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    {/* Image Indicators */}
                    {images.length > 1 && (
                        <div style={{
                            position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)',
                            zIndex: 10, display: 'flex', gap: '8px'
                        }}>
                            {images.map((_: string, idx: number) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: idx === currentImageIndex ? '24px' : '8px',
                                        height: '8px',
                                        borderRadius: '4px',
                                        background: idx === currentImageIndex ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.3)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: idx === currentImageIndex ? '0 0 10px var(--color-neon-purple)' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div style={{
                        position: 'relative',
                        zIndex: 5,
                        maxWidth: '800px',
                        width: '100%',
                        padding: isMobile ? '2rem 1.5rem' : '3rem',
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {event.vibe_tags && event.vibe_tags.length > 0 && (
                                <>
                                    {event.vibe_tags.map((tag, idx) => (
                                        <span key={idx} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', padding: '6px 16px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em' }}>
                                            {tag}
                                        </span>
                                    ))}
                                </>
                            )}
                        </div>
                        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: '900', margin: '0 0 1.5rem 0', lineHeight: 1.1, textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>{event.title}</h1>
                        {event.description && (
                            <p style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', color: 'rgba(255,255,255,0.9)', marginBottom: '2.5rem', fontWeight: '500' }}>
                                {event.description}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => event.venue_id ? setShowChat(true) : alert("Este parche no tiene un lugar asignado todavía — el chat no está disponible.")}
                                disabled={!event.venue_id}
                                style={{
                                    flex: isMobile ? 1 : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    background: event.venue_id ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(10px)',
                                    border: event.venue_id ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                    color: event.venue_id ? 'white' : 'rgba(255,255,255,0.3)',
                                    padding: '1rem 2rem',
                                    borderRadius: '100px',
                                    fontWeight: '900',
                                    cursor: event.venue_id ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.3s',
                                    fontSize: '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}
                                className={event.venue_id ? "action-btn-neon-teal" : ""}
                            >
                                <MessageSquare size={20} /> {isMobile ? "Chat" : "Hablar con el Local"}
                            </button>

                            <button
                                onClick={() => {
                                    if (!event?.venue_id) {
                                        alert("Este parche no tiene un lugar asignado todavía.");
                                        return;
                                    }
                                    const venueSlug = (event as any).venues?.slug || event.venue_id;
                                    navigate(`/places/${venueSlug}`);
                                }}
                                style={{
                                    flex: isMobile ? 1 : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    background: event.venue_id ? 'var(--color-neon-purple)' : 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    padding: '1rem 2rem',
                                    borderRadius: '100px',
                                    fontWeight: '900',
                                    cursor: event.venue_id ? 'pointer' : 'default',
                                    transition: 'all 0.3s',
                                    fontSize: '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    boxShadow: event.venue_id ? 'var(--shadow-neon-purple)' : 'none',
                                    border: 'none'
                                }}
                            >
                                <Store size={20} /> {isMobile ? "Local" : "Ir al Local"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && event.image_url && (
                <ImageLightbox
                    images={[event.image_url]}
                    title={event.title}
                    onClose={() => setLightboxOpen(false)}
                />
            )}


            {/* See the Event button (above the hero, floats over it) is done inline below */}

            {showChat && event.venue_id && (
                <CustomerChatWindow
                    venueId={event.venue_id}
                    venueName={event.title}
                    menuUrl={(event as any).venues?.menu_url}
                    eventContext={{
                        eventId: event.id,
                        eventTitle: event.title,
                        eventDate: event.event_date,
                        eventAddress: event.location_address,
                        eventPrice: event.price,
                    }}
                    onClose={() => setShowChat(false)}
                />
            )}

            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 350px', gap: '4rem' }}>

                    {/* Left Content */}
                    <div>
                        {/* About Section */}
                        <section style={{ marginBottom: '4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'var(--color-neon-purple)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                    <Info size={16} color="white" />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700' }}>Sobre este Parche</h2>
                            </div>
                            <p style={{ lineHeight: 1.8, fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                                {event.description || "Prepárate para una rumba de otro nivel. Un parche lleno de buena música, excelentes vibras y la mejor energía para que la pases espectacular."}
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {[
                                    { text: 'A Toa', icon: <Volume2 size={16} /> },
                                    { text: 'Lleno', icon: <Users size={16} /> },
                                    { text: 'Trasnoche', icon: <Moon size={16} /> },
                                    { text: 'Accesible', icon: <Accessibility size={16} /> },
                                ].map((tag, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '50px',
                                        fontSize: '0.9rem',
                                        color: 'rgba(255,255,255,0.8)'
                                    }}>
                                        {tag.icon}
                                        {tag.text}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Member Perks */}
                        <section style={{ marginBottom: '4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ background: 'var(--color-neon-purple)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                        <Sparkles size={16} color="white" />
                                    </div>
                                    <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700' }}>Gangazos Exclusivos</h2>
                                </div>
                                <Link to="#" style={{ color: 'var(--color-neon-purple)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>Ver todos los beneficios</Link>
                            </div>

                            {displayPerks.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {displayPerks.map((perk, idx) => (
                                        <div key={idx} style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '20px',
                                            padding: '1.5rem',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                                <div style={{ background: perk.iconBg, padding: '10px', borderRadius: '12px', color: perk.tagColor }}>
                                                    {perk.icon}
                                                </div>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '900', color: perk.tagColor, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px' }}>
                                                    {perk.tag}
                                                </span>
                                            </div>
                                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{perk.title}</h3>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{perk.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Aún no hay gangazos exclusivos para este parche.</p>
                                </div>
                            )}
                        </section>

                        {/* Location Section */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'var(--color-neon-purple)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                    <MapPin size={16} color="white" />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '700' }}>Ubicación</h2>
                            </div>

                            {event.location_address ? (
                                <div style={{
                                    padding: '2rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5rem'
                                }}>
                                    {/* Dirección */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>
                                                {event.location_address}
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                                                Presiona abajo para navegar hasta aquí.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => window.open(
                                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address!)}`,
                                                '_blank'
                                            )}
                                            style={{
                                                background: 'white',
                                                color: 'black',
                                                border: 'none',
                                                padding: '1rem 2rem',
                                                borderRadius: '100px',
                                                fontWeight: '800',
                                                fontSize: '1rem',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            Ver en Google Maps
                                        </button>
                                    </div>

                                    {/* Mapa embebido */}
                                    <div style={{
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        height: '300px'
                                    }}>
                                        <iframe
                                            title="Ubicación del evento"
                                            width="100%"
                                            height="300"
                                            style={{ border: 0, display: 'block' }}
                                            loading="lazy"
                                            allowFullScreen
                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location_address)}&output=embed&hl=es`}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    padding: '2rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.4)'
                                }}>
                                    <MapPin size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                                    <p style={{ margin: 0 }}>Ubicación por confirmar</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Sidebar */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        position: isMobile ? 'relative' : 'sticky',
                        top: isMobile ? '0' : '7rem',
                        height: 'fit-content',
                        marginTop: isMobile ? '2rem' : '0'
                    }}>

                        {/* Summary Card */}
                        <div className="card" style={{
                            padding: '2.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            backdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '24px'
                        }}>
                            <div style={{ marginBottom: '2rem' }}>
                                {/* Date and Time */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Calendar size={12} /> FECHA
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: '700' }}>{dateStr}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>HORA</div>
                                        <div style={{ fontSize: '1rem', fontWeight: '700' }}>{timeStr}</div>
                                    </div>
                                </div>

                                {/* Ticket Contact Button */}
                                {(() => {
                                    const contactType = (event as any).ticket_contact_type;
                                    const contactValue = (event as any).ticket_contact_value;
                                    const hasContact = contactType && contactValue;
                                    const isFree = event.price === 0;
                                    const isActive = isFree || hasContact;

                                    return (
                                        <>
                                            <button
                                                onClick={isActive ? handleGetTickets : undefined}
                                                disabled={!isActive}
                                                style={{
                                                    width: '100%',
                                                    padding: '1.1rem',
                                                    borderRadius: '100px',
                                                    fontSize: '1rem',
                                                    fontWeight: '800',
                                                    background: isActive ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.06)',
                                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: isActive ? 'var(--shadow-neon-purple)' : 'none',
                                                    marginBottom: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    cursor: isActive ? 'pointer' : 'not-allowed',
                                                    opacity: isActive ? 1 : 0.5,
                                                    transition: 'all 0.2s',
                                                    color: 'white',
                                                }}
                                            >
                                                {isFree ? '🎟 ' : contactType === 'whatsapp' ? '💬 ' : contactType === 'url' ? <><ExternalLink size={18} /> </> : '🔒 '}
                                                {isFree ? 'Conseguir Ticket Gratis' : contactType === 'whatsapp' ? 'Comprar Boletas por WhatsApp' : contactType === 'url' ? 'Comprar Boletas' : 'Boletas Próximamente'}
                                            </button>

                                            {!isActive && event.price != null && event.price > 0 && (
                                                <p style={{ margin: '0 0 0.5rem 0', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                                                    El organizador aún no ha habilitado la venta de boletas
                                                </p>
                                            )}

                                            {event.price != null && event.price > 0 && (
                                                <p style={{ margin: 0, textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                                    Precio desde: <strong style={{ color: 'var(--color-neon-teal)' }}>${event.price.toLocaleString()}</strong>
                                                </p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>




                        </div>
                    </div>
                </div>

                {isMobile && <MobileNav />}
                <Chatbot />
            </div>
        </div>
    );
};
