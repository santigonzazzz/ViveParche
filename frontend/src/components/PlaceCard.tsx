import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, DollarSign, Utensils, MessageCircle, Zap, Sparkles, Instagram, Facebook, Globe, Zap as Video, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { Place } from '../types';
import { loyaltyService } from '../services/api';

interface PlaceCardProps {
    place: Place;
    onChat?: (venueId: string, venueName: string) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, onChat }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const hasOffers = (place.special_offers_json && place.special_offers_json.length > 0) || !!place.special_offers_pdf_url;

    // Generate a random match percentage for consistency with EventCard
    const matchPercentage = useMemo(() => Math.floor(Math.random() * (99 - 85 + 1) + 85), []);

    const [imageError, setImageError] = useState(false);
    const DEFAULT_PLACE_IMAGE = '/assets/placeholder_event.jpg';

    const images = useMemo(() => {
        if (imageError) return [DEFAULT_PLACE_IMAGE];
        const list = [];
        if (place.image_url) list.push(place.image_url);
        if (place.gallery_images && Array.isArray(place.gallery_images)) {
            list.push(...place.gallery_images);
        }
        if (list.length === 0) list.push(DEFAULT_PLACE_IMAGE);
        return list;
    }, [imageError, place.image_url, place.gallery_images]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleCardClick = () => {
        const dest = place.slug || place.id;
        navigate(`/places/${dest}`);
    };

    const [perks, setPerks] = useState<any[]>([]);
    const [stampRewards, setStampRewards] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!place.id) return;
            try {
                const [perksData, rewardsData] = await Promise.all([
                    loyaltyService.getVenuePerks(place.id),
                    loyaltyService.getVenueStampRewards(place.id)
                ]);
                setPerks(perksData.filter((p: any) => p.active));
                setStampRewards((rewardsData || [])
                    .filter((r: any) => r.active)
                    .sort((a: any, b: any) => a.stamps_required - b.stamps_required)
                );
            } catch (err) {
                console.error("Failed to fetch venue loyalty data", err);
            }
        };
        fetchData();
    }, [place.id]);

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

    return (
        <div
            onClick={handleCardClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="card"
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                width: '100%',
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--color-surface)',
                borderRadius: '32px',
                height: '100%',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                transform: isHovered ? 'translateY(-8px)' : 'none',
                boxShadow: isHovered ? '0 20px 40px -12px rgba(0,0,0,0.5), 0 0 20px rgba(111, 66, 193, 0.2)' : 'none',
                borderColor: isHovered ? 'rgba(111, 66, 193, 0.4)' : 'rgba(255, 255, 255, 0.05)',
            }}
        >
            {/* Image Container */}
            <div 
                style={{ position: 'relative', height: '220px', overflow: 'hidden' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <img
                    key={images[currentImageIndex]}
                    src={images[currentImageIndex]}
                    alt={place.name}
                    onError={() => {
                        console.error(`Failed to load image for ${place.name}: ${images[currentImageIndex]}`);
                        setImageError(true);
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        background: '#1a1a1a' // Fallback color while loading or if broken
                    }}
                />

                {/* Carousel navigation */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="carousel-nav-btn"
                            style={{
                                position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                zIndex: 10, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', borderRadius: '50%', width: '30px', height: '30px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', opacity: isHovered ? 1 : 0, transition: 'all 0.2s', padding: 0,
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={nextImage}
                            className="carousel-nav-btn"
                            style={{
                                position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                zIndex: 10, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', borderRadius: '50%', width: '30px', height: '30px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', opacity: isHovered ? 1 : 0, transition: 'all 0.2s', padding: 0,
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>

                        {/* Image Indicators */}
                        <div style={{
                            position: 'absolute', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
                            zIndex: 10, display: 'flex', gap: '4px', opacity: 1, transition: 'opacity 0.2s'
                        }}>
                            {images.map((_: string, idx: number) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: idx === currentImageIndex ? '16px' : '6px',
                                        height: '4px',
                                        borderRadius: '2px',
                                        background: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}
                                />
                            ))}
                        </div>
                    </>
                )}

                <div style={overlayStyle}></div>

                {/* Ver Local Overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 2
                }}>
                    <div style={{
                        background: 'var(--color-neon-purple)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '100px',
                        fontSize: '0.85rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Sparkles size={14} /> Ver Local
                    </div>
                </div>

                {/* Top Badges */}
                <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3 }}>
                    <div style={ratingBadgeStyle}>
                        <Star size={12} fill="currentColor" />
                        <span>{place.rating || '4.5'}</span>
                    </div>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        {matchPercentage}% Match
                    </div>
                </div>

                {/* Status Badge */}
                <div style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    background: place.is_open ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(12px)',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 3
                }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                    {place.is_open ? 'Open Now' : 'Closed'}
                </div>

                {place.price_range && (
                    <div style={{ ...priceBadgeStyle, position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 3 }}>
                        {Array.from({ length: place.price_range }).map((_, i) => (
                            <DollarSign key={i} size={12} style={{ margin: '-1px' }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{
                    ...titleStyle,
                    marginBottom: '0.4rem',
                    lineHeight: 1.2,
                    height: '1.5rem', // Fixed height
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {place.name}
                </h3>

                {/* Passport Rewards teaser */}
                {stampRewards.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: '900', color: 'var(--color-neon-teal)', letterSpacing: '0.05em' }}>
                            <Star size={10} fill="currentColor" /> PASAPORTE
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }} className="no-scrollbar">
                            {stampRewards.map((reward, idx) => (
                                <div key={idx} style={{
                                    flexShrink: 0,
                                    background: 'rgba(0, 243, 255, 0.1)',
                                    border: '1px solid rgba(0, 243, 255, 0.3)',
                                    borderRadius: '8px',
                                    padding: '3px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: 'white'
                                }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '900' }}>{reward.stamps_required} visitas</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loyalty Perks Row */}
                {perks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: '900', color: '#a855f7', letterSpacing: '0.05em' }}>
                            <Zap size={10} fill="currentColor" /> LOYALTY
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }} className="no-scrollbar">
                            {perks.slice(0, 2).map((perk, idx) => (
                                <div key={idx} style={{
                                    flexShrink: 0,
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    borderRadius: '8px',
                                    padding: '3px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#d8b4fe'
                                }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '900' }}>{perk.coin_price} COINS</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Special Offers Row */}
                {((place.special_offers_json && place.special_offers_json.length > 0) || place.special_offers_pdf_url) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: '900', color: 'var(--color-neon-teal)', letterSpacing: '0.05em' }}>
                            <Sparkles size={10} fill="currentColor" /> OFERTAS
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
                            {place.special_offers_json?.slice(0, 2).map((offer, idx) => (
                                <div key={idx} style={{
                                    flexShrink: 0,
                                    background: 'rgba(20, 184, 166, 0.2)',
                                    border: '1px solid rgba(20, 184, 166, 0.4)',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: 'white',
                                    boxShadow: '0 0 10px rgba(20, 184, 166, 0.2)'
                                }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '900' }}>{offer.name}</span>
                                </div>
                            ))}
                            {place.special_offers_pdf_url && (
                                <div style={{
                                    flexShrink: 0,
                                    background: 'rgba(20, 184, 166, 0.15)',
                                    border: '1px solid rgba(20, 184, 166, 0.3)',
                                    borderRadius: '8px',
                                    padding: '3px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: 'var(--color-neon-teal)'
                                }}>
                                    <FileText size={10} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: '900' }}>PDF</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                    minHeight: '2.55rem'
                }}>
                    {place.description || 'No description available for this venue.'}
                </p>

                {/* Vibe Tags Container with fixed height */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', minHeight: '2rem' }}>
                    {place.vibe_tags && place.vibe_tags.length > 0 ? (
                        place.vibe_tags.slice(0, 3).map((vibe, idx) => (
                            <span key={idx} style={vibeTagStyle}>
                                {vibe}
                            </span>
                        ))
                    ) : (
                        ['General', 'Vibe'].slice(0, 2).map((vibe, idx) => (
                            <span key={idx} style={vibeTagStyle}>
                                {vibe}
                            </span>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', minWidth: 0, flex: 1 }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {place.address || (place.distance_km ? `${place.distance_km.toFixed(1)} km` : 'Downtown')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        <Utensils size={14} color="var(--color-neon-teal)" />
                        <span style={{ color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                            {place.category || 'Nightlife'}
                        </span>
                    </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div
                        onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '100px',
                            padding: '0.6rem',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease'
                        }} className="card-action-btn">
                        Details
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const dest = place.slug || place.id;
                            navigate(`/?tab=events&venueId=${dest}`);
                        }}
                        style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: hasOffers ? 'rgba(20, 184, 166, 0.2)' : 'rgba(189, 0, 255, 0.1)',
                            border: hasOffers ? '1px solid var(--color-neon-teal)' : '1px solid rgba(189, 0, 255, 0.2)',
                            borderRadius: '50%',
                            color: hasOffers ? 'var(--color-neon-teal)' : 'var(--color-neon-purple)',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                        title={hasOffers ? "Ver Ofertas Especiales" : "Ver Eventos"}
                    >
                        <Zap size={18} fill={hasOffers ? "currentColor" : "none"} />
                        {hasOffers && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '12px',
                                height: '12px',
                                background: '#ff3d00',
                                borderRadius: '50%',
                                border: '2px solid #0a0a0f',
                                boxShadow: '0 0 8px rgba(255,61,0,0.5)'
                            }} />
                        )}
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onChat) {
                                onChat(place.id, place.name);
                            } else {
                                alert("Conectando al chat...");
                            }
                        }}
                        style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 243, 255, 0.1)',
                            border: '1px solid rgba(0, 243, 255, 0.2)',
                            borderRadius: '50%',
                            color: 'var(--color-neon-teal)',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                        title="Chat"
                    >
                        <MessageCircle size={18} />
                    </button>

                    {place.whatsapp_number && (
                        <a
                            href={`https://wa.me/${place.whatsapp_number.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(37, 211, 102, 0.1)',
                                border: '1px solid rgba(37, 211, 102, 0.2)',
                                borderRadius: '50%',
                                color: '#25D366'
                            }}
                            title="WhatsApp"
                        >
                            <span style={{ fontSize: '1.2rem' }}>💬</span>
                        </a>
                    )}

                    {place.instagram_url && (
                        <a
                            href={place.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                color: 'white'
                            }}
                            title="Instagram"
                        >
                            <Instagram size={18} />
                        </a>
                    )}

                    {place.facebook_url && (
                        <a
                            href={place.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                color: 'white'
                            }}
                            title="Facebook"
                        >
                            <Facebook size={18} />
                        </a>
                    )}

                    {place.tiktok_url && (
                        <a
                            href={place.tiktok_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                color: 'white'
                            }}
                            title="TikTok"
                        >
                            <Video size={18} />
                        </a>
                    )}

                    {place.website_url && (
                        <a
                            href={place.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                color: 'white'
                            }}
                            title="Website"
                        >
                            <Globe size={18} />
                        </a>
                    )}
                </div>
            </div>
            <style>{`
                .card:hover .card-action-btn {
                    background: white !important;
                    color: black !important;
                }
                @media (hover: none) {
                    .carousel-nav-btn {
                        opacity: 1 !important;
                    }
                }
            `}</style>
        </div>
    );
};

const priceBadgeStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    border: '1px solid rgba(255, 255, 255, 0.2)'
};

const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.8) 100%)'
};

const ratingBadgeStyle: React.CSSProperties = {
    background: 'rgba(234, 179, 8, 0.2)',
    backdropFilter: 'blur(10px)',
    color: '#fbbf24',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: '1px solid rgba(234, 179, 8, 0.3)'
};

const titleStyle: React.CSSProperties = {
    margin: '0 0 0.75rem 0',
    fontSize: '1.25rem',
    fontWeight: '800'
};

const vibeTagStyle: React.CSSProperties = {
    background: 'rgba(111, 66, 193, 0.15)',
    border: '1px solid rgba(111, 66, 193, 0.3)',
    color: 'var(--color-neon-purple)',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};
