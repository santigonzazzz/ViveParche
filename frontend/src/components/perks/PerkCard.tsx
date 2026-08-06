import React from 'react';
import { Tag, Trash2, Ticket, Star, Zap, Clock, Sparkles } from 'lucide-react';

interface Perk {
    id: string;
    title: string;
    description: string;
    type: 'discount' | 'freebie' | 'access' | 'bonus' | 'custom';
    conditions?: string;
    active: boolean;
}

interface PerkCardProps {
    perk: Perk;
    onDelete?: (id: string) => void;
    readOnly?: boolean;
}

const PerkCard: React.FC<PerkCardProps> = ({ perk, onDelete, readOnly = false }) => {

    const getTypeDetails = () => {
        switch (perk.type) {
            case 'discount':
                return {
                    icon: <Tag size={20} />,
                    color: '#4ade80',
                    bg: 'rgba(74, 222, 128, 0.1)',
                    label: 'Descuento'
                };
            case 'freebie':
                return {
                    icon: <Ticket size={20} />,
                    color: '#c084fc',
                    bg: 'rgba(192, 132, 252, 0.1)',
                    label: 'Gratis'
                };
            case 'access':
                return {
                    icon: <Star size={20} />,
                    color: '#fbbf24',
                    bg: 'rgba(251, 191, 36, 0.1)',
                    label: 'Acceso VIP'
                };
            case 'bonus':
                return {
                    icon: <Sparkles size={20} />,
                    color: '#f472b6',
                    bg: 'rgba(244, 114, 182, 0.1)',
                    label: 'Bono'
                };
            default:
                return {
                    icon: <Zap size={20} />,
                    color: '#60a5fa',
                    bg: 'rgba(96, 165, 250, 0.1)',
                    label: 'Especial'
                };
        }
    };

    const type = getTypeDetails();

    return (
        <div
            style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '28px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                minHeight: '220px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(139, 92, 246, 0.1)';
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
            }}
        >
            {/* Top Glow Decor */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-20%',
                width: '100px',
                height: '100px',
                background: `radial-gradient(circle, ${type.color}20 0%, transparent 70%)`,
                filter: 'blur(20px)',
                pointerEvents: 'none'
            }}></div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: type.bg,
                    padding: '6px 14px',
                    borderRadius: '12px',
                    border: `1px solid ${type.color}20`,
                    color: type.color
                }}>
                    {type.icon}
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {type.label}
                    </span>
                </div>
                {!readOnly && onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(perk.id);
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '10px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Body */}
            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '900',
                    color: 'white',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.01em',
                    lineHeight: '1.3'
                }}>
                    {perk.title}
                </h3>
                <p style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                    fontWeight: '500',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {perk.description}
                </p>
            </div>

            {/* Footer */}
            <div style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8b5cf6'
                    }}>
                        <Clock size={14} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {perk.conditions || 'Sin condiciones'}
                    </span>
                </div>

                {perk.active ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        color: '#4ade80',
                        fontSize: '0.65rem',
                        fontWeight: '900'
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}></div>
                        ACTIVO
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '0.65rem',
                        fontWeight: '900'
                    }}>
                        BORRADOR
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerkCard;
