import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Mail, Shield, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, X, RefreshCw } from 'lucide-react';
import { authService } from '../services/api';

type Step = 'email' | 'code' | 'password' | 'success';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']); // Back to array for stable indices
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // countdown timer for resend
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // ── Step 1: Send code ─────────────────────────────────────────────────
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authService.forgotPassword(email);
            setStep('code');
            setResendCooldown(180); // 3 minutes cooldown (180s)
            setTimeout(() => codeRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al enviar el código.');
        } finally {
            setLoading(false);
        }
    };

    // ── Code input box logic ───────────────────────────────────────────────
    const handleCodeInput = (idx: number, val: string) => {
        const char = val.slice(-1);
        if (char && !/^\d$/.test(char)) return;

        const next = [...code];
        next[idx] = char;
        setCode(next);

        // Move focus forward
        if (char && idx < 5) {
            codeRefs.current[idx + 1]?.focus();
        }
    };

    const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') {
            if (!code[idx] && idx > 0) {
                const next = [...code];
                next[idx - 1] = '';
                setCode(next);
                codeRefs.current[idx - 1]?.focus();
            } else {
                const next = [...code];
                next[idx] = '';
                setCode(next);
            }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
            codeRefs.current[idx - 1]?.focus();
        } else if (e.key === 'ArrowRight' && idx < 5) {
            codeRefs.current[idx + 1]?.focus();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) {
            const next = [...code];
            pasted.split('').forEach((char, i) => {
                if (i < 6) next[i] = char;
            });
            setCode(next);
            const focusIdx = Math.min(pasted.length, 5);
            codeRefs.current[focusIdx]?.focus();
        }
    };

    // ── Step 2: Verify code ───────────────────────────────────────────────
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullCode = code.join('');

        if (fullCode.length < 6) { setError('Ingresa el código completo de 6 dígitos.'); return; }
        setLoading(true);
        setError('');
        try {
            await authService.verifyForgotPassword(email, fullCode);
            setStep('password');
        } catch (err: any) {
            console.error('[AUTH] Verification error:', err.response?.status, err.response?.data);
            const detail = err.response?.data?.detail || 'Código inválido o expirado.';
            setError(detail);

            // Critical check: even if the server returns 404, we must NOT proceed
            if (err.response?.status === 404) {
                setError('Error del servidor: El sistema de verificación no está disponible en este momento.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Change password ───────────────────────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
        if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
        setLoading(true);
        setError('');
        try {
            await authService.resetPassword({
                email,
                code: code.join(''),
                new_password: newPassword,
            });
            setStep('success');
        } catch (err: any) {
            console.error('[AUTH] Reset error:', err.response?.status, err.response?.data);
            setError(err.response?.data?.detail || 'Código inválido o expirado.');
            // If blocked or wrong code, go back to code step
            if (err.response?.data?.detail?.includes('intento')) {
                setStep('code');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Resend ────────────────────────────────────────────────────────────
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        setError('');
        try {
            await authService.forgotPassword(email);
            setCode(['', '', '', '', '', '']);
            setResendCooldown(180); // 3 minutes (180s)
            codeRefs.current[0]?.focus();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al reenviar el código.');
        } finally {
            setLoading(false);
        }
    };

    const pwStrength = () => {
        if (!newPassword) return null;
        let s = 0;
        if (newPassword.length >= 8) s++;
        if (newPassword.length >= 12) s++;
        if (/[A-Z]/.test(newPassword)) s++;
        if (/[0-9]/.test(newPassword)) s++;
        if (/[^a-zA-Z0-9]/.test(newPassword)) s++;
        if (s <= 1) return { label: 'Débil', color: '#ef4444', w: '25%' };
        if (s <= 3) return { label: 'Moderada', color: '#f59e0b', w: '60%' };
        return { label: 'Fuerte', color: '#22c55e', w: '100%' };
    };
    const strength = pwStrength();


    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white' }}>
            <Navbar />
            <div className="container" style={{
                paddingTop: isMobile ? '6rem' : '8rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingLeft: '1.5rem', paddingRight: '1.5rem'
            }}>
                <Link to="/login" style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: '2rem',
                    fontWeight: '700', transition: 'color 0.2s'
                }}>
                    <ArrowLeft size={16} /> Volver al inicio de sesión
                </Link>

                {/* ── STEP 1: Email ── */}
                {step === 'email' && (
                    <Card isMobile={isMobile}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(111,66,193,0.15)', border: '1px solid rgba(111,66,193,0.3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                <Mail size={28} color="#a78bfa" />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>¿Olvidaste tu contraseña?</h1>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Ingresa tu correo y te enviaremos un código de 6 dígitos.
                            </p>
                        </div>

                        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

                        <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={labelSt}>Correo electrónico</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={iconSt} />
                                    <input
                                        type="email" required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onFocus={e => e.target.select()}
                                        placeholder="nombre@correo.com"
                                        style={{ ...inputSt, paddingLeft: '2.75rem' }}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
                                {loading ? <Loader2 className="spin" size={18} /> : <Mail size={18} />}
                                Enviar código
                            </button>
                        </form>
                    </Card>
                )}

                {/* ── STEP 2: Code ── */}
                {step === 'code' && (
                    <Card isMobile={isMobile}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(111,66,193,0.15)', border: '1px solid rgba(111,66,193,0.3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                <Shield size={28} color="#a78bfa" />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>Revisa tu correo</h1>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Enviamos un código a <strong style={{ color: 'white' }}>{email}</strong>.
                                Tienes <strong style={{ color: 'white' }}>3 intentos</strong> y si fallas deberás esperar 3 minutos.
                            </p>
                        </div>

                        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

                        <form onSubmit={handleVerifyCode}>
                            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', marginBottom: '1.75rem' }} onPaste={handleCodePaste}>
                                {code.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { codeRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleCodeInput(i, e.target.value)}
                                        onKeyDown={e => handleCodeKeyDown(i, e)}
                                        onFocus={e => e.target.select()}
                                        style={{
                                            width: isMobile ? '42px' : '52px',
                                            height: isMobile ? '56px' : '68px',
                                            textAlign: 'center',
                                            fontSize: '1.75rem',
                                            fontWeight: '900',
                                            background: digit ? 'rgba(111,66,193,0.2)' : 'rgba(255,255,255,0.04)',
                                            border: `2px solid ${digit ? 'rgba(111,66,193,0.6)' : 'rgba(255,255,255,0.1)'}`,
                                            borderRadius: '14px',
                                            color: 'white',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            cursor: 'text'
                                        }}
                                    />
                                ))}
                            </div>

                            <button type="submit" disabled={loading || code.join('').length < 6} style={btnPrimary(loading || code.join('').length < 6)}>
                                {loading ? <Loader2 className="spin" size={18} /> : <Shield size={18} />}
                                Verificar código
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <button
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || loading}
                                style={{
                                    background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer',
                                    color: resendCooldown > 0 ? 'rgba(255,255,255,0.25)' : 'var(--color-neon-purple)',
                                    fontSize: '0.88rem', fontWeight: '700', display: 'inline-flex',
                                    alignItems: 'center', gap: '0.4rem', textDecoration: 'none'
                                }}
                            >
                                <RefreshCw size={14} />
                                {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                            </button>
                        </div>
                    </Card>
                )}

                {/* ── STEP 3: New Password ── */}
                {step === 'password' && (
                    <Card isMobile={isMobile}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(111,66,193,0.15)', border: '1px solid rgba(111,66,193,0.3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                <Shield size={28} color="#a78bfa" />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>Nueva contraseña</h1>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>Elige una contraseña segura de al menos 8 caracteres.</p>
                        </div>

                        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={labelSt}>Nueva Contraseña</label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={16} style={iconSt} />
                                    <input
                                        type={showPw ? 'text' : 'password'} required
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        onFocus={e => e.target.select()}
                                        placeholder="••••••••"
                                        style={{ ...inputSt, paddingLeft: '2.75rem', paddingRight: '3rem' }}
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {strength && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: strength.w, background: strength.color, borderRadius: '100px', transition: 'all 0.4s' }} />
                                        </div>
                                        <p style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: strength.color, fontWeight: '700' }}>
                                            Seguridad: {strength.label}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={labelSt}>Confirmar Contraseña</label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={16} style={iconSt} />
                                    <input
                                        type={showPw ? 'text' : 'password'} required
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        onFocus={e => e.target.select()}
                                        placeholder="••••••••"
                                        style={{ ...inputSt, paddingLeft: '2.75rem', borderColor: confirmPassword && newPassword !== confirmPassword ? 'rgba(239,68,68,0.5)' : inputSt.border as string }}
                                    />
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem', fontWeight: '600' }}>✗ Las contraseñas no coinciden</p>
                                )}
                                {confirmPassword && newPassword === confirmPassword && (
                                    <p style={{ color: '#22c55e', fontSize: '0.75rem', marginTop: '0.3rem', fontWeight: '600' }}>✓ Las contraseñas coinciden</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !newPassword || newPassword !== confirmPassword}
                                style={btnPrimary(loading || !newPassword || newPassword !== confirmPassword)}
                            >
                                {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle size={18} />}
                                Actualizar contraseña
                            </button>
                        </form>
                    </Card>
                )}

                {/* ── STEP 4: Success ── */}
                {step === 'success' && (
                    <Card isMobile={isMobile}>
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <CheckCircle size={36} color="#22c55e" />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.75rem' }}>¡Contraseña actualizada!</h1>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                                Ya puedes iniciar sesión con tu nueva contraseña.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                style={{ ...btnPrimary(false), width: '100%' }}
                            >
                                Ir al inicio de sesión
                            </button>
                        </div>
                    </Card>
                )}
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                input:focus { border-color: rgba(111,66,193,0.6) !important; outline: none; box-shadow: 0 0 0 3px rgba(111,66,193,0.12); }
            `}</style>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────
const ErrorBanner: React.FC<{ msg: string; onClose: () => void }> = ({ msg, onClose }) => (
    <div style={{
        padding: '0.875rem 1rem', borderRadius: '14px', marginBottom: '1.25rem',
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
        display: 'flex', alignItems: 'center', gap: '0.75rem'
    }}>
        <span style={{ flex: 1, fontSize: '0.88rem', color: '#f87171', fontWeight: '600' }}>{msg}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
            <X size={16} />
        </button>
    </div>
);

// ── Shared card wrapper ────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; isMobile: boolean }> = ({ children, isMobile }) => (
    <div style={{
        maxWidth: '460px', width: '100%',
        background: 'var(--color-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '32px',
        padding: isMobile ? '2rem' : '2.75rem',
        backdropFilter: 'blur(20px)'
    }}>
        {children}
    </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: '800',
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '0.5rem'
};

const inputSt: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
    padding: '0.9rem 1rem', color: 'white', outline: 'none',
    fontSize: '0.95rem', boxSizing: 'border-box', transition: 'all 0.2s'
};

const iconSt: React.CSSProperties = {
    position: 'absolute', left: '1rem', top: '50%',
    transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)'
};

const btnPrimary = (disabled: boolean): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
    padding: '1rem', borderRadius: '14px', border: 'none',
    background: 'var(--color-neon-purple)', color: 'white',
    fontWeight: '900', fontSize: '1rem', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1, transition: 'all 0.2s',
    boxShadow: disabled ? 'none' : '0 0 20px rgba(111,66,193,0.35)'
});
