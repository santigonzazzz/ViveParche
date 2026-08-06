import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
    return (
        <footer style={{
            marginTop: 'auto',
            padding: '4rem 2rem',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)'
        }}>
            <div className="container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2.5rem'
            }}>
                {/* Logo or Brand */}
                <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                    <span className="neon-text-purple">Parché</span> <span style={{ color: 'rgba(255,255,255,0.4)' }}>App</span>
                </div>

                {/* Main Links */}
                <nav style={{
                    display: 'flex',
                    gap: '3rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    <Link to="/about" style={linkStyle}>Sobre Nosotros</Link>
                    <Link to="/terms" style={linkStyle}>Términos y Condiciones</Link>
                    <Link to="/privacy" style={linkStyle}>Política de Privacidad</Link>
                    <Link to="/pricing" style={linkStyle}>Planes</Link>
                </nav>

                {/* Secondary Info */}
                <div style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.05em',
                    lineHeight: 1.8
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        Creado por <b>CloudMinds</b>
                    </div>
                    <div>© 2024 VIBEMAP AI TECHNOLOGIES. ALL RIGHTS RESERVED.</div>
                </div>
            </div>
        </footer>
    );
};

const linkStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'all 0.3s ease',
};
