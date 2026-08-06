import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, X, Info, User,
    FileText, Sparkles, Loader2, Bot
} from 'lucide-react';
import { customerChatApi } from '../services/chatApi';
import type { ChatMessage, ChatConversation } from '../services/chatApi';

interface EventContext {
    eventId?: string;
    eventTitle?: string;
    eventDate?: string;
    eventAddress?: string;
    eventPrice?: number;
}

interface CustomerChatWindowProps {
    venueId: string;
    venueName: string;
    menuUrl?: string; // New prop
    onClose: () => void;
    eventContext?: EventContext;
    specialOffersUrl?: string;
    whatsappNumber?: string;
}

// Generate or retrieve a stable anonymous customer ID
function getAnonymousCustomerId(): string {
    const key = 'vibe_anon_customer_id';
    let id = localStorage.getItem(key);
    // Validate it's a proper UUID (old format was 'anon_xxx' which Postgres rejects)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
    }
    return id;
}

export const CustomerChatWindow: React.FC<CustomerChatWindowProps> = ({ venueId, venueName, menuUrl, onClose, eventContext, specialOffersUrl, whatsappNumber }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [conversation, setConversation] = useState<ChatConversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [aiTyping, setAiTyping] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const scrollRef = useRef<HTMLDivElement>(null);
    const customerId = getAnonymousCustomerId();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get customer name from profile if logged in
    const profile = JSON.parse(localStorage.getItem('user') || '{}');
    const customerName = profile.full_name || undefined;

    // Ensure effectiveCustomerId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const effectiveCustomerId = (profile.id && uuidRegex.test(profile.id)) ? profile.id : customerId;

    useEffect(() => {
        const initChat = async () => {
            try {
                const conv = await customerChatApi.startConversation(
                    venueId,
                    effectiveCustomerId,
                    customerName,
                    eventContext
                );
                setConversation(conv);

                const msgs = await customerChatApi.getMessages(conv.id, effectiveCustomerId);
                setMessages(msgs);
            } catch (err) {
                console.error("Error initializing chat:", err);
            } finally {
                setLoading(false);
            }
        };

        initChat();
    }, [venueId]);

    // POLLING: Check for new messages (staff replies, etc.) every 5 seconds
    useEffect(() => {
        if (!conversation?.id) return;

        const pollInterval = setInterval(async () => {
            try {
                const newMsgs = await customerChatApi.getMessages(conversation.id, effectiveCustomerId);
                // Only update if message count changed or last message changed
                setMessages(prev => {
                    if (newMsgs.length === prev.length) {
                        const lastNew = newMsgs[newMsgs.length - 1];
                        const lastPrev = prev[prev.length - 1];
                        if (lastNew?.id === lastPrev?.id) return prev;
                    }
                    return newMsgs;
                });
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [conversation?.id, effectiveCustomerId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, aiTyping]);

    const handleSend = async () => {
        if (!inputText.trim() || !conversation || sending) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);
        setAiTyping(true);

        // Optimistic: add customer message immediately
        const tempMsg: ChatMessage = {
            id: 'temp_' + Date.now(),
            conversation_id: conversation.id,
            sender_type: 'customer',
            message: messageText,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const result = await customerChatApi.sendMessage(conversation.id, effectiveCustomerId, messageText);

            // Replace temp message with real one and add AI reply
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== tempMsg.id);
                const newMsgs = [...filtered];
                if (result.customer_message?.id) {
                    newMsgs.push(result.customer_message);
                }
                if (result.ai_reply) {
                    newMsgs.push(result.ai_reply);
                }
                return newMsgs;
            });
        } catch (err) {
            console.error("Error sending message:", err);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        } finally {
            setSending(false);
            setAiTyping(false);
        }
    };

    const handleOpenMenu = () => {
        if (proxiedMenuUrl) {
            window.open(proxiedMenuUrl, '_blank');
        }
    };

    const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola! Los vi en Parché App. Me gustaría más información sobre ${venueName}.`)}`
        : null;

    const getSenderLabel = (msg: ChatMessage) => {
        if (msg.sender_type === 'customer') return 'You';
        if (msg.sender_type === 'ai') return `${venueName} AI`;
        return venueName;
    };

    // Use a clean redirection URL for the menu to avoid revealing internal storage paths
    const proxiedMenuUrl = venueId
        ? `${(import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api').replace(/\/$/, '')}/venues/${venueId}/menu`
        : menuUrl;

    return (
        <div style={{
            position: 'fixed',
            bottom: isMobile ? '4.5rem' : '2rem',
            right: isMobile ? '1rem' : '2rem',
            width: isMobile ? '280px' : '350px',
            height: isMobile ? '400px' : '500px',
            maxWidth: 'calc(100vw - 2rem)',
            background: 'var(--color-surface)',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(0, 243, 255, 0.05)',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.08) 0%, rgba(189, 0, 255, 0.05) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--color-neon-teal), var(--color-neon-purple))',
                        padding: '8px',
                        borderRadius: '12px',
                        color: 'black',
                        display: 'flex'
                    }}>
                        <Bot size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>{venueName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-neon-teal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-neon-teal)', display: 'inline-block' }} />
                            AI Assistant · Online
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}
            >
                {loading ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" color="var(--color-neon-teal)" />
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '2rem' }}>
                        <Bot size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                        <p>Ask me anything about {venueName}!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.sender_type === 'customer' ? 'flex-end' : 'flex-start',
                                gap: '4px'
                            }}
                        >
                            {/* Sender label */}
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', paddingLeft: '4px', paddingRight: '4px' }}>
                                {msg.sender_type === 'ai' && <Bot size={10} style={{ display: 'inline', marginRight: '3px' }} />}
                                {msg.sender_type === 'customer' && <User size={10} style={{ display: 'inline', marginRight: '3px' }} />}
                                {getSenderLabel(msg)}
                            </span>
                            <div style={{
                                maxWidth: '82%',
                                padding: '0.7rem 1rem',
                                borderRadius: msg.sender_type === 'customer' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                fontSize: '0.88rem',
                                lineHeight: 1.5,
                                background: msg.sender_type === 'customer'
                                    ? 'var(--color-neon-teal)'
                                    : msg.sender_type === 'ai'
                                        ? 'rgba(189, 0, 255, 0.1)'
                                        : 'rgba(255,255,255,0.07)',
                                color: msg.sender_type === 'customer' ? 'black' : 'white',
                                border: msg.sender_type === 'ai' ? '1px solid rgba(189, 0, 255, 0.2)' : 'none',
                                fontWeight: msg.sender_type === 'customer' ? '600' : '400',
                            }}>
                                {msg.message.replace('[SHOW_MENU_BUTTON]', '').replace('[SHOW_SPECIAL_OFFERS_BUTTON]', '')}

                                {msg.sender_type === 'ai' && (msg.message.includes('[SHOW_MENU_BUTTON]') || msg.message.includes('[SHOW_SPECIAL_OFFERS_BUTTON]')) && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuUrl && msg.message.includes('[SHOW_MENU_BUTTON]') ? (
                                            <button
                                                onClick={handleOpenMenu}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    background: 'rgba(189, 0, 255, 0.15)',
                                                    color: 'white',
                                                    padding: '0.6rem 1rem',
                                                    borderRadius: '12px',
                                                    textDecoration: 'none',
                                                    fontWeight: '800',
                                                    fontSize: '0.85rem',
                                                    boxShadow: '0 0 15px rgba(189, 0, 255, 0.3)',
                                                    width: '100%',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <FileText size={14} /> Ver Menú PDF
                                            </button>
                                        ) : msg.message.includes('[SHOW_MENU_BUTTON]') ? (
                                            <div style={{ 
                                                fontSize: '0.8rem', 
                                                color: 'rgba(255,255,255,0.7)', 
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px dashed rgba(255,255,255,0.1)',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <span><Info size={12} style={{ display: 'inline', marginRight: '4px' }} /> Menú no disponible por ahora</span>
                                                {whatsappUrl && (
                                                    <a
                                                        href={whatsappUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            background: '#25D366',
                                                            color: 'white',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '800',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <span>💬 Escríbenos por WhatsApp</span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : null}

                                        {specialOffersUrl && msg.message.includes('[SHOW_SPECIAL_OFFERS_BUTTON]') ? (
                                            <button
                                                onClick={() => window.open(specialOffersUrl, '_blank')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    background: 'rgba(255, 127, 80, 0.15)',
                                                    color: 'white',
                                                    padding: '0.6rem 1rem',
                                                    borderRadius: '12px',
                                                    textDecoration: 'none',
                                                    fontWeight: '800',
                                                    fontSize: '0.85rem',
                                                    boxShadow: '0 0 15px rgba(255, 127, 80, 0.3)',
                                                    width: '100%',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Sparkles size={14} /> Ver Ofertas Especiales
                                            </button>
                                        ) : msg.message.includes('[SHOW_SPECIAL_OFFERS_BUTTON]') ? (
                                            <div style={{ 
                                                fontSize: '0.8rem', 
                                                color: 'rgba(255,255,255,0.7)', 
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px dashed rgba(255,255,255,0.1)',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <span><Info size={12} style={{ display: 'inline', marginRight: '4px' }} /> No tenemos ofertas especiales publicadas hoy</span>
                                                {whatsappUrl && (
                                                    <a
                                                        href={whatsappUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            background: '#25D366',
                                                            color: 'white',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '800',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <span>💬 Preguntar promociones por WhatsApp</span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {/* AI typing indicator */}
                {aiTyping && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', paddingLeft: '4px' }}>
                            <Bot size={10} style={{ display: 'inline', marginRight: '3px' }} />
                            {venueName} AI
                        </span>
                        <div style={{
                            padding: '0.7rem 1rem',
                            borderRadius: '16px 16px 16px 4px',
                            background: 'rgba(189, 0, 255, 0.1)',
                            border: '1px solid rgba(189, 0, 255, 0.2)',
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center'
                        }}>
                            {[0, 1, 2].map(i => (
                                <span key={i} style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'rgba(189, 0, 255, 0.6)',
                                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                                }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                gap: '0.5rem',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={`Ask about ${venueName}...`}
                    disabled={sending}
                    style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '100px',
                        padding: '0.6rem 1rem',
                        color: 'white',
                        fontSize: '0.88rem',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={sending || !inputText.trim()}
                    style={{
                        background: inputText.trim() ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: inputText.trim() ? 'black' : 'rgba(255,255,255,0.2)',
                        cursor: inputText.trim() ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.05; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                }
            `}</style>
        </div>
    );
};
