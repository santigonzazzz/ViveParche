import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { authService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [systemConfig, setSystemConfig] = useState<any>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) setIsMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const refreshUser = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser && storedUser !== 'undefined') {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);

                    if (['owner', 'worker', 'manager'].includes(parsedUser.role)) {
                        const currentUser = await authService.getMe();
                        if (currentUser.role !== parsedUser.role) {
                            const newUser = { ...parsedUser, role: currentUser.role };
                            setUser(newUser);
                            localStorage.setItem('user', JSON.stringify(newUser));
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to refresh user from storage/API", err);
            }
        };

        refreshUser();
    }, []);

    useEffect(() => {
        if (user) {
            authService.getSystemConfig()
                .then(config => setSystemConfig(config))
                .catch(() => setSystemConfig(null));
        } else {
            setSystemConfig(null);
        }
    }, [user]);

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setIsMenuOpen(false);
        navigate('/');
    };

    return (
        <>
            <nav style={{
                padding: isMobile ? '1rem 1.5rem' : '1.25rem 4rem',
                backgroundColor: 'rgba(3, 3, 5, 0.8)',
                backdropFilter: 'blur(20px)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1100,
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'white' }}>
                    <img
                        src="/logo.png"
                        alt="Parché AI Logo"
                        style={{
                            height: isMobile ? '45px' : '65px',
                            width: 'auto',
                            objectFit: 'contain',
                            filter: 'brightness(1.5) drop-shadow(0 0 15px rgba(189, 0, 255, 0.6)) contrast(1.1)'
                        }}
                    />
                    {!isMobile && (
                        <span style={{ fontSize: '1.5rem', fontWeight: '950', letterSpacing: '-0.04em' }}>
                            Parché <span style={{ color: 'var(--color-neon-teal)' }}>AI</span>
                        </span>
                    )}
                </Link>

                {isMobile ? (
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}
                    >
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                        <Link to="/" className="nav-link">Descubrir</Link>
                        {!user && <Link to="/business/register" className="nav-link" style={{ color: 'var(--color-neon-teal)', fontWeight: '700' }}>¿Tienes un Negocio?</Link>}
                        {user && <Link to="/passport" className="nav-link">Passport</Link>}
                        {user && <Link to="/marketplace" className="nav-link" style={{ color: 'var(--color-neon-purple)', fontWeight: '700' }}>Gastar monedas</Link>}
                        {user && ['owner', 'worker'].includes(user?.role) && <Link to="/business" className="nav-link" style={{ color: 'var(--color-neon-teal)', fontWeight: '700' }}>Dashboard</Link>}
                        <Link to="/pricing" className="nav-link">Precios</Link>
                        {systemConfig?.access_granted && <Link to={systemConfig.dashboard_route} className="nav-link" style={{ color: '#f59e0b', fontWeight: '800' }}>{systemConfig.nav_label}</Link>}
                        {user && <Link to="/settings" className="nav-link">Settings</Link>}

                        {user ? (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '0.4rem 1rem 0.4rem 0.6rem',
                                        borderRadius: '100px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'var(--color-neon-purple)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={14} color="white" />
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.full_name?.split(' ')[0] || 'User'}</span>
                                </button>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            style={{
                                                position: 'absolute',
                                                top: '120%',
                                                right: 0,
                                                width: '180px',
                                                background: '#0a0a0c',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '16px',
                                                padding: '0.5rem',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                zIndex: 1200
                                            }}
                                        >
                                            <Link
                                                to="/settings"
                                                onClick={() => setIsProfileOpen(false)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '0.75rem 1rem',
                                                    color: 'rgba(255,255,255,0.7)',
                                                    textDecoration: 'none',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    borderRadius: '10px',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="dropdown-item"
                                            >
                                                Configuración
                                            </Link>
                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                            <button
                                                onClick={handleLogout}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '0.75rem 1rem',
                                                    color: '#ff4444',
                                                    background: 'none',
                                                    border: 'none',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="dropdown-item-logout"
                                            >
                                                Cerrar Sesión
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/register')}
                                className="btn-primary"
                                style={{
                                    padding: '0.6rem 2rem',
                                    borderRadius: '100px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    background: 'var(--color-neon-purple)',
                                    border: 'none',
                                    boxShadow: 'var(--shadow-neon-purple)',
                                    cursor: 'pointer'
                                }}
                            >
                                Regístrate
                            </button>
                        )}
                    </div>
                )}
            </nav>

            <AnimatePresence>
                {isMobile && isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '4rem',
                            left: 0,
                            right: 0,
                            background: 'rgba(15, 15, 18, 0.98)',
                            backdropFilter: 'blur(30px)',
                            padding: '2rem',
                            zIndex: 1050,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        <Link to="/" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', textDecoration: 'none' }}>Descubrir</Link>
                        {!user && <Link to="/business/register" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-neon-teal)', textDecoration: 'none' }}>¿Tienes un Negocio?</Link>}
                        {user && <Link to="/passport" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', textDecoration: 'none' }}>Passport</Link>}
                        {user && <Link to="/marketplace" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-neon-purple)', textDecoration: 'none' }}>Gastar monedas</Link>}
                        {user && ['owner', 'worker'].includes(user?.role) && <Link to="/business" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-neon-teal)', textDecoration: 'none' }}>Dashboard</Link>}
                        <Link to="/pricing" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', textDecoration: 'none' }}>Precios</Link>
                        {systemConfig?.access_granted && <Link to={systemConfig.dashboard_route} onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-neon-purple)', textDecoration: 'none' }}>{systemConfig.nav_label}</Link>}
                        {user && <Link to="/settings" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', textDecoration: 'none' }}>Configuración</Link>}

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

                        {user ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <User size={20} color="var(--color-neon-purple)" />
                                    <span style={{ fontWeight: '800' }}>{user.full_name}</span>
                                </div>
                                <button onClick={handleLogout} style={{ background: 'rgba(255,68,68,0.1)', border: 'none', color: '#ff4444', padding: '0.6rem 1.2rem', borderRadius: '100px', fontWeight: '800' }}>Cerrar Sesión</button>
                            </div>
                        ) : (
                            <button onClick={() => { setIsMenuOpen(false); navigate('/register'); }} className="btn-primary" style={{ padding: '1.2rem', borderRadius: '100px', fontWeight: '800', border: 'none', background: 'var(--color-neon-purple)', color: 'white' }}>Regístrate</button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .nav-link {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.7);
                    text-decoration: none;
                    transition: color 0.3s;
                }
                .nav-link:hover {
                    color: white;
                }
                .dropdown-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: white!important;
                }
                .dropdown-item-logout:hover {
                    background: rgba(255, 68, 68, 0.1);
                }
            `}</style>
        </>
    );
};

export default Navbar;
