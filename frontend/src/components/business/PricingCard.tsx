import React from 'react';
import { Check, X, Star, Zap, Crown } from 'lucide-react';

interface PricingCardProps {
    name: string;
    price: string;
    features: { text: string; included: boolean }[];
    isPopular?: boolean;
    isVIP?: boolean;
    onSelect?: () => void;
    currentPlan?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
    name,
    price,
    features,
    isPopular,
    isVIP,
    onSelect,
    currentPlan
}) => {
    return (
        <div style={{
            background: isVIP
                ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.02) 100%)'
                : isPopular
                    ? 'linear-gradient(135deg, rgba(111, 66, 193, 0.15) 0%, rgba(111, 66, 193, 0.05) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${isVIP ? 'rgba(255, 215, 0, 0.3)' : isPopular ? 'rgba(111, 66, 193, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: '32px',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
            cursor: 'pointer',
            height: '100%',
            overflow: 'hidden'
        }}
            className="pricing-card"
            onClick={onSelect}
        >
            {isPopular && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '-35px',
                    background: 'var(--color-neon-purple)',
                    color: 'white',
                    padding: '8px 40px',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    transform: 'rotate(45deg)',
                    boxShadow: '0 4px 15px rgba(111, 66, 193, 0.3)',
                    letterSpacing: '1px'
                }}>
                    POPULAR
                </div>
            )}

            {isVIP && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '-35px',
                    background: '#ffd700',
                    color: 'black',
                    padding: '8px 40px',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    transform: 'rotate(45deg)',
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                    letterSpacing: '1px'
                }}>
                    VIP
                </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    {isVIP ? <Crown size={20} color="#ffd700" /> : isPopular ? <Zap size={20} color="var(--color-neon-purple)" /> : <Star size={20} color="rgba(255,255,255,0.4)" />}
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>{name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{price === 'Gratis' ? price : `$${price}`}</span>
                    {price !== 'Gratis' && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: '1rem' }}>/mes</span>}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, marginBottom: '2.5rem' }}>
                {features.map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'start', gap: '12px', opacity: feature.included ? 1 : 0.4 }}>
                        {feature.included ? (
                            <div style={{ background: isVIP ? 'rgba(255, 215, 0, 0.1)' : 'rgba(34, 197, 94, 0.1)', padding: '4px', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }}>
                                <Check size={14} color={isVIP ? '#ffd700' : '#22c55e'} />
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }}>
                                <X size={14} color="rgba(255,255,255,0.3)" />
                            </div>
                        )}
                        <span style={{ fontSize: '0.9rem', color: feature.included ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', fontWeight: '600', lineHeight: '1.4' }}>
                            {feature.text}
                        </span>
                    </div>
                ))}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (!currentPlan && onSelect) onSelect();
                }}
                style={{
                    width: '100%',
                    padding: '1.25rem',
                    borderRadius: '16px',
                    background: currentPlan
                        ? 'rgba(255,255,255,0.05)'
                        : isVIP
                            ? '#ffd700'
                            : isPopular
                                ? 'var(--color-neon-purple)'
                                : 'rgba(255,255,255,0.1)',
                    color: currentPlan
                        ? 'rgba(255,255,255,0.3)'
                        : isVIP
                            ? 'black'
                            : 'white',
                    fontWeight: '900',
                    border: currentPlan ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    cursor: currentPlan ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.95rem',
                    letterSpacing: '0.5px'
                }}
                disabled={currentPlan}
            >
                {currentPlan ? 'PLAN ACTUAL' : 'ELEGIR PLAN'}
            </button>

            <style>{`
                .pricing-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border-color: ${isVIP ? '#ffd700' : isPopular ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.2)'} !important;
                }
            `}</style>
        </div>
    );
};
