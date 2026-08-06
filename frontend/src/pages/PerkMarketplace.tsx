import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { loyaltyService } from '../services/api';
import { Zap, MapPin, ChevronRight, ArrowLeft, Sparkles, X, Loader2, ShoppingBag, Search } from 'lucide-react';

const PERK_ICONS: Record<string, string> = {
    drink: '🍺',
    food: '🍔',
    vip: '👑',
    discount: '💸',
    custom: '🎁',
};

export const PerkMarketplace: React.FC = () => {
    const navigate = useNavigate();
    const [venues, setVenues] = useState<any[]>([]);
    const [userCoins, setUserCoins] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [purchaseResult, setPurchaseResult] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const isMobile = window.innerWidth < 1024;

    const loadMarketplace = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await loyaltyService.getMarketplace();
            setVenues(data.venues || []);
            setUserCoins(data.user_coins || 0);
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Failed to load marketplace');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        loadMarketplace();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        loadMarketplace();
    };

    const handlePurchase = async (venueId: string, perkId: string) => {
        setPurchasing(perkId);
        setError('');
        try {
            const result = await loyaltyService.purchasePerk(venueId, perkId);
            setPurchaseResult(result);
            setUserCoins(result.coins_remaining);
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Purchase failed. Try again.');
        } finally {
            setPurchasing(null);
        }
    };

    if (loading && !isSearching && venues.length === 0) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <Loader2 className="animate-spin" size={32} color="var(--color-neon-purple)" />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: isMobile ? '8rem' : '5rem' }}>
            <Navbar />
            <div className="container" style={{ paddingTop: isMobile ? '6.5rem' : '8rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/passport')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
                        <ArrowLeft size={18} /> Passport
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <ShoppingBag size={28} color="var(--color-neon-purple)" />
                            <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', margin: 0 }}>Gastar Coins</h1>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.9rem' }}>
                            Venues where you can redeem your Parché VibeCoins
                        </p>
                    </div>
                    <div style={{ textAlign: 'right', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '16px', padding: '0.75rem 1.25rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: '2px' }}>YOUR BALANCE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={18} fill="currentColor" /> {userCoins.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* AI Search Bar */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="¿Qué se te antoja buscar hoy usando la IA? Ej: quiero tomar cervezas"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 48px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        style={{
                            padding: '0 1.5rem',
                            background: 'var(--color-neon-purple)',
                            border: 'none',
                            borderRadius: '16px',
                            color: 'white',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Descubrir'}
                    </button>
                </form>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', color: '#f87171', marginBottom: '1.5rem', fontWeight: '700' }}>
                        {error}
                    </div>
                )}

                {venues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                        <Sparkles size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>No venues available</h2>
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>
                            Earn more coins or check back later for venues with perks you can afford.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        {venues.map((venue) => (
                            <div
                                key={venue.id}
                                onClick={() => setSelectedVenue(venue)}
                                style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '24px', overflow: 'hidden', cursor: 'pointer',
                                    transition: 'all 0.3s', position: 'relative'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                            >
                                {/* Venue Image */}
                                <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
                                    <img
                                        src={venue.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'}
                                        alt={venue.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'; }}
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }} />
                                    <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem' }}>
                                        <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.2rem' }}>{venue.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                                            <MapPin size={12} /> {venue.address}
                                        </div>
                                    </div>
                                </div>

                                {/* Perks Preview */}
                                <div style={{ padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                        {venue.perks.length} PERK{venue.perks.length !== 1 ? 'S' : ''} AVAILABLE
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {venue.perks.slice(0, 3).map((perk: any) => (
                                            <div key={perk.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                                                    <span>{PERK_ICONS[perk.type] || '🎁'}</span>
                                                    <span style={{ color: userCoins >= perk.coin_price ? 'white' : 'rgba(255,255,255,0.3)' }}>{perk.title}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '900', color: userCoins >= perk.coin_price ? '#c084fc' : 'rgba(168,85,247,0.3)' }}>
                                                    <Zap size={11} fill="currentColor" /> {perk.coin_price.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                        {venue.perks.length > 3 && (
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                                                +{venue.perks.length - 3} more perks
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '800', color: 'rgba(168,85,247,0.7)' }}>
                                            Ver perks <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Venue Perks Modal */}
            {selectedVenue && !purchaseResult && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1rem' }} onClick={() => { setSelectedVenue(null); setError(''); }}>
                    <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: '900' }}>{selectedVenue.name}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '4px' }}>
                                    <MapPin size={12} /> {selectedVenue.address}
                                </div>
                            </div>
                            <button onClick={() => { setSelectedVenue(null); setError(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '0.75rem 1rem', color: '#f87171', marginBottom: '1rem', fontWeight: '700', fontSize: '0.85rem' }}>{error}</div>}

                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>SELECCIONA UN PERK</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '900', color: '#c084fc' }}>
                                <Zap size={13} fill="currentColor" /> {userCoins.toLocaleString()} disponibles
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedVenue.perks.map((perk: any) => {
                                const canAfford = userCoins >= perk.coin_price;
                                return (
                                    <div key={perk.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${canAfford ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: canAfford ? 1 : 0.5 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{PERK_ICONS[perk.type] || '🎁'}</span>
                                                <span>{perk.title}</span>
                                            </div>
                                            {perk.description && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{perk.description}</div>}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '900', color: '#c084fc' }}>
                                                <Zap size={12} fill="currentColor" /> {perk.coin_price.toLocaleString()} coins
                                            </div>
                                        </div>
                                        <button
                                            disabled={!canAfford || purchasing === perk.id}
                                            onClick={() => handlePurchase(selectedVenue.id, perk.id)}
                                            style={{
                                                marginLeft: '1rem', padding: '0.6rem 1.25rem', borderRadius: '100px',
                                                background: canAfford ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${canAfford ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                                color: canAfford ? '#d8b4fe' : 'rgba(255,255,255,0.2)',
                                                fontWeight: '900', fontSize: '0.8rem', cursor: canAfford ? 'pointer' : 'not-allowed',
                                                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                                            }}
                                        >
                                            {purchasing === perk.id ? <Loader2 size={14} className="animate-spin" /> : null}
                                            {canAfford ? 'Canjear' : 'Sin coins'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Success Modal → navigate to ticket view */}
            {purchaseResult && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '2rem' }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '32px', padding: '2.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
                            🎉
                        </div>
                        <h2 style={{ fontWeight: '900', marginBottom: '0.5rem' }}>¡Compra exitosa!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {purchaseResult.perk_title} en {purchaseResult.venue_name}
                        </p>
                        <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            <span style={{ fontWeight: '800', color: '#c084fc' }}>{purchaseResult.coins_spent} coins</span> deducidos · Saldo: <span style={{ fontWeight: '800', color: '#c084fc' }}>{purchaseResult.coins_remaining}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                            <button
                                onClick={() => navigate(`/reward-tickets/${purchaseResult.ticket_id}`, { state: { ticket: purchaseResult } })}
                                style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.8))', border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer', fontSize: '0.95rem' }}
                            >
                                Ver mi ticket QR
                            </button>
                            <button
                                onClick={() => { setPurchaseResult(null); setSelectedVenue(null); }}
                                style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Seguir comprando
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isMobile && <MobileNav />}
        </div>
    );
};
