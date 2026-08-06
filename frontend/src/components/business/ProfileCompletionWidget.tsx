import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface ProfileCompletionWidgetProps {
    completion: number;
    venueData?: {
        description?: string;
        opening_hours?: any;
        image_url?: string;
        address?: string;
        whatsapp_number?: string;
        items_count?: number;
        menu_url?: string;
        special_offers_json?: any[];
        special_offers_pdf_url?: string;
    };
}

export const ProfileCompletionWidget: React.FC<ProfileCompletionWidgetProps> = ({
    completion,
    venueData
}) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const venueId = searchParams.get('venue_id') || undefined;

    const tasks = [
        { label: 'Añadir Descripción', completed: !!venueData?.description, weight: 15 },
        { label: 'Fijar Horarios', completed: !!venueData?.opening_hours, weight: 15 },
        { label: 'Subir Portada', completed: !!venueData?.image_url, weight: 20 },
        { label: 'Añadir Dirección', completed: !!venueData?.address, weight: 15 },
        { label: 'Añadir WhatsApp', completed: !!venueData?.whatsapp_number, weight: 15 },
        { label: 'Añadir Menú (PDF o Ítems)', completed: (venueData?.items_count || 0) > 0 || !!venueData?.menu_url, weight: 10 },
        { label: 'Añadir Ofertas Especiales', completed: (venueData?.special_offers_json?.length || 0) > 0 || !!venueData?.special_offers_pdf_url, weight: 10 },
    ];

    const isComplete = completion >= 100;

    return (
        <div style={{
            background: 'linear-gradient(180deg, rgba(111, 66, 193, 0.1) 0%, rgba(10, 10, 12, 0.05) 100%)',
            border: '1px solid rgba(111, 66, 193, 0.3)',
            borderRadius: '24px',
            padding: '1.5rem',
        }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white', margin: 0 }}>
                        Perfil Completado
                    </h3>
                    <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '900',
                        color: isComplete ? '#4ade80' : 'var(--color-neon-purple)'
                    }}>
                        {completion}%
                    </span>
                </div>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '50px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${completion}%`,
                        height: '100%',
                        background: isComplete
                            ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                            : 'linear-gradient(90deg, var(--color-neon-purple), var(--color-neon-pink))',
                        transition: 'width 0.5s ease',
                        borderRadius: '50px'
                    }} />
                </div>
            </div>

            {!isComplete && (
                <div style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                }}>
                    <AlertCircle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{
                        fontSize: '0.8rem',
                        color: '#fbbf24',
                        margin: 0,
                        fontWeight: '600',
                        lineHeight: '1.4'
                    }}>
                        ¡Completa tu perfil para subir en descubrimientos y desbloquear todo!
                    </p>
                </div>
            )}

            {/* Task List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {tasks.map((task, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            opacity: task.completed ? 0.5 : 1,
                            transition: 'opacity 0.3s ease'
                        }}
                    >
                        {task.completed ? (
                            <CheckCircle2 size={18} color="#4ade80" />
                        ) : (
                            <Circle size={18} color="rgba(255,255,255,0.3)" />
                        )}
                        <span style={{
                            fontSize: '0.85rem',
                            color: task.completed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)',
                            fontWeight: '600',
                            textDecoration: task.completed ? 'line-through' : 'none'
                        }}>
                            {task.label}
                        </span>
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.3)',
                            fontWeight: '700'
                        }}>
                            +{task.weight}%
                        </span>
                    </div>
                ))}
            </div>

            {!isComplete && (
                <button
                    onClick={() => navigate(`/business/onboarding${venueId ? `?venue_id=${venueId}` : ''}`)}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '16px',
                        background: 'var(--color-neon-purple)',
                        border: 'none',
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 8px 20px rgba(111, 66, 193, 0.2)',
                        transition: 'transform 0.2s'
                    }}
                >
                    Completar Perfil <AlertCircle size={16} />
                </button>
            )}

            {isComplete && (
                <div style={{
                    marginTop: '1.5rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <CheckCircle2 size={24} color="#4ade80" style={{ marginBottom: '0.5rem' }} />
                    <p style={{
                        fontSize: '0.9rem',
                        color: '#4ade80',
                        margin: '0 0 0.75rem 0',
                        fontWeight: '700'
                    }}>
                        ¡Perfil Completado! 🎉
                    </p>
                    <button
                        onClick={() => navigate(`/business/onboarding${venueId ? `?venue_id=${venueId}` : ''}`)}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            color: '#4ade80',
                            padding: '0.4rem 1rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        Volver a editar
                    </button>
                </div>
            )}
        </div>
    );
};
