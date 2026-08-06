
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Store, Image as ImageIcon, Sparkles, MapPin,
    ArrowRight, ChevronLeft, Lock, Mail, User,
    Music, Coffee, Utensils, GlassWater, PartyPopper
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { businessApi } from '../services/businessApi';
import { municipalityService } from '../services/api';

const VIBE_OPTIONS = [
    { label: 'Techno', icon: Music },
    { label: 'Relajado', icon: Coffee },
    { label: 'Electrónica', icon: Sparkles },
    { label: 'Cocteles', icon: GlassWater },
    { label: 'Comida', icon: Utensils },
    { label: 'Rumba', icon: PartyPopper },
];

export const BusinessRegister: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        store_name: '',
        whatsapp_number: '',
        address: '',
        municipality_id: '',
        description: '',
        image_url: ''
    });

    React.useEffect(() => {
        const fetchMunicipalities = async () => {
            try {
                const data = await municipalityService.getAll();
                setMunicipalities(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to fetch municipalities:', err);
            }
        };
        fetchMunicipalities();
    }, []);

    const toggleVibe = (vibe: string) => {
        setSelectedVibes(prev =>
            prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
        );
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                alert('Solo se permiten imágenes JPG y PNG.');
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!acceptedTerms) {
            alert("Debes aceptar los Términos y Condiciones para continuar.");
            return;
        }

        setLoading(true);
        try {
            const formDataPayload = new FormData();

            // Append basic fields
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'municipality_id' && (value === '' || value === 'None')) {
                    // Skip or leave empty
                } else if (value !== undefined && value !== null) {
                    formDataPayload.append(key, value as string);
                }
            });

            // Append complex fields
            formDataPayload.set('vibes', JSON.stringify(selectedVibes));

            // Append file if exists
            if (logoFile) {
                formDataPayload.append('logo', logoFile);
            }

            await businessApi.registerBusiness(formDataPayload);
            // Store password temporarily for auto-login after OTP verification
            sessionStorage.setItem('pending_password', formData.password);
            navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&role=owner`);
        } catch (err: any) {
            console.error('Registration Error:', err.response?.data || err);
            const detail = err.response?.data?.detail;
            let errorMsg = 'Error en el registro';

            if (Array.isArray(detail)) {
                errorMsg = detail.map((d: any) => {
                    const field = d.loc && d.loc.length > 0 ? d.loc[d.loc.length - 1] : 'unknown';
                    return `${field}: ${d.msg}`;
                }).join('\n');
            } else if (typeof detail === 'string') {
                errorMsg = detail;
            } else if (err.message) {
                errorMsg = err.message;
            }

            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#030305', color: 'white', position: 'relative', overflowX: 'hidden' }}>
            {/* Background Glows */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(111, 66, 193, 0.15) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: '0%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(20, 184, 166, 0.1) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: 0 }} />

            <div style={{ position: 'relative', zIndex: 10 }}>
                <Navbar />

                <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '8rem', paddingBottom: '4rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(111, 66, 193, 0.1)', borderRadius: '20px', marginBottom: '1.5rem', border: '1px solid rgba(111, 66, 193, 0.2)' }}>
                            <Store size={32} color="var(--color-neon-purple)" />
                        </div>
                        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
                            Registra tu <span style={{ background: 'linear-gradient(45deg, var(--color-neon-purple), var(--color-neon-teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Local</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem' }}>Únete al mapa de los parches más chimba de la ciudad.</p>
                    </div>

                    {/* Stepper */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{
                                width: s === step ? '40px' : '10px',
                                height: '10px',
                                background: s === step ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} style={formContainerStyle}>
                        {step === 1 && (
                            <div className="fade-in">
                                <h2 style={stepTitleStyle}>Cuenta del Dueño</h2>
                                <p style={stepSubStyle}>Crea tus credenciales para administrar tu negocio.</p>

                                <div style={gridStyle}>
                                    <div style={inputWrapperStyle}>
                                        <label style={labelStyle}>Nombre Completo</label>
                                        <div style={inputContainerStyle}>
                                            <User size={18} style={iconStyle} />
                                            <input
                                                required
                                                placeholder="John Doe"
                                                style={inputStyle}
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                onFocus={e => e.target.select()}
                                            />
                                        </div>
                                    </div>
                                    <div style={inputWrapperStyle}>
                                        <label style={labelStyle}>Correo del Negocio</label>
                                        <div style={inputContainerStyle}>
                                            <Mail size={18} style={iconStyle} />
                                            <input
                                                required
                                                type="email"
                                                placeholder="contacto@tulocal.com"
                                                style={inputStyle}
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                onFocus={e => e.target.select()}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ ...inputWrapperStyle, gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Contraseña</label>
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
                                </div>
                                <button type="button" onClick={nextStep} style={buttonStyle}>
                                    Siguiente <ArrowRight size={18} />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="fade-in">
                                <h2 style={stepTitleStyle}>Perfil del Local</h2>
                                <p style={stepSubStyle}>Información básica para empezar.</p>

                                <div style={gridStyle}>
                                    <div style={{ ...inputWrapperStyle, gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Nombre del Local / Negocio</label>
                                        <div style={inputContainerStyle}>
                                            <Store size={18} style={iconStyle} />
                                            <input
                                                required
                                                placeholder="The Neon Lounge"
                                                style={inputStyle}
                                                value={formData.store_name}
                                                onChange={e => setFormData({ ...formData, store_name: e.target.value })}
                                                onFocus={e => e.target.select()}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ ...inputWrapperStyle, gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Número de WhatsApp (10 dígitos)</label>
                                        <div style={inputContainerStyle}>
                                            <Store size={18} style={iconStyle} />
                                            <input
                                                required
                                                type="tel"
                                                pattern="[0-9]{10}"
                                                placeholder="321..."
                                                style={inputStyle}
                                                value={formData.whatsapp_number}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length <= 10) {
                                                        setFormData({ ...formData, whatsapp_number: val });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ ...inputWrapperStyle, gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Logo / Imagen del Local (JPG/PNG)</label>
                                        <div style={{
                                            ...inputContainerStyle,
                                            height: '120px',
                                            border: '2px dashed rgba(255,255,255,0.1)',
                                            borderRadius: '24px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            background: logoPreview ? 'none' : 'rgba(255,255,255,0.02)'
                                        }}>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/jpg"
                                                onChange={handleLogoChange}
                                                style={{
                                                    position: 'absolute',
                                                    width: '100%',
                                                    height: '100%',
                                                    opacity: 0,
                                                    cursor: 'pointer',
                                                    zIndex: 2
                                                }}
                                            />
                                            {logoPreview ? (
                                                <img
                                                    src={logoPreview}
                                                    alt="Logo Preview"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '0.5rem', opacity: 0.4 }}>
                                                    <ImageIcon size={32} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Haz clic o arrastra la imagen</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="button" onClick={prevStep} style={backButtonStyle}>
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button type="button" onClick={nextStep} style={buttonStyle}>
                                        Siguiente <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="fade-in">
                                <h2 style={stepTitleStyle}>Vibra y Ubicación</h2>
                                <p style={stepSubStyle}>Detalles finales para aparecer en el mapa.</p>

                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={labelStyle}>¿Cuál es la energía?</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        {VIBE_OPTIONS.map(vibe => {
                                            const Icon = vibe.icon;
                                            const isSelected = selectedVibes.includes(vibe.label);
                                            return (
                                                <button
                                                    key={vibe.label}
                                                    type="button"
                                                    onClick={() => toggleVibe(vibe.label)}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '20px',
                                                        border: '1px solid',
                                                        borderColor: isSelected ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.05)',
                                                        background: isSelected ? 'rgba(111, 66, 193, 0.1)' : 'rgba(255,255,255,0.02)',
                                                        color: isSelected ? 'white' : 'rgba(255,255,255,0.4)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Icon size={20} />
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{vibe.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ ...inputWrapperStyle, marginBottom: '1.5rem' }}>
                                    <label style={labelStyle}>Ciudad / Municipio</label>
                                    <div style={inputContainerStyle}>
                                        <MapPin size={18} style={iconStyle} />
                                        <select
                                            required
                                            style={{ ...inputStyle, paddingLeft: '3.5rem', appearance: 'none' }}
                                            value={formData.municipality_id}
                                            onChange={e => setFormData({ ...formData, municipality_id: e.target.value })}
                                        >
                                            <option value="" disabled style={{ background: '#1a1a1a' }}>Selecciona tu ciudad</option>
                                            {municipalities.map(m => (
                                                <option key={m.id} value={m.id} style={{ background: '#1a1a1a' }}>
                                                    {m.name}, {m.department}
                                                </option>
                                            ))}
                                        </select>
                                        <div style={{ position: 'absolute', right: '1.5rem', pointerEvents: 'none', color: 'rgba(255,255,255,0.2)' }}>
                                            ▼
                                        </div>
                                    </div>
                                </div>

                                <div style={inputWrapperStyle}>
                                    <label style={labelStyle}>Dirección</label>
                                    <div style={inputContainerStyle}>
                                        <MapPin size={18} style={iconStyle} />
                                        <input
                                            required
                                            placeholder="123 Neon Ave, Downtown"
                                            style={inputStyle}
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            onFocus={e => e.target.select()}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '1rem',
                                    padding: '1.5rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    marginTop: '2rem',
                                    marginBottom: '2rem'
                                }}>
                                    <input
                                        type="checkbox"
                                        id="biz-terms"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        style={{ marginTop: '0.3rem', width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="biz-terms" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', lineHeight: 1.5 }}>
                                        Confirmo que he leído y acepto los <Link to="/terms" style={{ color: 'var(--color-neon-purple)', fontWeight: '700', textDecoration: 'none' }}>Términos y Condiciones</Link> y la <Link to="/privacy" style={{ color: 'var(--color-neon-teal)', fontWeight: '700', textDecoration: 'none' }}>Política de Privacidad</Link>. Entiendo que CloudMinds actúa como intermediario.
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="button" onClick={prevStep} style={backButtonStyle}>
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button type="submit" disabled={loading} style={buttonStyle}>
                                        {loading ? 'Creando Cuenta...' : 'Unirse Ahora'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                            ¿Ya tienes cuenta de negocio? <Link to="/business/login" style={{ color: 'var(--color-neon-purple)', fontWeight: '700', textDecoration: 'none' }}>Ingresa</Link>
                        </p>
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
    borderRadius: '40px',
    padding: '3rem',
    backdropFilter: 'blur(40px)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
};

const stepTitleStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: '900',
    marginBottom: '0.5rem',
    color: 'white'
};

const stepSubStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '2.5rem',
    fontWeight: '500'
};

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '2rem'
};

const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginLeft: '0.5rem'
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
    flex: 1,
    padding: '1rem',
    borderRadius: '100px',
    border: 'none',
    background: 'var(--color-neon-purple)',
    color: 'white',
    fontWeight: '900',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    boxShadow: '0 8px 20px rgba(111, 66, 193, 0.3)',
    transition: 'transform 0.2s'
};

const backButtonStyle: React.CSSProperties = {
    padding: '1rem',
    width: '60px',
    borderRadius: '100px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};
