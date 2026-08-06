import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, MapPin, Award, Star, Zap, Loader2, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export const PublicProfile: React.FC = () => {
    const { hashId } = useParams<{ hashId: string }>();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_BASE}/loyalty/public/profile/${hashId}`);
                if (!res.ok) throw new Error('Usuario no encontrado');
                const data = await res.json();
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [hashId, API_BASE]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-dark)' }}>
            <Loader2 className="animate-spin" size={40} color="var(--color-neon-purple)" />
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', padding: '2rem', textAlign: 'center', background: 'var(--color-bg-dark)', color: 'white' }}>
            <div style={{ maxWidth: '400px', margin: '0 auto', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 style={{ fontWeight: '900', marginBottom: '1rem' }}>Oops!</h2>
                <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{error}</p>
                <button onClick={() => navigate('/')} style={{ padding: '0.8rem 1.5rem', borderRadius: '100px', background: 'var(--color-neon-purple)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                    Volver al Inicio
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-dark)', color: 'white', padding: '1.5rem', paddingBottom: '4rem' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: '500px', margin: '0 auto' }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-neon-purple), var(--color-neon-teal))', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}>
                        <User size={50} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>{profile.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '0.5rem', opacity: 0.6, fontSize: '0.9rem', fontWeight: '700' }}>
                        <Award size={16} /> MIEMBRO DESDE {new Date(profile.member_since).getFullYear()}
                    </div>
                </div>

                {/* Status Badge */}
                <div style={{ background: 'rgba(0,243,255,0.1)', border: '1px solid var(--color-neon-teal)', borderRadius: '16px', padding: '1rem', textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-neon-teal)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>ESTADO DE PASAPORTE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>PARCERO VERIFICADO ✅</div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.25rem', textAlign: 'center' }}>
                        <Star size={20} color="var(--color-neon-teal)" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{profile.total_stamps}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase' }}>Sellos Totales</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.25rem', textAlign: 'center' }}>
                        <MapPin size={20} color="var(--color-neon-purple)" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{profile.venues_visited}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase' }}>Sitios Visitados</div>
                    </div>
                </div>

                {/* Extra Stats */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trophy size={20} color="#22c55e" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.5 }}>PREMIOS CANJEADOS</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>{profile.rewards_claimed} Recompensas</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={20} color="#a855f7" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.5 }}>RANGO ACTUAL</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>Parcero de Oro</div>
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Esta es una vista pública del pasaporte de {profile.name}. <br />
                    Las Parché Monedas y datos privados están ocultos.
                </div>

                {/* CTA */}
                <button
                    onClick={() => navigate('/register')}
                    style={{ width: '100%', marginTop: '3rem', padding: '1.2rem', borderRadius: '100px', background: 'white', color: 'black', border: 'none', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 30px rgba(255,255,255,0.1)' }}
                >
                    ÚNETE A VIVEPARCHÉ
                </button>
            </motion.div>
        </div>
    );
};
