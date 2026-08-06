import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Chatbot } from '../components/Chatbot';
import { placeService, loyaltyService, viewService, rewardService } from '../services/api';
import { CustomerChatWindow } from '../components/CustomerChatWindow';
import type { Place } from '../types';
import {
    MapPin, Star, Clock, Globe, Info,
    MessageCircle, ExternalLink, ChevronRight,
    Map as MapIcon, Utensils, Coffee, ShoppingBag,
    Instagram, Facebook, Share2, Zap,
    ChevronLeft, Link as LinkIcon, Video,
    Loader2, X, FileText, Trophy
} from 'lucide-react';

import { MobileNav } from '../components/MobileNav';
import { ImageLightbox } from '../components/ImageLightbox';
import { VenueReviews } from '../components/VenueReviews';

export const PlaceDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [place, setPlace] = useState<Place | null>(null);
    const [perks, setPerks] = useState<any[]>([]);
    const [stampRewards, setStampRewards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [showSchedules, setShowSchedules] = useState(false);
    const [showOffers, setShowOffers] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [passport, setPassport] = useState<any>(null);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [purchaseError, setPurchaseError] = useState('');
    const [purchaseSuccess, setPurchaseSuccess] = useState<any | null>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const isLoggedIn = !!localStorage.getItem('access_token');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        } else if (isRightSwipe) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    const scrollCarousel = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = isMobile ? 300 : 400;
        const newScrollPos = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
        scrollContainerRef.current.scrollTo({
            left: newScrollPos,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (slug) {
            placeService.getById(slug)
                .then(data => {
                    setPlace(data);
                    // Track view (best-effort, only for logged-in users)
                    if (data.id) {
                        viewService.trackVenueView(data.id);
                    }
                })
                .catch(console.error)
                .finally(() => setLoading(false));

            // We still need the real ID for some things like perks/rewards
            // But we have to wait for the place to load
        }
    }, [slug]);

    // Fetch related data once place is loaded
    useEffect(() => {
        if (place?.id) {
            const id = place.id;
            // Fetch perks
            loyaltyService.getVenuePerks(id)
                .then(data => setPerks(data.filter((p: any) => p.active)))
                .catch(err => console.error("Failed to fetch perks:", err));

            // Fetch active stamp rewards
            loyaltyService.getVenueStampRewards(id)
                .then(data => {
                    const activeRewards = (data || [])
                        .filter((r: any) => r.active)
                        .sort((a: any, b: any) => a.stamps_required - b.stamps_required);
                    setStampRewards(activeRewards);
                })
                .catch(err => console.error("Failed to fetch stamp reward:", err));

            // Fetch passport if logged in
            if (isLoggedIn) {
                rewardService.getPassport()
                    .then(setPassport)
                    .catch(error => console.error("Failed to fetch passport:", error));
            }
        }
    }, [place?.id, isLoggedIn]);

    const getWaMessage = (venueName: string, subTier: string) => {
        const isPro = subTier === 'PRO';
        return isPro
            ? `Hola, me gustaría más información.`
            : `¡Hola! Los vi en Parché App. Me gustaría ir a ${venueName}.`;
    };

    const whatsappUrl = place?.whatsapp_number
        ? `https://wa.me/${place.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(getWaMessage(place.name, place.subscription_tier || 'FREE'))}`
        : null;

    const getCategoryIcon = (category?: string) => {
        switch (category?.toLowerCase()) {
            case 'cafes': return <Coffee size={18} />;
            case 'restaurants': return <Utensils size={18} />;
            case 'retail': return <ShoppingBag size={18} />;
            default: return <MapPin size={18} />;
        }
    };

    const images = useMemo(() => {
        const list = [];
        if (place?.image_url) list.push(place.image_url);
        if ((place as any)?.gallery_images && Array.isArray((place as any).gallery_images)) {
            list.push(...(place as any).gallery_images);
        }
        if (list.length === 0) list.push('/assets/placeholder_event.jpg');
        return list;
    }, [place]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div className="neon-text-teal">Cargando lugar...</div>
        </div>
    );

    if (!place) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Local no encontrado</h2>
                <Link to="/" className="btn-secondary">Volver al Inicio</Link>
            </div>
        </div>
    );

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleShare = (method: string) => {
        const url = window.location.href;
        const text = `¡Mira este parche en Parché App! ${place.name}`;

        if (method === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        } else if (method === 'facebook') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        } else if (method === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        } else if (method === 'copy') {
            navigator.clipboard.writeText(url);
            alert('¡Enlace copiado al portapapeles!');
        }
        setShowShareMenu(false);
    };

    const handlePurchase = async (perkId: string) => {
        if (!isLoggedIn) {
            navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
            return;
        }
        setPurchasing(perkId);
        setPurchaseError('');
        try {
            const result = await loyaltyService.purchasePerk(place!.id, perkId);
            setPurchaseSuccess(result);
            if (passport) setPassport({ ...passport, total_coins: result.coins_remaining });
        } catch (e: any) {
            setPurchaseError(e?.response?.data?.detail || 'Error al canjear el gangazo. Intenta de nuevo.');
        } finally {
            setPurchasing(null);
        }
    };

    const shareButtonStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold'
    };

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '8rem', background: 'var(--color-bg)', color: 'white' }}>
            <Navbar />

            {/* Breadcrumbs */}
            <div className="container" style={{ paddingTop: '8rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: '500' }}>
                    <Link to="/" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} className="breadcrumb-link">Inicio</Link>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <Link to="/" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} className="breadcrumb-link">Locales</Link>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <span style={{ color: 'var(--color-neon-teal)', fontWeight: '700' }}>{place.name}</span>
                </div>
            </div>

            {/* Hero Image Section */}
            <div className="container" style={{ marginBottom: isMobile ? '2rem' : '3rem' }}>
                <div style={{
                    minHeight: isMobile ? '400px' : '550px',
                    width: '100%',
                    background: '#0d0d0d',
                    borderRadius: isMobile ? '24px' : '40px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                >
                    {/* Background Images with transition */}
                    {images.map((img: string, idx: number) => (
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: `url(${img}) center/cover`,
                                opacity: idx === currentImageIndex ? 1 : 0,
                                transition: 'opacity 0.6s ease-in-out',
                                zIndex: 0,
                                cursor: images.length > 0 ? 'pointer' : 'default'
                            }}
                            onClick={() => images.length > 0 && setLightboxOpen(true)}
                        />
                    ))}

                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)', zIndex: 1 }}></div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                style={{
                                    position: 'absolute', left: isMobile ? '1rem' : '1.5rem', top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white', borderRadius: '50%', width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s'
                                }}
                                className="nav-btn-hover"
                            >
                                <ChevronLeft size={isMobile ? 20 : 24} />
                            </button>
                            <button
                                onClick={nextImage}
                                style={{
                                    position: 'absolute', right: isMobile ? '1rem' : '1.5rem', top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white', borderRadius: '50%', width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s'
                                }}
                                className="nav-btn-hover"
                            >
                                <ChevronRight size={isMobile ? 20 : 24} />
                            </button>
                        </>
                    )}

                    {/* Gallery Button */}
                    {images.length > 0 && (
                        <button
                            onClick={() => setLightboxOpen(true)}
                            style={{
                                position: 'absolute', right: '1.5rem', top: '1.5rem',
                                zIndex: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                padding: '0.6rem 1rem', borderRadius: '12px', display: 'flex',
                                alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem',
                                fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            className="gallery-btn-hover"
                        >
                            <Video size={16} /> Ver fotos
                        </button>
                    )}

                    {/* Image Indicators */}
                    {images.length > 1 && (
                        <div style={{
                            position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                            zIndex: 10, display: 'flex', gap: '8px'
                        }}>
                            {images.map((_: string, idx: number) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: idx === currentImageIndex ? '20px' : '6px',
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: idx === currentImageIndex ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.25)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: idx === currentImageIndex ? '0 0 10px var(--color-neon-teal)' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div style={{
                        position: 'relative',
                        zIndex: 5,
                        width: '100%',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'flex-end',
                        gap: isMobile ? '1.5rem' : '2rem',
                        padding: isMobile ? '2.5rem 1.5rem' : '3.5rem',
                    }}>
                        <div style={{ maxWidth: '800px', width: '100%' }}>
                            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <span style={{ background: 'rgba(0, 243, 255, 0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 243, 255, 0.25)', color: 'var(--color-neon-teal)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {getCategoryIcon(place.category)} {place.category?.toUpperCase() || 'LOCAL'}
                                </span>
                                <div style={{ background: 'rgba(234, 179, 8, 0.15)', backdropFilter: 'blur(10px)', color: '#fbbf24', padding: '4px 12px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: '900', border: '1px solid rgba(234, 179, 8, 0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Star size={12} fill="currentColor" /> {place.rating}
                                </div>
                            </div>
                            <h1 style={{ fontSize: isMobile ? '2.2rem' : 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: '900', margin: '0 0 1rem 0', lineHeight: 1.1, letterSpacing: '-0.03em', textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>{place.name}</h1>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.75rem' : '2rem', color: 'rgba(255,255,255,0.85)', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <MapPin size={isMobile ? 18 : 20} color="var(--color-neon-teal)" />
                                    <span style={{ fontWeight: '500' }}>{place.address || 'Dirección por confirmar'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Clock size={isMobile ? 18 : 20} color={place.is_open ? 'var(--color-neon-teal)' : '#f87171'} />
                                    <span style={{ color: place.is_open ? 'var(--color-neon-teal)' : '#f87171', fontWeight: '800', letterSpacing: '0.05em' }}>
                                        {place.is_open ? 'ABIERTO AHORA' : 'CERRADO'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'nowrap', width: isMobile ? '100%' : 'auto' }}>
                            <button
                                onClick={() => setShowChat(true)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: 'rgba(0, 243, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(0, 243, 255, 0.4)',
                                    color: 'white',
                                    padding: isMobile ? '0.85rem 1rem' : '1.1rem 2rem',
                                    borderRadius: '100px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <MessageCircle size={isMobile ? 18 : 20} /> <span style={{ display: isMobile ? 'inline' : 'inline' }}>Chat</span>
                            </button>

                            <Link
                                to={`/?tab=events&venueId=${place.id}`}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: 'var(--color-neon-purple)',
                                    color: 'white',
                                    padding: isMobile ? '0.85rem 1rem' : '1.1rem 2rem',
                                    borderRadius: '100px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    textDecoration: 'none',
                                    boxShadow: 'var(--shadow-neon-purple)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Zap size={isMobile ? 18 : 20} /> <span style={{ display: isMobile ? 'inline' : 'inline' }}>Parches</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && place.image_url && (
                <ImageLightbox
                    images={(place as any).gallery_images?.length > 0 ? (place as any).gallery_images : [place.image_url]}
                    title={place.name}
                    onClose={() => setLightboxOpen(false)}
                />
            )}

            {showChat && place && (
                <CustomerChatWindow
                    venueId={place.id}
                    venueName={place.name}
                    menuUrl={place.menu_url}
                    specialOffersUrl={place.special_offers_pdf_url}
                    whatsappNumber={place.whatsapp_number}
                    onClose={() => setShowChat(false)}
                />
            )}

            <div className="container" style={{ overflow: 'hidden', padding: isMobile ? '0 1rem' : '0 2rem' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 380px', 
                    gap: isMobile ? '2rem' : '4rem',
                }}>

                    {/* Left Content */}
                    <div style={{ minWidth: 0 }}>
                        {/* Summary / About */}
                        <section style={{ marginBottom: '4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(0, 243, 255, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                                    <Info size={18} color="var(--color-neon-teal)" />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>Siente la Vibra</h2>
                            </div>
                            <p style={{ lineHeight: 1.8, fontSize: '1.15rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2.5rem' }}>
                                {place.description || `Bienvenidos a ${place.name}. Descubre una atmósfera única pensada para los que aprecian el buen servicio y las mejores vibras. Definitivamente tu nuevo parche favorito.`}
                            </p>

                            {/* Multiple Stamp Rewards Section */}
                            {stampRewards.length > 0 && (
                                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <Star size={18} fill="var(--color-neon-teal)" color="var(--color-neon-teal)" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--color-neon-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PASAPORTE DE RECOMPENSAS</span>
                                        </div>
                                        
                                        {!isMobile && stampRewards.length > 2 && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    onClick={() => scrollCarousel('left')}
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => scrollCarousel('right')}
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div 
                                        ref={scrollContainerRef}
                                        style={{
                                            display: 'flex',
                                            gap: '1.5rem',
                                            overflowX: 'auto',
                                            paddingBottom: '1rem',
                                            paddingRight: '1rem',
                                            scrollbarWidth: 'none', // Hide scrollbar for cleaner look
                                            msOverflowStyle: 'none'
                                        }} className="no-scrollbar"
                                    >
                                        {stampRewards.map((reward, index) => {
                                            const venueStamp = passport?.venue_stamps?.find((vs: any) => vs.venue_id === place.id);
                                            const stampsCount = venueStamp?.total_actual || venueStamp?.stamps_count || 0;
                                            const stampsRequired = reward.stamps_required || 8;
                                            const progressValue = Math.min(stampsCount / stampsRequired, 1);
                                            const isUnlocked = stampsCount >= stampsRequired;

                                            return (
                                                <div key={reward.id || index} style={{
                                                    minWidth: isMobile ? '280px' : '320px',
                                                    flexShrink: 0,
                                                    background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.08), rgba(0, 243, 255, 0.02))',
                                                    border: isUnlocked ? '1px solid var(--color-neon-teal)' : '1px solid rgba(0, 243, 255, 0.2)',
                                                    borderRadius: '24px',
                                                    padding: '1.5rem',
                                                    position: 'relative',
                                                    boxShadow: isUnlocked ? '0 10px 30px rgba(0, 243, 255, 0.15)' : 'none'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                        <div style={{ 
                                                            background: isUnlocked ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.05)', 
                                                            color: isUnlocked ? 'black' : 'white',
                                                            padding: '4px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '900'
                                                        }}>
                                                            {stampsRequired} {stampsRequired === 1 ? 'VISITA' : 'VISITAS'}
                                                        </div>
                                                        {isUnlocked && <Trophy size={16} color="var(--color-neon-teal)" />}
                                                    </div>

                                                    <h4 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>{reward.title}</h4>
                                                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: '1.5rem', height: '2.8rem', overflow: 'hidden' }}>
                                                        {reward.description}
                                                    </p>

                                                    {isLoggedIn && (
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: '800' }}>
                                                                <span style={{ color: isUnlocked ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.4)' }}>
                                                                    {isUnlocked ? '✓ COMPLETADO' : 'PROGRESO'}
                                                                </span>
                                                                <span style={{ color: 'white' }}>{stampsCount}/{stampsRequired}</span>
                                                            </div>
                                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    width: `${progressValue * 100}%`,
                                                                    height: '100%',
                                                                    background: isUnlocked ? 'var(--color-neon-teal)' : 'rgba(0, 243, 255, 0.4)',
                                                                    transition: 'width 0.5s ease'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {isLoggedIn && (
                                        <button
                                            onClick={() => navigate('/passport')}
                                            style={{
                                                marginTop: '1rem',
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                background: 'rgba(255, 255, 255, 0.05)', padding: '10px 20px',
                                                borderRadius: '100px', border: '1px solid rgba(255, 255, 255, 0.15)',
                                                color: 'white', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            Ver mi pasaporte completo <ChevronRight size={16} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {!isLoggedIn && stampRewards.length > 0 && (
                                <div style={{ 
                                    marginBottom: '3rem',
                                    display: 'flex', 
                                    flexDirection: isMobile ? 'column' : 'row', 
                                    alignItems: isMobile ? 'stretch' : 'center', 
                                    gap: '1.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    padding: '1.25rem',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                            <Info size={16} color="var(--color-neon-teal)" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>Activa tu Pasaporte</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>Regístrate para empezar a acumular sellos y ganar beneficios exclusivos.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname))}
                                        style={{
                                            background: 'var(--color-neon-purple)', color: 'white',
                                            border: 'none', padding: '12px 24px', borderRadius: '100px',
                                            fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer',
                                            boxShadow: '0 8px 20px rgba(168, 85, 247, 0.4)', whiteSpace: 'nowrap',
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        Unirme Ahora
                                    </button>
                                </div>
                            )}

                            {/* Loyalty Perks Row */}
                            {perks.length > 0 && (
                                <div style={{ marginBottom: '3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                                        <Zap size={18} color="#a855f7" />
                                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#a855f7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>GANGAZOS EXCLUSIVOS</span>
                                    </div>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
                                        gap: '1.25rem' 
                                    }}>
                                        {perks.map((perk, idx) => (
                                            <div key={idx} style={{
                                                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.03) 100%)',
                                                border: '1.5px solid rgba(168, 85, 247, 0.2)',
                                                borderRadius: '24px',
                                                padding: '1.75rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                                transition: 'transform 0.3s ease'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                    <span style={{ fontWeight: '900', fontSize: '1.1rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{perk.title}</span>
                                                    <span style={{ background: '#a855f7', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                                        {perk.coin_price} 👋
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, flex: 1 }}>
                                                    {perk.description}
                                                </p>
                                                
                                                <button
                                                    onClick={() => handlePurchase(perk.id)}
                                                    disabled={purchasing === perk.id}
                                                    style={{
                                                        marginTop: '1rem',
                                                        padding: '1rem',
                                                        borderRadius: '16px',
                                                        background: 'rgba(168,85,247,0.15)',
                                                        border: '1px solid rgba(168,85,247,0.4)',
                                                        color: '#e9d5ff',
                                                        fontWeight: '900',
                                                        fontSize: '0.9rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '10px',
                                                        transition: 'all 0.3s ease',
                                                    }}
                                                >
                                                    {purchasing === perk.id ? <Loader2 size={18} className="animate-spin" /> : <>Canjear ahora <ChevronRight size={16} /></>}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {purchaseError && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontWeight: '700', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {purchaseError}
                                            <button onClick={() => setPurchaseError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><X size={16} /></button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {place.vibe_tags?.map((tag, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '50px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: 'var(--color-neon-teal)'
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }}></div>
                                        {tag.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Schedules Section */}
                        <section style={{ marginBottom: '4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                                    <Clock size={18} color="white" />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>Horario de Atención</h2>
                            </div>
                            {!showSchedules ? (
                                <button
                                    onClick={() => setShowSchedules(true)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0, 243, 255, 0.1)',
                                        border: '1px solid rgba(0, 243, 255, 0.3)',
                                        color: 'var(--color-neon-teal)',
                                        padding: '1rem',
                                        borderRadius: '16px',
                                        fontWeight: '800',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Clock size={18} /> Ver horarios
                                </button>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                        const dayKey = day.toLowerCase();
                                        const hoursObj = place.opening_hours?.[dayKey];

                                        let hoursText = 'No disponible';
                                        let isClosedDay = false;

                                        if (hoursObj) {
                                            if (hoursObj.closed) {
                                                isClosedDay = true;
                                                hoursText = 'CERRADO';
                                            } else if (hoursObj.open && hoursObj.close) {
                                                hoursText = `${hoursObj.open} - ${hoursObj.close}`;
                                            }
                                        }

                                        const dayName = {
                                            'monday': 'Lunes', 'tuesday': 'Martes', 'wednesday': 'Miércoles',
                                            'thursday': 'Jueves', 'friday': 'Viernes', 'saturday': 'Sábado', 'sunday': 'Domingo'
                                        }[dayKey] || day;

                                        return (
                                            <div key={day} style={{
                                                padding: '1.5rem',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '20px',
                                                border: isClosedDay ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{dayName}</div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isClosedDay ? '#f87171' : 'white' }}>{hoursText}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Special Offers Section */}
                        {(place?.special_offers_json?.length || place?.special_offers_pdf_url) && (
                            <section style={{ marginBottom: '4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ background: 'rgba(255, 127, 80, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                                        <Zap size={18} color="#ff7f50" />
                                    </div>
                                    <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>Ofertas Especiales</h2>
                                </div>
                                {!showOffers ? (
                                    <button
                                        onClick={() => setShowOffers(true)}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 127, 80, 0.1)',
                                            border: '1px solid rgba(255, 127, 80, 0.3)',
                                            color: '#ff7f50',
                                            padding: '1rem',
                                            borderRadius: '16px',
                                            fontWeight: '800',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <Zap size={18} /> Ver ofertas especiales
                                    </button>
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                                        {place?.special_offers_json && place.special_offers_json.length > 0 && (
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                                gap: '1.25rem',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}>
                                                {place.special_offers_json.map((offer, idx) => (
                                                    <div key={idx} style={{
                                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,127,80,0.06) 100%)',
                                                        border: '1.5px solid rgba(255,127,80,0.25)',
                                                        borderRadius: '28px',
                                                        padding: isMobile ? '1.5rem' : '2.25rem',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.6rem',
                                                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        boxSizing: 'border-box',
                                                        minHeight: '200px'
                                                    }}>
                                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle at top right, rgba(255,127,80,0.08), transparent 70%)', pointerEvents: 'none' }}></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div style={{ fontWeight: '900', fontSize: isMobile ? '1.2rem' : '1.5rem', color: '#ff7f50', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{offer.name}</div>
                                                            <Zap size={20} color="#ff7f50" style={{ flexShrink: 0, marginTop: '4px' }} />
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, flex: 1 }}>{offer.description}</p>
                                                        <div style={{ 
                                                            fontWeight: '900', 
                                                            fontSize: isMobile ? '1.2rem' : '1.4rem', 
                                                            textAlign: 'right', 
                                                            marginTop: '0.5rem',
                                                            color: 'white',
                                                            textShadow: '0 0 12px rgba(255,127,80,0.25)'
                                                        }}>{offer.price}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {place?.special_offers_pdf_url && (
                                            <div style={{ marginTop: '1.5rem' }}>
                                                <a
                                                    href={place.special_offers_pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.75rem',
                                                        background: 'rgba(255, 127, 80, 0.15)',
                                                        color: '#ff7f50',
                                                        padding: '1.1rem',
                                                        borderRadius: '16px',
                                                        textDecoration: 'none',
                                                        fontWeight: '900',
                                                        border: '1px solid rgba(255, 127, 80, 0.4)',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    <FileText size={20} /> Ver Ofertas en PDF
                                                </a>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowOffers(false)}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255, 127, 80, 0.15)',
                                                border: '1.5px solid rgba(255, 127, 80, 0.4)',
                                                color: '#ff7f50',
                                                padding: '1.2rem',
                                                borderRadius: '16px',
                                                marginTop: '2rem',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                fontWeight: '900',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.75rem',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 8px 25px rgba(255, 127, 80, 0.1)'
                                            }}
                                        >
                                            <X size={18} /> Ocultar ofertas
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Map / Location */}
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(0, 243, 255, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                                    <MapIcon size={18} color="var(--color-neon-teal)" />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: '800' }}>Cómo Llegar</h2>
                            </div>

                            {(place.address || (place.latitude && place.longitude)) ? (
                                <div style={{
                                    padding: '2.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '32px',
                                    border: '1px solid rgba(0, 243, 255, 0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5rem',
                                    boxShadow: '0 10px 30px rgba(0, 243, 255, 0.05)'
                                }}>
                                    {/* Dirección y botón */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h4 style={{
                                                margin: '0 0 0.5rem 0',
                                                fontSize: '1.25rem',
                                                fontWeight: '800',
                                                color: 'var(--color-neon-teal)'
                                            }}>
                                                {place.address}
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                                                Haz clic para abrir la ubicación exacta en Google Maps.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const query = (place.latitude && place.longitude)
                                                    ? `${place.latitude},${place.longitude}`
                                                    : encodeURIComponent(place.address || place.name);
                                                window.open(
                                                    `https://www.google.com/maps/search/?api=1&query=${query}`,
                                                    '_blank'
                                                );
                                            }}
                                            style={{
                                                background: 'var(--color-neon-teal)',
                                                color: 'black',
                                                border: 'none',
                                                padding: '1.1rem 2.2rem',
                                                borderRadius: '100px',
                                                fontWeight: '900',
                                                fontSize: '1rem',
                                                cursor: 'pointer',
                                                boxShadow: 'var(--shadow-neon-teal)',
                                                transition: 'transform 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            Ver en Google Maps
                                        </button>
                                    </div>

                                    {/* Mapa embebido */}
                                    <div style={{
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(0, 243, 255, 0.15)',
                                        height: '300px'
                                    }}>
                                        <iframe
                                            title="Ubicación del local"
                                            width="100%"
                                            height="300"
                                            style={{ border: 0, display: 'block' }}
                                            loading="lazy"
                                            allowFullScreen
                                            src={
                                                (place.latitude && place.longitude)
                                                    ? `https://maps.google.com/maps?q=${place.latitude},${place.longitude}&output=embed&hl=es&z=16`
                                                    : `https://maps.google.com/maps?q=${encodeURIComponent(place.address || place.name)}&output=embed&hl=es`
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    padding: '2rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '32px',
                                    border: '1px solid rgba(0, 243, 255, 0.1)',
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.4)'
                                }}>
                                    <MapIcon size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                                    <p style={{ margin: 0 }}>Ubicación por confirmar</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Sidebar */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        position: isMobile ? 'relative' : 'sticky',
                        top: isMobile ? '0' : '7rem',
                        height: 'fit-content',
                        marginTop: isMobile ? '2rem' : '0'
                    }}>

                        {/* Connectivity Card */}
                        <div className="card" style={{ padding: '2.5rem', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginBottom: '1rem' }}>SÍGUENOS</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                                    {place.instagram_url && (
                                        <a href={place.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%', transition: 'all 0.3s' }} title="Instagram"><Instagram size={22} /></a>
                                    )}
                                    {place.facebook_url && (
                                        <a href={place.facebook_url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%', transition: 'all 0.3s' }} title="Facebook"><Facebook size={22} /></a>
                                    )}
                                    {place.tiktok_url && (
                                        <a href={place.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%', transition: 'all 0.3s' }} title="TikTok"><Video size={22} /></a>
                                    )}
                                    {place.website_url && (
                                        <a href={place.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%', transition: 'all 0.3s' }} title="Sitio Web"><Globe size={22} /></a>
                                    )}
                                    {(!place.instagram_url && !place.facebook_url && !place.tiktok_url && !place.website_url) && (
                                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>No hay redes sociales configuradas.</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {whatsappUrl ? (
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem',
                                            background: '#25D366',
                                            color: 'white',
                                            padding: '1.25rem',
                                            borderRadius: '100px',
                                            textDecoration: 'none',
                                            fontWeight: '900',
                                            fontSize: '1rem',
                                            boxShadow: '0 10px 30px rgba(37, 211, 102, 0.3)'
                                        }}
                                    >
                                        <MessageCircle size={24} /> Escríbenos
                                    </a>
                                ) : (
                                    <a
                                        href={whatsappUrl || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem', fontSize: '1.1rem', borderRadius: '100px', fontWeight: '900', textDecoration: 'none' }}
                                    >
                                        <MessageCircle size={24} /> Escríbenos
                                    </a>
                                )}

                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setShowShareMenu(!showShareMenu)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem',
                                            background: showShareMenu ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white',
                                            padding: '1.25rem',
                                            borderRadius: '100px',
                                            fontWeight: '800',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            width: '100%'
                                        }}>
                                        <Share2 size={20} /> Compartir Parche
                                    </button>
                                    
                                    {showShareMenu && (
                                        <div style={{ position: 'absolute', bottom: '100%', left: '0', right: '0', marginBottom: '0.5rem', background: 'rgba(20, 20, 20, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 50 }}>
                                            <button onClick={() => handleShare('whatsapp')} style={{ ...shareButtonStyle, color: '#25D366' }}>
                                                <MessageCircle size={18} /> WhatsApp
                                            </button>
                                            <button onClick={() => handleShare('facebook')} style={{ ...shareButtonStyle, color: '#1877F2' }}>
                                                <Facebook size={18} /> Facebook
                                            </button>
                                            <button onClick={() => handleShare('twitter')} style={{ ...shareButtonStyle, color: '#1DA1F2' }}>
                                                <ExternalLink size={18} /> X (Twitter)
                                            </button>
                                            <button onClick={() => handleShare('copy')} style={{ ...shareButtonStyle, color: 'var(--color-neon-teal)' }}>
                                                <LinkIcon size={18} /> Copiar Enlace
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Menu Card */}
                        <div className="card" style={{ padding: '2.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                                <div style={{ color: 'var(--color-neon-teal)' }}>
                                    <Utensils size={24} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Explorar Menú</h3>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '2rem' }}>
                                Mira nuestra selección de productos, comida y más para armar el parche perfecto.
                            </p>
                            {place.menu_url ? (
                                <a
                                    href={place.menu_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        padding: '1rem',
                                        borderRadius: '100px',
                                        textDecoration: 'none',
                                        fontWeight: '700',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <ExternalLink size={18} /> Ver Menú en PDF
                                </a>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    color: 'rgba(255,255,255,0.3)',
                                    padding: '1rem',
                                    borderRadius: '100px',
                                    fontWeight: '700',
                                    border: '1px dashed rgba(255,255,255,0.1)',
                                    cursor: 'not-allowed'
                                }}>
                                    <Info size={18} /> Menú no disponible
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            {place?.id && (
                <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
                    <VenueReviews venueId={place.id} isLoggedIn={isLoggedIn} />
                </div>
            )}

            <Chatbot />
            {isMobile && <MobileNav />}

            {/* Purchase Success Modal */}
            {purchaseSuccess && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '2rem' }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '32px', padding: '2.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
                            🎉
                        </div>
                        <h2 style={{ fontWeight: '900', marginBottom: '0.5rem' }}>¡Compra exitosa!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Has canjeado {purchaseSuccess.perk_title}
                        </p>
                        <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            <span style={{ fontWeight: '800', color: '#c084fc' }}>{purchaseSuccess.coins_spent} monedas</span> deducidas. <br /> Saldo actual: <span style={{ fontWeight: '800', color: '#c084fc' }}>{purchaseSuccess.coins_remaining}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                            <button
                                onClick={() => navigate(`/reward-tickets/${purchaseSuccess.ticket_id}`, { state: { ticket: purchaseSuccess } })}
                                style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.8))', border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer', fontSize: '0.95rem' }}
                            >
                                Ver mi ticket QR
                            </button>
                            <button
                                onClick={() => setPurchaseSuccess(null)}
                                style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <style>{`
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.05; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                }
            `}</style>
            <style>{`
                .breadcrumb-link:hover {
                    color: var(--color-neon-teal) !important;
                    opacity: 1 !important;
                }
                .gallery-btn-hover:hover {
                    background: rgba(0,0,0,0.8) !important;
                    transform: scale(1.05);
                }
                .gallery-btn-hover:active {
                    transform: scale(0.95);
                }
                .nav-btn-hover:hover {
                    background: rgba(255,255,255,0.2) !important;
                    border-color: var(--color-neon-teal) !important;
                }
                @media (max-width: 768px) {
                    .nav-btn-hover {
                        opacity: 1 !important;
                    }
                }
            `}</style>
        </div>
    );
};
