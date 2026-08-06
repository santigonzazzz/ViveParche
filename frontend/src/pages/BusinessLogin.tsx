
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Store, Lock, Mail, ArrowRight, ShieldCheck,
    ChevronLeft, HelpCircle
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { businessApi } from '../services/businessApi';

export const BusinessLogin: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const queryParams = new URLSearchParams(window.location.search);
    const isRegistered = queryParams.get('registered') === 'true';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await businessApi.login(formData);

            navigate('/business');
            window.location.reload(); // Ensure navbar updates
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#030305', color: 'white', position: 'relative', overflowX: 'hidden' }}>
            {/* Background Glows */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(111, 66, 193, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(20, 184, 166, 0.05) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: 0 }} />

            <div style={{ position: 'relative', zIndex: 10 }}>
                <Navbar />

                <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '10rem', paddingBottom: '4rem' }}>

                    {isRegistered && (
                        <div style={successBannerStyle}>
                            <ShieldCheck size={20} />
                            <span>¡Cuenta creada con éxito! Por favor inicia sesión.</span>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '20px', marginBottom: '1.5rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                            <Store size={32} color="#eab308" />
                        </div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                            Portal de <span style={{ color: '#eab308' }}>Negocios</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>Acceso para dueños de locales y meseros de equipo.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={formContainerStyle}>
                        <div style={inputWrapperStyle}>
                            <label style={labelStyle}>Correo Electrónico</label>
                            <div style={inputContainerStyle}>
                                <Mail size={18} style={iconStyle} />
                                <input
                                    required
                                    type="email"
                                    placeholder="dueño@local.com o mesero@local.com"
                                    style={inputStyle}
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    onFocus={e => e.target.select()}
                                />
                            </div>
                        </div>

                        <div style={{ ...inputWrapperStyle, marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={labelStyle}>Contraseña</label>
                                <button type="button" style={ghostLinkStyle}>¿Olvidaste?</button>
                            </div>
                            <div style={inputContainerStyle}>
                                <Lock size={18} style={iconStyle} />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    style={inputStyle}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    onFocus={e => e.target.select()}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={buttonStyle}>
                            {loading ? 'Autenticando...' : 'Ingresar al Portal'}
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
                            ¿Eres nuevo aquí? <Link to="/business/register" style={{ color: '#eab308', fontWeight: '800', textDecoration: 'none' }}>Registra tu local</Link>
                        </p>
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                            <Link to="/login" style={{ ...ghostLinkStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ChevronLeft size={16} /> Ingreso Usuario
                            </Link>
                            <button type="button" style={{ ...ghostLinkStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <HelpCircle size={16} /> Soporte a Aliados
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Styles
const formContainerStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '32px',
    padding: '2.5rem',
    backdropFilter: 'blur(40px)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
};

const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
};

const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '100px',
    padding: '1rem 1.5rem 1rem 3.5rem',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s'
};

const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1.25rem',
    color: 'rgba(255,255,255,0.2)'
};

const buttonStyle: React.CSSProperties = {
    width: '100%',
    marginTop: '2.5rem',
    padding: '1.1rem',
    borderRadius: '100px',
    border: 'none',
    background: '#eab308',
    color: 'black',
    fontWeight: '900',
    fontSize: '1.05rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    boxShadow: '0 8px 25px rgba(234, 179, 8, 0.2)',
    transition: 'all 0.3s'
};

const ghostLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none'
};

const successBannerStyle: React.CSSProperties = {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: '16px',
    padding: '1rem',
    color: '#4ade80',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: '600'
};
