import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    images: string[];
    initialIndex?: number;
    title?: string;
    onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({ images, initialIndex = 0, title, onClose }) => {
    const [current, setCurrent] = useState(initialIndex);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const prev = useCallback(() => setCurrent(c => (c - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setCurrent(c => (c + 1) % images.length), [images.length]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'ArrowRight') next();
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [prev, next, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            if (dx < 0) next(); else prev();
        }
        touchStartX.current = null;
    };

    if (!images.length) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            {/* Header */}
            <div
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'clamp(0.75rem, 3vw, 1.5rem) clamp(1rem, 4vw, 2rem)',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                    zIndex: 2, pointerEvents: 'none'
                }}
            >
                <div>
                    {title && (
                        <p style={{ color: 'white', fontWeight: '800', fontSize: 'clamp(0.9rem, 2.5vw, 1.25rem)', margin: 0 }}>
                            {title}
                        </p>
                    )}
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', margin: 0 }}>
                        {current + 1} / {images.length}
                    </p>
                </div>
                {/* Spacer */}
                <div />
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: 'clamp(0.75rem, 3vw, 1.5rem)', right: 'clamp(1rem, 4vw, 2rem)',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white', borderRadius: '50%', width: '44px', height: '44px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 3, transition: 'all 0.2s',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <X size={20} />
            </button>

            {/* Main Image */}
            <div
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(3rem, 10vw, 5rem) clamp(3rem, 8vw, 6rem)' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={e => e.stopPropagation()}
            >
                <img
                    key={current}
                    src={images[current]}
                    alt={`Imagen ${current + 1}`}
                    style={{
                        maxWidth: '100%', maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '16px',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                        animation: 'lb-fade 0.25s ease-out'
                    }}
                />
            </div>

            {/* Prev / Next buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={e => { e.stopPropagation(); prev(); }}
                        style={{
                            position: 'absolute', left: 'clamp(0.5rem, 2vw, 1.5rem)', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white', borderRadius: '50%',
                            width: 'clamp(40px, 6vw, 56px)', height: 'clamp(40px, 6vw, 56px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)', zIndex: 3
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); next(); }}
                        style={{
                            position: 'absolute', right: 'clamp(0.5rem, 2vw, 1.5rem)', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white', borderRadius: '50%',
                            width: 'clamp(40px, 6vw, 56px)', height: 'clamp(40px, 6vw, 56px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)', zIndex: 3
                        }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div
                    style={{
                        position: 'absolute', bottom: 'clamp(0.75rem, 3vw, 1.5rem)',
                        left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                        maxWidth: '90vw', overflowX: 'auto',
                        padding: '0.5rem', zIndex: 3
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            style={{
                                width: i === current ? '56px' : '44px',
                                height: i === current ? '56px' : '44px',
                                borderRadius: '10px',
                                border: i === current ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
                                overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                                transition: 'all 0.25s', opacity: i === current ? 1 : 0.5,
                                background: 'none', padding: 0
                            }}
                        >
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes lb-fade {
                    from { opacity: 0; transform: scale(0.97); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
