import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Share2, MapPin, Calendar, Award, PiggyBank, Gift, Zap, Loader2, ShoppingBag, Star, Trophy, ChevronRight } from 'lucide-react';
import { rewardService, ticketService, loyaltyService } from '../services/api';
import { MobileNav } from '../components/MobileNav';

export const Passport: React.FC = () => {
    const navigate = useNavigate();
    const [passport, setPassport] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [rewardTickets, setRewardTickets] = useState<any[]>([]);
    const [passportRewards, setPassportRewards] = useState<any[]>([]);
    const [claimingVenueId, setClaimingVenueId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'tickets' | 'rewards'>('profile');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pData, tData, rtData, prData] = await Promise.all([
                    rewardService.getPassport(),
                    ticketService.getMyTickets(),
                    loyaltyService.getMyRewardTickets(),
                    loyaltyService.getMyPassportRewards(),
                ]);
                setPassport(pData);
                setTickets(tData);
                setRewardTickets(rtData.tickets || []);
                setPassportRewards(prData.tickets || []);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const interval = setInterval(() => {
            fetchData();
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    const handleClaimReward = async (venueId: string) => {
        setClaimingVenueId(venueId);
        try {
            const result = await loyaltyService.claimStampReward(venueId);
            navigate(`/reward-tickets/${result.ticket_id}`, {
                state: {
                    coupon: {
                        id: result.ticket_id,
                        qr_token: result.qr_token,
                        text_code: result.text_code,
                        reward_type: result.reward_title,
                        venue_name: result.venue_name,
                        expires_at: result.expires_at,
                        status: result.status,
                        is_passport_reward: true,
                    }
                }
            });
        } catch (e: any) {
            alert(e?.response?.data?.detail || 'Error al reclamar el premio.');
        } finally {
            setClaimingVenueId(null);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--color-neon-purple)" />
        </div>
    );

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: isMobile ? '7rem' : '4rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: isMobile ? '6rem' : '8rem' }}>
                {/* Profile Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: isMobile ? '24px' : '32px', padding: isMobile ? '1.5rem' : '2.5rem',
                    display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center', gap: isMobile ? '1.5rem' : '2.5rem',
                    marginBottom: '2rem', backdropFilter: 'blur(20px)', textAlign: isMobile ? 'center' : 'left'
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: isMobile ? '120px' : '180px', height: isMobile ? '120px' : '180px', borderRadius: '50%', border: '4px solid var(--color-neon-purple)', padding: '4px' }}>
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'var(--color-neon-purple)', color: 'white', fontSize: '0.65rem', fontWeight: '800', padding: '4px 8px', borderRadius: '100px', boxShadow: '0 0 15px var(--color-neon-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {passport?.badge && <Award size={10} />}
                            {passport?.badge ? passport.badge : `Lvl ${passport?.level || 1}`}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: '900', marginBottom: '0.5rem' }}>{user.full_name || 'Adventurer'}</h1>
                    </div>
                    <button className="social-btn-small" style={{ alignSelf: isMobile ? 'center' : 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '100px' }}>
                        <Share2 size={18} /> Compartir Perfil
                    </button>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Monedas</span>
                            <PiggyBank size={20} color="var(--color-neon-purple)" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1rem' }}>
                            <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', color: 'var(--color-neon-teal)' }}>{passport?.vibecoins || 0}</div>
                        </div>
                        <button onClick={() => navigate('/marketplace')} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '100px', background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <ShoppingBag size={14} /> Gastar Monedas
                        </button>
                    </div>
                    <div className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Sellos en Locales</span>
                            <Award size={20} color="var(--color-neon-purple)" />
                        </div>
                        <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900' }}>{passport?.venue_stamps?.length || 0}</div>
                    </div>
                    <div className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Sellos en Parches</span>
                            <Zap size={20} color="var(--color-neon-purple)" />
                        </div>
                        <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900' }}>{passport?.event_stamps?.length || 0}</div>
                    </div>
                    <div className="stat-card" style={{ border: '1px solid var(--color-neon-purple)', background: 'rgba(111, 66, 193, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Tu ID</span>
                            <div style={{ background: 'var(--color-neon-purple)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>ÚNICO</div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>{passport?.user_hash_id || '------'}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: isMobile ? '1rem' : '2rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '2px' : '0' }}>
                    <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'tab-active' : 'tab-inactive'} style={{ whiteSpace: 'nowrap' }}>PASAPORTE Y QR</button>
                    <button onClick={() => setActiveTab('tickets')} className={activeTab === 'tickets' ? 'tab-active' : 'tab-inactive'} style={{ whiteSpace: 'nowrap' }}>MIS BOLETAS ({tickets.length + rewardTickets.length})</button>
                    <button onClick={() => setActiveTab('rewards')} className={activeTab === 'rewards' ? 'tab-active' : 'tab-inactive'} style={{ whiteSpace: 'nowrap' }}>
                        MIS PREMIOS {passportRewards.length > 0 && `(${passportRewards.length})`}
                    </button>
                </div>

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.8fr', gap: isMobile ? '2rem' : '3rem' }}>
                        {/* QR Card */}
                        <div className="stat-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>Pasaporte Parché</h3>
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', display: 'inline-block', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(111, 66, 193, 0.3)' }}>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/p/${passport?.user_hash_id}`)}`} alt="User QR" style={{ width: '180px', height: '180px' }} />
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>Muestra este QR cuando pagues en un local para acumular sellos y Monedas.</div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '4px' }}>
                                {passport?.user_hash_id || '------'}
                            </div>
                        </div>

                        {/* Venue Stamps Progress */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <MapPin size={22} color="var(--color-neon-teal)" /> Sellos en Locales
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {passport?.venue_stamps?.length > 0 ? (
                                        <>
                                            {[...(passport.venue_stamps)]
                                                .sort((a: any, b: any) => (b.porcentaje_progreso || 0) - (a.porcentaje_progreso || 0))
                                                .slice(0, 5)
                                                .map((stamp: any) => {
                                                    const activeConfig = stamp.siguiente_recompensa;
                                                    const stampsRequired = activeConfig?.stamps_required || 5;
                                                    const rewardTitle = activeConfig?.title || 'Premio Sorpresa';
                                                    const progress = (stamp.porcentaje_progreso || 0) / 100;
                                                    const isReached = progress >= 1.0;
                                                    const existingRewardsCount = stamp.recompensas_disponibles?.length || 0;
                                                    const hasRewards = existingRewardsCount > 0 || isReached;
                                                    const rewardsCount = existingRewardsCount > 0 ? existingRewardsCount : 1;
                                                    const isClaiming = claimingVenueId === stamp.venue_id;

                                                    return (
                                                        <div key={stamp.venue_id} className="stat-card" style={{ padding: '1.25rem', border: hasRewards ? '1px solid var(--color-neon-teal)' : '1px solid rgba(255,255,255,0.08)', background: hasRewards ? 'rgba(0,243,255,0.05)' : undefined }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: hasRewards ? 'var(--color-neon-teal)' : 'rgba(0,243,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    {hasRewards ? <Trophy size={24} color="black" /> : <Star size={24} color="var(--color-neon-teal)" />}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                        <div style={{ fontWeight: '800' }}>{stamp.venue_name || 'Local'}</div>
                                                                        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-neon-teal)' }}>
                                                                            {stamp.total_actual}/{stamp.limit} visitas
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                                        <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--color-neon-teal)', boxShadow: hasRewards ? '0 0 12px var(--color-neon-teal)' : 'none', transition: 'width 0.5s ease' }}></div>
                                                                    </div>
                                                                    {hasRewards ? (
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-neon-teal)', fontWeight: '800' }}>
                                                                                {existingRewardsCount > 0 ? `🎉 ¡Tienes ${rewardsCount} ${rewardsCount === 1 ? 'premio' : 'premios'} listos!` : `🎉 ¡Hito alcanzado!`}
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                <button
                                                                                    onClick={() => navigate(`/places/${stamp.venue_slug || stamp.venue_id}`)}
                                                                                    style={{ padding: '6px 12px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}
                                                                                >
                                                                                    Detalles
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleClaimReward(stamp.venue_id)}
                                                                                    disabled={isClaiming}
                                                                                    style={{ padding: '6px 16px', borderRadius: '100px', background: 'var(--color-neon-teal)', border: 'none', color: 'black', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                                                                                >
                                                                                    {isClaiming ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />}
                                                                                    Reclamar
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                                                                Próximo hito: <b>{rewardTitle}</b> (a las {stampsRequired} visitas)
                                                                            </div>
                                                                            <button
                                                                                onClick={() => navigate(`/places/${stamp.venue_slug || stamp.venue_id}`)}
                                                                                style={{ padding: '6px 12px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}
                                                                            >
                                                                                Ir →
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            {passport.venue_stamps.length > 5 && (
                                                <button onClick={() => navigate('/profile/passports')} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', color: 'var(--color-neon-teal)', fontWeight: '800', cursor: 'pointer' }}>
                                                    VER TODOS ({passport.venue_stamps.length})
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                                            Aún no tienes sellos de locales. ¡Visita uno para empezar!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Event Stamps */}
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <Calendar size={22} color="var(--color-neon-purple)" /> Sellos en Parches
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {passport?.event_stamps?.length > 0 ? (
                                        passport.event_stamps.map((stamp: any) => (
                                            <div key={stamp.store_id} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Zap size={24} color="white" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: '800' }}>{stamp.store_name}</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-neon-purple)' }}>{stamp.stamps_count}/{stamp.limit || 5}</div>
                                                    </div>
                                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                        <div style={{ width: `${(stamp.stamps_count / (stamp.limit || 5)) * 100}%`, height: '100%', background: 'var(--color-neon-purple)', boxShadow: '0 0 10px var(--color-neon-purple)' }}></div>
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                                        ¡Asiste a {stamp.limit || 5} parches de este organizador para ganar un súper premio!
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                                            Aún no tienes sellos de parches. ¡Asiste a uno para empezar!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TICKETS TAB */}
                {activeTab === 'tickets' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* Perk Reward Tickets */}
                        {rewardTickets.length > 0 && (
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Gift size={20} color="var(--color-neon-purple)" /> Gangazos Comprados ({rewardTickets.length})
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                                    {rewardTickets.map((ticket: any) => (
                                        <div key={ticket.id} className="stat-card" onClick={() => navigate(`/reward-tickets/${ticket.id}`, { state: { coupon: { ...ticket, reward_type: ticket.perk_title } } })} style={{ cursor: 'pointer', padding: '1.5rem', border: '1px solid rgba(168,85,247,0.2)' }}>
                                            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Gift size={20} color="white" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>{ticket.perk_title}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{ticket.venue_name}</div>
                                                </div>
                                                <div style={{ background: ticket.status === 'REDEEMED' ? 'rgba(255,255,255,0.1)' : 'var(--color-neon-teal)', color: ticket.status === 'REDEEMED' ? 'rgba(255,255,255,0.5)' : 'black', padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '900', alignSelf: 'flex-start' }}>
                                                    {ticket.status}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                                <MapPin size={14} /> {ticket.venue_address}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Event Tickets */}
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Calendar size={20} color="var(--color-neon-teal)" /> Boletas de Parches ({tickets.length})
                            </h2>
                            {tickets.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>Aún no tienes boletas compradas.</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
                                    {tickets.map((group: any) => (
                                        <div key={group.event_id} className="stat-card" onClick={() => navigate(`/tickets/${group.event_id}`, { state: { event: { id: group.event_id, ...group.details }, tickets: group.tickets } })} style={{ padding: 0, cursor: 'pointer', overflow: 'hidden' }}>
                                            <div style={{ height: isMobile ? '180px' : '200px', position: 'relative' }}>
                                                <img src={group.details?.image_url || '/assets/placeholder_event.jpg'} alt={group.details?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{ position: 'absolute', bottom: '1rem', left: '1.5rem' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{group.details?.title}</h3>
                                                </div>
                                            </div>
                                            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(group.details?.event_date).toLocaleDateString()}</div>
                                                    <div style={{ fontWeight: '700' }}>{group.tickets.length} Boletas</div>
                                                </div>
                                                <div style={{ color: 'var(--color-neon-purple)', fontWeight: '900' }}>VER →</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MY REWARDS TAB (Passport Stamp Rewards) */}
                {activeTab === 'rewards' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Trophy size={20} color="var(--color-neon-teal)" /> Mis Recompensas de Pasaporte
                        </h2>
                        {passportRewards.length === 0 ? (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', color: 'rgba(255,255,255,0.3)' }}>
                                <Trophy size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>No tienes premios reclamados aún</div>
                                <div style={{ fontSize: '0.85rem' }}>Completa tu pasaporte de sellos en un local para desbloquear premios.</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                                {passportRewards.map((reward: any) => (
                                    <div
                                        key={reward.id}
                                        className="stat-card"
                                        onClick={() => navigate(`/reward-tickets/${reward.id}`, { state: { coupon: { id: reward.id, qr_token: reward.qr_token, text_code: reward.text_code, reward_type: reward.reward_title, venue_name: reward.venue_name, expires_at: reward.expires_at, status: reward.status, is_passport_reward: true } } })}
                                        style={{ cursor: 'pointer', padding: '1.5rem', border: reward.status === 'ACTIVE' ? '1px solid rgba(0,243,255,0.3)' : '1px solid rgba(255,255,255,0.05)', background: reward.status === 'ACTIVE' ? 'rgba(0,243,255,0.03)' : undefined, transition: 'all 0.2s' }}
                                    >
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: reward.status === 'ACTIVE' ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Trophy size={22} color={reward.status === 'ACTIVE' ? 'black' : 'rgba(255,255,255,0.3)'} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '3px' }}>{reward.reward_title}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{reward.venue_name}</div>
                                            </div>
                                            <div style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '900', alignSelf: 'flex-start', background: reward.status === 'ACTIVE' ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.05)', color: reward.status === 'ACTIVE' ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.3)' }}>
                                                {reward.status === 'ACTIVE' ? 'ACTIVO' : reward.status === 'REDEEMED' ? 'CANJEADO' : 'EXPIRADO'}
                                            </div>
                                        </div>
                                        {reward.reward_description && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>{reward.reward_description}</div>}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                                                {reward.expires_at ? `Vence: ${new Date(reward.expires_at).toLocaleDateString('es-CO')}` : 'Sin vencimiento'}
                                            </div>
                                            {reward.status === 'ACTIVE' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-neon-teal)', fontWeight: '800' }}>
                                                    VER TICKET <ChevronRight size={14} />
                                                </div>
                                            )}
                                        </div>
                                        {/* Code preview */}
                                        {reward.status === 'ACTIVE' && (
                                            <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px dashed rgba(0,243,255,0.3)', fontFamily: 'monospace', fontWeight: '800', fontSize: '0.9rem', color: 'var(--color-neon-teal)', letterSpacing: '3px' }}>
                                                {reward.text_code}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isMobile && <MobileNav />}

            <style>{`
                .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 1.5rem 2rem; backdrop-filter: blur(20px); }
                .tab-active { padding: 1rem 0; background: none; border: none; color: var(--color-neon-purple); border-bottom: 2px solid var(--color-neon-purple); font-weight: 800; cursor: pointer; }
                .tab-inactive { padding: 1rem 0; background: none; border: none; color: rgba(255,255,255,0.4); border-bottom: 2px solid transparent; font-weight: 800; cursor: pointer; }
                .social-btn-small { padding: 0.9rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: white; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};


