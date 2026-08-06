import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ShieldCheck, ArrowRight, Loader2, RefreshCw, X } from 'lucide-react';
import { authService } from '../services/api';

export const VerifyOTP: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [email, setEmail] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const emailParam = params.get('email');
        const storedEmail = localStorage.getItem('pending_email');

        if (emailParam) {
            setEmail(emailParam);
        } else if (storedEmail) {
            setEmail(storedEmail);
        } else {
            navigate('/register');
        }
    }, [location, navigate]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleCodeInput = (idx: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        const newCode = [...code];
        newCode[idx] = val.slice(-1);
        setCode(newCode);
        if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[idx] && idx > 0) {
            codeRefs.current[idx - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            codeRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Ingresa el código completo de 6 dígitos.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // Retrieve password saved during registration for auto-login
            const pendingPassword = sessionStorage.getItem('pending_password');

            const params = new URLSearchParams(location.search);
            const role = params.get('role');

            const result = await authService.verify({
                email,
                code: fullCode,
                ...(pendingPassword ? { password: pendingPassword } : {})
            });

            // Clean up temporary credentials immediately
            localStorage.removeItem('pending_email');
            sessionStorage.removeItem('pending_password');

            setSuccess('¡Email verificado con éxito! Ingresando...');

            // If backend returned a session token, auto-login the user
            if (result?.access_token) {
                localStorage.setItem('access_token', result.access_token);
                localStorage.setItem('user', JSON.stringify(result.user));

                setTimeout(() => {
                    if (role === 'owner' || result?.user?.role === 'owner') {
                        navigate('/business/dashboard');
                    } else {
                        navigate('/');
                    }
                }, 1500);
            } else {
                // Fallback: no auto-login possible, redirect to login with helper message
                setTimeout(() => {
                    if (role === 'owner') {
                        navigate('/business/login?registered=true');
                    } else {
                        navigate('/login?verified=true');
                    }
                }, 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Código incorrecto. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        setError('');
        try {
            await authService.resendOtp(email);
            setResendCooldown(60);
            setSuccess('Código reenviado con éxito al correo.');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al reenviar el código.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white' }}>
            <Navbar />

            <div className="container" style={{
                paddingTop: isMobile ? '6rem' : '8rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: isMobile ? '2rem' : '3rem' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        background: 'rgba(45,212,191,0.1)',
                        border: '1px solid rgba(45,212,191,0.3)',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <ShieldCheck size={36} color="#2dd4bf" />
                    </div>
                    <h1 style={{ fontSize: isMobile ? '2.5rem' : '3rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                        Verifica tu Email
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                        Hemos enviado un código de 6 dígitos a <strong style={{ color: 'white' }}>{email}</strong>
                    </p>
                </div>

                <div className="card" style={{
                    maxWidth: '460px',
                    width: '100%',
                    padding: isMobile ? '2rem' : '2.75rem',
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '32px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}>
                    {error && <Alert type="error" msg={error} onClose={() => setError('')} />}
                    {success && <Alert type="success" msg={success} />}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '2.5rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: '900',
                                color: 'rgba(255,255,255,0.4)',
                                letterSpacing: '0.1em',
                                textAlign: 'center',
                                marginBottom: '1.5rem',
                                textTransform: 'uppercase'
                            }}>
                                Código de Verificación
                            </label>

                            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }} onPaste={handlePaste}>
                                {code.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { codeRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleCodeInput(i, e.target.value)}
                                        onKeyDown={e => handleKeyDown(i, e)}
                                        onFocus={e => e.target.select()}
                                        style={{
                                            width: isMobile ? '42px' : '52px',
                                            height: isMobile ? '56px' : '68px',
                                            textAlign: 'center',
                                            fontSize: '1.75rem',
                                            fontWeight: '900',
                                            background: digit ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.03)',
                                            border: `2px solid ${digit ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                            borderRadius: '16px',
                                            color: 'white',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.join('').length < 6}
                            style={{
                                width: '100%',
                                padding: '1.1rem',
                                borderRadius: '100px',
                                fontSize: '1.1rem',
                                fontWeight: '900',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                background: 'var(--color-neon-teal)',
                                color: 'var(--color-bg)',
                                border: 'none',
                                opacity: (loading || code.join('').length < 6) ? 0.6 : 1,
                                cursor: (loading || code.length < 6) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: '0 10px 20px rgba(45,212,191,0.2)'
                            }}
                        >
                            {loading ? <Loader2 className="spin" size={24} /> : <><ArrowRight size={22} /> Verificar y Continuar</>}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                            ¿No recibiste el código?
                        </p>
                        <button
                            onClick={handleResend}
                            disabled={resendCooldown > 0 || loading}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: resendCooldown > 0 ? 'rgba(255,255,255,0.2)' : 'var(--color-neon-teal)',
                                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                                fontWeight: '800',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                margin: '0 auto'
                            }}
                        >
                            <RefreshCw size={16} className={loading ? 'spin' : ''} />
                            {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                input:focus { border-color: #2dd4bf !important; box-shadow: 0 0 15px rgba(45,212,191,0.2) !important; }
            `}</style>
        </div>
    );
};

const Alert: React.FC<{ type: 'error' | 'success', msg: string, onClose?: () => void }> = ({ type, msg, onClose }) => (
    <div style={{
        padding: '1rem',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
        border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
        color: type === 'error' ? '#f87171' : '#4ade80',
        fontWeight: '600'
    }}>
        <span style={{ flex: 1 }}>{msg}</span>
        {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                <X size={16} />
            </button>
        )}
    </div>
);
