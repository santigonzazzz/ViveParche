import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User, Compass } from 'lucide-react';

export const MobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: 'home', icon: Home, label: 'Inicio', path: '/' },
        { id: 'explore', icon: Compass, label: 'Descubrir', path: '/?tab=discovery' },
        { id: 'search', icon: Search, label: 'Buscar', path: '/?tab=search' },
        { id: 'passport', icon: Heart, label: 'Pasaporte', path: '/passport' },
        { id: 'profile', icon: User, label: 'Perfil', path: '/settings' },
    ];

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/' && !location.search) return true;
        if (path !== '/' && (location.pathname + location.search).startsWith(path)) return true;
        return false;
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '1rem',
            right: '1rem',
            height: '65px',
            background: 'rgba(15, 15, 18, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 0.5rem',
            zIndex: 1000,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}>
            {tabs.map((tab) => {
                const active = isActive(tab.path);
                return (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.path)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: active ? 'var(--color-neon-purple)' : 'rgba(255, 255, 255, 0.4)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            padding: '8px',
                            flex: 1
                        }}
                    >
                        <tab.icon
                            size={22}
                            style={{
                                filter: active ? 'drop-shadow(0 0 8px rgba(189, 0, 255, 0.5))' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        />
                        <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {tab.label}
                        </span>

                        {active && (
                            <div style={{
                                position: 'absolute',
                                bottom: '6px',
                                width: '4px',
                                height: '4px',
                                background: 'var(--color-neon-purple)',
                                borderRadius: '50%',
                                boxShadow: '0 0 10px var(--color-neon-purple)'
                            }} />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
