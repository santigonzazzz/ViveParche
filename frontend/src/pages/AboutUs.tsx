import React from 'react';
import { Navbar } from '../components/Navbar';
import { motion } from 'framer-motion';
import { Shield, Zap, Sparkles, Building2 } from 'lucide-react';

export const AboutUs: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: '4rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: '8rem', maxWidth: '900px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--color-neon-purple)' }}>
                        <Sparkles size={24} />
                        <span style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.9rem', textTransform: 'uppercase' }}>Descubre la Historia</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, marginBottom: '2rem', lineHeight: 1.1 }}>
                        Sobre <span className="neon-text-purple">Nosotros</span>
                    </h1>

                    <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', padding: '3rem', marginBottom: '3rem', backdropFilter: 'blur(20px)' }}>
                        <p style={{ fontSize: '1.2rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>
                            Parché nació como una respuesta a la necesidad de Medellín y Colombia de conectar su vibrante cultura con la tecnología. Somos la plataforma definitiva para encontrar el parche perfecto, impulsada por inteligencia artificial.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ background: 'rgba(0, 243, 255, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <Building2 color="var(--color-neon-teal)" size={24} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>Desarrollado por</h3>
                                <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                    <b>CloudMinds</b><br />
                                    Innovación y Desarrollo Tecnológico
                                </p>
                            </div>
                        </div>
                    </div>

                    <section style={{ marginTop: '4rem' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 800 }}>Nuestra Visión</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            {[
                                { icon: <Zap size={20} />, title: 'Inmediatez', text: 'Encuentra qué hacer en segundos.' },
                                { icon: <Shield size={20} />, title: 'Confianza', text: 'Locales verificados.' },
                                { icon: <Sparkles size={20} />, title: 'IA Viva', text: 'Recomendaciones que entienden tu vibra.' }
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                                    <div style={{ color: 'var(--color-neon-purple)', marginBottom: '1rem' }}>{item.icon}</div>
                                    <h4 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>{item.title}</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </motion.div>
            </div>
        </div>
    );
};
