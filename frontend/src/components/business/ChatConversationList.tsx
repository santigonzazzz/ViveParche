
import React from 'react';
import { Search, Smile, Minus, Frown } from 'lucide-react';
import type { ChatConversation } from '../../services/chatApi';

interface ChatConversationListProps {
    conversations: ChatConversation[];
    activeId: string | undefined;
    onSelect: (id: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
    conversations,
    activeId,
    onSelect,
    activeFilter,
    onFilterChange
}) => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getSentimentIcon = (sentiment: ChatConversation['sentiment']) => {
        // ... (rest of sentiments)
        switch (sentiment) {
            case 'positive': return <Smile size={16} color="#22c55e" />;
            case 'negative': return <Frown size={16} color="#ef4444" />;
            default: return <Minus size={16} color="rgba(255,255,255,0.4)" />;
        }
    };

    const tabs = [
        { id: 'all', label: 'Todos' },
        { id: 'leads', label: 'Prospectos' },
        { id: 'guests', label: 'Parceros' },
        { id: 'alerts', label: 'Alertas' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '900', color: 'white', marginBottom: '1rem' }}>Mensajes</h2>
                <div style={{ position: 'relative' }}>
                    <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        placeholder="Buscar chats..."
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: isMobile ? '0.6rem 1rem 0.6rem 2.5rem' : '0.75rem 1rem 0.75rem 2.5rem',
                            color: 'white',
                            outline: 'none',
                            fontSize: '0.9rem',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            <div style={{
                display: 'flex',
                gap: '0.4rem',
                padding: isMobile ? '0 1rem 1rem' : '0 1.5rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                overflowX: 'auto',
                scrollbarWidth: 'none'
            }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onFilterChange(tab.id)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '100px',
                            background: activeFilter === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: activeFilter === tab.id ? 'white' : 'rgba(255,255,255,0.4)',
                            border: activeFilter === tab.id ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.5rem' : '1rem' }}>
                {conversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        style={{
                            padding: '1rem',
                            borderRadius: '16px',
                            background: activeId === conv.id ? 'rgba(111, 66, 193, 0.1)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '1rem',
                            marginBottom: '0.5rem',
                            border: activeId === conv.id ? '1px solid rgba(111, 66, 193, 0.3)' : '1px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                                src={conv.customer_avatar || 'https://via.placeholder.com/50'}
                                alt={conv.customer_name}
                                style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }}
                            />
                            {conv.unread_count > 0 && (
                                <div style={{
                                    position: 'absolute', top: '-4px', right: '-4px',
                                    background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: '800',
                                    width: '16px', height: '16px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid #050505'
                                }}>
                                    {conv.unread_count}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <h4 style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {conv.customer_name || `Parcero #${conv.customer_id.substring(0, 4)}`}
                                </h4>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{new Date(conv.updated_at).toLocaleDateString()}</span>
                            </div>
                            <p style={{ color: activeId === conv.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {conv.last_message}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: conv.category === 'alert' ? 'rgba(239, 68, 68, 0.15)' :
                                        conv.category === 'guest' ? 'rgba(34, 197, 94, 0.15)' :
                                            'rgba(255, 255, 255, 0.05)',
                                    color: conv.category === 'alert' ? '#f87171' :
                                        conv.category === 'guest' ? '#4ade80' :
                                            'rgba(255, 255, 255, 0.6)',
                                    fontWeight: '700',
                                    textTransform: 'uppercase'
                                }}>
                                    {conv.category === 'guest' ? 'parcero' : conv.category}
                                </span>
                                {getSentimentIcon(conv.sentiment)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
