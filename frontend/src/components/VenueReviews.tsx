import React, { useState, useEffect, useCallback } from 'react';
import { Star, Send, Lock } from 'lucide-react';
import { reviewService } from '../services/api';

interface Review {
    id: string;
    reviewer_name: string;
    stars: number;
    message: string;
    created_at: string;
}

interface ReviewStats {
    avg_stars: number;
    total_reviews: number;
    distribution: Record<string, number>;
}

interface VenueReviewsProps {
    venueId: string;
    isLoggedIn: boolean;
}

const StarRow: React.FC<{ rating: number; interactive?: boolean; onChange?: (v: number) => void }> = ({ rating, interactive, onChange }) => {
    const [hovered, setHovered] = useState(0);
    const display = hovered || rating;
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    size={interactive ? 24 : 14}
                    fill={i <= display ? '#f59e0b' : 'none'}
                    color={i <= display ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
                    style={{ cursor: interactive ? 'pointer' : 'default', transition: 'all 0.1s' }}
                    onMouseEnter={() => interactive && setHovered(i)}
                    onMouseLeave={() => interactive && setHovered(0)}
                    onClick={() => interactive && onChange && onChange(i)}
                />
            ))}
        </div>
    );
};

export const VenueReviews: React.FC<VenueReviewsProps> = ({ venueId, isLoggedIn }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [stars, setStars] = useState(0);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [reviewList, reviewStats] = await Promise.all([
                reviewService.getVenueReviews(venueId),
                reviewService.getVenueReviewStats(venueId),
            ]);
            setReviews(reviewList);
            setStats(reviewStats);
        } catch (e) {
            console.error('Failed to load reviews', e);
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (stars === 0) { setSubmitError('Por favor selecciona una calificación de estrellas.'); return; }
        setSubmitting(true);
        setSubmitError('');
        setSubmitSuccess('');
        try {
            const res = await reviewService.createReview(venueId, stars, message);
            setSubmitSuccess(res.message || '¡Reseña enviada! +50 Parché Coins 🎉');
            setStars(0);
            setMessage('');
            setShowForm(false);
            loadData();
        } catch (err: any) {
            setSubmitError(err.response?.data?.detail || 'No se pudo enviar tu reseña. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return ''; }
    };

    return (
        <div style={{ marginTop: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={20} fill="#f59e0b" color="#f59e0b" /> Reseñas del Local
                    </h3>
                    {stats && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <StarRow rating={Math.round(stats.avg_stars)} />
                            <span style={{ color: '#f59e0b', fontWeight: '800', fontSize: '1.1rem' }}>{stats.avg_stars.toFixed(1)}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>({stats.total_reviews} {stats.total_reviews === 1 ? 'reseña' : 'reseñas'})</span>
                        </div>
                    )}
                </div>
                {isLoggedIn ? (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            background: showForm ? 'rgba(255,255,255,0.05)' : 'var(--color-neon-purple)',
                            border: showForm ? '1px solid rgba(255,255,255,0.15)' : 'none',
                            color: 'white', padding: '0.6rem 1.4rem',
                            borderRadius: '100px', fontWeight: '800',
                            fontSize: '0.85rem', cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {showForm ? 'Cancelar' : '⭐ Dejar Reseña'}
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                        <Lock size={14} /> Inicia sesión para dejar una reseña
                    </div>
                )}
            </div>

            {/* Success message */}
            {submitSuccess && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '16px', padding: '1rem 1.5rem', marginBottom: '1.5rem', color: '#22c55e', fontWeight: '700' }}>
                    {submitSuccess}
                </div>
            )}

            {/* Review Form */}
            {showForm && isLoggedIn && (
                <form onSubmit={handleSubmit} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px', padding: '2rem',
                    marginBottom: '2rem',
                }}>
                    <h4 style={{ margin: '0 0 1.5rem', fontWeight: '700' }}>Tu Reseña</h4>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Calificación *</label>
                        <StarRow rating={stars} interactive onChange={setStars} />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            Comentario (máx. 500 caracteres)
                        </label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value.slice(0, 500))}
                            rows={3}
                            maxLength={500}
                            placeholder="¿Cómo fue tu experiencia en este local? Sé honesto, tus opiniones ayudan a otros parceros..."
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                                color: 'white', padding: '0.9rem 1rem', fontSize: '0.9rem',
                                resize: 'vertical', fontFamily: 'inherit',
                                boxSizing: 'border-box', outline: 'none',
                            }}
                        />
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>{message.length}/500</div>
                    </div>

                    {submitError && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>
                            {submitError}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                            🏅 Recibirás <strong style={{ color: '#f59e0b' }}>+50 Parché Coins</strong> al dejar tu reseña
                        </p>
                        <button
                            type="submit"
                            disabled={submitting || stars === 0}
                            style={{
                                background: stars > 0 ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.08)',
                                border: 'none', color: 'white', padding: '0.7rem 1.8rem',
                                borderRadius: '100px', fontWeight: '800', fontSize: '0.9rem',
                                cursor: stars > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                opacity: submitting ? 0.7 : 1,
                            }}
                        >
                            <Send size={16} /> {submitting ? 'Enviando...' : 'Publicar Reseña'}
                        </button>
                    </div>
                </form>
            )}

            {/* Star distribution */}
            {stats && stats.total_reviews > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                    {[5, 4, 3, 2, 1].map(n => {
                        const count = stats.distribution[String(n)] || 0;
                        const pct = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
                        return (
                            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', width: '12px', textAlign: 'right' }}>{n}</span>
                                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: '#f59e0b', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '22px' }}>{count}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Review list */}
            {loading ? (
                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem' }}>Cargando reseñas...</div>
            ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem 0' }}>
                    <Star size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: '600' }}>Aún no hay reseñas para este local.</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>¡Sé el primero en opinar!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviews.map(r => (
                        <div key={r.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '20px', padding: '1.5rem',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{r.reviewer_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{formatDate(r.created_at)}</div>
                                </div>
                                <StarRow rating={r.stars} />
                            </div>
                            {r.message && (
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{r.message}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
