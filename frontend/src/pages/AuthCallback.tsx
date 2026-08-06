import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { authService } from '../services/api';

export const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Autenticando...');
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase returns auth tokens in the URL hash
                const hash = window.location.hash;
                if (!hash) {
                    throw new Error('No se encontraron tokens de autenticación.');
                }

                const params = new URLSearchParams(hash.substring(1)); // remove #
                const accessToken = params.get('access_token');
                
                if (!accessToken) {
                    const errorDesc = params.get('error_description');
                    throw new Error(errorDesc || 'Error en la autenticación con Google.');
                }

                // Guardar token temporalmente
                localStorage.setItem('access_token', accessToken);

                // Obtener perfil de usuario desde el backend y asegurar sincronización
                setStatus('Sincronizando perfil...');
                const userData = await authService.syncProfile();
                
                // Guardar usuario y redirigir
                localStorage.setItem('user', JSON.stringify(userData));
                navigate('/');
                
            } catch (err: any) {
                console.error("Auth Callback Error:", err);
                setError(err.message || 'Ocurrió un error en la autenticación.');
                localStorage.removeItem('access_token');
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '400px', background: 'var(--color-surface)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '48px', opacity: 0.8 }} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>Verificación en proceso</h2>
                    
                    {error ? (
                        <div style={{ color: '#ff4444', marginTop: '1rem', background: 'rgba(255,68,68,0.1)', padding: '1rem', borderRadius: '12px' }}>
                            {error}
                            <button 
                                onClick={() => navigate('/login')}
                                style={{ display: 'block', width: '100%', marginTop: '1rem', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer' }}>
                                Volver al Login
                            </button>
                        </div>
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-neon-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p>{status}</p>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
