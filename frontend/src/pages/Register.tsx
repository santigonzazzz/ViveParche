import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { User, Mail, Lock, Eye } from 'lucide-react';
import { authService } from '../services/api';

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: ''
    });
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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

        // Strict Validation: No numbers in name
        if (/\d/.test(formData.full_name)) {
            setError("Names must not contain numbers.");
            return;
        }

        if (!acceptedTerms) {
            setError("Debes aceptar los Términos y Condiciones.");
            return;
        }

        setLoading(true);
        setError('');
        try {
            await authService.register(formData);
            // Store email and password temporarily for auto-login after OTP verification
            localStorage.setItem('pending_email', formData.email);
            sessionStorage.setItem('pending_password', formData.password);
            navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail[0].msg || 'Validation failed.');
            } else {
                setError(detail || 'Registration failed.');
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
                    <h1 style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: '900', marginBottom: '1rem', lineHeight: 1.1 }}>
                        Join the <span style={{ background: 'linear-gradient(45deg, var(--color-neon-purple), var(--color-neon-teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vibe</span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '1rem' : '1.1rem', maxWidth: '400px' }}>Discover and manage local events with AI-powered insights.</p>
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
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.4rem',
                        borderRadius: '100px',
                        display: 'flex',
                        marginBottom: '2.5rem',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '100px',
                                border: 'none',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.5)',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                borderRadius: '100px',
                                border: 'none',
                                background: 'var(--color-neon-purple)',
                                color: 'white',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            Create Account
                        </button>
                    </div>

                    {error && (
                        <div style={{ color: '#ff4444', background: 'rgba(255,68,68,0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.75rem' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '1.1rem', color: 'rgba(255,255,255,0.3)' }} />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                    placeholder="Enter your name"
                                    onFocus={e => e.target.select()}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1.5rem 1rem 3.5rem', borderRadius: '16px', color: 'white', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.75rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '1.1rem', color: 'rgba(255,255,255,0.3)' }} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    placeholder="name@example.com"
                                    onFocus={e => e.target.select()}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1.5rem 1rem 3.5rem', borderRadius: '16px', color: 'white', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.75rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '1.1rem', color: 'rgba(255,255,255,0.3)' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    placeholder="••••••••"
                                    onFocus={e => e.target.select()}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 3.5rem 1rem 3.5rem', borderRadius: '16px', color: 'white', outline: 'none' }}
                                />
                                <Eye
                                    size={18}
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '1.25rem', top: '1.1rem', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="terms"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                            />
                            <label htmlFor="terms" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', lineHeight: 1.4 }}>
                                Acepto los <Link to="/terms" style={{ color: 'var(--color-neon-purple)', textDecoration: 'none' }}>Términos y Condiciones</Link> y la <Link to="/privacy" style={{ color: 'var(--color-neon-teal)', textDecoration: 'none' }}>Política de Privacidad</Link>.
                            </label>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary" style={{
                            marginTop: '1rem',
                            padding: '1.1rem',
                            borderRadius: '100px',
                            fontSize: '1rem',
                            fontWeight: '800',
                            background: 'var(--color-neon-purple)',
                            border: 'none',
                            boxShadow: 'var(--shadow-neon-purple)',
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0', opacity: 0.3 }}>
                        <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.1em' }}>OR CONTINUE WITH</span>
                        <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button className="social-btn-small" onClick={handleGoogleLogin} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '16px' }} />
                            Continue with Google
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--color-neon-purple)', fontWeight: '700', textDecoration: 'none' }}>Log in</Link>
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
                        <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
                        <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
                        <Link to="/about" style={{ color: 'inherit', textDecoration: 'none' }}>ABOUT</Link>
                    </div>
                    <span>© 2024 VIBEMAP AI TECHNOLOGIES. ALL RIGHTS RESERVED.</span>
                </div>
            </div>

            <style>{`
                .social-btn-small {
                    padding: 0.9rem;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    color: white;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }
                .social-btn-small:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.2);
                }
            `}</style>
        </div>
    );
};
