import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { eventService, ticketService } from '../services/api';
import type { Event } from '../types';
import {
    ChevronRight, CreditCard,
    Apple, Lock, CheckCircle2, Ticket as TicketIcon, Zap
} from 'lucide-react';

export const Checkout: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple'>('card');
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
    const [purchasing, setPurchasing] = useState(false);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const reservationId = queryParams.get('res');

    useEffect(() => {
        if (id) {
            eventService.getById(id)
                .then(setEvent)
                .catch(console.error)
                .finally(() => {
                    if (!reservationId) setLoading(false);
                });
        }
    }, [id, reservationId]);

    useEffect(() => {
        if (reservationId) {
            ticketService.getReservation(reservationId)
                .then(res => {
                    setQuantity(res.quantity);
                    // Sync time left with original expiry if needed, 
                    // or just use the 15m timer from mount.
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch reservation:", err);
                    alert("Reserva inválida o expirada.");
                    navigate('/');
                });
        }
    }, [reservationId, navigate]);

    useEffect(() => {
        if (timeLeft <= 0) {
            alert("¡Reserva expirada! Redirigiendo...");
            navigate(`/events/${id}`);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, navigate, id]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCompleteBooking = async () => {
        if (!reservationId) {
            alert("Referencia de reserva no encontrada.");
            return;
        }

        setPurchasing(true);
        try {
            const ticket = await ticketService.purchase(reservationId);
            if (total === 0) {
                navigate(`/tickets/${event?.id}`, { state: { event, tickets: [ticket] } });
            } else {
                navigate('/confirmation', { state: { event, ticket, quantity, total } });
            }
        } catch (err: any) {
            alert(err.response?.data?.detail || "Payment failed. Try again.");
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div className="neon-text-purple">Cargando checkout...</div>
        </div>
    );

    if (!event) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div style={{ textAlign: 'center' }}>
                <h2>Event not found</h2>
                <Link to="/" className="btn-secondary">Back Home</Link>
            </div>
        </div>
    );

    const ticketPrice = event.price || 0;
    const subtotal = ticketPrice * quantity;
    const total = subtotal;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: '5rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: '8rem', maxWidth: '800px' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem' }}>Checkout</h1>

                    {/* Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--color-neon-purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={18} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)' }}>DETAILS</span>
                        </div>
                        <div style={{ width: '100px', height: '2px', background: 'var(--color-neon-purple)', marginBottom: '1.5rem' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--color-neon-purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-neon-purple)', boxShadow: 'var(--shadow-neon-purple)' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '900' }}>2</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'white' }}>PAYMENT</span>
                        </div>
                        <div style={{ width: '100px', height: '2px', background: 'rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>3</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.2)' }}>CONFIRM</span>
                        </div>
                    </div>

                    {/* Timer Alert */}
                    <div style={{
                        marginTop: '2rem',
                        background: 'rgba(255, 122, 0, 0.1)',
                        border: '1px solid rgba(255, 122, 0, 0.3)',
                        padding: '1rem',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: '#ff9d42',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                    }}>
                        <Zap size={16} /> Reservation locks in: <span style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', padding: '2rem', marginBottom: '2rem' }}>
                    {/* Event Info Mini-Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                        <div style={{ width: '60px', height: '60px', background: 'var(--color-neon-purple)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TicketIcon size={30} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-neon-purple)', letterSpacing: '0.1em' }}>ART & CULTURE</div>
                            <h3 style={{ margin: '0.2rem 0', fontSize: '1.25rem', fontWeight: '700' }}>{event.title}</h3>
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                                {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {new Date(event.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>Ticket</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', marginRight: '0.5rem' }}>QTY:</span>
                                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: '900', fontSize: '1.1rem', color: 'var(--color-neon-purple)' }}>{quantity}</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>(Locked to reservation)</span>
                            </div>
                            <span style={{ fontWeight: '700' }}>${subtotal.toFixed(2)}</span>
                        </div>



                        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Enter promo code"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 6rem 1rem 1rem', borderRadius: '12px', outline: 'none', color: 'white' }}
                                />
                                <button style={{ position: 'absolute', right: '0.6rem', top: '0.6rem', bottom: '0.6rem', background: 'rgba(0, 243, 255, 0.1)', border: '1px solid var(--color-neon-teal)', color: 'var(--color-neon-teal)', padding: '0 1.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', width: '80px' }}>
                                    APPLY
                                </button>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>Total</span>
                            <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--color-neon-purple)' }}>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Section */}
                {total > 0 ? (
                    <>
                        <h2 style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.4)' }}>PAYMENT METHOD</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                            <button
                                onClick={() => setPaymentMethod('apple')}
                                style={{
                                    padding: '1.2rem',
                                    borderRadius: '16px',
                                    background: paymentMethod === 'apple' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: paymentMethod === 'apple' ? '2px solid var(--color-neon-purple)' : '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                    color: 'white', cursor: 'pointer'
                                }}
                            >
                                <Apple size={20} /> <span style={{ fontWeight: '700' }}>Apple Pay</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                style={{
                                    padding: '1.2rem',
                                    borderRadius: '16px',
                                    background: paymentMethod === 'card' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: paymentMethod === 'card' ? '2px solid var(--color-neon-purple)' : '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                    color: 'white', cursor: 'pointer'
                                }}
                            >
                                <CreditCard size={20} /> <span style={{ fontWeight: '700' }}>Card</span>
                            </button>
                        </div>

                        {paymentMethod === 'card' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', display: 'block', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>CARD NUMBER</label>
                                    <div style={{ position: 'relative' }}>
                                        <CreditCard size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: 'rgba(255,255,255,0.3)' }} />
                                        <input type="text" placeholder="0000 0000 0000 0000" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', outline: 'none', color: 'white' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: '800', display: 'block', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>EXPIRY DATE</label>
                                        <input type="text" placeholder="MM/YY" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', outline: 'none', color: 'white', textAlign: 'center' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: '800', display: 'block', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>CVC</label>
                                        <input type="text" placeholder="•••" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', outline: 'none', color: 'white', textAlign: 'center' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '16px', color: '#22c55e', fontWeight: '800', marginBottom: '2rem' }}>
                        🎉 ¡Evento GRATIS! No se requieren datos de pago.
                    </div>
                )}

                <button
                    onClick={handleCompleteBooking}
                    disabled={purchasing || timeLeft <= 0}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '1.25rem',
                        borderRadius: '100px',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        marginTop: '3rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        background: 'var(--color-neon-purple)',
                        border: 'none',
                        boxShadow: 'var(--shadow-neon-purple)',
                        opacity: (purchasing || timeLeft <= 0) ? 0.7 : 1,
                        cursor: (purchasing || timeLeft <= 0) ? 'not-allowed' : 'pointer'
                    }}
                >
                    <ChevronRight size={20} /> {purchasing ? 'Processing...' : 'Complete Booking'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                    <Lock size={12} />
                    <span>PAYMENTS ARE SECURE AND ENCRYPTED</span>
                </div>
            </div>
        </div>
    );
};
