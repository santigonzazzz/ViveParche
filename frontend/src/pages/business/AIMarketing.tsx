import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, Zap, Save, CheckCircle, Loader2 } from 'lucide-react';
import { chatApi } from '../../services/chatApi';

export const AIMarketing: React.FC = () => {
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;
    const [tone, setTone] = useState<'professional' | 'vibey' | 'energetic'>('vibey');
    const [automationLevel, setAutomationLevel] = useState(80);
    const [customInstructions, setCustomInstructions] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ... loadSettings ...
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await chatApi.getAISettings(venueId);
                setTone(settings.tone || 'vibey');
                setAutomationLevel(settings.automation_level ?? 80);
                setCustomInstructions(settings.custom_instructions || '');
            } catch (err) {
                console.warn('Error al cargar la configuración de IA:', err);
                setSaveError('No se pudo cargar la configuración. Intenta recargar la página.');
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, [venueId]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setSaveError(null);
        try {
            await chatApi.saveAISettings({
                tone,
                custom_instructions: customInstructions,
                automation_level: automationLevel,
            }, venueId);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.warn('Error al guardar la configuración de IA:', err);
            setSaveError('No se pudo guardar la configuración. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const automationDescription = () => {
        if (automationLevel >= 70) return "La IA maneja todo automáticamente. Puedes ver el historial e intervenir cuando quieras.";
        if (automationLevel >= 40) return "La IA maneja preguntas de rutina. Solicitudes complejas son enviadas para que las revises.";
        return "La IA es principalmente pasiva. La mayoría de chats requerirán una respuesta manual.";
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <Loader2 className="animate-spin" color="var(--color-neon-purple)" size={32} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{
                marginBottom: '2.5rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Co-Piloto IA</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '1rem' : '1.1rem' }}>Configura cómo el asistente de IA interactúa con tus parceros.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: isMobile ? '100%' : 'auto', alignItems: isMobile ? 'stretch' : 'flex-end' }}>
                    {saveError && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '12px',
                            color: '#ef4444',
                            fontSize: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <span>{saveError}</span>
                            <button
                                onClick={() => setSaveError(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    padding: 0,
                                    flexShrink: 0
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '0.85rem 1.5rem',
                            borderRadius: '100px',
                            background: saved
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'linear-gradient(135deg, var(--color-neon-purple), #a855f7)',
                            border: saved ? '1px solid rgba(34, 197, 94, 0.4)' : 'none',
                            color: saved ? '#22c55e' : 'white',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: saving ? 'default' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            transition: 'all 0.3s',
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        {saving ? (
                            <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                        ) : saved ? (
                            <><CheckCircle size={16} /> ¡Guardado!</>
                        ) : (
                            <><Save size={16} /> Guardar Configuración</>
                        )}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
                {/* Main Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Persona Settings */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: isMobile ? '1.5rem' : '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'rgba(111, 66, 193, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                <Brain size={20} color="var(--color-neon-purple)" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '800', color: 'white', margin: 0 }}>Personalidad del Asistente</h2>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Cómo la IA habla con tus clientes</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            {[
                                { key: 'professional', label: 'Profesional', desc: 'Formal e informativo', icon: <BriefcaseIcon /> },
                                { key: 'vibey', label: 'Buena Vibra', desc: 'Fresco y casual', icon: <SparklesIcon /> },
                                { key: 'energetic', label: 'Enérgico', desc: 'Emocionante y entusiasta', icon: <ZapIcon /> },
                            ].map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTone(t.key as any)}
                                    style={{
                                        padding: '1.25rem 1rem',
                                        borderRadius: '16px',
                                        border: tone === t.key ? '1px solid var(--color-neon-purple)' : '1px solid rgba(255,255,255,0.1)',
                                        background: tone === t.key ? 'rgba(111, 66, 193, 0.15)' : 'transparent',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: isMobile ? 'row' : 'column',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.2s',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ color: tone === t.key ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.4)' }}>{t.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: tone === t.key ? '800' : '500', fontSize: '0.9rem' }}>{t.label}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{t.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
                                Instrucciones Personalizadas
                            </label>
                            <textarea
                                rows={4}
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                placeholder="Ej. Siempre menciona nuestros cócteles exclusivos. Invita a las personas a reservar una mesa VIP. Nunca hables de locales de la competencia."
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    padding: '1rem',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    resize: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                                Estas reglas se inyectan en cada conversación de IA para este local.
                            </p>
                        </div>
                    </div>

                    {/* Automation Settings */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                <Zap size={20} color="#22c55e" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', margin: 0 }}>Nivel de Automatización</h2>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Qué tan independiente opera la IA</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Autonomía de Respuesta</span>
                            <span style={{
                                color: automationLevel >= 70 ? '#22c55e' : automationLevel >= 40 ? '#f59e0b' : '#ef4444',
                                fontWeight: '800',
                                fontSize: '1.1rem'
                            }}>
                                {automationLevel}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={automationLevel}
                            onChange={(e) => setAutomationLevel(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                            <span>Manual</span>
                            <span>Balanceado</span>
                            <span>Piloto Automático</span>
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                            {automationDescription()}
                        </p>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(111, 66, 193, 0.2) 0%, rgba(111, 66, 193, 0.05) 100%)', 
                        border: '1px solid rgba(111, 66, 193, 0.3)', 
                        borderRadius: '24px', 
                        padding: '1.5rem' 
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>
                            Información del Asistente
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Motor de IA</span>
                            <span style={{ fontWeight: '800', color: 'var(--color-neon-teal)', fontSize: '0.8rem' }}>
                                Groq Llama 3.3
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Disponibilidad</span>
                            <span style={{ fontWeight: '800', color: '#22c55e', fontSize: '0.85rem' }}>
                                24/7
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Idioma</span>
                            <span style={{ fontWeight: '800', color: 'white', fontSize: '0.85rem' }}>
                                Español
                            </span>
                        </div>
                    </div>

                    {/* Safety Info */}
                    <div style={{ background: 'rgba(0, 243, 255, 0.03)', border: '1px solid rgba(0, 243, 255, 0.1)', borderRadius: '24px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--color-neon-teal)', marginBottom: '0.75rem' }}>🛡️ Reglas de Seguridad (Siempre Activas)</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                                'Solo responde preguntas del local',
                                'Nunca revela ganancias ni datos privados',
                                'Rechaza consultas fuera de tema',
                                'Mantiene tu personalidad de marca',
                            ].map((rule, i) => (
                                <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '6px' }}>
                                    <span style={{ color: 'var(--color-neon-teal)' }}>✓</span> {rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple Icons
const SparklesIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
const BriefcaseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
const ZapIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
