import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, BarChart3, Settings, Search, Bell, Store, Brain, Users, CreditCard, Menu, X, ChevronDown, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { settingsService } from '../../services/api';
import { businessApi } from '../../services/businessApi';
import { Lock } from 'lucide-react';

export const BusinessLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isBellOpen, setIsBellOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
    const [venueProfile, setVenueProfile] = useState<any>(null);

    const searchParams = new URLSearchParams(location.search);
    const venueId = searchParams.get('venue_id');

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarOpen(true);
            else setIsSidebarOpen(false); // Close by default on mobile resize
        };
        const handleStorageChange = () => {
            setUser(JSON.parse(localStorage.getItem('user') || '{}'));
        };
        const fetchNotifications = async () => {
            try {
                const data = await settingsService.getNotifications(venueId || undefined);
                setNotifications(data);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };
        const fetchVenueProfile = async () => {
            try {
                const data = await businessApi.getVenueProfile(venueId || undefined);
                setVenueProfile(data);
            } catch (err) {
                console.error("Failed to fetch venue profile for layout", err);
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('storage', handleStorageChange);
        fetchNotifications();
        fetchVenueProfile();

        // Refresh notifications every minute
        const interval = setInterval(fetchNotifications, 60000);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [venueId]);

    const markAsRead = async (id: string) => {
        try {
            await settingsService.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        navigate('/');
    };

    // Close sidebar when route changes on mobile
    React.useEffect(() => {
        if (isMobile) setIsSidebarOpen(false);
    }, [location.pathname, isMobile]);

    const isActive = (path: string) => {
        if (path === '/business' && location.pathname === '/business') return true;
        if (path !== '/business' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const isOwner = user.role === 'owner';
    const isAdmin = user.role === 'admin';
    const isVIP = user.role === 'VIP';
    const isFree = venueProfile?.subscription_tier === 'FREE' && !isAdmin && !isVIP;

    const navItems = [
        { id: 'dashboard', path: '/business', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'ai', path: '/business/ai-marketing', label: 'Co-Piloto IA', icon: Brain },
        { id: 'analytics', path: '/business/analytics', label: 'Analíticas', icon: BarChart3, locked: isFree },
        { id: 'messages', path: '/business/chat', label: 'Mensajes', icon: MessageSquare },
        { id: 'loyalty', path: '/business/loyalty', label: 'Fidelización Parché', icon: Award, locked: isFree },
        { id: 'events', path: '/business/events', label: 'Parches', icon: Store },
        ...(isOwner ? [
            { id: 'team', path: '/business/team', label: 'Equipo', icon: Users, locked: isFree },
            { id: 'billing', path: '/business/subscription', label: 'Facturación', icon: CreditCard },
            { id: 'settings', path: '/business/settings', label: 'Perfil', icon: Settings }
        ] : [])
    ];

    const handleNavigate = (path: string, locked?: boolean) => {
        if (locked) {
            const upgradePath = `/business/subscription?showUpgrade=true${venueId ? `&venue_id=${venueId}` : ''}`;
            navigate(upgradePath);
            return;
        }

        if (venueId) {
            navigate(`${path}?venue_id=${venueId}`);
        } else {
            navigate(path);
        }
    };

    const sidebarWidth = '280px';

    return (
        <div style={{
            background: 'linear-gradient(180deg, #050505 0%, #0a0a0c 100%)',
            minHeight: '100vh',
            color: 'white',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex'
        }}>
            {/* Overlay for Mobile */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 90,
                        transition: 'opacity 0.3s'
                    }}
                />
            )}

            {/* Sidebar / Drawer */}
            <aside style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: sidebarWidth,
                borderRight: '1px solid rgba(255,255,255,0.05)',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                background: '#050505',
                transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isMobile && isSidebarOpen ? '20px 0 50px rgba(0,0,0,0.5)' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--color-neon-purple) 0%, var(--color-neon-blue) 100%)', borderRadius: '8px' }} />
                        <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em' }}>EVENTOS<span style={{ color: 'var(--color-neon-purple)' }}>.AI</span></span>
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    )}
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.path, item.locked)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.85rem 1.25rem',
                                borderRadius: '16px',
                                background: isActive(item.path) ? 'var(--color-neon-purple)' : 'transparent',
                                border: 'none',
                                color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.4)',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isActive(item.path) ? '0 8px 24px rgba(111, 66, 193, 0.25)' : 'none',
                                position: 'relative',
                                opacity: item.locked ? 0.6 : 1
                            }}
                        >
                            <item.icon size={20} />
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {item.locked && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Lock size={12} style={{ opacity: 0.5 }} /> {/* Using a Lock icon */}
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.5rem' }}>Nivel Vibe Pro</h4>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Alcanzando 15% más parceros</p>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ width: '75%', height: '100%', background: 'var(--color-neon-teal)' }} />
                    </div>
                </div>
            </aside>

            {/* Main Content Wrap */}
            <div style={{
                flex: 1,
                marginLeft: isMobile ? 0 : sidebarWidth,
                transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0
            }}>
                {/* Header */}
                <header style={{
                    height: '80px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isMobile ? '0 1.25rem' : '0 2.5rem',
                    background: 'rgba(5, 5, 5, 0.8)',
                    backdropFilter: 'blur(20px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
                            >
                                <Menu size={24} />
                            </button>
                        )}

                        {!isMobile && (
                            <div style={{ position: 'relative', width: '350px' }}>
                                <Search size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    placeholder="Buscar parches, invitados..."
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '100px',
                                        padding: '0.7rem 1rem 0.7rem 2.75rem',
                                        color: 'white',
                                        outline: 'none',
                                        fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem' }}>
                        {isMobile && <Search size={20} color="rgba(255,255,255,0.4)" width={20} />}
                        <div style={{ position: 'relative' }}>
                            <div onClick={() => setIsBellOpen(!isBellOpen)} style={{ position: 'relative', cursor: 'pointer', padding: '8px' }}>
                                <Bell size={20} color="white" />
                                {notifications.some(n => !n.read) && (
                                    <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--color-neon-purple)', borderRadius: '50%', border: '2px solid #050505' }} />
                                )}
                            </div>

                            <AnimatePresence>
                                {isBellOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        style={{
                                            position: 'absolute',
                                            top: '120%',
                                            right: 0,
                                            width: '320px',
                                            background: '#0a0a0c',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '20px',
                                            padding: '1rem',
                                            boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                                            zIndex: 1200
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>Notificaciones</span>
                                            {notifications.length > 0 && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Reciente</span>}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                                            {notifications.length > 0 ? (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => { if (!n.read) markAsRead(n.id); }}
                                                        style={{
                                                            padding: '0.85rem',
                                                            borderRadius: '12px',
                                                            background: n.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        className="notification-item"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: n.read ? 'rgba(255,255,255,0.6)' : 'white' }}>{n.title}</div>
                                                            {!n.read && <div style={{ width: '6px', height: '6px', background: 'var(--color-neon-purple)', borderRadius: '50%' }} />}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>{n.message}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.5rem' }}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                                                    ¡Todo al día! ✨
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
                            >
                                {!isMobile && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{user.full_name || 'Dueño'}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{user.role === 'owner' ? 'Dueño del Parche' : 'Mesero'}</div>
                                    </div>
                                )}
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img src={user.image_url || "/assets/placeholder_event.jpg"} alt="Venue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <ChevronDown size={16} color="rgba(255,255,255,0.4)" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </div>

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
                                            width: '200px',
                                            background: '#0a0a0c',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            padding: '0.5rem',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            zIndex: 1200
                                        }}
                                    >
                                        <div style={{ padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Detalles de Cuenta
                                        </div>
                                        {isOwner && (
                                            <button
                                                onClick={() => { handleNavigate('/business/settings'); setIsProfileOpen(false); }}
                                                className="dropdown-item"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '0.75rem 1rem',
                                                    color: 'rgba(255,255,255,0.7)',
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
                                            >
                                                <Settings size={16} /> Configuración del Negocio
                                            </button>
                                        )}
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                        <button
                                            onClick={handleLogout}
                                            className="dropdown-item-logout"
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
                                        >
                                            <X size={16} /> Cerrar Sesión
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <style>{`
                    .dropdown-item:hover {
                        background: rgba(255, 255, 255, 0.05);
                        color: white!important;
                    }
                    .dropdown-item-logout:hover {
                        background: rgba(255, 68, 68, 0.1);
                    }
                    .notification-item:hover {
                        background: rgba(255, 255, 255, 0.05)!important;
                    }
                `}</style>

                {/* Main Content */}
                <main style={{
                    padding: isMobile ? '1.5rem 1.25rem' : '2.5rem',
                    maxWidth: '1600px',
                    margin: '0 auto',
                    width: '100%'
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
