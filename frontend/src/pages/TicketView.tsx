import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { eventService, ticketService } from '../services/api';
import type { Event } from '../types';
import {
    ChevronLeft, ChevronRight,
    Share2, MapPin, Info, Sun, ArrowLeft, Sparkles, Loader2, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const TicketView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as { event: Event; tickets: any[] };

    const [event, setEvent] = useState<Event | null>(state?.event || null);
    const [tickets, setTickets] = useState<any[]>(state?.tickets || []);
    const [loading, setLoading] = useState(!state?.event);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [currentTicket, setCurrentTicket] = useState(0);
    const [brightnessBoost, setBrightnessBoost] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!event && id) {
            const loadData = async () => {
                try {
                    const [evt, tkts] = await Promise.all([
                        eventService.getById(id),
                        ticketService.getMyTickets()
                    ]);
                    setEvent(evt);
                    const group = tkts.find((g: any) => g.event_id === id);
                    if (group) setTickets(group.tickets);
                } catch (err) {
                    console.warn('Error al cargar el ticket:', err);
                    setFetchError('No pudimos cargar tu ticket. Intenta de nuevo.');
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }
    }, [id, event]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--color-neon-purple)" />
        </div>
    );

    if (fetchError) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: '1rem' }}>
            <p style={{ color: '#ef4444', fontSize: '1rem' }}>{fetchError}</p>
            <button
                onClick={() => window.location.reload()}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1.5rem', borderRadius: '100px', cursor: 'pointer', fontWeight: '700' }}
            >
                Reintentar
            </button>
        </div>
    );

    if (!event || tickets.length === 0) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Tickets not found</h2>
                <button onClick={() => navigate('/passport')} className="btn-secondary" style={{ padding: '0.75rem 2rem', borderRadius: '100px' }}>Back to Passport</button>
            </div>
        </div>
    );

    const ticket = tickets[currentTicket];
    const handleNext = () => setCurrentTicket(prev => (prev + 1) % tickets.length);
    const handlePrev = () => setCurrentTicket(prev => (prev - 1 + tickets.length) % tickets.length);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-bg)',
            color: 'white',
            paddingBottom: isMobile ? '8rem' : '5rem',
            filter: brightnessBoost ? 'brightness(1.3) contrast(1.1)' : 'none',
            transition: 'filter 0.3s ease'
        }}>
            <Navbar />

            <div className="container" style={{ paddingTop: isMobile ? '6.5rem' : '8rem' }}>
                {!isMobile && (
                    <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Dashboard</span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Active Tickets</span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
                        <span style={{ color: 'var(--color-neon-purple)' }}>{event.title}</span>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr 350px', gap: isMobile ? '2rem' : '4rem', alignItems: 'start' }}>
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '2.5rem' }}>
                        <button onClick={() => navigate('/passport')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '1rem', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
                            <ArrowLeft size={18} /> Back to Passport
                        </button>
                        {!isMobile && (
                            <>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <button
                                        className="action-button-premium"
                                        onClick={async () => {
                                            const shareData = { title: event?.title || 'Mi Ticket', text: `¡Tengo entrada para ${event?.title}! 🎉`, url: window.location.href };
                                            if (navigator.share) { await navigator.share(shareData); }
                                            else { navigator.clipboard.writeText(window.location.href); alert('¡Enlace copiado al portapapeles!'); }
                                        }}
                                    >
                                        <Share2 size={20} /> Compartir
                                    </button>
                                </div>
                            </>
                        )}
                    </aside>

                    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '2rem' : '3rem' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={ticket.id}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="ticket-premium-container"
                                >
                                    <div style={{ position: 'relative', height: isMobile ? '180px' : '240px', overflow: 'hidden' }}>
                                        <img src={event.image_url || '/assets/placeholder_event.jpg'} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,1))' }}></div>
                                        <div style={{ position: 'absolute', bottom: isMobile ? '1rem' : '1.5rem', left: isMobile ? '1.5rem' : '2rem', right: isMobile ? '1.5rem' : '2rem' }}>
                                            <div style={{ background: 'var(--color-neon-purple)', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '0.25rem 0.65rem', borderRadius: '6px', width: 'fit-content', marginBottom: '0.5rem', letterSpacing: '0.15em' }}>EXCLUSIVE VIP ACCESS</div>
                                            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2.25rem', fontWeight: '900', margin: 0, lineHeight: 1.1 }}>{event.title}</h2>
                                        </div>
                                    </div>

                                    <div style={{ padding: isMobile ? '1.5rem' : '2rem 2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '1.25rem' : '2rem', borderBottom: '2px dashed rgba(255,255,255,0.08)', position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '-12px', bottom: '-12px', width: '24px', height: '24px', background: 'var(--color-bg)', borderRadius: '50%' }}></div>
                                        <div style={{ position: 'absolute', right: '-12px', bottom: '-12px', width: '24px', height: '24px', background: 'var(--color-bg)', borderRadius: '50%' }}></div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>DATE</div>
                                            <div style={{ fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>{new Date(event.event_date).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>HORA</div>
                                            <div style={{ fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
                                                {event?.event_date ? new Date(event.event_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Por confirmar'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>SECCIÓN</div>
                                            <div style={{ fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>General</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>TICKET</div>
                                            <div style={{ fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>#{currentTicket + 1}</div>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>VENUE</div>
                                            <div style={{ fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>{event.location_address || 'The Neon Heights Lounge, LA'}</div>
                                        </div>
                                        <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-neon-teal)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>UNIQUE TICKET CODE</div>
                                            <div style={{ fontWeight: '900', fontSize: isMobile ? '1.2rem' : '1.4rem', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                                {ticket.text_code || 'ABCD-1234-XYZ'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: isMobile ? '2rem' : '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            background: 'white',
                                            padding: isMobile ? '1rem' : '1.5rem',
                                            borderRadius: isMobile ? '20px' : '28px',
                                            marginBottom: isMobile ? '1.5rem' : '2rem',
                                            boxShadow: '0 0 50px rgba(0, 243, 255, 0.25)',
                                            border: '6px solid rgba(255,255,255,0.05)',
                                            position: 'relative'
                                        }}>
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${ticket.qr_code_token}`} alt="QR Code" style={{ width: isMobile ? '150px' : '200px', height: isMobile ? '150px' : '200px' }} />
                                            {ticket.attended && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', borderRadius: isMobile ? '14px' : '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                                                    <CheckCircle2 size={isMobile ? 48 : 64} color="var(--color-neon-teal)" />
                                                    <span style={{ fontWeight: '900', color: 'var(--color-neon-teal)', letterSpacing: '0.1em', fontSize: isMobile ? '0.75rem' : '1rem' }}>USED</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>TICKET {currentTicket + 1} OF {tickets.length}</div>
                                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
                                            {tickets.map((_, i) => (
                                                <div key={i} style={{
                                                    width: i === currentTicket ? '20px' : '6px',
                                                    height: '6px',
                                                    borderRadius: '10px',
                                                    background: i === currentTicket ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.1)',
                                                    transition: 'all 0.4s'
                                                }}></div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setBrightnessBoost(!brightnessBoost)}
                                            style={{
                                                marginTop: isMobile ? '2rem' : '2.5rem',
                                                padding: '0.75rem 1.75rem',
                                                borderRadius: '100px',
                                                background: brightnessBoost ? 'var(--color-neon-teal)' : 'rgba(0, 243, 255, 0.08)',
                                                border: '1px solid rgba(0, 243, 255, 0.2)',
                                                color: brightnessBoost ? 'black' : 'var(--color-neon-teal)',
                                                fontSize: '0.75rem',
                                                fontWeight: '900',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.65rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <Sun size={16} /> {brightnessBoost ? 'Boost Enabled' : 'Brightness Boost'}
                                        </button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1.5rem' : '3rem' }}>
                            <button onClick={handlePrev} className="nav-arrow-premium" style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px' }}>
                                <ChevronLeft size={isMobile ? 24 : 28} />
                            </button>
                            <span style={{ fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)' }}>{isMobile ? 'Swipe' : 'Swipe for next ticket'}</span>
                            <button onClick={handleNext} className="nav-arrow-premium" style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px' }}>
                                <ChevronRight size={isMobile ? 24 : 28} />
                            </button>
                        </div>
                    </main>

                    {isMobile && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                className="action-button-premium"
                                onClick={async () => {
                                    const shareData = { title: event?.title || 'Mi Ticket', text: `¡Tengo entrada para ${event?.title}! 🎉`, url: window.location.href };
                                    if (navigator.share) { await navigator.share(shareData); }
                                    else { navigator.clipboard.writeText(window.location.href); alert('¡Enlace copiado al portapapeles!'); }
                                }}
                            >
                                <Share2 size={18} /> Compartir
                            </button>
                        </div>
                    )}

                    <aside style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.5rem' : '2.5rem' }}>
                        <div className="card-premium" style={{ padding: isMobile ? '1.5rem' : '2.25rem' }}>
                            <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.35rem', fontWeight: '900', marginBottom: isMobile ? '1.25rem' : '2rem' }}>Event Details</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.25rem' : '2rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(111, 66, 193, 0.1)' }}>
                                            <MapPin size={18} color="var(--color-neon-purple)" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>Venue Map</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{event.location_address}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: isMobile ? '140px' : '180px', borderRadius: '24px', overflow: 'hidden' }}>
                                        {event?.location_address ? (
                                            <iframe
                                                title="Ubicación del evento"
                                                width="100%"
                                                height="100%"
                                                style={{ border: 0, display: 'block' }}
                                                loading="lazy"
                                                allowFullScreen
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location_address)}&output=embed&hl=es`}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                                                Ubicación por confirmar
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(111, 66, 193, 0.1)' }}>
                                        <Info size={18} color="var(--color-neon-purple)" />
                                    </div>
                                    {event?.vibe_tags && event.vibe_tags.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>Ambiente</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{event.vibe_tags.join(', ')}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-premium" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(111, 66, 193, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={28} color="var(--color-neon-purple)" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>ORGANIZADO POR</div>
                                <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Vive Parche</div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <style>{`
                .action-button-premium {
                    display: flex; align-items: center; gap: 1.25rem;
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
                    color: rgba(255,255,255,0.6); font-size: 0.95rem; font-weight: 700;
                    cursor: pointer; transition: all 0.3s; padding: 1rem 1.5rem; border-radius: 16px;
                }
                .action-button-premium:hover {
                    color: white; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); transform: translateX(8px);
                }
                .ticket-premium-container {
                    background: #0a0a0a; border-radius: 48px; border: 1px solid rgba(255,255,255,0.1);
                    overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8);
                }
                .nav-arrow-premium {
                    width: 64px; height: 64px; border-radius: 50%;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
                    color: white; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.3s;
                }
                .nav-arrow-premium:hover {
                    background: rgba(111, 66, 193, 0.1); border-color: var(--color-neon-purple); transform: scale(1.15);
                }
                .card-premium {
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 32px; padding: 2.25rem; backdrop-filter: blur(20px);
                }
            `}</style>
        </div>
    );
};
