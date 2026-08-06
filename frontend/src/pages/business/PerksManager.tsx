import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Loader2, Tag, Lock } from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import PerkCard from '../../components/perks/PerkCard';
import PerkForm from '../../components/perks/PerkForm';

interface PerksManagerProps {
    event: any;
}

const PerksManager: React.FC<PerksManagerProps> = ({ event }) => {
    const [perks, setPerks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [editingPerk, setEditingPerk] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [venue, setVenue] = useState<any>(null);
    const [user] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadPerks();
    }, [event.id]);

    const loadPerks = async () => {
        try {
            const data = await businessApi.getEventPerks(event.id);
            setPerks(data);
        } catch (error) {
            console.error("Failed to load perks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSuccess = (newPerk: any) => {
        setPerks([newPerk, ...perks]);
        setShowForm(false);
        setEditingPerk(null);

        // Remove from suggestions if it was from AI
        if (editingPerk) {
            setAiSuggestions(aiSuggestions.filter(s => s.title !== editingPerk.title));
        }
    };

    const handleDelete = async (perkId: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este gangazo?")) return;
        try {
            await businessApi.deletePerk(perkId);
            setPerks(perks.filter(p => p.id !== perkId));
        } catch (error) {
            console.error("Failed to delete perk:", error);
            alert("Error al eliminar gangazo. " + (error as any).response?.data?.detail || "Error desconocido");
        }
    };

    const handleGenerateAI = async () => {
        setGeneratingAI(true);
        setAiSuggestions([]);
        try {
            const suggestions = await businessApi.generatePerkSuggestions({
                title: event.title,
                description: event.description,
                event_type: event.category || 'Nightlife'
            });
            setAiSuggestions(suggestions);
        } catch (error) {
            console.error("Failed to generate AI suggestions:", error);
        } finally {
            setGeneratingAI(false);
        }
    };

    const startEditingSuggestion = (suggestion: any) => {
        setEditingPerk(suggestion);
        setShowForm(true);
    };

    useEffect(() => {
        const fetchVenue = async () => {
            if (event.venue_id) {
                try {
                    const data = await businessApi.getVenueProfile(event.venue_id);
                    setVenue(data);
                } catch (err) {
                    console.error("Failed to fetch venue for perks", err);
                }
            }
        };
        fetchVenue();
    }, [event.venue_id]);

    const isAdmin = user.role === 'admin';
    const isVIP = user.role === 'VIP';
    const isFree = venue?.subscription_tier === 'FREE' && !isAdmin && !isVIP;
    const isArranque = venue?.subscription_tier === 'ARRANQUE' && !isAdmin && !isVIP;
    const perkLimitReached = isArranque && perks.length >= 1;

    return (
        <div style={{ padding: isMobile ? '0' : '1rem', color: 'white' }}>
            {isFree && (
                <div style={{
                    background: 'rgba(111, 66, 193, 0.1)',
                    border: '1px solid rgba(111, 66, 193, 0.2)',
                    borderRadius: '20px',
                    padding: '1.5rem 2rem',
                    marginBottom: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '2rem',
                    flexDirection: isMobile ? 'column' : 'row',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    <div>
                        <h4 style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Parché Loyalty es Premium</h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
                            Crea beneficios exclusivos y cupones de descuento para fidelizar a tus parceros.
                            Disponible en el plan <strong>El Parche</strong>.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/business/subscription?showUpgrade=true'}
                        style={{
                            background: 'var(--color-neon-purple)',
                            color: 'white',
                            border: 'none',
                            padding: '0.8rem 1.5rem',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 8px 24px rgba(111, 66, 193, 0.3)'
                        }}
                    >
                        Mejorar a 'El Parche'
                    </button>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: '2rem',
                gap: '1.5rem',
                opacity: isFree ? 0.6 : 1,
                pointerEvents: isFree ? 'none' : 'auto'
            }}>
                <div>
                    <h2 style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Gangazos y Cupones</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.85rem' : '0.9rem', fontWeight: '600' }}>Aumenta las ventas de boletas con gangazos.</p>
                </div>
                {!isFree && (
                    <div style={{ display: 'flex', gap: '1rem', width: isMobile ? '100%' : 'auto' }}>
                        <button
                            onClick={handleGenerateAI}
                            disabled={generatingAI || perkLimitReached}
                            style={{
                                flex: isMobile ? 1 : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.5rem',
                                borderRadius: '16px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: '#a78bfa',
                                fontWeight: '800',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                            }}
                        >
                            {generatingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isMobile ? 'Idea IA' : (aiSuggestions.length > 0 ? 'Regenerar Idea IA' : 'Generar Idea IA')}
                        </button>
                        <button
                            onClick={() => { setShowForm(true); setEditingPerk(null); }}
                            disabled={perkLimitReached}
                            style={{
                                flex: isMobile ? 1 : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.5rem',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                                border: 'none',
                                color: 'white',
                                fontWeight: '900',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(109, 40, 217, 0.3)'
                            }}
                        >
                            {perkLimitReached ? <Lock size={16} /> : <Plus size={16} />}
                            {isMobile ? (perkLimitReached ? 'Límite' : 'Nuevo') : (perkLimitReached ? 'Límite Alcanzado' : 'Crear Gangazo')}
                        </button>
                    </div>
                )}
            </div>

            {/* AI Suggestions Panel */}
            {(generatingAI || aiSuggestions.length > 0) && (
                <div style={{
                    background: 'rgba(139, 92, 246, 0.03)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '24px',
                    padding: isMobile ? '1.5rem' : '2.5rem',
                    marginBottom: '3rem',
                    backdropFilter: 'blur(30px)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{
                            padding: '10px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            borderRadius: '12px',
                            color: 'white'
                        }}>
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '950', color: 'white', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                Recomendaciones de Vibra
                            </h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '700' }}>Sugerencias de IA para darle más hype a tu parche.</p>
                        </div>
                    </div>

                    {generatingAI ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', textAlign: 'center' }}>
                            <Loader2 size={48} className="animate-spin text-white" />
                            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1.5rem', fontWeight: '600' }}>Analizando la vibra del parche...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {aiSuggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '20px',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1.25rem',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '950',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            color: '#a78bfa',
                                            background: 'rgba(139, 92, 246, 0.15)',
                                            padding: '4px 10px',
                                            borderRadius: '8px'
                                        }}>
                                            {suggestion.type}
                                        </span>
                                        <h4 style={{ fontSize: '1.25rem', fontWeight: '950', color: 'white', marginTop: '1rem', textTransform: 'uppercase' }}>
                                            {suggestion.title}
                                        </h4>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                                            {suggestion.description}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => startEditingSuggestion(suggestion)}
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Editar y Activar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div style={{ marginBottom: '3rem' }}>
                    <PerkForm
                        eventId={event.id}
                        initialData={editingPerk}
                        onSuccess={handleCreateSuccess}
                        onCancel={() => { setShowForm(false); setEditingPerk(null); }}
                    />
                </div>
            )}

            {/* Perks List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 size={48} className="animate-spin text-purple-500" />
                </div>
            ) : perks.length === 0 && !showForm ? (
                <div style={{
                    textAlign: 'center',
                    padding: isMobile ? '3rem 1.5rem' : '5rem 2rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '24px',
                    border: '2px dashed rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>
                    <Tag size={40} style={{ opacity: 0.2 }} />
                    {isFree ? (
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Fidelización Bloqueada</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '300px', margin: '0 auto', fontSize: '0.85rem' }}>
                                Actualiza tu plan para crear beneficios exclusivos y usar IA para generar hype.
                            </p>
                            <button
                                onClick={() => window.location.href = '/business/subscription?showUpgrade=true'}
                                style={{
                                    marginTop: '1.5rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    background: 'var(--color-neon-purple)',
                                    color: 'white',
                                    fontWeight: '900',
                                    fontSize: '0.8rem',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    border: 'none'
                                }}
                            >
                                Ver Planes
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>No hay Gangazos Activos</h3>
                                <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '300px', margin: '0 auto', fontSize: '0.85rem' }}>Ofrece recompensas exclusivas a tus parceros.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    onClick={() => setShowForm(true)}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#8b5cf6', color: 'white', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', border: 'none' }}
                                >
                                    Manual
                                </button>
                                <button
                                    onClick={handleGenerateAI}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer' }}
                                >
                                    Consultar IA
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {perks.map(perk => (
                        <PerkCard
                            key={perk.id}
                            perk={perk}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PerksManager;
