
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Bot, User, BrainCircuit, Pause, Play, Sparkles } from 'lucide-react';
import type { ChatMessage, ChatConversation } from '../../services/chatApi';
import { chatApi } from '../../services/chatApi';

interface ChatMessagesProps {
    conversation: ChatConversation;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onToggleAI: (conversationId: string, enabled: boolean) => void;
    onBack?: () => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ conversation, messages, onSendMessage, onToggleAI, onBack }) => {
    const [inputText, setInputText] = useState('');
    const [aiEnabled, setAiEnabled] = useState(conversation.ai_enabled ?? true);
    const [togglingAI, setTogglingAI] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync AI state when conversation changes
    useEffect(() => {
        setAiEnabled(conversation.ai_enabled ?? true);
    }, [conversation.id, conversation.ai_enabled]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : '';
        const prevLastMsgId = (window as any)._lastMsgId;

        if (messages.length > 0 && lastMsgId !== prevLastMsgId) {
            scrollToBottom();
            (window as any)._lastMsgId = lastMsgId;
        }
    }, [messages]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const handleToggleAI = async () => {
        setTogglingAI(true);
        try {
            const newEnabled = !aiEnabled;
            await chatApi.toggleAI(conversation.id, newEnabled);
            setAiEnabled(newEnabled);
            onToggleAI(conversation.id, newEnabled);
        } catch (err) {
            console.error('Failed to toggle AI:', err);
        } finally {
            setTogglingAI(false);
        }
    };

    const getMessageStyle = (msg: ChatMessage) => {
        if (msg.sender_type === 'staff') {
            return {
                background: 'linear-gradient(135deg, var(--color-neon-purple) 0%, #a855f7 100%)',
                color: 'white',
                borderRadius: '20px 20px 4px 20px',
                boxShadow: '0 4px 15px rgba(111, 66, 193, 0.3)',
            };
        }
        if (msg.sender_type === 'ai') {
            return {
                background: 'rgba(0, 243, 255, 0.07)',
                color: 'white',
                borderRadius: '20px 20px 20px 4px',
                border: '1px solid rgba(0, 243, 255, 0.15)',
            };
        }
        // customer
        return {
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            borderRadius: '20px 20px 20px 4px',
        };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0c' }}>
            {/* Header */}
            <div style={{
                padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? '0.75rem' : '0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: isMobile ? '100%' : 'auto' }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', marginLeft: '-4px' }}
                        >
                            <Play style={{ transform: 'rotate(180deg)' }} size={20} />
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '2px', background: 'linear-gradient(135deg, var(--color-neon-purple), var(--color-neon-blue))', borderRadius: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} color="white" />
                            </div>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>{conversation.customer_name || 'Parcero'}</h3>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
                                En línea
                            </div>
                        </div>
                    </div>

                    {!isMobile && (
                        <div style={{
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: aiEnabled ? 'rgba(0, 243, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${aiEnabled ? 'rgba(0, 243, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: aiEnabled ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '1rem'
                        }}>
                            <Bot size={10} />
                            {aiEnabled ? 'IA Activa' : 'IA Pausada'}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                    <button
                        onClick={handleToggleAI}
                        disabled={togglingAI}
                        style={{
                            flex: isMobile ? 1 : 'none',
                            padding: '6px 12px',
                            borderRadius: '100px',
                            background: aiEnabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            border: `1px solid ${aiEnabled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                            color: aiEnabled ? '#ef4444' : '#22c55e',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        {aiEnabled ? <Pause size={12} /> : <Play size={12} />}
                        {isMobile ? (aiEnabled ? 'Pausar IA' : 'Reanudar') : (aiEnabled ? 'Pausar IA' : 'Reanudar IA')}
                    </button>

                    {!isMobile && (
                        <button style={{ padding: '8px 16px', borderRadius: '100px', background: 'rgba(111, 66, 193, 0.1)', border: '1px solid var(--color-neon-purple)', color: 'var(--color-neon-purple)', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <Sparkles size={14} /> Perfil IA
                        </button>
                    )}
                </div>
            </div>

            {/* AI Takeover Banner */}
            {!aiEnabled && (
                <div style={{
                    padding: isMobile ? '0.5rem 1rem' : '0.6rem 2rem',
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.75rem',
                    color: '#ef4444'
                }}>
                    <BrainCircuit size={12} />
                    <span><strong>IA Pausada.</strong> Estás chateando tú mismo.</span>
                </div>
            )}

            {/* Messages Area - adjusted padding for mobile */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: isMobile ? '1.5rem 1rem' : '1rem 2rem', // Reduced top/bottom padding on desktop
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
            }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_type === 'staff' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: isMobile ? '85%' : '70%', width: 'auto' }}>
                            <span style={{
                                fontSize: '0.65rem',
                                color: 'rgba(255,255,255,0.3)',
                                marginLeft: msg.sender_type !== 'staff' ? '8px' : undefined,
                                marginRight: msg.sender_type === 'staff' ? '8px' : undefined,
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                justifyContent: msg.sender_type === 'staff' ? 'flex-end' : 'flex-start'
                            }}>
                                {msg.sender_type === 'ai' && <Bot size={10} />}
                                {msg.sender_type === 'ai' ? 'IA' : msg.sender_type === 'staff' ? 'Tú' : conversation.customer_name || 'Parcero'}
                                {' · '}
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            <div style={{
                                padding: '0.85rem 1.25rem',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                ...getMessageStyle(msg)
                            }}>
                                {msg.message}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: isMobile ? '1rem' : '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#050505' }}>
                <form onSubmit={handleSend} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${!aiEnabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '14px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {!isMobile && (
                        <button type="button" style={{ padding: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                            <Image size={20} />
                        </button>
                    )}
                    <input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={aiEnabled ? "IA Activa..." : "Escribe un mensaje..."}
                        disabled={aiEnabled}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: aiEnabled ? 'rgba(255,255,255,0.3)' : 'white',
                            outline: 'none',
                            fontSize: '0.9rem',
                            padding: '8px 4px',
                            cursor: aiEnabled ? 'not-allowed' : 'text'
                        }}
                    />
                    {aiEnabled ? (
                        <button
                            type="button"
                            onClick={handleToggleAI}
                            disabled={togglingAI}
                            style={{
                                padding: '8px 12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '100px',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Pause size={12} /> Pausar IA
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            style={{
                                padding: '8px',
                                background: !inputText.trim() ? 'rgba(255,255,255,0.1)' : 'var(--color-neon-purple)',
                                borderRadius: '10px',
                                border: 'none',
                                color: 'white',
                                cursor: !inputText.trim() ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Send size={16} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};
