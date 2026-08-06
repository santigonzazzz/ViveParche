import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Zap } from 'lucide-react';
import { authService } from '../services/api';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const queryParams = new URLSearchParams(window.location.search);
    const isExpired = queryParams.get('expired') === 'true';
    const isVerified = queryParams.get('verified') === 'true';

    const [error, setError] = useState(isExpired ? 'Tu sesión ha expirado. Por favor ingresa de nuevo. (Your session has expired. Please sign in again.)' : '');
    const [success, setSuccess] = useState(isVerified ? '¡Email verificado con éxito! Ya puedes ingresar. (Email verified successfully! You can now sign in.)' : '');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const redirectUrl = `${window.location.origin}/auth/callback`;
            const data = await authService.getGoogleAuthUrl(redirectUrl);
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError('Error connecting to Google.');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await authService.login(formData);
            if (res.verification_required) {
                localStorage.setItem('pending_email', formData.email);
                navigate(`/verify-otp?email=${formData.email}`);
            } else {
                navigate('/');
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail[0].msg || 'Validation failed.');
            } else {
                setError(detail || 'Login failed. Check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: isMobile ? '6rem' : '8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>

                <div style={{ textAlign: 'center', marginBottom: isMobile ? '2rem' : '3rem' }}>
                    <h1 style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: '900', marginBottom: '1rem', lineHeight: 1.1 }}>Step into the Vibe</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '1.1rem' : '1.25rem' }}>Your city, filtered by your energy.</p>
                </div>

                <div className="card" style={{
                    maxWidth: '480px',
                    width: '100%',
                    padding: isMobile ? '1.5rem' : '2.5rem',
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '32px',
                    backdropFilter: 'blur(20px)'
                }}>
                    {/* Tab Switcher */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.4rem',
                        borderRadius: '100px',
                        display: 'flex',
                        marginBottom: '2.5rem',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <button
                            onClick={() => setActiveTab('signin')}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '100px',
                                border: 'none',
                                background: activeTab === 'signin' ? 'var(--color-neon-purple)' : 'transparent',
                                color: 'white',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '100px',
                                border: 'none',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.5)',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* Social Logins */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <button className="social-btn" onClick={handleGoogleLogin} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px' }} />
                            Continue with Google
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', opacity: 0.3 }}>
                        <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em' }}>OR EMAIL LOGIN</span>
                        <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                    </div>

                    {error && (
                        <div style={{ color: '#ff4444', background: 'rgba(255,68,68,0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                            {success}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                placeholder="name@vibe.com"
                                onFocus={e => e.target.select()}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem 1.5rem', borderRadius: '16px', color: 'white', outline: 'none' }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>PASSWORD</label>
                                <Link to="/forgot-password" style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--color-neon-purple)', textDecoration: 'none' }}>¿OLVIDASTE?</Link>
                            </div>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                placeholder="••••••••"
                                onFocus={e => e.target.select()}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem 1.5rem', borderRadius: '16px', color: 'white', outline: 'none' }}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary" style={{
                            marginTop: '1.5rem',
                            padding: '1.25rem',
                            borderRadius: '100px',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            background: 'var(--color-neon-purple)',
                            border: 'none',
                            boxShadow: 'var(--shadow-neon-purple)',
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}>
                            {loading ? 'Entering...' : 'Enter the Vibe'} <Zap size={18} />
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                        New to VibeMap? <Link to="/register" style={{ color: 'white', fontWeight: '700', textDecoration: 'none' }}>Create your account</Link>
                    </div>
                </div>

                {/* Footer Links */}
                <div style={{
                    marginTop: '5rem',
                    paddingBottom: '3rem',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.1em'
                }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <Link to="#" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
                        <Link to="#" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
                        <Link to="#" style={{ color: 'inherit', textDecoration: 'none' }}>SUPPORT</Link>
                    </div>
                    <span style={{ textAlign: 'center' }}>© 2024 VIBEMAP AI TECHNOLOGIES. ALL RIGHTS RESERVED.</span>
                </div>
            </div>

            <style>{`
                .social-btn {
                    width: 100%;
                    padding: 1.1rem;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    color: white;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .social-btn:hover {
                    background: rgba(255,255,255,0.08);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};
