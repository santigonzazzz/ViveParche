import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { User, Phone, Mail, Bell, Shield, Camera, ChevronRight, Loader2, Eye, EyeOff, Check, X, AlertCircle, CheckCircle } from 'lucide-react';
import { settingsService, authService } from '../services/api';
import { MobileNav } from '../components/MobileNav';

type TabId = 'general' | 'security' | 'notifications';

interface NotifPrefs {
    events_and_venues: boolean;
    new_rewards: boolean;
    weekly_updates: boolean;
    security_alerts: boolean;
}

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // General
    const [formData, setFormData] = useState({ full_name: '', cellphone: '', email: '' });
    const [pendingData, setPendingData] = useState<{ full_name: string; cellphone: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    // Security
    const [passwords, setPasswords] = useState({ new_password: '', confirm: '' });
    const [showPw1, setShowPw1] = useState(false);
    const [showPw2, setShowPw2] = useState(false);

    // Notifications
    const [notifs, setNotifs] = useState<NotifPrefs>({
        events_and_venues: true,
        new_rewards: true,
        weekly_updates: false,
        security_alerts: true,
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Carga inmediata desde localStorage
        const cached = JSON.parse(localStorage.getItem('user') || '{}');
        setFormData({
            full_name: cached.full_name || '',
            cellphone: cached.cellphone || '',
            email: cached.email || ''
        });
        if (cached.notification_settings) {
            setNotifs(cached.notification_settings);
        }

        // Sincroniza con el backend para obtener datos frescos
        const syncFreshProfile = async () => {
            try {
                await authService.syncProfile();
                const fresh = JSON.parse(localStorage.getItem('user') || '{}');
                setFormData({
                    full_name: fresh.full_name || '',
                    cellphone: fresh.cellphone || '',
                    email: fresh.email || ''
                });
                if (fresh.notification_settings) {
                    setNotifs(fresh.notification_settings);
                }
            } catch (err) {
                console.warn('No se pudo sincronizar el perfil:', err);
            }
        };

        syncFreshProfile();
    }, []);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // General: open confirm dialog
    const handleSaveClick = () => {
        setPendingData({ full_name: formData.full_name, cellphone: formData.cellphone });
        setShowConfirm(true);
    };

    // General: actually save after confirmation
    const handleConfirmSave = async () => {
        if (!pendingData) return;
        setLoading(true);
        setShowConfirm(false);
        try {
            const updated = await settingsService.updateProfile(pendingData);
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, ...updated }));
            showToast('success', '¡Perfil actualizado con éxito!');
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Error al actualizar perfil.');
        } finally {
            setLoading(false);
            setPendingData(null);
        }
    };

    // Security: change password
    const handleChangePassword = async () => {
        if (passwords.new_password.length < 8) {
            showToast('error', 'La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (passwords.new_password !== passwords.confirm) {
            showToast('error', 'Las contraseñas no coinciden. Inténtalo de nuevo.');
            return;
        }
        setLoading(true);
        try {
            await settingsService.changePassword({ new_password: passwords.new_password });
            setPasswords({ new_password: '', confirm: '' });
            showToast('success', '¡Contraseña actualizada! Ya puedes usarla para iniciar sesión.');
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Error al cambiar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    // Notifications: save
    const handleSaveNotifications = async () => {
        setLoading(true);
        try {
            await settingsService.updateNotifications(notifs);
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, notification_settings: notifs }));
            showToast('success', '¡Preferencias de notificaciones guardadas!');
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Error al guardar notificaciones.');
        } finally {
            setLoading(false);
        }
    };

    const pwStrength = () => {
        const pw = passwords.new_password;
        if (!pw) return null;
        let score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;
        if (score <= 1) return { label: 'Débil', color: '#ef4444', width: '25%' };
        if (score <= 3) return { label: 'Moderada', color: '#f59e0b', width: '55%' };
        return { label: 'Fuerte', color: '#22c55e', width: '100%' };
    };

    const strength = pwStrength();

    const tabs = [
        { id: 'general' as TabId, label: 'General', icon: <User size={18} /> },
        { id: 'security' as TabId, label: 'Seguridad', icon: <Shield size={18} /> },
        { id: 'notifications' as TabId, label: 'Notificaciones', icon: <Bell size={18} /> },
    ];

    const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
        <button
            onClick={onChange}
            style={{
                width: '52px', height: '28px', borderRadius: '100px', border: 'none',
                background: value ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.12)',
                cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all 0.3s',
                boxShadow: value ? '0 0 12px rgba(111,66,193,0.5)' : 'none',
            }}
        >
            <div style={{
                position: 'absolute', top: '4px',
                left: value ? '26px' : '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'white', transition: 'all 0.3s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }} />
        </button>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: isMobile ? '8rem' : '4rem' }}>
            <Navbar />

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '6rem', right: '1.5rem', zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '1rem 1.5rem', borderRadius: '16px',
                    background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    backdropFilter: 'blur(20px)',
                    animation: 'fadeInDown 0.3s ease',
                    maxWidth: '360px'
                }}>
                    {toast.type === 'success' ? <CheckCircle size={18} color="#22c55e" /> : <AlertCircle size={18} color="#ef4444" />}
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{toast.msg}</span>
                </div>
            )}

            {/* Confirm Dialog */}
            {showConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '28px', padding: '2.5rem', maxWidth: '440px', width: '100%',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.6)'
                    }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.75rem' }}>Confirmar cambios</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            ¿Deseas guardar los siguientes cambios en tu perfil?
                        </p>
                        {pendingData && (
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '1.25rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Nombre</span>
                                    <span style={{ fontWeight: '700' }}>{pendingData.full_name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Celular</span>
                                    <span style={{ fontWeight: '700' }}>{pendingData.cellphone || '—'}</span>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => { setShowConfirm(false); setPendingData(null); }}
                                style={{
                                    flex: 1, padding: '0.9rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: '700', cursor: 'pointer'
                                }}
                            >Cancelar</button>
                            <button
                                onClick={handleConfirmSave}
                                style={{
                                    flex: 1, padding: '0.9rem', borderRadius: '14px', border: 'none',
                                    background: 'var(--color-neon-purple)', color: 'white', fontWeight: '900',
                                    cursor: 'pointer', boxShadow: '0 0 20px rgba(111,66,193,0.4)'
                                }}
                            >Confirmar Acción</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container" style={{ paddingTop: isMobile ? '7.5rem' : '8rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
                    Mi Configuración
                </h1>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: isMobile ? '1.5rem' : '3rem' }}>
                    {/* Sidebar Tabs */}
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        gap: '0.4rem',
                        overflowX: isMobile ? 'auto' : 'visible',
                        paddingBottom: isMobile ? '0.5rem' : '0'
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center',
                                    gap: isMobile ? '0.5rem' : '0.85rem',
                                    padding: isMobile ? '0.7rem 1rem' : '1rem 1.25rem',
                                    borderRadius: '14px', border: 'none',
                                    background: activeTab === tab.id ? 'rgba(111,66,193,0.15)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.45)',
                                    fontWeight: '700', fontSize: isMobile ? '0.82rem' : '0.95rem',
                                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', whiteSpace: 'nowrap',
                                    borderLeft: !isMobile && activeTab === tab.id ? '2px solid var(--color-neon-purple)' : '2px solid transparent'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                                {!isMobile && activeTab === tab.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '28px', padding: isMobile ? '1.5rem' : '2.5rem',
                        backdropFilter: 'blur(20px)'
                    }}>

                        {/* ── GENERAL ── */}
                        {activeTab === 'general' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                                {/* Avatar */}
                                <section>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.85)' }}>
                                        Foto de Perfil
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: '90px', height: '90px', borderRadius: '24px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}`}
                                                    alt="Avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            {/* Camera icon just for show — not changeable for users */}
                                            <div
                                                title="La foto se genera automáticamente"
                                                style={{
                                                    position: 'absolute', bottom: '-8px', right: '-8px',
                                                    width: '32px', height: '32px', borderRadius: '10px',
                                                    background: 'rgba(255,255,255,0.08)',
                                                    border: '2px solid var(--color-bg)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'not-allowed', color: 'rgba(255,255,255,0.3)'
                                                }}>
                                                <Camera size={14} />
                                            </div>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>Avatar generado automáticamente</p>
                                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                                La foto de perfil se genera a partir de tu correo electrónico y no puede modificarse.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Data */}
                                <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'rgba(255,255,255,0.85)' }}>Datos Personales</h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                                        {/* Name */}
                                        <div>
                                            <label style={labelStyle}>Nombre Completo</label>
                                            <div style={{ position: 'relative' }}>
                                                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
                                                <input
                                                    type="text"
                                                    value={formData.full_name}
                                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                    style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                                                    placeholder="Tu nombre"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Número de Celular</label>
                                            <div style={{ position: 'relative' }}>
                                                <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
                                                <input
                                                    type="tel"
                                                    value={formData.cellphone}
                                                    maxLength={10}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, cellphone: val });
                                                    }}
                                                    style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                                                    placeholder="3000000000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email – read only */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <label style={{ ...labelStyle, margin: 0 }}>Correo Electrónico</label>
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                color: '#f87171', padding: '2px 8px', borderRadius: '100px'
                                            }}>
                                                No editable
                                            </span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.15)' }} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                readOnly
                                                style={{ ...inputStyle, paddingLeft: '2.75rem', opacity: 0.45, cursor: 'not-allowed' }}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <button
                                    onClick={handleSaveClick}
                                    disabled={loading}
                                    style={{
                                        alignSelf: isMobile ? 'stretch' : 'flex-start',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                        padding: '0.9rem 2rem', borderRadius: '14px', border: 'none',
                                        background: 'var(--color-neon-purple)', color: 'white', fontWeight: '900',
                                        fontSize: '0.95rem', cursor: 'pointer', opacity: loading ? 0.7 : 1,
                                        boxShadow: '0 0 20px rgba(111,66,193,0.35)', transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        )}

                        {/* ── SECURITY ── */}
                        {activeTab === 'security' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.4rem' }}>Cambiar Contraseña</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
                                        Elige una contraseña segura de al menos 8 caracteres.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* New password */}
                                        <div>
                                            <label style={labelStyle}>Nueva Contraseña</label>
                                            <div style={{ position: 'relative' }}>
                                                <Shield size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
                                                <input
                                                    type={showPw1 ? 'text' : 'password'}
                                                    value={passwords.new_password}
                                                    onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                                                    placeholder="••••••••"
                                                    style={{ ...inputStyle, paddingLeft: '2.75rem', paddingRight: '3rem' }}
                                                />
                                                <button
                                                    onClick={() => setShowPw1(!showPw1)}
                                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
                                                    {showPw1 ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {/* Strength bar */}
                                            {strength && (
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: '100px', transition: 'all 0.4s' }} />
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: strength.color, fontWeight: '700' }}>
                                                        Seguridad: {strength.label}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm password */}
                                        <div>
                                            <label style={labelStyle}>Confirmar Contraseña</label>
                                            <div style={{ position: 'relative' }}>
                                                <Shield size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
                                                <input
                                                    type={showPw2 ? 'text' : 'password'}
                                                    value={passwords.confirm}
                                                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                                    placeholder="••••••••"
                                                    style={{
                                                        ...inputStyle, paddingLeft: '2.75rem', paddingRight: '3rem',
                                                        borderColor: passwords.confirm && passwords.new_password !== passwords.confirm
                                                            ? 'rgba(239,68,68,0.5)' : inputStyle.border as string
                                                    }}
                                                />
                                                <button
                                                    onClick={() => setShowPw2(!showPw2)}
                                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
                                                    {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {passwords.confirm && passwords.new_password !== passwords.confirm && (
                                                <p style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: '#f87171', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <X size={12} /> Las contraseñas no coinciden
                                                </p>
                                            )}
                                            {passwords.confirm && passwords.new_password === passwords.confirm && (
                                                <p style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Check size={12} /> Las contraseñas coinciden
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleChangePassword}
                                        disabled={loading || !passwords.new_password || passwords.new_password !== passwords.confirm}
                                        style={{
                                            marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                            padding: '0.9rem 2rem', borderRadius: '14px', border: 'none',
                                            background: 'white', color: 'black', fontWeight: '900', fontSize: '0.95rem',
                                            cursor: 'pointer', opacity: (loading || !passwords.new_password || passwords.new_password !== passwords.confirm) ? 0.4 : 1,
                                            width: isMobile ? '100%' : 'auto', transition: 'all 0.2s'
                                        }}
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                                        Actualizar Contraseña
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── NOTIFICATIONS ── */}
                        {activeTab === 'notifications' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem' }}>Alertas y Notificaciones</h3>

                                {([
                                    {
                                        id: 'events_and_venues' as keyof NotifPrefs,
                                        title: 'Eventos y locales que te podrían gustar',
                                        desc: 'Recibe alertas por correo cuando haya un evento o local cercano que coincida con tus gustos.'
                                    },
                                    {
                                        id: 'new_rewards' as keyof NotifPrefs,
                                        title: 'Nuevas recompensas en tus tiendas favoritas',
                                        desc: 'Te avisamos cuando haya una nueva recompensa disponible en eventos o locales que frecuentas.'
                                    },
                                    {
                                        id: 'weekly_updates' as keyof NotifPrefs,
                                        title: 'Resumen semanal de actividad',
                                        desc: 'Un correo cada semana con los mejores parches y tus VibeCoins acumuladas.'
                                    },
                                    {
                                        id: 'security_alerts' as keyof NotifPrefs,
                                        title: 'Alertas de seguridad',
                                        desc: 'Notificaciones importantes sobre tu cuenta como nuevos inicios de sesión o cambios de contraseña.'
                                    },
                                ] as const).map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
                                        padding: '1.25rem 1.5rem', borderRadius: '18px',
                                        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: '700', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{item.title}</p>
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', lineHeight: 1.5 }}>{item.desc}</p>
                                        </div>
                                        <Toggle value={notifs[item.id]} onChange={() => setNotifs(prev => ({ ...prev, [item.id]: !prev[item.id] }))} />
                                    </div>
                                ))}

                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={loading}
                                    style={{
                                        marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                        padding: '0.9rem 2rem', borderRadius: '14px', border: 'none',
                                        background: 'var(--color-neon-purple)', color: 'white', fontWeight: '900', fontSize: '0.95rem',
                                        cursor: 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 0 20px rgba(111,66,193,0.35)',
                                        width: isMobile ? '100%' : 'auto', transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Bell size={18} />}
                                    Guardar Preferencias
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isMobile && <MobileNav />}

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeInDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
                input:focus { border-color: rgba(111,66,193,0.5) !important; box-shadow: 0 0 0 3px rgba(111,66,193,0.1); outline: none; }
            `}</style>
        </div>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: '800',
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '0.5rem'
};

const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', padding: '0.875rem 1rem',
    borderRadius: '14px', color: 'white', outline: 'none', fontSize: '0.95rem',
    transition: 'all 0.2s', boxSizing: 'border-box'
};
