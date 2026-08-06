import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { loyaltyService } from '../services/api';
import { ArrowLeft, MapPin, Zap, Sun, CheckCircle2, Loader2, Clock, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    ACTIVE: { label: 'Activo — Listo para canjear', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: Gift },
    REDEEMED: { label: 'Canjeado', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', icon: CheckCircle2 },
    EXPIRED: { label: 'Expirado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: Clock },
    CANCELLED: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: Clock },
};

const PERK_ICONS: Record<string, string> = {
    drink: '🍺', food: '🍔', vip: '👑', discount: '💸', custom: '🎁',
};

export const PerkRewardView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state as { ticket?: any; coupon?: any };
    const initialData = locationState?.ticket || locationState?.coupon;

    const [ticket, setTicket] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [brightnessBoost, setBrightnessBoost] = useState(false);
    const isMobile = window.innerWidth < 1024;

    useEffect(() => {
        if (!ticket && id) {
            const load = async () => {
                try {
                    const data = await loyaltyService.getMyRewardTickets();
                    const found = (data.tickets || []).find((t: any) => t.id === id);
                    if (found) setTicket(found);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            load();
        }
    }, [id, ticket]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--color-neon-purple)" />
        </div>
    );

    if (!ticket) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Ticket no encontrado</h2>
                <button onClick={() => navigate('/marketplace')} style={{ padding: '0.75rem 2rem', borderRadius: '100px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: 'white', cursor: 'pointer', fontWeight: '800' }}>
                    Volviendo al Marketplace
                </button>
            </div>
        </div>
    );

    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG['ACTIVE'];
    const StatusIcon = statusConfig.icon;
    const isRedeemed = ticket.status === 'REDEEMED';
    // const qrToken = ticket.qr_token || ticket.ticket_id;

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--color-bg)', color: 'white',
            paddingBottom: isMobile ? '8rem' : '5rem',
            filter: brightnessBoost ? 'brightness(1.3) contrast(1.1)' : 'none',
            transition: 'filter 0.3s ease'
        }}>
            <Navbar />

            <div className="container" style={{ paddingTop: isMobile ? '6.5rem' : '8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <button onClick={() => navigate('/marketplace')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                        <ArrowLeft size={18} /> Gastar Coins
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            style={{ width: '100%', maxWidth: '480px' }}
                        >
                            {/* Reward Ticket Card */}
                            <div style={{ background: '#0a0a0a', borderRadius: '48px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                                {/* Header */}
                                <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))', padding: isMobile ? '1.5rem' : '2rem 2.5rem', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(168,85,247,0.1)' }} />
                                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>REWARD TICKET · PARCHÉ COINS</div>
                                    <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>{PERK_ICONS[ticket.perk_type || 'custom'] || '🎁'}</span>
                                        <span>{ticket.perk_title || ticket.reward_type}</span>
                                    </div>
                                    {ticket.perk_description && (
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{ticket.perk_description}</div>
                                    )}
                                </div>

                                {/* Details */}
                                <div style={{ padding: isMobile ? '1.5rem' : '2rem 2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderBottom: '2px dashed rgba(255,255,255,0.08)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-12px', bottom: '-12px', width: '24px', height: '24px', background: 'var(--color-bg)', borderRadius: '50%' }} />
                                    <div style={{ position: 'absolute', right: '-12px', bottom: '-12px', width: '24px', height: '24px', background: 'var(--color-bg)', borderRadius: '50%' }} />

                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px' }}>VENUE</div>
                                        <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{ticket.venue_name || ticket.profiles?.full_name}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px' }}>COINS</div>
                                        <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Zap size={14} fill="currentColor" /> {ticket.coins_spent}
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={10} /> DIRECCIÓN
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{ticket.venue_address || 'Check venue for location'}</div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px' }}>CÓDIGO ÚNICO</div>
                                        <div style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '0.15em', fontFamily: 'monospace', color: 'var(--color-neon-teal)' }}>
                                            {ticket.text_code}
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code */}
                                <div style={{ padding: isMobile ? '2rem' : '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        background: 'white', padding: isMobile ? '1rem' : '1.5rem',
                                        borderRadius: isMobile ? '20px' : '28px', marginBottom: isMobile ? '1.5rem' : '2rem',
                                        boxShadow: isRedeemed ? 'none' : '0 0 50px rgba(168, 85, 247, 0.3)',
                                        border: '6px solid rgba(255,255,255,0.05)', position: 'relative'
                                    }}>
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.text_code)}`}
                                            alt="QR Code"
                                            style={{ width: isMobile ? '160px' : '220px', height: isMobile ? '160px' : '220px' }}
                                        />
                                        {isRedeemed && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                                                <CheckCircle2 size={56} color="#22c55e" />
                                                <span style={{ fontWeight: '900', color: '#22c55e', letterSpacing: '0.1em', fontSize: '0.85rem' }}>CANJEADO</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: statusConfig.bg, border: `1px solid ${statusConfig.color}30`, padding: '8px 20px', borderRadius: '100px', marginBottom: '1.5rem' }}>
                                        <StatusIcon size={14} color={statusConfig.color} />
                                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: statusConfig.color, letterSpacing: '0.05em' }}>
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    {!isRedeemed && (
                                        <button
                                            onClick={() => setBrightnessBoost(!brightnessBoost)}
                                            style={{
                                                padding: '0.75rem 1.75rem', borderRadius: '100px',
                                                background: brightnessBoost ? 'var(--color-neon-teal)' : 'rgba(0, 243, 255, 0.08)',
                                                border: '1px solid rgba(0, 243, 255, 0.2)',
                                                color: brightnessBoost ? 'black' : 'var(--color-neon-teal)',
                                                fontSize: '0.75rem', fontWeight: '900',
                                                display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer'
                                            }}
                                        >
                                            <Sun size={16} /> {brightnessBoost ? 'Boost Activo' : 'Brillo para escanear'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expiry info */}
                            {!isRedeemed && ticket.expires_at && (
                                <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Clock size={12} /> Expira el {new Date(ticket.expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {isMobile && <MobileNav />}
        </div>
    );
};
