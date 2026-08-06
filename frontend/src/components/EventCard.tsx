import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowUpRight, Heart, MessageCircle, Store } from 'lucide-react';
import type { Event } from '../types';

interface EventCardProps {
    event: Event;
    onChat?: (venueId: string, venueName: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onChat }) => {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);
    const DEFAULT_EVENT_IMAGE = '/assets/placeholder_event.jpg';
    const currentImage = imageError || !event.image_url ? DEFAULT_EVENT_IMAGE : event.image_url;

    const dateStr = useMemo(() => {
        if (!event.event_date) return 'TBD';
        const d = new Date(event.event_date);
        if (isNaN(d.getTime())) return 'TBD';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }, [event.event_date]);

    // Generate a random match percentage for the "AI feel"
    const matchPercentage = Math.floor(Math.random() * (99 - 85 + 1) + 85);

    const handleCardClick = () => {
        const dest = event.slug || event.id;
        navigate(`/events/${dest}`);
    };

    const handleVenueClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (event.venue_id) {
            const venueSlug = (event as any).venues?.slug || event.venue_id;
            navigate(`/places/${venueSlug}`);
        }
    };

    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onChat && event.venue_id) {
            onChat(event.venue_id, event.title + " (at Venue)"); // Titulo del evento como referencia inicial
        } else if (onChat) {
            onChat(event.owner_id, event.title);
        } else {
            console.log("Chat with venue started", event.venue_id || event.owner_id);
            alert("Conectando al chat... (Integración en progreso)");
        }
    };

    return (
        <div onClick={handleCardClick} className="card" style={{
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
            transition: 'transform 0.3s ease, border-color 0.3s ease',
            cursor: 'pointer',
            overflow: 'hidden'
        }}>
            <div style={{
                height: '240px',
                position: 'relative',
                borderRadius: '32px',
                overflow: 'hidden',
                background: '#1a1a1a'
            }}>
                <img
                    key={currentImage}
                    src={currentImage}
                    alt={event.title}
                    onError={() => {
                        console.error(`Failed to load event image: ${currentImage}`);
                        setImageError(true);
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        inset: 0
                    }}
                />
                {/* Overlay for match and badges only */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)'
                }}></div>

                {/* Top Badges */}
                <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); /* Favorite logic */ }}
                        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white', display: 'flex', cursor: 'pointer' }}
                    >
                        <Heart size={18} />
                    </button>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{
                            background: 'rgba(189, 0, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--color-neon-purple)',
                            padding: '4px 12px',
                            borderRadius: '50px',
                            fontSize: '0.65rem',
                            fontWeight: '900',
                            border: '1px solid rgba(189, 0, 255, 0.3)',
                            letterSpacing: '0.05em'
                        }}>
                            [EVENT]
                        </div>
                        <div style={{
                            background: 'rgba(0, 243, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--color-neon-teal)',
                            padding: '4px 12px',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            border: '1px solid rgba(0, 243, 255, 0.3)'
                        }}>
                            {matchPercentage}% Match
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Content Area */}
            <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {event.vibe_tags && event.vibe_tags.length > 0 ? (
                        event.vibe_tags.slice(0, 2).map(tag => (
                            <span key={tag} style={{
                                fontSize: '0.65rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                background: tag.toLowerCase() === 'party' ? 'rgba(189, 0, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: tag.toLowerCase() === 'party' ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.6)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: tag.toLowerCase() === 'party' ? '1px solid rgba(189, 0, 255, 0.2)' : '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>GENERAL</span>
                    )}
                </div>

                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '800', lineHeight: 1.2 }}>{event.title}</h3>

                <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', minWidth: 0, flex: 1 }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.location_address || 'TBD'}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const addr = event.location_address || 'TBD';
                                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '50px',
                                padding: '3px 10px',
                                fontSize: '0.65rem',
                                color: 'var(--color-neon-teal)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                fontWeight: '700'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(0, 243, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.3)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                            Go to Google maps
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        <Calendar size={14} color="var(--color-neon-teal)" />
                        <span style={{ whiteSpace: 'nowrap' }}>{dateStr.split(',')[0]}</span>
                    </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    <div style={{
                        flex: 2,
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
                        View Details <ArrowUpRight size={16} />
                    </div>

                    {event.venue_id && (
                        <button
                            onClick={handleVenueClick}
                            style={{
                                width: '42px',
                                height: '42px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(189, 0, 255, 0.1)',
                                border: '1px solid rgba(189, 0, 255, 0.2)',
                                borderRadius: '50%',
                                color: 'var(--color-neon-purple)',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                            title="Go to Venue"
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(189, 0, 255, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(189, 0, 255, 0.1)'}
                        >
                            <Store size={18} />
                        </button>
                    )}

                    <button
                        onClick={handleChatClick}
                        style={{
                            width: '42px',
                            height: '42px',
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
                        title="Chat with Venue"
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 243, 255, 0.2)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0, 243, 255, 0.1)'}
                    >
                        <MessageCircle size={18} />
                    </button>
                </div>
            </div>

            <style>{`
          .card:hover .card-action-btn {
              background: white !important;
              color: black !important;
          }
      `}</style>
        </div>
    );
};

