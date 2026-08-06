import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { MapPin, Calendar, Award, Zap, ChevronLeft, Loader2 } from 'lucide-react';
import { rewardService } from '../services/api';
import { MobileNav } from '../components/MobileNav';

export const PassportList: React.FC = () => {
    const navigate = useNavigate();
    const [passport, setPassport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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
                console.error("Failed to fetch passport", err);
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
                    <ChevronLeft size={20} /> Volver al Perfil
                </button>

                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: '900', marginBottom: '0.5rem' }}>Colección del Pasaporte</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.1rem' }}>Todos tus sellos de locales y parches en un solo lugar.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {/* Venue Stamps */}
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: 'var(--color-neon-teal)' }}>
                            <MapPin size={24} /> Sellos en Locales
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {passport?.venue_stamps?.length > 0 ? passport.venue_stamps.map((stamp: any) => (
                                <div key={stamp.venue_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', backdropFilter: 'blur(20px)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0, 243, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Award size={28} color="var(--color-neon-teal)" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{stamp.venue_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Sello Oficial</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>Progreso</span>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--color-neon-teal)' }}>{stamp.count}/{stamp.limit}</div>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(stamp.count / stamp.limit) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-neon-teal), #00d2ff)', boxShadow: '0 0 15px var(--color-neon-teal)' }}></div>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ gridColumn: '1/-1', padding: '4rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '32px' }}>
                                    Aún no tienes sellos en locales.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Event Stamps */}
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: 'var(--color-neon-purple)' }}>
                            <Calendar size={24} /> Sellos en Parches
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {passport?.event_stamps?.length > 0 ? passport.event_stamps.map((stamp: any) => (
                                <div key={stamp.store_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', backdropFilter: 'blur(20px)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(111, 66, 193, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Zap size={28} color="var(--color-neon-purple)" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{stamp.store_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Parche Exclusivo</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>Progreso</span>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--color-neon-purple)' }}>{stamp.count}/{stamp.limit}</div>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(stamp.count / stamp.limit) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-neon-purple), #a855f7)', boxShadow: '0 0 15px var(--color-neon-purple)' }}></div>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ gridColumn: '1/-1', padding: '4rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '32px' }}>
                                    Aún no tienes sellos en parches.
                                </div>
                            )}
                        </div>
                    </div>
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
