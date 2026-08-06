import React from 'react';
import { Navbar } from '../components/Navbar';
import { motion } from 'framer-motion';

export const TermsConditions: React.FC = () => {
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
                        Términos y <span className="neon-text-purple">Condiciones</span>
                    </h1>

                    <div className="legal-content" style={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}>
                        <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
                            <i>Última actualización: 2 de marzo de 2026</i>
                        </p>

                        <section style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>1. Naturaleza del Servicio</h2>
                            <p>
                                Parché es una plataforma tecnológica de intermediación y visualización de eventos y locales en Medellín.
                                <b>CloudMinds</b> actúa exclusivamente como un canal de comunicación y marketing, no siendo propietario,
                                organizador ni responsable de la calidad de los servicios o eventos publicados por terceros.
                            </p>
                        </section>

                        <section style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>2. Deslinde de Responsabilidad (Indemnidad)</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <p>
                                    <b>Gestión de Pagos:</b> Para los planes "Arranque","El Parche" y "VIP", el usuario realiza pagos directamente al establecimiento vía WhatsApp u otros medios externos.
                                    Parché no recibe, procesa ni garantiza dichos dineros y se deslinda de cualquier responsabilidad por fraudes o incumplimientos del establecimiento.
                                </p>
                                <p>
                                    <b>Cancelaciones:</b> La gestión de devoluciones por cancelación de eventos es responsabilidad exclusiva del local organizador.
                                </p>
                                <p>
                                    <b>Uso de Monedas y Sellos:</b> El sistema de Parché Monedas y Pasaportes es una herramienta de fidelización gestionada por el local.
                                    Parché no garantiza la disponibilidad de los premios (Perks) ni se hace responsable si un establecimiento decide no honrar los beneficios acumulados.
                                </p>
                            </div>
                        </section>

                        <section style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>3. Exención de Daños Técnicos</h2>
                            <p>CloudMinds no se hace responsable por:</p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
                                <li>Caídas temporales del sistema o fallos en el escaneo de QRs debido a mala conexión a internet.</li>
                                <li style={{ marginTop: '0.5rem' }}>Pérdida de datos por ataques cibernéticos externos que superen los estándares de seguridad implementados.</li>
                                <li style={{ marginTop: '0.5rem' }}>Errores en la geolocalización que impidan el registro de visitas.</li>
                            </ul>
                        </section>

                        <div style={{ marginTop: '4rem', padding: '2rem', border: '1px solid rgba(189, 0, 255, 0.2)', background: 'rgba(189, 0, 255, 0.05)', borderRadius: '24px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                Al usar Parché, aceptas estos términos en su totalidad.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
