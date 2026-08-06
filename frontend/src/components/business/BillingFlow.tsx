
import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, ArrowRight, Loader2, X } from 'lucide-react';
import { businessApi } from '../../services/businessApi';

interface BillingFlowProps {
    venueId: string;
    onClose: () => void;
    onSuccess: () => void;
    initialPlanId?: string;
}

const PLANS = [
    { id: 'ARRANQUE', name: 'Arranque', price: '40.000', color: 'var(--color-neon-teal)' },
    { id: 'EL PARCHE', name: 'El Parche', price: '110.000', color: 'var(--color-neon-purple)' },
    { id: 'PRO', name: 'Dueño del Parche', price: '450.000', color: '#ffd700' }
];

export const BillingFlow: React.FC<BillingFlowProps> = ({ venueId, onClose, onSuccess, initialPlanId }) => {
    const [step, setStep] = useState<'select' | 'payment'>(initialPlanId ? 'payment' : 'select');
    const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(
        initialPlanId ? PLANS.find(p => p.id === initialPlanId) || null : null
    );
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
            const isAllowedExtension = ['jpg', 'jpeg', 'png'].includes(fileExtension || '');

            if (!allowedTypes.includes(selectedFile.type) && !isAllowedExtension) {
                setError('Solo se permiten formatos de foto .jpg o .png');
                setFile(null);
                setPreview(null);
                return;
            }

            setError(null);
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPlan || !file) return;
        if (!venueId) {
            setError('Error: ID de establecimiento no encontrado.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await businessApi.submitPaymentProof(venueId, selectedPlan.id, file);
            setStep('select'); // Reset or move to success
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al subir comprobante. Intentalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(5, 5, 5, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem'
        }}>
            <div style={{
                width: '100%', maxWidth: '600px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '32px',
                padding: window.innerWidth < 768 ? '1.5rem' : '2.5rem',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer'
                }}><X size={24} /></button>

                {step === 'select' && (
                    <>
                        <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Mejora tu <span style={{ color: 'var(--color-neon-purple)' }}>Perfil</span></h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2.5rem', fontWeight: '500' }}>Selecciona el plan que mejor se adapte a tu negocio.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                            {PLANS.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    style={{
                                        padding: '1.5rem',
                                        borderRadius: '20px',
                                        background: selectedPlan?.id === plan.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${selectedPlan?.id === plan.id ? plan.color : 'rgba(255,255,255,0.05)'}`,
                                        cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'white' }}>{plan.name}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>${plan.price} COP / mes</div>
                                    </div>
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: selectedPlan?.id === plan.id ? plan.color : 'transparent'
                                    }}>
                                        {selectedPlan?.id === plan.id && <CheckCircle2 size={16} color="black" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            disabled={!selectedPlan}
                            onClick={() => setStep('payment')}
                            style={{
                                width: '100%', padding: '1.2rem', borderRadius: '16px',
                                background: selectedPlan ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.05)',
                                color: selectedPlan ? 'white' : 'rgba(255,255,255,0.2)',
                                fontWeight: '800', border: 'none', cursor: selectedPlan ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            Continuar al Pago <ArrowRight size={20} />
                        </button>
                    </>
                )}

                {step === 'payment' && (
                    <>
                        <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>Detalles de <span style={{ color: 'var(--color-neon-purple)' }}>Pago</span></h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontWeight: '500' }}>Transfiere ${selectedPlan?.price} COP a nuestra cuenta oficial.</p>

                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexDirection: window.innerWidth < 600 ? 'column' : 'row' }}>
                            <div style={{
                                flex: 1,
                                background: 'white',
                                padding: '1rem',
                                borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <img src="/assets/payment_qr.jpeg" alt="QR Pago" style={{ width: '100%', maxWidth: '200px' }} />
                            </div>
                            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: '800' }}>Banco</div>
                                    <div style={{ color: 'white', fontWeight: '700' }}>Bancolombia - Ahorros</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: '800' }}>Número de Cuenta</div>
                                    <div style={{ color: 'white', fontWeight: '700' }}>279-779818-20</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '5px', fontWeight: '800' }}>Total a Pagar</div>
                                    <div style={{ color: 'var(--color-neon-purple)', fontWeight: '900', fontSize: '1.2rem' }}>${selectedPlan?.price} COP</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '700', marginBottom: '10px' }}>Adjuntar Comprobante</div>
                            <label style={{
                                width: '100%', height: '120px',
                                border: '2px dashed rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', background: preview ? 'none' : 'rgba(255,255,255,0.02)',
                                transition: 'all 0.2s', position: 'relative'
                            }}>
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                {preview ? (
                                    <img src={preview} alt="Vista previa" style={{ height: '100%', width: '100%', objectFit: 'contain', borderRadius: '16px' }} />
                                ) : (
                                    <>
                                        <Upload size={32} color="rgba(255,255,255,0.2)" />
                                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>Click para subir captura</span>
                                    </>
                                )}
                            </label>
                        </div>

                        {error && (
                            <div style={{
                                padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setStep('select')}
                                style={{ flex: 1, padding: '1.2rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                            >
                                Volver
                            </button>
                            <button
                                disabled={!file || loading}
                                onClick={handleSubmit}
                                style={{
                                    flex: 2, padding: '1.2rem', borderRadius: '16px',
                                    background: file ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.05)',
                                    color: file ? 'white' : 'rgba(255,255,255,0.2)',
                                    fontWeight: '900', border: 'none', cursor: file ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Pago'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
