import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import {
    Check, Calendar, MapPin, Ticket as TicketIcon,
    Wallet, ArrowLeft, Sparkles
} from 'lucide-react';
import type { Event } from '../types';

interface LocationState {
    event: Event;
    quantity: number;
    total: number;
}

export const BookingConfirmation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState;

    // Fallback if accessed without state
    if (!state) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>No se encontró la reserva</h2>
                    <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>Volver a Descubrir</Link>
                </div>
            </div>
        );
    }

    const { event, quantity } = state;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: '5rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: '8rem', maxWidth: '1000px', textAlign: 'center' }}>

                {/* Success Icon */}
                <div style={{
                    width: '100px',
                    height: '100px',
                    background: 'rgba(0, 255, 178, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 2.5rem',
                    border: '2px solid #00FFB2',
                    boxShadow: '0 0 30px rgba(0, 255, 178, 0.3)'
                }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: '#00FFB2',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Check size={35} color="black" strokeWidth={3} />
                    </div>
                </div>

                <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '1rem' }}>¡Reserva Confirmada!</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.25rem', marginBottom: '4rem' }}>
                    Tu lugar está asegurado. Prepárate para el mejor parche.
                </p>

                {/* Confirmation Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '40px',
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr',
                    marginBottom: '3rem',
                    textAlign: 'left'
                }}>
                    {/* Event Image */}
                    <div style={{ height: '400px', position: 'relative' }}>
                        <img
                            src={event.image_url || '/assets/placeholder_event.jpg'}
                            alt={event.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to right, transparent 50%, rgba(10,10,10,1) 100%)'
                        }}></div>
                    </div>

                    {/* Event Details */}
                    <div style={{ padding: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
                        <div>
                            <div style={{ color: 'var(--color-neon-purple)', fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>PARCHE EN VIVO</div>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.1' }}>{event.title}</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                <Calendar size={18} color="var(--color-neon-purple)" />
                                <span>{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {new Date(event.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                <TicketIcon size={18} color="var(--color-neon-purple)" />
                                <span>{quantity}x Boletas Entrada General</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                <MapPin size={18} color="var(--color-neon-purple)" />
                                <span>Starlight Arena, District 7</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Actions */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
                    <button
                        onClick={() => navigate(`/tickets/${event.id}`, { state: { event, quantity } })}
                        className="btn-primary"
                        style={{
                            padding: '1.2rem 3rem',
                            borderRadius: '100px',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            background: 'var(--color-neon-purple)',
                            border: 'none',
                            boxShadow: 'var(--shadow-neon-purple)',
                            display: 'flex', alignItems: 'center', gap: '0.75rem'
                        }}
                    >
                        Ver Boletas
                    </button>
                    <button style={{
                        padding: '1.2rem 3rem',
                        borderRadius: '100px',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        cursor: 'pointer'
                    }}>
                        <Wallet size={20} /> Apple Wallet
                    </button>
                </div>

                {/* AI Assistant Message */}
                <div style={{
                    maxWidth: '600px',
                    margin: '0 auto 4rem',
                    background: 'linear-gradient(90deg, rgba(88, 28, 135, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    padding: '1.25rem 2rem',
                    borderRadius: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-neon-purple)' }}>
                            <img src="https://i.pravatar.cc/100?u=assistant" alt="Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '18px', height: '18px', background: '#00FFB2', borderRadius: '50%', border: '2px solid var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={10} color="black" strokeWidth={4} />
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'white' }}>¡Disfruta el parche! Lo he añadido a tu Pasaporte.</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-neon-purple)', letterSpacing: '0.05em', marginTop: '0.2rem' }}>ASISTENTE IA VIBEMAP</div>
                    </div>
                    <Sparkles style={{ marginLeft: 'auto', color: '#00FFB2' }} size={20} />
                </div>

                {/* Footer Link */}
                <Link
                    to="/"
                    style={{
                        color: 'rgba(255,255,255,0.4)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                    <ArrowLeft size={16} /> Volver a Descubrir
                </Link>

            </div>

            {/* Background Decorative Element */}
            <div style={{
                position: 'fixed',
                top: '20%',
                right: '5%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(162, 28, 175, 0.08) 0%, transparent 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>
            <div style={{
                position: 'fixed',
                bottom: '10%',
                left: '2%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(0, 243, 255, 0.05) 0%, transparent 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>
        </div>
    );
};
