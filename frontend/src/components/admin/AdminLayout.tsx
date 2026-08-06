import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
    Users,
    Store,
    Calendar,
    Award,
    CreditCard,
    Menu,
    X,
    Search,
    LogOut,
    Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [user] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarOpen(true);
            else setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close sidebar on mobile when route changes
    useEffect(() => {
        if (isMobile) setIsSidebarOpen(false);
    }, [location.pathname, isMobile]);

    const sidebarWidth = '280px';

    const menuItems = [
        { id: 'users', path: '/gestion/users', label: 'Usuarios', icon: Users },
        { id: 'venues', path: '/gestion/venues', label: 'Establecimientos', icon: Store },
        { id: 'events', path: '/gestion/events', label: 'Eventos', icon: Calendar },
        { id: 'perks', path: '/gestion/perks', label: 'Beneficios (Perks)', icon: Award },
        { id: 'bills', path: '/gestion/bills', label: 'Facturación / Bills', icon: CreditCard },
    ];

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <div style={{
            background: '#050505',
            minHeight: '100vh',
            color: 'white',
            display: 'flex',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <AnimatePresence>
                {isMobile && isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 999
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: sidebarWidth,
                background: '#0a0a0c',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                zIndex: 1000,
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isMobile && isSidebarOpen ? '20px 0 50px rgba(0,0,0,0.5)' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'var(--color-neon-purple)', padding: '8px', borderRadius: '10px' }}>
                            <Shield size={20} color="white" />
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em' }}>ADMIN<span style={{ color: 'var(--color-neon-purple)' }}> PANEL</span></span>
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {menuItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem 1.25rem',
                                borderRadius: '16px',
                                background: isActive(item.path) ? 'rgba(111, 66, 193, 0.1)' : 'transparent',
                                color: isActive(item.path) ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.4)',
                                textDecoration: 'none',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s',
                                border: isActive(item.path) ? '1px solid rgba(111, 66, 193, 0.2)' : '1px solid transparent'
                            }}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem 1.25rem',
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: '#ff4444',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        <LogOut size={20} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div style={{
                flex: 1,
                marginLeft: isMobile ? 0 : sidebarWidth,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0
            }}>
                <header style={{
                    height: '80px',
                    padding: isMobile ? '0 1.5rem' : '0 2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(5, 5, 5, 0.8)',
                    backdropFilter: 'blur(20px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isMobile && (
                            <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                                <Menu size={24} />
                            </button>
                        )}
                        <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '800' }}>
                            {menuItems.find(i => isActive(i.path))?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', width: '300px', display: (isMobile || window.innerWidth < 1200) ? 'none' : 'block' }}>
                            <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                placeholder="Buscar globalmente..."
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '100px',
                                    padding: '0.6rem 1rem 0.6rem 2.5rem',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.9rem' }}>
                            {user.full_name?.[0] || 'A'}
                        </div>
                    </div>
                </header>

                <main style={{ padding: isMobile ? '1.5rem' : '2.5rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
