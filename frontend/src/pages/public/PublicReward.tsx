import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gift, MapPin, Calendar, CheckCircle, AlertCircle, Loader2, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export const PublicReward: React.FC = () => {
    const { qrToken } = useParams<{ qrToken: string }>();
    const [reward, setReward] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';

    useEffect(() => {
        const fetchReward = async () => {
            try {
                const res = await fetch(`${API_BASE}/loyalty/public/reward/${qrToken}`);
                if (!res.ok) throw new Error('Ticket no encontrado o expirado');
                const data = await res.json();
                
                if (data.user_hash_id) {
                    navigate(`/p/${data.user_hash_id}`, { replace: true });
                    return;
                }
                
                setReward(data);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchReward();
    }, [qrToken, API_BASE]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-dark)' }}>
            <Loader2 className="animate-spin" size={40} color="var(--color-neon-purple)" />
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', padding: '2rem', textAlign: 'center', background: 'var(--color-bg-dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: '400px', width: '100%', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontWeight: '900', marginBottom: '1rem' }}>Sello o Cupón Inválido</h2>
                <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Este código no es válido, ya ha sido canjeado o ha expirado.</p>
                <button onClick={() => navigate('/')} style={{ width: '100%', padding: '0.8rem 1.5rem', borderRadius: '100px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                    Volver al Inicio
                </button>
            </div>
        </div>
    );

    const isRedeemed = reward.status === 'REDEEMED';
    const isActive = reward.status === 'ACTIVE';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-dark)', color: 'white', padding: '1.5rem', paddingBottom: '4rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ maxWidth: '500px', margin: '0 auto' }}
            >
                {/* Header Card */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', overflow: 'hidden', padding: '2rem', textAlign: 'center', marginBottom: '2rem', backdropFilter: 'blur(20px)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '22px', background: isRedeemed ? 'rgba(255,255,255,0.1)' : 'var(--color-neon-purple)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isActive ? '0 0 40px rgba(168, 85, 247, 0.4)' : 'none' }}>
                        {reward.type.includes('PASAPORTE') ? <Trophy size={40} color="white" /> : <Gift size={40} color="white" />}
                    </div>

                    <div style={{ fontSize: '0.75rem', fontWeight: '900', color: isRedeemed ? 'rgba(255,255,255,0.4)' : 'var(--color-neon-purple)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '8px' }}>
                        {reward.type}
                    </div>

                    <h1 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 1rem', lineHeight: 1.2 }}>{reward.title}</h1>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '100px', background: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isActive ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, color: isActive ? '#22c55e' : 'rgba(255,255,255,0.5)', fontWeight: '900', fontSize: '0.8rem' }}>
                        {isActive ? <CheckCircle size={14} /> : (isRedeemed ? <Calendar size={14} /> : <AlertCircle size={14} />)}
                        {reward.status === 'ACTIVE' ? 'ESTE TICKET ESTÁ ACTIVO' : (isRedeemed ? 'TICKET YA CANJEADO' : 'TICKET EXPIRADO')}
                    </div>
                </div>

                {/* Venue Info */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>LOCAL VÁLIDO</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={20} color="var(--color-neon-teal)" />
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{reward.venue_name}</div>
                    </div>
                </div>

                {/* Valid Until */}
                {reward.expires_at && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>VENCIMIENTO</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                            {new Date(reward.expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                )}

                {/* Important Notice */}
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ color: '#f59e0b', fontWeight: '900', fontSize: '0.85rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <AlertCircle size={16} /> ¡ATENCIÓN!
                    </div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
                        Solo el personal autorizado de <b>{reward.venue_name}</b> puede canjear este ticket escaneándolo desde su propia estación de Check-in.
                    </p>
                </div>

                {/* Footer Logo */}
                <div style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.2 }}>
                    <h2 style={{ fontWeight: '900', letterSpacing: '4px' }}>VIVEPARCHÉ</h2>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800' }}>WWW.VIVEPARCHE.COM</div>
                </div>
            </motion.div>
        </div>
    );
};
