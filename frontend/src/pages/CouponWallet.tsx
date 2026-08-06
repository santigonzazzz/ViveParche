import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Gift, ChevronLeft, Loader2, Clock, MapPin } from 'lucide-react';
import { rewardService } from '../services/api';
import { MobileNav } from '../components/MobileNav';

const getCouponStatus = (coupon: any) => {
    const daysLeft = coupon.expires_at
        ? Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    if (coupon.status === 'used' || coupon.is_redeemed) {
        return { label: '✅ Usado', color: 'rgba(255,255,255,0.3)', disabled: true, daysText: 'Ya canjeado' };
    }
    if (daysLeft !== null && daysLeft < 0) {
        return { label: '❌ Expirado', color: '#ef4444', disabled: true, daysText: 'Expirado' };
    }
    if (daysLeft === 0) {
        return { label: '⚡ Vence hoy', color: '#eab308', disabled: false, daysText: 'Vence hoy' };
    }
    if (daysLeft !== null && daysLeft <= 3) {
        return { label: '⚠️ Por vencer', color: '#f97316', disabled: false, daysText: `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}` };
    }
    if (daysLeft !== null) {
        return { label: '✨ Activo', color: '#22c55e', disabled: false, daysText: `Vence en ${daysLeft} días` };
    }
    return { label: '✨ Activo', color: '#22c55e', disabled: false, daysText: 'Válido indefinidamente' };
};

export const CouponWallet: React.FC = () => {
    const navigate = useNavigate();
    const [passport, setPassport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchPassport = async () => {
            try {
                const data = await rewardService.getPassport();
                setPassport(data);
            } catch (err) {
                console.warn("Error al cargar el historial de cupones:", err);
                setError("No pudimos cargar tus cupones. Intenta de nuevo.");
            } finally {
                setLoading(false);
            }
        };
        fetchPassport();
    }, []);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--color-neon-purple)" />
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'white' }}>
            <p style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    fontWeight: '700'
                }}
            >
                Reintentar
            </button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: isMobile ? '7rem' : '4rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: isMobile ? '6rem' : '8rem' }}>
                <button
                    onClick={() => navigate('/passport')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                        fontWeight: '700', cursor: 'pointer', marginBottom: '2rem'
                    }}
                >
                    <ChevronLeft size={20} /> Back to Profile
                </button>

                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: '900', marginBottom: '0.5rem' }}>My Coupon Wallet</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.1rem' }}>All your unlocked rewards and special offers.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                    {passport?.coupons?.length > 0 ? passport.coupons.map((coupon: any) => {
                        const status = getCouponStatus(coupon);
                        return (
                        <div key={coupon.id} style={{
                            background: 'rgba(111, 66, 193, 0.05)',
                            border: '1px solid rgba(111, 66, 193, 0.3)',
                            borderRadius: '32px',
                            padding: '1.75rem',
                            position: 'relative',
                            overflow: 'hidden',
                            backdropFilter: 'blur(20px)',
                            opacity: status.disabled ? 0.6 : 1,
                            transition: 'opacity 0.2s'
                        }}>
                            {/* Decorative background circle */}
                            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(111, 66, 193, 0.1)', filter: 'blur(40px)' }}></div>

                            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2rem' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--color-neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 20px rgba(111, 66, 193, 0.4)' }}>
                                    {coupon.profiles?.avatar_url ? (
                                        <img
                                            src={coupon.profiles.avatar_url}
                                            alt={coupon.profiles?.full_name || 'Local'}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '2px solid rgba(255,255,255,0.1)'
                                            }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <Gift size={24} color="white" />
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '900', fontSize: '1.25rem', marginBottom: '4px' }}>{coupon.reward_type}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: '600' }}>
                                        <MapPin size={14} /> {coupon.profiles?.full_name}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px dashed rgba(255,255,255,0.15)',
                                borderRadius: '20px',
                                padding: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>Código Secreto</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--color-neon-teal)', fontFamily: 'monospace', letterSpacing: '2px' }}>{coupon.text_code}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(coupon.text_code);
                                                setCopiedId(coupon.id);
                                                setTimeout(() => setCopiedId(null), 2000);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: `1px solid ${copiedId === coupon.id ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                                                color: copiedId === coupon.id ? '#22c55e' : 'rgba(255,255,255,0.6)',
                                                borderRadius: '8px',
                                                padding: '4px 10px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {copiedId === coupon.id ? '✅ Copiado' : '📋 Copiar'}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !status.disabled && navigate(`/reward-tickets/${coupon.id}`, { state: { coupon } })}
                                    disabled={status.disabled}
                                    style={{
                                        background: 'var(--color-neon-purple)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '100px',
                                        cursor: status.disabled ? 'not-allowed' : 'pointer',
                                        fontWeight: '900',
                                        fontSize: '0.85rem',
                                        boxShadow: '0 4px 15px rgba(111, 66, 193, 0.4)',
                                        opacity: status.disabled ? 0.4 : 1,
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    CANJEAR
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: status.color, fontWeight: '700' }}>
                                    <Clock size={14} />
                                    <span>{status.daysText}</span>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    color: status.color,
                                    background: `${status.color}22`,
                                    padding: '3px 10px',
                                    borderRadius: '100px',
                                    border: `1px solid ${status.color}44`
                                }}>
                                    {status.label}
                                </span>
                            </div>
                        </div>
                        );
                    }) : (
                        <div style={{ gridColumn: '1/-1', padding: '5rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '32px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>Your wallet is empty</h3>
                            <p style={{ maxWidth: '400px', margin: '0 auto' }}>Visit venues and complete event passports to unlock exclusive rewards.</p>
                        </div>
                    )}
                </div>
            </div>

            {isMobile && <MobileNav />}

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
