import React from 'react';
import { Navbar } from '../components/Navbar';
import { motion } from 'framer-motion';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: '6rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: '8rem', maxWidth: '800px' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '3rem' }}>
                        Política de <span className="neon-text-teal">Privacidad</span>
                    </h1>

                    <div className="legal-content" style={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}>
                        <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
                            <i>Última actualización: 2 de marzo de 2026</i>
                        </p>

                        <section style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>1. Datos Recolectados</h2>
                            <p>Solo recolectamos los datos estrictamente necesarios para la operación:</p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
                                <li><b>Usuarios:</b> Correo electrónico, número de teléfono y nombre para la generación del ID único y envío de promociones.</li>
                                <li style={{ marginTop: '0.5rem' }}><b>Ubicación:</b> Se utiliza geolocalización en tiempo real únicamente para validar la presencia en el local al momento de otorgar monedas; esta ubicación no se almacena permanentemente.</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>2. Uso de Inteligencia Artificial</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <p>
                                    Nuestra IA utiliza el lenguaje natural para recomendar locales basándose en las etiquetas de "Vibes" y categorías públicas de los negocios.
                                </p>
                                <p>
                                    La IA no procesa información sensible de salud, orientación sexual, creencias religiosas ni datos financieros privados.
                                </p>
                                <p>
                                    El historial de "Vibes" del usuario se utiliza exclusivamente para mejorar la precisión de las recomendaciones personalizadas.
                                </p>
                            </div>
                        </section>

                        <section style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>3. Autorización de Contacto</h2>
                            <p>
                                Al registrarse, el usuario autoriza el envío de notificaciones sobre eventos, promociones y actualizaciones del saldo de su Parché Passport vía correo electrónico o mensaje de texto.
                                El usuario puede revocar este permiso en cualquier momento desde su perfil.
                            </p>
                        </section>

                        <div style={{ marginTop: '4rem', padding: '2rem', border: '1px solid rgba(0, 243, 255, 0.2)', background: 'rgba(0, 243, 255, 0.05)', borderRadius: '24px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                Valoramos tu privacidad por encima de todo.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
