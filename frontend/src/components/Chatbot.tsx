import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { aiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
        { role: 'assistant', content: 'Hi! I\'m VibeSeeker AI. Ask me about events near you!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            // Check if we are on an event page to send event_id
            const pathParts = window.location.pathname.split('/');
            const eventId = pathParts[1] === 'events' ? pathParts[2] : undefined;

            const response = await aiService.chat(userMsg, eventId);

            const aiResponse = response.answer || "I found some cool vibes for you!";
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I got disconnected from the vibe stream. Try again later.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '6.5rem' : '2rem',
                    right: isMobile ? '1.5rem' : '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--color-neon-purple)',
                    color: 'white',
                    boxShadow: 'var(--shadow-neon-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    transition: 'bottom 0.3s, right 0.3s, transform 0.3s',
                    border: 'none',
                    cursor: 'pointer'
                }}
                className="chatbot-toggle"
            >
                {isOpen ? <X /> : <MessageCircle />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: isMobile ? '11rem' : '7rem',
                            right: isMobile ? '1rem' : '2rem',
                            width: isMobile ? 'calc(100vw - 2rem)' : '350px',
                            maxWidth: isMobile ? 'none' : '350px',
                            height: isMobile ? '60vh' : '500px',
                            background: 'var(--color-surface)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(189, 0, 255, 0.1)' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                                <span style={{ width: '10px', height: '10px', background: 'var(--color-neon-teal)', borderRadius: '50%', boxShadow: '0 0 5px var(--color-neon-teal)' }}></span>
                                VibeSeeker AI
                            </h3>
                        </div>

                        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {messages.map((msg, i) => (
                                <div key={i} style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    padding: '0.8rem',
                                    borderRadius: '12px',
                                    background: msg.role === 'user' ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                                    borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                }}>
                                    {msg.content}
                                </div>
                            ))}
                            {loading && <div style={{ alignSelf: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Thinking...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem' }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                placeholder="Ask for recommendations..."
                                style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                            />
                            <button onClick={handleSend} style={{ background: 'var(--color-neon-teal)', color: 'black', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
