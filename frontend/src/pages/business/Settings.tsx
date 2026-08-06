import React, { useState, useEffect, useRef } from 'react';
import { User, Bell, Shield, Camera, Save, Loader2, CheckCircle2, AlertCircle, Users, Mail, Phone, Lock, X, Check, Image as ImageIcon, Plus, Instagram, Facebook, Globe, Zap as Video, FileText, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { settingsService, placeService, authService } from '../../services/api';
import { businessApi } from '../../services/businessApi';
import { motion, AnimatePresence } from 'framer-motion';
import type { Place } from '../../types';
import { TeamManagement } from './TeamManagement';

type TabId = 'profile' | 'staff' | 'security' | 'notifications';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Logo upload state
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Gallery upload state
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [isSavingGallery, setIsSavingGallery] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Menu upload state
    const [menuPDF, setMenuPDF] = useState<File | null>(null);
    const [isUploadingMenu, setIsUploadingMenu] = useState(false);
    const menuPDFInputRef = useRef<HTMLInputElement>(null);

    // Confirm dialog
    const [showConfirm, setShowConfirm] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        image_url: ''
    });
    const [venue, setVenue] = useState<Partial<Place>>({
        name: '',
        description: '',
        image_url: '',
        instagram_url: '',
        facebook_url: '',
        tiktok_url: '',
        website_url: ''
    });
    // Track if full_name was manually changed from the venue name
    const [fullNameSynced, setFullNameSynced] = useState(true);

    // Security State
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [showPw1, setShowPw1] = useState(false);
    const [showPw2, setShowPw2] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState({
        new_bookings: true,
        chat_messages: true,
        weekly_reports: true,
        system_alerts: true
    });
    
    // Special Offers State
    const [offersMode, setOffersMode] = useState<'manual' | 'pdf'>('manual');
    const [specialOffers, setSpecialOffers] = useState<any[]>([]);
    const [offersPDF, setOffersPDF] = useState<File | null>(null);
    const [newOffer, setNewOffer] = useState({ name: '', price: '', description: '' });
    const [editingOfferIndex, setEditingOfferIndex] = useState<number | null>(null);
    const [isAddingOffer, setIsAddingOffer] = useState(false);
    const [isUploadingOffersPDF, setIsUploadingOffersPDF] = useState(false);
    const offersPDFInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        fetchData();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync full_name with venue.name when synced
    useEffect(() => {
        if (fullNameSynced && venue.name) {
            setProfile(prev => ({ ...prev, full_name: venue.name || prev.full_name }));
        }
    }, [venue.name, fullNameSynced]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [userData, venueData] = await Promise.all([
                authService.getMe(),
                placeService.getProfile()
            ]);

            const venueName = venueData?.name || '';

            setProfile({
                full_name: userData.full_name || venueName,
                email: userData.email || '',
                phone_number: userData.phone_number || '',
                image_url: userData.image_url || ''
            });

            if (userData.notification_settings) {
                setNotifications(userData.notification_settings);
            }

            if (venueData) {
                setVenue(venueData);
                if (venueData.special_offers_json) {
                    setSpecialOffers(venueData.special_offers_json);
                }
                if (venueData.special_offers_pdf_url) {
                    setOffersMode('pdf');
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Logo ──
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) {
            setStatus({ type: 'error', message: 'Solo se permiten imágenes .jpg o .png' });
            return;
        }

        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = ev => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleUploadLogo = async () => {
        if (!logoFile) return;
        setIsUploadingLogo(true);
        setStatus(null);
        try {
            const result = await settingsService.uploadLogo(logoFile);
            localStorage.removeItem('vibe_landing_data_v4');
            setVenue(v => ({ ...v, image_url: result.image_url }));
            setLogoPreview(null);
            setLogoFile(null);
            setStatus({ type: 'success', message: '¡Logo actualizado!' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || 'Error al subir el logo' });
        } finally {
            setIsUploadingLogo(false);
        }
    };

    // ── Gallery ──
    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const valid = files.filter(f => allowed.includes(f.type)).slice(0, 5 - galleryFiles.length);
        if (valid.length < files.length) {
            setStatus({ type: 'error', message: 'Solo se permiten imágenes JPG/PNG/WEBP.' });
        }
        setGalleryFiles(prev => [...prev, ...valid].slice(0, 5));
        valid.forEach(f => {
            const reader = new FileReader();
            reader.onload = ev => setGalleryPreviews(prev => [...prev, ev.target?.result as string].slice(0, 5));
            reader.readAsDataURL(f);
        });
        e.target.value = '';
    };

    const removeGalleryImage = (i: number) => {
        setGalleryFiles(prev => prev.filter((_, idx) => idx !== i));
        setGalleryPreviews(prev => prev.filter((_, idx) => idx !== i));
    };

    const handleSaveGallery = async () => {
        if (galleryFiles.length === 0) return;
        setIsSavingGallery(true);
        setStatus(null);
        try {
            // Upload each gallery image via the same logo upload endpoint and collect URLs
            const uploadedUrls: string[] = [];
            for (const file of galleryFiles) {
                const res = await settingsService.uploadLogo(file);
                if (res.image_url) uploadedUrls.push(res.image_url);
            }
            // Update the venue gallery_images field
            await settingsService.updateProfile({ gallery_images: uploadedUrls });
            localStorage.removeItem('vibe_landing_data_v4');
            setGalleryFiles([]);
            setGalleryPreviews([]);
            setStatus({ type: 'success', message: `¡${uploadedUrls.length} imagen(es) de galería guardadas!` });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || 'Error al guardar la galería' });
        } finally {
            setIsSavingGallery(false);
        }
    };

    const handleMenuPDFSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setStatus({ type: 'error', message: 'Solo se permiten archivos PDF para el menú.' });
            return;
        }
        setMenuPDF(file);
    };

    const handleUploadMenu = async () => {
        if (!menuPDF) return;
        setIsUploadingMenu(true);
        setStatus(null);
        try {
            const result = await businessApi.uploadVenueFile(menuPDF);
            // Update the venue with the new menu_url
            await settingsService.updateProfile({ 
                menu_url: result.url,
                menu_text: result.menu_text 
            });
            localStorage.removeItem('vibe_landing_data_v4');
            setVenue(v => ({ ...v, menu_url: result.url, menu_text: result.menu_text }));
            setMenuPDF(null);
            setStatus({ type: 'success', message: '¡Menú PDF actualizado y escaneado por la IA!' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || 'Error al subir el menú' });
        } finally {
            setIsUploadingMenu(false);
        }
    };

    const handleOffersPDFSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setStatus({ type: 'error', message: 'Solo se permiten archivos PDF para las ofertas.' });
            return;
        }
        setOffersPDF(file);
    };

    const handleUploadOffersPDF = async () => {
        if (!offersPDF) return;
        setIsUploadingOffersPDF(true);
        setStatus(null);
        try {
            const result = await businessApi.uploadVenueFile(offersPDF);
            // Update the venue with the new offers_pdf_url
            const updatedProfile = { 
                special_offers_pdf_url: result.url,
                special_offers_text: result.menu_text // backend returns menu_text for PDF sync
            };
            await settingsService.updateProfile(updatedProfile);
            localStorage.removeItem('vibe_landing_data_v4');
            setVenue(v => ({ ...v, ...updatedProfile }));
            setOffersPDF(null);
            setStatus({ type: 'success', message: '¡Ofertas PDF actualizadas!' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || 'Error al subir las ofertas' });
        } finally {
            setIsUploadingOffersPDF(false);
        }
    };

    const addSpecialOffer = () => {
        if (!newOffer.name.trim()) {
            setStatus({ type: 'error', message: 'Por favor escribe el nombre de la oferta.' });
            return;
        }

        if (editingOfferIndex !== null) {
            const updated = [...specialOffers];
            updated[editingOfferIndex] = { ...newOffer };
            setSpecialOffers(updated);
            setEditingOfferIndex(null);
        } else {
            if (specialOffers.length >= 10) {
                setStatus({ type: 'error', message: 'Máximo 10 ofertas permitidas.' });
                return;
            }
            setSpecialOffers([...specialOffers, { ...newOffer }]);
        }
        setNewOffer({ name: '', price: '', description: '' });
        setIsAddingOffer(false);
    };

    const removeSpecialOffer = (index: number) => {
        setSpecialOffers(specialOffers.filter((_, i) => i !== index));
    };

    const handleSaveSpecialOffers = async () => {
        try {
            setIsSaving(true);
            setStatus(null);
            
            let finalOffers = [...specialOffers];
            if (newOffer.name.trim()) {
                finalOffers.push({ ...newOffer });
            }

            const dataToSave = {
                special_offers_json: offersMode === 'manual' ? finalOffers : [],
                special_offers_pdf_url: offersMode === 'pdf' ? venue.special_offers_pdf_url : null,
                special_offers_text: offersMode === 'pdf' ? venue.special_offers_text : null
            };

            await settingsService.updateProfile(dataToSave);
            localStorage.removeItem('vibe_landing_data_v4');
            
            // Update local venue state
            setVenue(v => ({ 
                ...v, 
                special_offers_json: dataToSave.special_offers_json,
                special_offers_pdf_url: dataToSave.special_offers_pdf_url as any,
                special_offers_text: dataToSave.special_offers_text as any
            }));

            setStatus({ type: 'success', message: '¡Ofertas especiales actualizadas!' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Error al actualizar ofertas' });
        } finally {
            setIsSaving(false);
        }
    };

    const editSpecialOffer = (index: number) => {
        setNewOffer(specialOffers[index]);
        setEditingOfferIndex(index);
        setIsAddingOffer(true);
    };

    const handleSaveProfile = async () => {
        setShowConfirm(false);
        try {
            setIsSaving(true);
            setStatus(null);
            const dataToSave = {
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                venue_name: venue.name,
                description: venue.description,
                instagram_url: venue.instagram_url,
                facebook_url: venue.facebook_url,
                tiktok_url: venue.tiktok_url,
                website_url: venue.website_url,
                menu_url: venue.menu_url,
                menu_text: venue.menu_text,
                special_offers_json: offersMode === 'manual' 
                    ? (newOffer.name.trim() ? [...specialOffers, { ...newOffer }] : specialOffers)
                    : [],
                special_offers_pdf_url: offersMode === 'pdf' ? venue.special_offers_pdf_url : null,
                special_offers_text: offersMode === 'pdf' ? venue.special_offers_text : null
            };
            await settingsService.updateProfile(dataToSave);
            localStorage.removeItem('vibe_landing_data_v4');
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, full_name: profile.full_name }));
            window.dispatchEvent(new Event('storage'));
            setStatus({ type: 'success', message: '¡Perfil actualizado con éxito!' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Error al actualizar perfil' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Password ──
    const handleChangePassword = async () => {
        if (passwords.new.length < 8) {
            setStatus({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setStatus({ type: 'error', message: 'Las contraseñas nuevas no coinciden' });
            return;
        }
        try {
            setIsSaving(true);
            await settingsService.changePassword({ new_password: passwords.new });
            setStatus({ type: 'success', message: '¡Contraseña cambiada con éxito!' });
            setPasswords({ new: '', confirm: '' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Error al cambiar contraseña' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Notifications ──
    const handleToggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveNotifications = async () => {
        try {
            setIsSaving(true);
            setStatus(null);
            await settingsService.updateNotifications(notifications);
            setStatus({ type: 'success', message: '¡Preferencias de notificaciones actualizadas!' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Error al actualizar notificaciones' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-neon-purple)" />
            </div>
        );
    }

    const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
        <button onClick={onChange} style={{
            width: '52px', height: '28px', borderRadius: '100px', border: 'none',
            background: value ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.12)',
            cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all 0.3s',
            boxShadow: value ? '0 0 12px rgba(111,66,193,0.5)' : 'none',
        }}>
            <div style={{
                position: 'absolute', top: '4px',
                left: value ? '26px' : '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'white', transition: 'all 0.3s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }} />
        </button>
    );

    const pwMatch = passwords.confirm && passwords.new === passwords.confirm;
    const pwMismatch = passwords.confirm && passwords.new !== passwords.confirm;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: isMobile ? '2rem' : '0' }}>
            {/* Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem' }}>
                    Configuración del Portal
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>
                    Gestiona el perfil de tu local y preferencias.
                </p>
            </div>

            {/* Confirm Dialog */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '28px', padding: '2.5rem', maxWidth: '440px', width: '100%',
                                boxShadow: '0 28px 70px rgba(0,0,0,0.7)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>Confirmar cambios</h3>
                                <button onClick={() => setShowConfirm(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.75rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
                                ¿Deseas guardar los cambios en el perfil de tu local?
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.85rem', fontSize: '0.85rem' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Local</p>
                                    <p style={{ fontWeight: '700', color: 'white' }}>{venue.name || '—'}</p>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.85rem', fontSize: '0.85rem' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Nombre</p>
                                    <p style={{ fontWeight: '700', color: 'white' }}>{profile.full_name || '—'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: '700', cursor: 'pointer' }}
                                >Cancelar</button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', border: 'none', background: 'var(--color-neon-purple)', color: 'white', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(111,66,193,0.4)' }}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: isMobile ? '0.5rem' : '2rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '2.5rem', overflowX: isMobile ? 'auto' : 'visible',
                scrollbarWidth: 'none', msOverflowStyle: 'none'
            }}>
                {([
                    { id: 'profile', icon: User, label: 'Perfil' },
                    { id: 'staff', icon: Users, label: 'Equipo' },
                    { id: 'security', icon: Shield, label: 'Seguridad' },
                    { id: 'notifications', icon: Bell, label: 'Alertas' }
                ] as const).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setStatus(null); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '1rem 0', background: 'transparent', border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-neon-purple)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.4)',
                            fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                        }}
                    >
                        <tab.icon size={18} />{tab.label}
                    </button>
                ))}
            </div>

            {/* Status Toast */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                            padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '2rem',
                            background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                            color: status.type === 'success' ? '#22c55e' : '#f87171',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                        {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{status.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Logo upload */}
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem' }}>Logo del Local</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={logoPreview || venue.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(venue.name || 'V')}&background=6f42c1&color=fff&size=120&bold=true`}
                                    style={{ width: '100px', height: '100px', borderRadius: '20px', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.1)' }}
                                    alt="Logo"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        position: 'absolute', bottom: '-6px', right: '-6px',
                                        padding: '8px', background: 'var(--color-neon-purple)',
                                        border: '3px solid #050505', borderRadius: '50%', color: 'white',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 15px rgba(111,66,193,0.4)'
                                    }}>
                                    <Camera size={14} />
                                </button>
                            </div>
                            <div>
                                <p style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                                    {logoFile ? logoFile.name : 'Elige una imagen'}
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                                    Solo se permiten archivos <strong>.jpg</strong> o <strong>.png</strong>.
                                    La imagen aparecerá en todas las tarjetas del local.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                                    >
                                        Seleccionar imagen
                                    </button>
                                    {logoFile && (
                                        <button
                                            onClick={handleUploadLogo}
                                            disabled={isUploadingLogo}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', background: 'var(--color-neon-purple)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            {isUploadingLogo ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                            Subir logo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style={{ display: 'none' }} onChange={handleLogoSelect} />
                    </div>

                    {/* Venue & Profile Info */}
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.75rem' }}>Información del Local</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                            {/* Venue name */}
                            <div>
                                <label style={labelStyle}>Nombre del Local</label>
                                <input
                                    value={venue.name || ''}
                                    onChange={e => {
                                        setVenue({ ...venue, name: e.target.value });
                                        if (fullNameSynced) {
                                            setProfile(prev => ({ ...prev, full_name: e.target.value }));
                                        }
                                    }}
                                    style={inputStyle}
                                    placeholder="El Parche del Norte"
                                />
                            </div>

                            {/* Email – locked */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <label style={{ ...labelStyle, margin: 0 }}>Correo Electrónico</label>
                                    <span style={{
                                        fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em',
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                        color: '#f87171', padding: '2px 8px', borderRadius: '100px',
                                        display: 'flex', alignItems: 'center', gap: '3px'
                                    }}>
                                        <Lock size={9} /> Solo Admin
                                    </span>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.15)' }} />
                                    <input
                                        value={profile.email}
                                        readOnly
                                        title="El correo no puede modificarse. Contacta a un administrador si necesitas cambiarlo."
                                        style={{ ...inputStyle, paddingLeft: '2.5rem', opacity: 0.4, cursor: 'not-allowed' }}
                                    />
                                </div>
                            </div>

                            {/* Biography */}
                            <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                                <label style={labelStyle}>Biografía / Descripción</label>
                                <textarea
                                    rows={4}
                                    value={venue.description || ''}
                                    onChange={e => setVenue({ ...venue, description: e.target.value })}
                                    style={{ ...inputStyle, resize: 'none' }}
                                    placeholder="Cuéntale a los parceros qué hace especial tu local..."
                                />
                            </div>

                            {/* Full name (auto-synced with venue name, but editable) */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label style={{ ...labelStyle, margin: 0 }}>Nombre Completo (dueño)</label>
                                    {fullNameSynced && (
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(111,66,193,0.8)', fontWeight: '700' }}>
                                            Sincronizado
                                        </span>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <User size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                    <input
                                        value={profile.full_name}
                                        onChange={e => {
                                            setProfile({ ...profile, full_name: e.target.value });
                                            setFullNameSynced(false);
                                        }}
                                        style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                        placeholder="Tu nombre completo"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={labelStyle}>Número de Teléfono</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                    <input
                                        value={profile.phone_number}
                                        onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
                                        style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                        placeholder="+57 300 000 0000"
                                    />
                                </div>
                            </div>

                            {/* Social Media Links */}
                            <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Redes Sociales</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={labelStyle}>Instagram (URL)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Instagram size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                            <input
                                                value={venue.instagram_url || ''}
                                                onChange={e => setVenue({ ...venue, instagram_url: e.target.value })}
                                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                                placeholder="https://instagram.com/tu_local"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Facebook (URL)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Facebook size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                            <input
                                                value={venue.facebook_url || ''}
                                                onChange={e => setVenue({ ...venue, facebook_url: e.target.value })}
                                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                                placeholder="https://facebook.com/tu_local"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>TikTok (URL)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Video size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                            <input
                                                value={venue.tiktok_url || ''}
                                                onChange={e => setVenue({ ...venue, tiktok_url: e.target.value })}
                                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                                placeholder="https://tiktok.com/@tu_local"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Sitio Web (URL)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Globe size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                            <input
                                                value={venue.website_url || ''}
                                                onChange={e => setVenue({ ...venue, website_url: e.target.value })}
                                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                                placeholder="https://tu_local.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save */}
                        <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', marginTop: '2rem' }}>
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={isSaving}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    background: 'var(--color-neon-purple)', color: 'white', border: 'none',
                                    padding: '0.85rem 2rem', borderRadius: '14px', fontWeight: '900',
                                    cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1,
                                    width: isMobile ? '100%' : 'auto', boxShadow: '0 0 20px rgba(111,66,193,0.3)'
                                }}
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Guardar Cambios
                            </button>
                        </div>
                    </div>

                    {/* Venue Gallery */}
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.4rem' }}>Galería del Local</h3>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Estas imágenes aparecerán en el visor del local en el landing. Máx. 5 imágenes (JPG/PNG/WEBP).
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                            {galleryPreviews.map((src, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img
                                        src={src} alt=""
                                        style={{
                                            width: isMobile ? '72px' : '88px',
                                            height: isMobile ? '72px' : '88px',
                                            objectFit: 'cover', borderRadius: '13px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    />
                                    <button
                                        onClick={() => removeGalleryImage(i)}
                                        style={{
                                            position: 'absolute', top: '-6px', right: '-6px',
                                            width: '22px', height: '22px', borderRadius: '50%',
                                            background: '#ef4444', border: '2px solid #050505',
                                            color: 'white', cursor: 'pointer', padding: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            ))}
                            {galleryFiles.length < 5 && (
                                <button
                                    onClick={() => galleryInputRef.current?.click()}
                                    style={{
                                        width: isMobile ? '72px' : '88px',
                                        height: isMobile ? '72px' : '88px',
                                        borderRadius: '13px',
                                        border: '2px dashed rgba(255,255,255,0.15)',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        gap: '4px', transition: 'all 0.2s'
                                    }}
                                >
                                    <Plus size={20} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>Añadir</span>
                                </button>
                            )}
                        </div>
                        <input
                            ref={galleryInputRef}
                            type="file" multiple
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleGallerySelect}
                        />
                        {galleryFiles.length > 0 && (
                            <button
                                onClick={handleSaveGallery}
                                disabled={isSavingGallery}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'var(--color-neon-teal)', color: 'white',
                                    border: 'none', padding: '0.75rem 1.75rem',
                                    borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
                                    opacity: isSavingGallery ? 0.7 : 1, fontSize: '0.9rem'
                                }}
                            >
                                {isSavingGallery ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                                Guardar Galería ({galleryFiles.length} imagen{galleryFiles.length !== 1 ? 'es' : ''})
                            </button>
                        )}
                    </div>

                    {/* Venue Menu PDF */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <FileText size={20} color="var(--color-neon-purple)" />
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Menú en PDF (AI Scanner)</h3>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Sube tu menú en formato PDF. Nuestra IA lo analizará para que el chatbot pueda responder preguntas detalladas sobre tus platos y precios.
                        </p>
                        
                        <div 
                            onClick={() => menuPDFInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${menuPDF ? 'rgba(111,66,193,0.5)' : 'rgba(255,255,255,0.15)'}`,
                                borderRadius: '16px', padding: '1.5rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                background: menuPDF ? 'rgba(111,66,193,0.05)' : 'rgba(255,255,255,0.02)',
                                marginBottom: '1.25rem'
                            }}
                        >
                            <FileText size={32} color={menuPDF ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.2)'} />
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>
                                    {menuPDF ? menuPDF.name : (venue.menu_url ? 'Actualizar Menú PDF' : 'Subir menú en PDF')}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                                    {venue.menu_url ? 'Ya tienes un menú configurado' : 'Solo archivos .pdf'}
                                </p>
                            </div>
                            {venue.menu_url && !menuPDF && (
                                <a 
                                    href={venue.menu_url} target="_blank" rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ fontSize: '0.75rem', color: 'var(--color-neon-purple)', fontWeight: '700', textDecoration: 'none' }}
                                >
                                    Ver actual
                                </a>
                            )}
                        </div>
                        <input 
                            ref={menuPDFInputRef} type="file" accept="application/pdf" 
                            style={{ display: 'none' }} onChange={handleMenuPDFSelect} 
                        />

                        {menuPDF && (
                            <button
                                onClick={handleUploadMenu}
                                disabled={isUploadingMenu}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'var(--color-neon-purple)', color: 'white',
                                    border: 'none', padding: '0.75rem 1.75rem',
                                    borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
                                    opacity: isUploadingMenu ? 0.7 : 1, fontSize: '0.9rem',
                                    boxShadow: '0 0 15px rgba(111,66,193,0.3)'
                                }}
                            >
                                {isUploadingMenu ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                Subir y Escanear Menú
                            </button>
                        )}
                    </div>

                    {/* Special Offers Section */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <Sparkles size={20} color="var(--color-neon-teal)" />
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Ofertas Especiales</h3>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Promociona tus beneficios exclusivos. Puedes ingresarlas manualmente o subir un PDF.
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '12px' }}>
                            <button
                                onClick={() => setOffersMode('manual')}
                                style={{
                                    flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
                                    background: offersMode === 'manual' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: offersMode === 'manual' ? 'white' : 'rgba(255,255,255,0.4)',
                                    fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >Escribir Ofertas</button>
                            <button
                                onClick={() => setOffersMode('pdf')}
                                style={{
                                    flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
                                    background: offersMode === 'pdf' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: offersMode === 'pdf' ? 'white' : 'rgba(255,255,255,0.4)',
                                    fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >Subir Archivo PDF</button>
                        </div>

                        {offersMode === 'manual' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {specialOffers.map((offer, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px'
                                    }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>{offer.name}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{offer.price ? `${offer.price} • ` : ''}{offer.description}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => editSpecialOffer(i)} 
                                                style={{ background: 'none', border: 'none', color: 'var(--color-neon-purple)', cursor: 'pointer', padding: '5px' }}
                                                title="Editar"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                onClick={() => removeSpecialOffer(i)} 
                                                style={{ background: 'none', border: 'none', color: '#ff3d00', cursor: 'pointer', padding: '5px' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {isAddingOffer ? (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-neon-teal)', borderRadius: '16px', padding: '1.25rem', marginTop: '0.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                            <input
                                                style={inputStyle} placeholder="Nombre de la oferta (ej: 2x1 Polas)"
                                                value={newOffer.name} onChange={e => setNewOffer({ ...newOffer, name: e.target.value })}
                                            />
                                            <input
                                                style={inputStyle} placeholder="Precio (opcional)"
                                                value={newOffer.price} onChange={e => setNewOffer({ ...newOffer, price: e.target.value })}
                                            />
                                        </div>
                                        <textarea
                                            style={{ ...inputStyle, resize: 'none' }} rows={2} placeholder="Descripción de la oferta..."
                                            value={newOffer.description} onChange={e => setNewOffer({ ...newOffer, description: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                            <button onClick={addSpecialOffer} style={{ flex: 1, padding: '0.6rem', background: 'var(--color-neon-teal)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                                                {editingOfferIndex !== null ? 'Actualizar Oferta' : 'Añadir Oferta'}
                                            </button>
                                            <button onClick={() => { setIsAddingOffer(false); setEditingOfferIndex(null); }} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : specialOffers.length < 10 && (
                                    <button
                                        onClick={() => { setIsAddingOffer(true); setNewOffer({ name: '', price: '', description: '' }); }}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', background: 'rgba(20, 184, 166, 0.1)', border: '1px dashed rgba(20, 184, 166, 0.3)', color: 'var(--color-neon-teal)', borderRadius: '12px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                                    >
                                        <Plus size={16} /> Añadir Oferta Especial ({specialOffers.length}/10)
                                    </button>
                                )}

                                {/* Dedicated Save Button for Manual Offers */}
                                {specialOffers.length >= 0 && (
                                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                        <button
                                            onClick={handleSaveSpecialOffers}
                                            disabled={isSaving}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                background: 'var(--color-neon-teal)', color: 'white', border: 'none',
                                                padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '900',
                                                cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1,
                                                width: isMobile ? '100%' : 'auto', fontSize: '0.9rem',
                                                boxShadow: '0 0 15px rgba(20, 184, 166, 0.2)'
                                            }}
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            Guardar Lista de Ofertas
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div
                                    onClick={() => offersPDFInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${offersPDF ? 'rgba(20, 184, 166, 0.5)' : 'rgba(255,255,255,0.15)'}`,
                                        borderRadius: '16px', padding: '1.5rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        background: offersPDF ? 'rgba(20, 184, 166, 0.05)' : 'rgba(255,255,255,0.02)',
                                        marginBottom: '1.25rem'
                                    }}
                                >
                                    <FileText size={32} color={offersPDF ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.2)'} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>
                                            {offersPDF ? offersPDF.name : (venue.special_offers_pdf_url ? 'Actualizar PDF de Ofertas' : 'Subir ofertas en PDF')}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                                            {venue.special_offers_pdf_url ? 'Ya tienes ofertas configuradas' : 'Solo archivos .pdf'}
                                        </p>
                                    </div>
                                    {venue.special_offers_pdf_url && !offersPDF && (
                                        <a
                                            href={venue.special_offers_pdf_url} target="_blank" rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ fontSize: '0.75rem', color: 'var(--color-neon-teal)', fontWeight: '700', textDecoration: 'none' }}
                                        >
                                            Ver actual
                                        </a>
                                    )}
                                </div>
                                <input
                                    ref={offersPDFInputRef} type="file" accept="application/pdf"
                                    style={{ display: 'none' }} onChange={handleOffersPDFSelect}
                                />
                                {offersPDF && (
                                    <button
                                        onClick={handleUploadOffersPDF}
                                        disabled={isUploadingOffersPDF}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            background: 'var(--color-neon-teal)', color: 'white',
                                            border: 'none', padding: '0.75rem 1.75rem',
                                            borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
                                            opacity: isUploadingOffersPDF ? 0.7 : 1, fontSize: '0.9rem',
                                            boxShadow: '0 0 15px rgba(20, 184, 166, 0.3)'
                                        }}
                                    >
                                        {isUploadingOffersPDF ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        Subir Archivo de Ofertas
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ── STAFF / EQUIPO TAB ── */}
            {activeTab === 'staff' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <TeamManagement />
                </motion.div>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === 'security' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.5rem' }}>Cambiar Contraseña</h3>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
                            Elige una contraseña segura de al menos 8 caracteres.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={labelStyle}>Nueva Contraseña</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw1 ? 'text' : 'password'}
                                        placeholder="••••••••" value={passwords.new}
                                        onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                        style={{ ...inputStyle, paddingRight: '3rem' }}
                                    />
                                    <button onClick={() => setShowPw1(!showPw1)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
                                        {showPw1 ? '👁' : '🔒'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Confirmar Nueva Contraseña</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw2 ? 'text' : 'password'}
                                        placeholder="••••••••" value={passwords.confirm}
                                        onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                        style={{ ...inputStyle, paddingRight: '3rem', borderColor: pwMismatch ? 'rgba(239,68,68,0.5)' : inputStyle.border as string }}
                                    />
                                    <button onClick={() => setShowPw2(!showPw2)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
                                        {showPw2 ? '👁' : '🔒'}
                                    </button>
                                </div>
                                {pwMatch && <p style={{ color: '#22c55e', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: '600' }}>✓ Las contraseñas coinciden</p>}
                                {pwMismatch && <p style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: '600' }}>✗ Las contraseñas no coinciden</p>}
                            </div>
                        </div>
                        <button
                            onClick={handleChangePassword}
                            disabled={isSaving || !passwords.new || !pwMatch}
                            style={{
                                marginTop: '1.5rem', padding: '0.85rem 2rem', background: 'white', border: 'none',
                                color: 'black', borderRadius: '12px', fontWeight: '900', cursor: 'pointer',
                                opacity: (isSaving || !passwords.new || !pwMatch) ? 0.4 : 1,
                                width: isMobile ? '100%' : 'auto',
                                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
                            }}
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                            Actualizar Contraseña
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === 'notifications' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {([
                        { id: 'new_bookings' as const, title: 'Nuevas Reservas de Parches', desc: 'Notifícame cuando un parcero compre una boleta.' },
                        { id: 'chat_messages' as const, title: 'Mensajes de Chat', desc: 'Alértame sobre nuevas consultas de clientes.' },
                        { id: 'weekly_reports' as const, title: 'Reportes Semanales', desc: 'Recibe un resumen de rendimiento cada lunes.' },
                        { id: 'system_alerts' as const, title: 'Alertas del Sistema', desc: 'Notificaciones de seguridad y cuenta.' }
                    ]).map(item => (
                        <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
                            padding: '1.25rem 1.5rem', borderRadius: '18px',
                            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <div>
                                <h4 style={{ fontWeight: '700', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{item.title}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{item.desc}</p>
                            </div>
                            <Toggle value={notifications[item.id]} onChange={() => handleToggleNotification(item.id)} />
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                        <button
                            onClick={handleSaveNotifications}
                            disabled={isSaving}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                background: 'var(--color-neon-purple)', color: 'white', border: 'none',
                                padding: '0.85rem 2rem', borderRadius: '14px', fontWeight: '900',
                                cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1,
                                width: isMobile ? '100%' : 'auto', boxShadow: '0 0 20px rgba(111,66,193,0.3)'
                            }}
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Bell size={18} />}
                            Guardar Notificaciones
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'block', color: 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem'
};

const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    padding: '0.85rem 1rem', color: 'white', outline: 'none',
    fontSize: '0.95rem', boxSizing: 'border-box', transition: 'border-color 0.2s'
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '24px', padding: '2rem'
};
