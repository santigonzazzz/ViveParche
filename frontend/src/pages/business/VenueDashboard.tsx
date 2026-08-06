import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    CheckCircle, AlertCircle, Loader2,
    DollarSign, History, Zap, Users, Star, Sparkles,
    Tag, Ticket, ChevronRight, X,
    Camera, Trash2, Plus, Gift, Lock
} from 'lucide-react';
import { loyaltyService } from '../../services/loyaltyService';
import { businessApi } from '../../services/businessApi';
import { PassportConfig } from '../../components/business/PassportConfig';
import { QRScanner } from '../../components/business/QRScanner';
import confetti from 'canvas-confetti';

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.6rem'
};

const PLAN_NAMES_FRIENDLY: Record<string, string> = {
    'FREE': 'Vitrina (Free)',
    'VITRINA': 'Vitrina (Free)',
    'ARRANQUE': 'Arranque',
    'EL PARCHE': 'El Parche',
    'PRO': 'Dueño del Parche',
    'active': 'Activo',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    padding: '1.1rem 1.15rem',
    borderRadius: '14px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '700',
    outline: 'none',
};

export const VenueDashboard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const venueIdParam = searchParams.get('venue_id');

    const [userCode, setUserCode] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [venue, setVenue] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [recentValidations, setRecentValidations] = useState<any[]>([]);
    const [perks, setPerks] = useState<any[]>([]);
    const [isMobile] = useState(window.innerWidth < 1024);

    // Perk Management State
    const [showPerkModal, setShowPerkModal] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [loadingAI, setLoadingAI] = useState(false);
    const [showAllValidations, setShowAllValidations] = useState(false);
    const [allValidations, setAllValidations] = useState<any[]>([]);
    const [loadingAll, setLoadingAll] = useState<boolean>(false);
    const [perkStatus, setPerkStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Redeem Reward State
    const [checkinMode, setCheckinMode] = useState<'passport' | 'award' | 'redeem'>('passport');
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [redeemResult, setRedeemResult] = useState<any | null>(null);
    const [redeemError, setRedeemError] = useState('');

    // QR Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scanMode, setScanMode] = useState<'flash_code' | 'reward_redeem' | 'passport_reward'>('flash_code');

    // Subscription State
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [subStatusMsg, setSubStatusMsg] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const API_BASE = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchStats = useCallback(async (venueId: string) => {
        if (!venueId) return;
        try {
            const headers = getAuthHeaders();
            const [statsRes, validationsRes, perksRes] = await Promise.all([
                fetch(`${API_BASE}/loyalty/venue/${venueId}/stats`, { headers }),
                fetch(`${API_BASE}/loyalty/venue/${venueId}/recent-validations?limit=5`, { headers }),
                fetch(`${API_BASE}/loyalty/venue/${venueId}/perks`, { headers }),
            ]);

            if (statsRes.ok) {
                const sData = await statsRes.json();
                setStats(sData);
            } else if (statsRes.status === 401) {
                console.error("Auth failed for stats");
            }

            if (validationsRes.ok) {
                const vData = await validationsRes.json();
                setRecentValidations(vData);
            }

            if (perksRes.ok) setPerks(await perksRes.json());
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    }, [API_BASE]);

    useEffect(() => {
        const load = async () => {
            try {
                const venueData = await businessApi.getVenueProfile(venueIdParam || undefined);
                setVenue(venueData);
                if (venueData?.id) await fetchStats(venueData.id);

                // Handle showUpgrade
                if (searchParams.get('showUpgrade') === 'true') {
                    setShowSubscriptionModal(true);
                }
            } catch (err) {
                console.error("Failed to fetch venue", err);
            }
        };
        load();
        const interval = setInterval(() => {
            if (venue?.id) fetchStats(venue.id);
        }, 30000);
        return () => clearInterval(interval);
    }, [venueIdParam, searchParams]);

    const handleValidate = async (e: React.FormEvent) => {
        if (venue?.subscription_status !== 'active') {
            setShowSubscriptionModal(true);
            return;
        }
        e.preventDefault();
        if (!userCode || !venue) return;
        setLoading(true);
        setStatus(null);
        try {
            const res = await loyaltyService.validateVisit({
                user_hash_id: userCode.toUpperCase(),
                venue_id: venue.id,
                amount_spent: amount ? parseFloat(amount) : undefined
            });
            setStatus({
                type: 'success',
                message: `✅ Verified! ${res.coins_awarded} VibeCoins awarded. ${res.stamps_count !== undefined ? `Stamp ${res.stamps_count}/${res.stamp_limit || 5}.` : ''}`
            });
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 }, colors: ['#6f42c1', '#00f3ff', '#fff'], zIndex: 1000 });
            setUserCode('');
            setAmount('');
            fetchStats(venue.id);
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || "Validation failed. Check bill status or code." });
        } finally {
            setLoading(false);
        }
    };

    // Handle scanned QR code: auto-fill user code and submit based on active tab
    const handleQRScan = async (code: string) => {
        setShowScanner(false);

        let cleanCode = code;
        // Extract ID from URL if applicable
        if (code.includes('/p/')) {
            cleanCode = code.split('/p/').pop()?.split('?')[0] || code;
        } else if (code.includes('/r/')) {
            cleanCode = code.split('/r/').pop()?.split('?')[0] || code;
        } else if (code.startsWith('PARCHE:')) {
            // Handle legacy QR codes format: PARCHE:HASH_ID:USER_ID
            const parts = code.split(':');
            if (parts.length >= 2) {
                cleanCode = parts[1]; // The second part is the HASH_ID
            }
        }

        // If it looks like a UUID qr_token keep lowercase; otherwise uppercase (short text_code)
        const isUUID = (cleanCode.match(/-/g) || []).length === 4;
        const finalCode = isUUID ? cleanCode.trim().toLowerCase() : cleanCode.trim().toUpperCase();

        if (checkinMode === 'passport' || checkinMode === 'award') {
            setUserCode(finalCode);
            setLoading(true);
            setStatus(null);
            try {
                const res = await loyaltyService.validateVisit({
                    user_hash_id: finalCode,
                    venue_id: venue!.id,
                    amount_spent: amount ? parseFloat(amount) : undefined
                });
                setStatus({
                    type: 'success',
                    message: `✅ QR escaneado! ${res.user_name || ''} — ${res.coins_awarded} Parché Monedas otorgadas. ${res.stamps !== undefined ? `Sello ${res.stamps}/${res.stamp_limit || 5}.` : ''}`
                });
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 }, colors: ['#6f42c1', '#00f3ff', '#fff'], zIndex: 1000 });
                setUserCode('');
                setAmount('');
                if (venue?.id) fetchStats(venue.id);
            } catch (err: any) {
                const msg = err.response?.data?.detail || 'Código inválido o usuario no encontrado.';
                setStatus({ type: 'error', message: `❌ ${msg}` });
            } finally {
                setLoading(false);
            }
        } else if (checkinMode === 'redeem') {
            setRedeemCode(finalCode);
            setRedeemLoading(true);
            setRedeemResult(null);
            setRedeemError('');
            try {
                let result: any;
                try {
                    result = await loyaltyService.redeemTicket(finalCode);
                } catch {
                    result = await loyaltyService.validatePassportReward(finalCode);
                }
                setRedeemResult(result);
            } catch (err: any) {
                const errRes = err.response?.data?.detail;
                setRedeemError(typeof errRes === 'string' ? errRes : 'Código inválido o ya canjeado.');
            } finally {
                setRedeemLoading(false);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPaymentFile(file);
            const reader = new FileReader();
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitProof = async () => {
        if (!paymentFile || !venue?.id) return;
        setUploadingProof(true);
        setSubStatusMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', paymentFile);
            formData.append('venue_id', venue.id);
            formData.append('plan_type', 'el_parche'); // Defaulting to El Parche plan

            const res = await fetch(`${API_BASE}/subscriptions/submit-proof`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`
                },
                body: formData
            });

            if (res.ok) {
                setSubStatusMsg({ type: 'success', message: '¡Pago enviado! Revisaremos tu comprobante pronto.' });
                // Update local venue status
                setVenue((prev: any) => ({ ...prev, subscription_status: 'pending_approval' }));
                setTimeout(() => setShowSubscriptionModal(false), 3000);
            } else {
                const data = await res.json();
                const errorMessage = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || 'Error al enviar el pago.');
                setSubStatusMsg({ type: 'error', message: errorMessage });
            }
        } catch (err) {
            setSubStatusMsg({ type: 'error', message: 'Error de conexión.' });
        } finally {
            setUploadingProof(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!venue?.id) return;
        setLoadingAI(true);
        setAiSuggestions([]);
        try {
            const res = await fetch(`${API_BASE}/loyalty/venue/${venue.id}/perks/ai-generate`, {
                method: 'POST', headers: getAuthHeaders()
            });
            const data = await res.json();
            setAiSuggestions(data.suggestions || []);
        } catch (err) {
            console.error("AI generation failed", err);
        } finally {
            setLoadingAI(false);
        }
    };

    const handleApplyPerk = async (suggestion: any) => {
        if (!venue?.id) return;
        try {
            const res = await fetch(`${API_BASE}/loyalty/venue/${venue.id}/perks`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ title: suggestion.title, description: suggestion.description, coin_price: suggestion.coin_price, type: suggestion.type })
            });
            if (res.ok) {
                const newPerk = await res.json();
                setPerks(prev => [newPerk, ...prev]);
                setAiSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
                showPerkNotif("Perk guardado ✓", "success");
            }
        } catch (err) {
            console.error("Failed to apply perk", err);
            showPerkNotif("Error al guardar perk", "error");
        }
    };

    const showPerkNotif = (msg: string, type: 'success' | 'error') => {
        setPerkStatus({ message: msg, type });
        setTimeout(() => setPerkStatus(null), 3000);
    };

    const handleManagePerk = (suggestion: any) => {
        const titleInput = document.getElementById('new-perk-title') as HTMLInputElement;
        const priceInput = document.getElementById('new-perk-price') as HTMLInputElement;
        const descInput = document.getElementById('new-perk-desc') as HTMLTextAreaElement;
        const typeSelect = document.getElementById('new-perk-type') as HTMLSelectElement;

        if (titleInput) titleInput.value = suggestion.title;
        if (priceInput) priceInput.value = suggestion.coin_price.toString();
        if (descInput) descInput.value = suggestion.description || '';
        if (typeSelect) typeSelect.value = suggestion.type;

        // Scroll to form
        titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInput?.focus();
    };

    const handleDeletePerk = async (perkId: string) => {
        if (!venue?.id) return;
        try {
            await fetch(`${API_BASE}/loyalty/venue/${venue.id}/perks/${perkId}`, {
                method: 'DELETE', headers: getAuthHeaders()
            });
            setPerks(prev => prev.filter(p => p.id !== perkId));
            showPerkNotif("Eliminado correctamente", "success");
        } catch (err) {
            console.error("Failed to delete perk", err);
            showPerkNotif("Error al eliminar", "error");
        }
    };

    const handleViewAll = async () => {
        if (!venue?.id) return;
        setShowAllValidations(true);
        setLoadingAll(true);
        try {
            const res = await fetch(`${API_BASE}/loyalty/venue/${venue.id}/recent-validations?limit=100`, { headers: getAuthHeaders() });
            if (res.ok) setAllValidations(await res.json());
        } finally {
            setLoadingAll(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'drink': return '🍺';
            case 'vip': return '⭐';
            case 'discount': return '🏷️';
            case 'food': return '🍴';
            default: return '🎁';
        }
    };

    const fmtCOP = (n: number) => new Intl.NumberFormat('es-CO').format(n);
    const fmtTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    };

    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>
                    Dashboard de Fidelización Parché
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.05rem' }}>
                    {venue?.name || 'Cargando local...'} — Inteligencia y fidelización en tiempo real
                </p>
            </div>

            {/* Upgrade Banner for FREE Tier */}
            {venue?.subscription_tier === 'FREE' && (
                <div style={{
                    background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                    padding: '12px 24px',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}>
                            <Sparkles size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: '900', fontSize: '1rem', color: 'white' }}>MODO VITRINA (FREE)</div>
                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
                                ¿Quieres ver a qué hora llegan tus parceros y fidelizarlos con Parché Monedas? <br />
                                <span style={{ textDecoration: 'underline' }}>Actualiza a "El Parche" por solo $110k/mes.</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSubscriptionModal(true)}
                        style={{
                            background: 'white',
                            color: '#a855f7',
                            padding: '8px 20px',
                            borderRadius: '100px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        VER PLANES
                    </button>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '1.25rem',
                marginBottom: '2.5rem',
                position: 'relative'
            }}>
                {venue?.subscription_tier === 'FREE' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowSubscriptionModal(true)}>
                            <Lock size={14} color="#a855f7" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'white' }}>MEJORA A EL PARCHE PARA VER ANALÍTICAS</span>
                        </div>
                    </div>
                )}
                {[
                    { label: 'Sellos Dados', value: stats?.total_stamps ?? '—', icon: <Star size={20} />, color: '#00f3ff' },
                    { label: 'Canjes Usados', value: stats?.rewards_used ?? '—', icon: <Ticket size={20} />, color: '#22c55e' },
                    { label: 'Monedas Generadas', value: stats?.total_coins ?? '—', icon: <Zap size={20} />, color: '#a855f7' },
                    { label: 'Parceros Fieles', value: stats?.active_loyalists ?? '—', icon: <Users size={20} />, color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', filter: venue?.subscription_tier === 'FREE' ? 'blur(4px)' : 'none', opacity: venue?.subscription_tier === 'FREE' ? 0.4 : 1 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* QR Scanner Overlay */}
            {showScanner && (
                <QRScanner
                    mode={scanMode}
                    onScan={handleQRScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }}>
                {/* Left: Check-in Station */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="stat-card" style={{ border: '1px solid rgba(111, 66, 193, 0.3)', background: 'rgba(111, 66, 193, 0.04)', position: 'relative' }}>
                        {(venue?.subscription_tier === 'FREE') && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                                <Lock size={32} color="#10b981" />
                                <h3 style={{ fontWeight: '900', fontSize: '1.1rem' }}>SISTEMA DE SELLOS (PASAPORTE)</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', maxWidth: '200px' }}>
                                    Requiere plan <b>Arranque</b> o superior para activar el Pasaporte de tu negocio.
                                </p>
                                <button
                                    onClick={() => setShowSubscriptionModal(true)}
                                    style={{ padding: '8px 16px', borderRadius: '100px', background: 'white', color: 'black', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                    ACTIVAR ARRANQUE
                                </button>
                            </div>
                        )}
                        {/* Header with toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'var(--color-neon-purple)', padding: '10px', borderRadius: '12px' }}>
                                <Camera size={22} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0 }}>Estación de Check-in</h2>
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', fontWeight: '600', margin: 0 }}>Gestión de Fidelización y Gangazos</p>
                            </div>
                            {/* QR Scan Button */}
                            <button
                                onClick={() => {
                                    setScanMode(checkinMode === 'redeem' ? 'passport_reward' : 'flash_code');
                                    setShowScanner(true);
                                }}
                                title="Escanear código QR con cámara"
                                style={{ background: 'rgba(0,243,255,0.12)', border: '1px solid rgba(0,243,255,0.3)', borderRadius: '12px', padding: '10px', color: '#00f3ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.75rem' }}
                            >
                                <Camera size={18} /> Escanear QR
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '4px', marginBottom: '1.75rem', border: '1px solid rgba(255,255,255,0.06)', gap: '4px' }}>
                            <button
                                onClick={() => { setCheckinMode('passport'); setStatus(null); setRedeemResult(null); setRedeemError(''); }}
                                style={{ padding: '0.6rem', borderRadius: '10px', border: 'none', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: checkinMode === 'passport' ? '#00f3ff' : 'transparent', color: checkinMode === 'passport' ? 'black' : 'rgba(255,255,255,0.4)' }}
                            >
                                <Star size={14} /> Pasaporte
                            </button>
                            <button
                                onClick={() => { setCheckinMode('award'); setRedeemResult(null); setRedeemError(''); }}
                                style={{ padding: '0.6rem', borderRadius: '10px', border: 'none', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: checkinMode === 'award' ? 'var(--color-neon-purple)' : 'transparent', color: checkinMode === 'award' ? 'white' : 'rgba(255,255,255,0.4)' }}
                            >
                                <Zap size={14} /> Monedas
                            </button>
                            <button
                                onClick={() => { setCheckinMode('redeem'); setStatus(null); }}
                                style={{ padding: '0.6rem', borderRadius: '10px', border: 'none', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: checkinMode === 'redeem' ? '#a855f7' : 'transparent', color: checkinMode === 'redeem' ? 'white' : 'rgba(255,255,255,0.4)' }}
                            >
                                <Gift size={14} /> Canjear
                            </button>
                        </div>

                        {/* Passport Mode */}
                        {checkinMode === 'passport' && (
                            <div style={{ position: 'relative' }}>
                                <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={labelStyle}>User Flash Code</label>
                                            <input
                                                value={userCode}
                                                onChange={e => setUserCode(e.target.value)}
                                                placeholder="e.g. ABC123"
                                                style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '3px', textTransform: 'uppercase' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Monto de Venta (COP)</label>
                                            <div style={{ position: 'relative' }}>
                                                <DollarSign size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                    placeholder="Opcional"
                                                    style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {status && (
                                        <div style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${status.type === 'success' ? '#22c55e' : '#ef4444'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: status.type === 'success' ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                            {status.message}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !userCode}
                                        style={{ width: '100%', padding: '1.25rem', borderRadius: '100px', background: '#00f3ff', border: 'none', color: 'black', fontWeight: '900', fontSize: '1rem', cursor: (loading || !userCode) ? 'not-allowed' : 'pointer', boxShadow: '0 0 30px rgba(0,243,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: (loading || !userCode) ? 0.45 : 1, transition: 'all 0.2s' }}
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={22} /> : <><Star size={20} /> REGISTRAR VISITA (PASAPORTE)</>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Award Coins Mode (LOCKED for Arranque) */}
                        {checkinMode === 'award' && (
                            <div style={{ position: 'relative' }}>
                                {['FREE', 'VITRINA', 'ARRANQUE'].includes(venue?.subscription_tier) && (
                                    <div style={{ position: 'absolute', inset: -10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 10, borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', textAlign: 'center', justifyContent: 'center' }}>
                                        <Lock size={20} color="#a855f7" />
                                        <div style={{ fontWeight: '900', fontSize: '0.8rem', marginTop: '0.5rem' }}>SISTEMA VIBECOINS</div>
                                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', margin: '4px 0 8px' }}>Premia a tus clientes con monedas para que vuelvan. Requiere plan <b>El Parche</b>.</p>
                                        <button onClick={() => setShowSubscriptionModal(true)} style={{ padding: '4px 12px', borderRadius: '100px', background: '#a855f7', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>MEJORAR A EL PARCHE</button>
                                    </div>
                                )}
                                <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={labelStyle}>User Flash Code</label>
                                            <input
                                                value={userCode}
                                                onChange={e => setUserCode(e.target.value)}
                                                placeholder="e.g. ABC123"
                                                style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '3px', textTransform: 'uppercase' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Monto Acumulado (COP)</label>
                                            <div style={{ position: 'relative' }}>
                                                <DollarSign size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                    placeholder="Opcional"
                                                    style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {status && (
                                        <div style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${status.type === 'success' ? '#22c55e' : '#ef4444'}`, display: 'flex', alignItems: 'center', gap: '0.75rem', color: status.type === 'success' ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                            {status.message}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !userCode}
                                        style={{ width: '100%', padding: '1.25rem', borderRadius: '100px', background: 'var(--color-neon-purple)', border: 'none', color: 'white', fontWeight: '900', fontSize: '1rem', cursor: (loading || !userCode) ? 'not-allowed' : 'pointer', boxShadow: '0 0 30px rgba(111,66,193,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: (loading || !userCode) ? 0.45 : 1, transition: 'all 0.2s' }}
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={22} /> : <><Zap size={20} /> DAR MONEDAS</>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Redeem Reward Mode */}
                        {checkinMode === 'redeem' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={labelStyle}>Código del ticket (QR code o texto)</label>
                                    <input
                                        value={redeemCode}
                                        onChange={e => { setRedeemCode(e.target.value); setRedeemResult(null); setRedeemError(''); }}
                                        placeholder="Escanea o escribe el código..."
                                        style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: '800', letterSpacing: '2px' }}
                                    />
                                </div>

                                {redeemError && (
                                    <div style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', fontWeight: '700' }}>
                                        <AlertCircle size={18} /> {redeemError}
                                    </div>
                                )}

                                {redeemResult && (
                                    <div style={{ padding: '1.5rem', borderRadius: '20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#22c55e', fontWeight: '900', fontSize: '1.1rem' }}>
                                            <CheckCircle size={24} /> ¡Cupón Validado!
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '2px' }}>GANGAZO</div>
                                                <div style={{ fontWeight: '800', color: 'white' }}>{redeemResult.perk_title}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '2px' }}>PARCERO</div>
                                                <div style={{ fontWeight: '800', color: 'white' }}>{redeemResult.customer_name}</div>
                                            </div>
                                            {redeemResult.perk_description && (
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '2px' }}>DESCRIPCIÓN</div>
                                                    <div style={{ fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{redeemResult.perk_description}</div>
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '2px' }}>MONEDAS</div>
                                                <div style={{ fontWeight: '900', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} fill="currentColor" /> {redeemResult.coins_spent}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    disabled={redeemLoading || !redeemCode.trim()}
                                    onClick={async () => {
                                        if (!redeemCode.trim()) return;
                                        setRedeemLoading(true);
                                        setRedeemError('');
                                        setRedeemResult(null);
                                        try {
                                            // Try perk ticket first, then passport reward
                                            let result: any;
                                            try {
                                                result = await loyaltyService.redeemTicket(redeemCode.trim());
                                            } catch {
                                                result = await loyaltyService.validatePassportReward(redeemCode.trim());
                                            }
                                            setRedeemResult(result);
                                            setRedeemCode('');
                                        } catch (e: any) {
                                            setRedeemError(e?.response?.data?.detail || 'Ticket no encontrado o ya canjeado.');
                                        } finally {
                                            setRedeemLoading(false);
                                        }
                                    }}
                                    style={{ width: '100%', padding: '1.25rem', borderRadius: '100px', background: 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.8))', border: 'none', color: 'white', fontWeight: '900', fontSize: '1rem', cursor: (redeemLoading || !redeemCode.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: (redeemLoading || !redeemCode.trim()) ? 0.45 : 1, transition: 'all 0.2s' }}
                                >
                                    {redeemLoading ? <Loader2 className="animate-spin" size={22} /> : <><Gift size={20} /> VALIDAR CUPÓN</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Pro Card, Active Perks, and Recent Validations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Subscription / Plan Card (TOP) */}
                    <div style={{
                        background: venue?.subscription_status === 'active'
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : (venue?.subscription_status === 'pending_approval'
                                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'),
                        borderRadius: '24px',
                        padding: '1.25rem',
                        color: 'white',
                        position: 'relative'
                    }}>
                        <h3 style={{ fontWeight: '900', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {venue?.subscription_status === 'active' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            {venue?.subscription_status === 'active' ?
                                `${PLAN_NAMES_FRIENDLY[venue?.plan_type?.toUpperCase()] || PLAN_NAMES_FRIENDLY[venue?.subscription_tier] || venue?.plan_type || 'Pro'} Plan Activo` :
                                (venue?.subscription_status === 'pending_approval' ? 'Pago Pendiente de Aprobación' : 'Suscripción Inactiva')}
                        </h3>
                        <p style={{ fontSize: '0.88rem', opacity: 0.9, lineHeight: '1.5', marginBottom: '1rem' }}>
                            {venue?.subscription_status === 'active'
                                ? `Tu local es parte de la red de crecimiento. Renueva el ${venue.expiry_date ? new Date(venue.expiry_date).toLocaleDateString() : '—'}.`
                                : (venue?.subscription_status === 'pending_approval'
                                    ? 'Estamos revisando tu comprobante de pago. Esto usualmente toma menos de 2 horas.'
                                    : 'Tu dashboard está bloqueado. Por favor sube un comprobante de pago para reactivar tu sistema de fidelización.')}
                        </p>

                        {venue?.subscription_status !== 'active' && (
                            <button
                                onClick={() => setShowSubscriptionModal(true)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '10px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                {venue?.subscription_status === 'pending_approval' ? 'ACTUALIZAR COMPROBANTE DE PAGO' : 'REACTIVAR AHORA'}
                            </button>
                        )}

                        {venue?.subscription_status === 'active' && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800' }}>
                                Tasa: 1 Moneda = $10 COP (Referencia)
                            </div>
                        )}
                    </div>

                    <div className="stat-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                        {(venue?.subscription_tier === 'FREE' || venue?.subscription_tier === 'VITRINA') && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', borderRadius: '24px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Lock size={24} color="#10b981" style={{ marginBottom: '1rem' }} />
                                    <div style={{ fontWeight: '900', color: 'white' }}>CONFIGURACIÓN PASAPORTE</div>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '8px 0' }}>El plan Vitrina no permite crear recompensas.</p>
                                    <button onClick={() => setShowSubscriptionModal(true)} style={{ marginTop: '0.5rem', padding: '8px 20px', borderRadius: '100px', background: 'white', color: 'black', border: 'none', fontWeight: '900', cursor: 'pointer' }}>ACTIVAR ARRANQUE (1 Reward)</button>
                                </div>
                            </div>
                        )}
                        {venue?.id && <PassportConfig venueId={venue.id} subscriptionTier={venue.subscription_tier} />}
                    </div>

                    {/* Active Perks - REQUIRES PRO */}
                    <div className="stat-card" style={{ padding: '1.25rem', position: 'relative' }}>
                        {['FREE', 'VITRINA', 'ARRANQUE'].includes(venue?.subscription_tier) && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 10, borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
                                <Lock size={28} color="#f59e0b" style={{ marginBottom: '1rem' }} />
                                <h4 style={{ fontWeight: '900', fontSize: '0.9rem' }}>SISTEMA DE CANJES (GANGAZOS)</h4>
                                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', maxWidth: '200px', margin: '8px 0' }}>Permite a los usuarios canjear sus monedas por premios físicos. Requiere plan <b>El Parche</b>.</p>
                                <button onClick={() => setShowSubscriptionModal(true)} style={{ padding: '6px 16px', borderRadius: '100px', background: '#f59e0b', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>MEJORAR A EL PARCHE</button>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Tag size={18} color="#a855f7" />
                                <h3 style={{ fontSize: '1rem', fontWeight: '900' }}>Gangazos y Cupones Activos</h3>
                            </div>
                            <button
                                onClick={() => { setShowPerkModal(true); setAiSuggestions([]); }}
                                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', padding: '8px 14px', borderRadius: '100px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                            >
                                <Sparkles size={12} /> Gestión
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {perks.filter(p => p.active).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
                                    <Sparkles size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                                    <div style={{ fontWeight: '700' }}>Aún no hay gangazos activos</div>
                                    <div style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>Usa "Gestión" para generar ideas con IA</div>
                                </div>
                            ) : perks.filter(p => p.active).map(perk => (
                                <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '12px' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                        {getTypeIcon(perk.type)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '800', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perk.title}</div>
                                        {perk.description && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '0px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perk.description}</div>}
                                    </div>
                                    <div style={{ fontWeight: '900', fontSize: '0.8rem', color: '#a855f7', whiteSpace: 'nowrap' }}>
                                        {fmtCOP(perk.coin_price)} <span style={{ fontSize: '0.6rem' }}>coins</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Validations (Moved to right column) */}
                    <div className="stat-card" style={{ padding: '1.25rem', position: 'relative' }}>
                        {venue?.subscription_tier === 'FREE' && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.3)' }}>
                                <div style={{ textAlign: 'center', padding: '1rem' }}>
                                    <Lock size={28} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
                                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white' }}>HISTORIAL BLOQUEADO</div>
                                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Mejora tu plan para ver la actividad</p>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <History size={18} color="var(--color-neon-teal)" />
                                <h3 style={{ fontSize: '1rem', fontWeight: '900' }}>Validaciones Recientes</h3>
                            </div>
                            <button
                                onClick={handleViewAll}
                                style={{ background: 'none', border: 'none', color: 'var(--color-neon-purple)', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                            >
                                Ver Todo <ChevronRight size={14} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: venue?.subscription_tier === 'FREE' ? 0.3 : 1, filter: venue?.subscription_tier === 'FREE' ? 'blur(3px)' : 'none' }}>
                            {recentValidations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', fontWeight: '600', fontSize: '0.8rem' }}>
                                    Aún no hay validaciones hoy
                                </div>
                            ) : recentValidations.slice(0, 5).map((v, i) => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', background: v.type === 'REWARD' ? 'rgba(168,85,247,0.06)' : (i === 0 ? 'rgba(0,243,255,0.05)' : 'rgba(255,255,255,0.02)'), borderRadius: '12px', border: v.type === 'REWARD' ? '1px solid rgba(168,85,247,0.2)' : (i === 0 ? '1px solid rgba(0,243,255,0.2)' : '1px solid rgba(255,255,255,0.04)') }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: v.type === 'REWARD' ? '#a855f7' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem', color: v.type === 'REWARD' ? 'white' : 'var(--color-neon-purple)' }}>
                                            {v.type === 'REWARD' ? <Gift size={14} /> : (v.user_name || 'U')[0].toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: '800', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.user_name || 'Customer'}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{v.type === 'REWARD' ? v.perk_title : (v.user_hash_id || '—')}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: '800', color: v.type === 'REWARD' ? '#a855f7' : '#22c55e', fontSize: '0.8rem' }}>
                                            {v.type === 'REWARD' ? `-${v.coins_spent}` : `+${v.coins_awarded}`}
                                            <span style={{ fontSize: '0.65rem' }}> coins</span>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>{fmtTime(v.created_at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modals outside the grid but inside the return div */}
                {showPerkModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: isMobile ? '1.5rem' : '2.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: '900' }}>Gangazos y Cupones</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: '600' }}>Gestiona recompensas para tu economía de monedas</p>
                                </div>
                                <button onClick={() => setShowPerkModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px', borderRadius: '12px', color: 'white', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Manual Creation Form */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Plus size={18} color="var(--color-neon-purple)" /> Añadir Gangazo Manualmente
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <input id="new-perk-title" placeholder="Título del Gangazo (Ej. 1 Pola Gratis)" style={inputStyle} />
                                    <div style={{ position: 'relative' }}>
                                        <input id="new-perk-price" type="number" placeholder="Monedas" style={{ ...inputStyle, paddingRight: '3rem' }} />
                                        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>MONEDAS</span>
                                    </div>
                                </div>
                                <textarea id="new-perk-desc" placeholder="Breve descripción de la recompensa..." style={{ ...inputStyle, minHeight: '80px', marginBottom: '1rem', resize: 'none' }} />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <select id="new-perk-type" style={{ ...inputStyle, flex: 1 }}>
                                        <option value="drink">Trago 🍺</option>
                                        <option value="food">Comida 🍴</option>
                                        <option value="discount">Descuento 🏷️</option>
                                        <option value="vip">VIP ⭐</option>
                                        <option value="custom">Personalizado 🎁</option>
                                    </select>
                                    <button
                                        onClick={async () => {
                                            const title = (document.getElementById('new-perk-title') as HTMLInputElement).value;
                                            const price = parseInt((document.getElementById('new-perk-price') as HTMLInputElement).value);
                                            const desc = (document.getElementById('new-perk-desc') as HTMLTextAreaElement).value;
                                            const type = (document.getElementById('new-perk-type') as HTMLSelectElement).value;
                                            if (!title || !price) return alert("El título y el precio son obligatorios");
                                            await handleApplyPerk({ title, coin_price: price, description: desc, type });
                                            (document.getElementById('new-perk-title') as HTMLInputElement).value = '';
                                            (document.getElementById('new-perk-price') as HTMLInputElement).value = '';
                                            (document.getElementById('new-perk-desc') as HTMLTextAreaElement).value = '';
                                        }}
                                        style={{ background: 'var(--color-neon-teal)', border: 'none', color: 'black', padding: '0 2rem', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        CREAR
                                    </button>
                                </div>
                            </div>

                            {/* AI Generator */}
                            <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(111,66,193,0.06) 100%)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiSuggestions.length > 0 ? '1.5rem' : '0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Sparkles size={20} color="#a855f7" />
                                        <div>
                                            <div style={{ fontWeight: '800' }}>Laboratorio de IA</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Obtén sugerencias automáticas para tu local</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAIGenerate}
                                        disabled={loadingAI}
                                        style={{ background: '#a855f7', border: 'none', color: 'white', padding: '10px 18px', borderRadius: '100px', fontWeight: '800', cursor: loadingAI ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', opacity: loadingAI ? 0.6 : 1 }}
                                    >
                                        {loadingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        {loadingAI ? 'Pensando...' : 'Generar Ideas'}
                                    </button>
                                </div>

                                {aiSuggestions.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {aiSuggestions.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '14px' }}>
                                                <div style={{ fontSize: '1.25rem' }}>{getTypeIcon(s.type)}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '800', fontSize: '0.92rem' }}>{s.title}</div>
                                                    {s.description && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{s.description}</div>}
                                                    <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: '800', marginTop: '4px' }}>{fmtCOP(s.coin_price)} monedas</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleManagePerk(s)}
                                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: '100px', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Gestionar
                                                    </button>
                                                    <button
                                                        onClick={() => handleApplyPerk(s)}
                                                        style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', padding: '8px 16px', borderRadius: '100px', fontWeight: '900', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                                    >
                                                        Aplicar ✓
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Active perks list */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ fontWeight: '800', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Gangazos Activos ({perks.filter(p => p.active).length})
                                    </div>
                                    {perkStatus && (
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: '800',
                                            color: perkStatus.type === 'success' ? '#22c55e' : '#ef4444',
                                            background: perkStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${perkStatus.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                                        }}>
                                            {perkStatus.message}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {perks.filter(p => p.active).length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.2)', fontWeight: '600', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px' }}>No hay gangazos activos. ¡Usa el formulario arriba y empieza a premiar a tus parceros!</div>
                                    )}
                                    {perks.filter(p => p.active).map(perk => (
                                        <div key={perk.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                                            <div style={{ fontSize: '1.25rem' }}>{getTypeIcon(perk.type)}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '800' }}>{perk.title}</div>
                                                {perk.description && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{perk.description}</div>}
                                            </div>
                                            <div style={{ fontWeight: '900', color: '#a855f7', fontSize: '0.9rem', marginRight: '0.5rem' }}>{fmtCOP(perk.coin_price)}</div>
                                            <button onClick={() => handleDeletePerk(perk.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAllValidations && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: isMobile ? '1.5rem' : '2.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: '900' }}>Todas las Validaciones</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: '600' }}>Historial de visitas completo de este mes</p>
                                </div>
                                <button onClick={() => setShowAllValidations(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            {loadingAll ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                                    <div>Cargando historial de validaciones...</div>
                                </div>
                            ) : allValidations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '16px' }}>No se encontraron validaciones.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {allValidations.map((v) => (
                                        <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.5rem', alignItems: 'center', padding: '1rem 1.1rem', background: v.type === 'REWARD' ? 'rgba(168,85,247,0.04)' : 'rgba(255,255,255,0.02)', borderRadius: '14px', border: v.type === 'REWARD' ? '1px solid rgba(168,85,247,0.15)' : '1px solid rgba(255,255,255,0.04)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: v.type === 'REWARD' ? '#a855f7' : 'rgba(111,66,193,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem', color: v.type === 'REWARD' ? 'white' : 'var(--color-neon-purple)', flexShrink: 0 }}>
                                                    {v.type === 'REWARD' ? <Gift size={16} /> : (v.user_name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>{v.user_name || 'Parcero'}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{v.type === 'REWARD' ? 'Canje' : `#${v.user_hash_id}`}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>{fmtTime(v.created_at)}</div>
                                                <div style={{ fontSize: '0.8rem', color: v.type === 'REWARD' ? '#a855f7' : '#22c55e', fontWeight: '800' }}>
                                                    {v.type === 'REWARD' ? v.perk_title : `${fmtCOP(v.amount_spent)} COP`}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '900', color: v.type === 'REWARD' ? '#a855f7' : '#22c55e' }}>
                                                    {v.type === 'REWARD' ? '-' : '+'}{v.type === 'REWARD' ? v.coins_spent : v.coins_awarded} <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>monedas</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <style>{`
                .stat-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 24px;
                    padding: 1.75rem;
                    backdrop-filter: blur(20px);
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
                {showSubscriptionModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
                        <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', width: '100%', maxWidth: '800px', padding: '2rem', margin: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: '900' }}>Elige tu Plan</h2>
                                <button onClick={() => setShowSubscriptionModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            {/* Pricing Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                {[
                                    { name: 'Arranque', price: '40.000', color: '#10b981', features: ['Validación de Sellos', '1 Cuenta de Mesero', 'Soporte Básico'] },
                                    { name: 'El Parche', price: '110.000', color: '#a855f7', features: ['Todo en Arranque', 'Sistema VibeCoins', '3 Cuentas de Mesero', 'Sugerencias de IA'], popular: true },
                                    { name: 'Dueño del Parche', price: '450.000', color: '#f59e0b', features: ['Todo en El Parche', 'Redención de Gangazos', 'Meseros Ilimitados', 'Estadísticas Premium'] }
                                ].map(plan => (
                                    <div key={plan.name} style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: plan.popular ? `2px solid ${plan.color}` : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '24px',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        scale: plan.popular ? '1.05' : '1'
                                    }}>
                                        {plan.popular && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: 'white', padding: '2px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '900' }}>MÁS POPULAR</div>}
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: plan.color, marginBottom: '0.5rem' }}>{plan.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1.5rem' }}>
                                            <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>${plan.price}</span>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>/mes</span>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                                            {plan.features.map(f => (
                                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                                                    <CheckCircle size={14} color={plan.color} /> {f}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const pricingEl = document.getElementById('payment-section');
                                                pricingEl?.scrollIntoView({ behavior: 'smooth' });
                                                // Set selected plan context for payment
                                                (window as any).selectedPlan = plan.name;
                                                (window as any).selectedPrice = plan.price;
                                            }}
                                            style={{ width: '100%', padding: '10px', borderRadius: '12px', background: plan.popular ? plan.color : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            ELEGIR PLAN
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div id="payment-section" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '0.5rem' }}>Pagar Suscripción</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>Escanea el código QR desde tu app bancaria (Nequi/Bancolombia) y sube el comprobante.</p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>
                                                <Camera size={18} />
                                                {paymentFile ? paymentFile.name : 'Subir Comprobante (Screenshot)'}
                                                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                            </label>

                                            {subStatusMsg && (
                                                <div style={{ padding: '0.75rem', borderRadius: '12px', background: subStatusMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${subStatusMsg.type === 'success' ? '#22c55e' : '#ef4444'}`, color: subStatusMsg.type === 'success' ? '#22c55e' : '#ef4444', fontSize: '0.85rem', fontWeight: '700' }}>
                                                    {subStatusMsg.message}
                                                </div>
                                            )}

                                            <button
                                                disabled={!paymentFile || uploadingProof}
                                                onClick={handleSubmitProof}
                                                style={{ width: '100%', padding: '1.1rem', borderRadius: '100px', background: 'var(--color-neon-purple)', border: 'none', color: 'white', fontWeight: '900', fontSize: '1rem', cursor: uploadingProof ? 'wait' : 'pointer', opacity: (!paymentFile || uploadingProof) ? 0.5 : 1 }}
                                            >
                                                {uploadingProof ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRMAR PAGO'}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ width: '200px', flexShrink: 0 }}>
                                        <div style={{ background: 'white', padding: '10px', borderRadius: '16px', width: '100%' }}>
                                            <img src="/assets/payment_qr.jpeg" alt="Payment QR" style={{ width: '100%', aspectRatio: '1/1' }} />
                                        </div>
                                        <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)' }}>Santiago González Cardona</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VenueDashboard;
