import React, { useState, useEffect } from 'react';
import { useChatConversations } from '../../hooks/useChatConversations';
import { useLocation } from 'react-router-dom';
import { chatApi } from '../../services/chatApi';
import type { ChatMessage, ChatConversation } from '../../services/chatApi';
import { ChatConversationList } from '../../components/business/ChatConversationList';
import { ChatMessages } from '../../components/business/ChatMessages';
import { businessApi } from '../../services/businessApi';
import { Lock } from 'lucide-react';

export const ChatManagement: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const venueId = queryParams.get('venue_id') || undefined;

    const [activeFilter, setActiveFilter] = useState('all');
    const { conversations, loading, error } = useChatConversations(activeFilter, venueId);
    const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [localConversations, setLocalConversations] = useState<ChatConversation[]>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    const [venueProfile, setVenueProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        const fetchVenueProfile = async () => {
            try {
                const data = await businessApi.getVenueProfile(venueId);
                setVenueProfile(data);
            } catch (err) {
                console.error('Failed to fetch venue profile:', err);
            } finally {
                setProfileLoading(false);
            }
        };
        fetchVenueProfile();
    }, [venueId]);

    // Chat in-app is exclusive for PRO ("Dueño del Parche") and VIP/Admin.
    // El Parche and below use WhatsApp integration instead.
    const tier = venueProfile?.subscription_tier || 'FREE';
    const isChatLocked = !['PRO', 'VIP'].includes(tier);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync local conversations with fetched ones
    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

    // Auto-select first conversation ONLY on desktop
    useEffect(() => {
        if (!isMobile && localConversations.length > 0 && !activeConversationId) {
            setActiveConversationId(localConversations[0].id);
        }
    }, [localConversations, activeConversationId, isMobile]);

    // Fetch messages when active conversation changes
    useEffect(() => {
        if (!activeConversationId) return;

        const fetchMessages = async (silent = false) => {
            if (!silent) setLoadingMessages(true);
            try {
                const data = await chatApi.getMessages(activeConversationId);
                setMessages(data);
            } catch (error) {
                console.error('Failed to load messages', error);
            } finally {
                if (!silent) setLoadingMessages(false);
            }
        };

        fetchMessages(false); // Initial load with spinner

        const interval = setInterval(() => fetchMessages(true), 5000);
        return () => clearInterval(interval);
    }, [activeConversationId, venueId]);

    const handleSendMessage = async (text: string) => {
        if (!activeConversationId) return;

        try {
            // Optimistic update
            const tempMessage: ChatMessage = {
                id: Date.now().toString(),
                conversation_id: activeConversationId,
                sender_type: 'staff',
                message: text,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMessage]);

            // Actual API call
            const sent = await chatApi.sendMessage(activeConversationId, text);

            // AUTO AI TAKEOVER: When staff sends a message, local AI status turns off
            setLocalConversations(prev =>
                prev.map(c => c.id === activeConversationId ? { ...c, ai_enabled: false } : c)
            );

            // Replace temp with real message
            setMessages(prev => prev.map(m => m.id === tempMessage.id ? sent : m));
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    const handleToggleAI = async (conversationId: string, enabled: boolean) => {
        try {
            await chatApi.toggleAI(conversationId, enabled);
            // Update local state so the UI reflects the change immediately
            setLocalConversations(prev =>
                prev.map(c => c.id === conversationId ? { ...c, ai_enabled: enabled } : c)
            );
        } catch (err) {
            console.error("Failed to toggle AI:", err);
        }
    };

    const handleSelectConversation = (id: string) => {
        setActiveConversationId(id);
        if (isMobile) {
            setMobileView('chat');
        }
    };

    if (profileLoading) return <div style={{ color: 'white', padding: '2rem' }}>Cargando perfil...</div>;

    const activeConversation = localConversations.find(c => c.id === activeConversationId);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '350px 1fr',
            height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 130px)', // Subtract header (80px) + content padding (50px/2.5rem * 2 = 5rem/100px - margins)
            background: '#0a0a0c',
            marginTop: isMobile ? '-1.5rem' : '-2.5rem',
            marginLeft: isMobile ? '-1.5rem' : '-2.5rem',
            marginRight: isMobile ? '-1.5rem' : '-2.5rem',
            marginBottom: isMobile ? '-1.5rem' : '-2.5rem',
            borderTopLeftRadius: isMobile ? '0' : '32px',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {isChatLocked && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, rgba(10,10,12,0.92) 0%, rgba(20,10,40,0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    {/* Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: '32px',
                        padding: isMobile ? '2rem 1.5rem' : '3rem',
                        maxWidth: '480px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem',
                        boxShadow: '0 0 80px rgba(168,85,247,0.1)',
                        textAlign: 'center'
                    }}>
                        {/* Icon */}
                        <div style={{
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            padding: '18px',
                            borderRadius: '24px',
                            boxShadow: '0 0 40px rgba(168,85,247,0.5)'
                        }}>
                            <Lock size={36} color="white" />
                        </div>

                        {/* Text */}
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-neon-purple)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.75rem' }}>
                                Función Premium
                            </div>
                            <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: '900', color: 'white', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                                Bandeja de Entrada<br/>en Tiempo Real
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '360px' }}>
                                Tu Co-Piloto IA ya está respondiendo clientes. Con un plan de pago puedes leer el historial completo e intervenir en las ventas manualmente.
                            </p>
                        </div>

                        {/* Feature list */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {[
                                '💬  Historial completo de chats',
                                '🤝  Toma el control cuando quieras',
                                '🔔  Alertas cuando la IA necesita ayuda',
                                '📊  Clasificación de leads y huéspedes',
                            ].map((item, i) => (
                                <div key={i} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '12px',
                                    padding: '0.65rem 1rem',
                                    color: 'rgba(255,255,255,0.65)',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    textAlign: 'left'
                                }}>
                                    {item}
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => window.location.href = '/business/subscription'}
                            style={{
                                width: '100%',
                                padding: '1rem 2rem',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                color: 'white',
                                fontWeight: '900',
                                fontSize: '1rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 0 30px rgba(168,85,247,0.4)',
                                transition: 'all 0.2s',
                                letterSpacing: '0.3px'
                            }}
                            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            🚀 Ver Planes y Mejorar
                        </button>
                    </div>
                </div>
            )}
            
            <div style={{ pointerEvents: isChatLocked ? 'none' : 'auto', userSelect: isChatLocked ? 'none' : 'auto', display: 'contents' }}>

                {/* Loading / Error states for paid users */}
                {!isChatLocked && loading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', gridColumn: '1 / -1' }}>
                        Cargando chats...
                    </div>
                )}
                {!isChatLocked && !loading && error && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', gridColumn: '1 / -1' }}>
                        Error al cargar los chats.
                    </div>
                )}

                {(!isChatLocked && !loading && !error) && (!isMobile || mobileView === 'list') && (
                <ChatConversationList
                    conversations={localConversations}
                    activeId={activeConversationId}
                    onSelect={handleSelectConversation}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            )}

                {(!isChatLocked && !loading && !error) && (!isMobile || mobileView === 'chat') && (
                activeConversation ? (
                    loadingMessages ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>
                            Cargando mensajes...
                        </div>
                    ) : (
                        <ChatMessages
                            conversation={activeConversation}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            onToggleAI={handleToggleAI}
                            onBack={isMobile ? () => setMobileView('list') : undefined}
                        />
                    )
                ) : !isMobile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                        Selecciona una conversación para empezar a chatear
                    </div>
                ) : null
            )}
            </div>
        </div>
    );
};

export default ChatManagement;
