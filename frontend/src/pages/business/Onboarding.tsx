import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Store, Sparkles, ArrowRight, ChevronLeft, Music, Coffee,
    Utensils, GlassWater, PartyPopper, Loader2,
    Clock, Phone, DollarSign, Plus, Trash2, CheckCircle2,
    Image as ImageIcon, X, FileText, Camera, Check, PlusCircle
} from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import { settingsService } from '../../services/api';

const VIBE_OPTIONS = [
    { label: 'Techno', icon: Music },
    { label: 'Chill', icon: Coffee },
    { label: 'Electronic', icon: Sparkles },
    { label: 'Cocktails', icon: GlassWater },
    { label: 'Dining', icon: Utensils },
    { label: 'Party', icon: PartyPopper },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
};

type DaySchedule = { open: string; close: string; closed?: boolean };

export const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const DEFAULT_HOURS: Record<string, DaySchedule> = {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday: { open: '09:00', close: '22:00' },
        friday: { open: '09:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '10:00', close: '21:00', closed: true },
    };

    const [hours, setHours] = useState<Record<string, DaySchedule>>(DEFAULT_HOURS);

    // Step 2 — Contact & Presence
    const [whatsappNumber, setWhatsappNumber] = useState(''); // without +57
    const [priceRange, setPriceRange] = useState(2);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const coverImageRef = useRef<HTMLInputElement>(null);

    // Step 3 — Menu
    const [menuMode, setMenuMode] = useState<'images' | 'pdf'>('images');
    const [menuFiles, setMenuFiles] = useState<File[]>([]); // up to 5 images
    const [menuPDF, setMenuPDF] = useState<File | null>(null);
    const menuInputRef = useRef<HTMLInputElement>(null);
    const menuPDFRef = useRef<HTMLInputElement>(null);

    // Step 3 — Gallery + description + address
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]); // up to 5
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Step 3 — Menu items
    const [menuItems, setMenuItems] = useState<{ name: string; price: string; description: string }[]>([]);
    const [newItem, setNewItem] = useState({ name: '', price: '', description: '' });

    // Step 4 — Special Offers
    const [offersMode, setOffersMode] = useState<'manual' | 'pdf'>('manual');
    const [offersPDF, setOffersPDF] = useState<File | null>(null);
    const [specialOffers, setSpecialOffers] = useState<{ name: string; price: string; description: string }[]>([]);
    const [newOffer, setNewOffer] = useState({ name: '', price: '', description: '' });
    const offersPDFRef = useRef<HTMLInputElement>(null);
    const [isAddingOffer, setIsAddingOffer] = useState(false);
    const [editingOfferIndex, setEditingOfferIndex] = useState<number | null>(null);

    React.useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const venue = await businessApi.getVenueProfile();
                if (venue) {
                    if (venue.opening_hours) setHours({ ...DEFAULT_HOURS, ...venue.opening_hours });
                    if (venue.whatsapp_number) {
                        const stripped = venue.whatsapp_number.replace(/\D/g, '');
                        setWhatsappNumber(stripped.startsWith('57') ? stripped.slice(2) : stripped);
                    }
                    setPriceRange(venue.price_range || 2);
                    if (venue.vibe_tags) setSelectedVibes(venue.vibe_tags);
                    if (venue.description) setDescription(venue.description);
                    if (venue.address) setAddress(venue.address);
                    if (venue.image_url) setCoverImagePreview(venue.image_url);
                    if (venue.special_offers_json) setSpecialOffers(venue.special_offers_json);
                    if (venue.special_offers_pdf_url) {
                        setOffersMode('pdf');
                    }
                }
            } catch (err) {
                console.log('No existing profile found or failed to fetch', err);
            }
        };
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleVibe = (vibe: string) => setSelectedVibes(prev =>
        prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );

    const toggleDayClosed = (day: string) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], closed: !prev[day]?.closed }
        }));
    };

    const addMenuItem = () => {
        if (newItem.name && newItem.price) {
            setMenuItems([...menuItems, newItem]);
            setNewItem({ name: '', price: '', description: '' });
        }
    };

    // Cover image
    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            alert('Solo se aceptan imágenes JPG, PNG o WEBP.');
            return;
        }
        setCoverImageFile(file);
        const reader = new FileReader();
        reader.onload = ev => setCoverImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // Menu images
    const handleMenuImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const valid = files.filter(f => allowed.includes(f.type)).slice(0, 5 - menuFiles.length);
        if (valid.length < files.length) alert('Solo se permiten imágenes JPG/PNG/WEBP. Archivos no válidos fueron ignorados.');
        setMenuFiles(prev => [...prev, ...valid].slice(0, 5));
    };

    // Special Offers PDF
    const handleOffersPDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert('Solo se acepta un archivo PDF para las ofertas.');
            return;
        }
        setOffersPDF(file);
    };

    const editSpecialOffer = (index: number) => {
        setNewOffer(specialOffers[index]);
        setEditingOfferIndex(index);
        setIsAddingOffer(true);
    };

    const addSpecialOffer = () => {
        if (!newOffer.name.trim()) {
            alert('Por favor escribe el nombre de la oferta.');
            return;
        }

        if (editingOfferIndex !== null) {
            const updated = [...specialOffers];
            updated[editingOfferIndex] = { ...newOffer };
            setSpecialOffers(updated);
            setEditingOfferIndex(null);
        } else {
            if (specialOffers.length >= 10) {
                alert('Máximo 10 ofertas permitidas.');
                return;
            }
            setSpecialOffers([...specialOffers, { ...newOffer }]);
        }
        setNewOffer({ name: '', price: '', description: '' });
        setIsAddingOffer(false);
    };

    // Menu PDF
    const handleMenuPDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert('Solo se acepta un archivo PDF para el menú.');
            return;
        }
        setMenuPDF(file);
    };

    // Gallery images
    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const valid = files.filter(f => allowed.includes(f.type)).slice(0, 5 - galleryFiles.length);
        if (valid.length < files.length) alert('Solo se permiten imágenes JPG/PNG/WEBP. Archivos no válidos fueron ignorados.');
        setGalleryFiles(prev => [...prev, ...valid].slice(0, 5));
        valid.forEach(f => {
            const reader = new FileReader();
            reader.onload = ev => setGalleryPreviews(prev => [...prev, ev.target?.result as string].slice(0, 5));
            reader.readAsDataURL(f);
        });
    };

    const removeGalleryImage = (i: number) => {
        setGalleryFiles(prev => prev.filter((_, idx) => idx !== i));
        setGalleryPreviews(prev => prev.filter((_, idx) => idx !== i));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let imageUrl: string | undefined;
            let galleryUrls: string[] = [];
            let menuUrl: string | undefined;
            let menuText: string | undefined;
            let specialOffersPdfUrl: string | undefined;
            let specialOffersText: string | undefined;

            // 1. Upload cover image
            if (coverImageFile) {
                try {
                    const res = await settingsService.uploadLogo(coverImageFile);
                    imageUrl = res.image_url;
                } catch (err) {
                    console.warn('Cover upload failed', err);
                }
            }

            // 2. Upload gallery images
            if (galleryFiles.length > 0) {
                for (const file of galleryFiles) {
                    try {
                        const res = await businessApi.uploadVenueFile(file);
                        galleryUrls.push(res.url);
                    } catch (err) {
                        console.warn('Gallery upload failed', err);
                    }
                }
            }

            // 3. Upload menu (images or PDF)
            if (menuMode === 'images' && menuFiles.length > 0) {
                // For simplicity, we use the first image as menu_url or we could join them
                // But usually menu_url is a single link. We'll upload the first one.
                try {
                    const res = await businessApi.uploadVenueFile(menuFiles[0]);
                    menuUrl = res.url;
                } catch (err) {
                    console.warn('Menu image upload failed', err);
                }
            } else if (menuMode === 'pdf' && menuPDF) {
                try {
                    const res = await businessApi.uploadVenueFile(menuPDF);
                    menuUrl = res.url;
                    menuText = res.menu_text;
                } catch (err) {
                    console.warn('Menu PDF upload failed', err);
                }
            }

            // 3.5 Upload special offers PDF
            if (offersMode === 'pdf' && offersPDF) {
                try {
                    const res = await businessApi.uploadVenueFile(offersPDF);
                    specialOffersPdfUrl = res.url;
                    specialOffersText = res.menu_text;
                } catch (err) {
                    console.warn('Special Offers PDF upload failed', err);
                }
            }

            const whatsappFull = `57${whatsappNumber.replace(/\D/g, '')}`;

            // 4. Format hours to ensure consistency
            const formattedHours: Record<string, any> = {};
            DAYS.forEach(day => {
                formattedHours[day] = {
                    open: hours[day]?.open || '09:00',
                    close: hours[day]?.close || '22:00',
                    closed: !!hours[day]?.closed
                };
            });

            const updatePayload: Record<string, any> = {
                opening_hours: formattedHours,
                price_range: priceRange,
                whatsapp_number: whatsappFull,
                vibe_tags: selectedVibes,
                description,
                address,
                status: 'active',
                gallery_images: galleryUrls
            };
            if (imageUrl) updatePayload.image_url = imageUrl;
            if (menuUrl) updatePayload.menu_url = menuUrl;
            if (menuText) updatePayload.menu_text = menuText;
            if (specialOffersPdfUrl) updatePayload.special_offers_pdf_url = specialOffersPdfUrl;
            if (specialOffersText) updatePayload.special_offers_text = specialOffersText;
            if (offersMode === 'manual') {
                let finalOffers = [...specialOffers];
                // Capture pending offer if user filled the name but didn't click "Confirm"
                if (newOffer.name.trim()) {
                    finalOffers.push({ ...newOffer });
                }
                updatePayload.special_offers_json = finalOffers;
            }

            await businessApi.updateVenueProfile(updatePayload);
            localStorage.removeItem('vibe_landing_data_v4');

            // 5. Add Menu Items if any
            if (menuItems.length > 0) {
                const venueProfile = await businessApi.getVenueProfile();
                const venueId = venueProfile.id;
                for (const item of menuItems) {
                    await businessApi.addVenueMenuItem({
                        ...item,
                        price: parseFloat(item.price),
                        venue_id: venueId
                    });
                }
            }

            navigate('/business');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.detail || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#030305', color: 'white', padding: isMobile ? '1rem' : '2rem' }}>
            <div style={{ maxWidth: '800px', margin: isMobile ? '1rem auto' : '2rem auto' }}>
                <div style={{ textAlign: 'center', marginBottom: isMobile ? '2rem' : '3rem' }}>
                    <div style={{ display: 'inline-flex', padding: isMobile ? '0.75rem' : '1rem', background: 'rgba(111, 66, 193, 0.1)', borderRadius: '24px', marginBottom: '1.5rem', border: '1px solid rgba(111, 66, 193, 0.2)' }}>
                        <Sparkles size={isMobile ? 24 : 32} color="var(--color-neon-purple)" />
                    </div>
                    <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Personaliza Tu Portal</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>Destaca en el mapa con horarios detallados y ofertas destacadas.</p>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: isMobile ? '2.5rem' : '4rem' }}>
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} style={{
                            width: s === step ? (isMobile ? '40px' : '60px') : '15px',
                            height: '6px',
                            background: s === step ? 'var(--color-neon-purple)' : s < step ? 'rgba(111,66,193,0.4)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '100px',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{
                    ...formContainerStyle,
                    padding: isMobile ? '1.5rem' : '3rem',
                    borderRadius: isMobile ? '24px' : '40px'
                }}>
                    {/* ── STEP 1: Schedule ── */}
                    {step === 1 && (
                        <div className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                                <Clock color="var(--color-neon-purple)" size={isMobile ? 20 : 24} />
                                <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '800' }}>Horarios de Atención</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
                                {DAYS.map(day => {
                                    const isClosed = !!hours[day]?.closed;
                                    return (
                                        <div key={day} style={{
                                            ...dayRowStyle,
                                            flexDirection: isMobile ? 'column' : 'row',
                                            alignItems: isMobile ? 'stretch' : 'center',
                                            gap: isMobile ? '0.75rem' : '1.5rem',
                                            padding: isMobile ? '1.25rem' : '1rem 2rem',
                                            opacity: isClosed ? 0.6 : 1,
                                            borderColor: isClosed ? 'rgba(255,60,60,0.2)' : 'rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ textTransform: 'capitalize', fontWeight: '700', color: 'white', fontSize: isMobile ? '0.95rem' : '1rem', minWidth: '90px' }}>
                                                    {DAY_LABELS[day]}
                                                </span>
                                                {/* Closed toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDayClosed(day)}
                                                    style={{
                                                        display: isMobile ? 'flex' : 'none',
                                                        alignItems: 'center', gap: '0.4rem',
                                                        padding: '0.3rem 0.75rem', borderRadius: '100px',
                                                        border: `1px solid ${isClosed ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                                        background: isClosed ? 'rgba(255,60,60,0.15)' : 'transparent',
                                                        color: isClosed ? '#f87171' : 'rgba(255,255,255,0.4)',
                                                        fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
                                                    }}
                                                >
                                                    {isClosed ? '🔴 Cerrado' : '✓ Abierto'}
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                                                <div style={{ flex: 1, maxWidth: isMobile ? 'none' : '130px' }}>
                                                    <input
                                                        type="time"
                                                        style={{ ...timeInputStyle, opacity: isClosed ? 0.3 : 1 }}
                                                        value={hours[day]?.open || '09:00'}
                                                        disabled={isClosed}
                                                        onChange={e => setHours({ ...hours, [day]: { ...hours[day], open: e.target.value } })}
                                                    />
                                                </div>
                                                <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 'bold', flexShrink: 0 }}>—</span>
                                                <div style={{ flex: 1, maxWidth: isMobile ? 'none' : '130px' }}>
                                                    <input
                                                        type="time"
                                                        style={{ ...timeInputStyle, opacity: isClosed ? 0.3 : 1 }}
                                                        value={hours[day]?.close || '22:00'}
                                                        disabled={isClosed}
                                                        onChange={e => setHours({ ...hours, [day]: { ...hours[day], close: e.target.value } })}
                                                    />
                                                </div>
                                                {/* Desktop closed toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDayClosed(day)}
                                                    style={{
                                                        display: isMobile ? 'none' : 'flex',
                                                        alignItems: 'center', gap: '0.4rem',
                                                        padding: '0.4rem 0.9rem', borderRadius: '100px',
                                                        border: `1px solid ${isClosed ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                                        background: isClosed ? 'rgba(255,60,60,0.15)' : 'transparent',
                                                        color: isClosed ? '#f87171' : 'rgba(255,255,255,0.4)',
                                                        fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                                                        flexShrink: 0, whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {isClosed ? '🔴 Cerrado' : '✓ Abierto'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button type="button" onClick={nextStep} style={buttonStyle}>
                                Detalles del Negocio <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: Contact & Presence ── */}
                    {step === 2 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Store color="var(--color-neon-purple)" size={isMobile ? 20 : 24} /> Contacto y Presencia
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
                                {/* WhatsApp with +57 prefix */}
                                <div>
                                    <label style={labelStyle}>Número de WhatsApp</label>
                                    <div style={{ ...inputContainerStyle }}>
                                        <Phone size={18} style={iconStyle} />
                                        <div style={{
                                            position: 'absolute', left: '3rem', top: '50%', transform: 'translateY(-50%)',
                                            color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: '0.95rem',
                                            borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '0.75rem',
                                            lineHeight: 1
                                        }}>+57</div>
                                        <input
                                            placeholder="300 000 0000"
                                            style={{ ...inputStyle, paddingLeft: '7.5rem' }}
                                            value={whatsappNumber}
                                            maxLength={10}
                                            onFocus={e => e.target.select()}
                                            onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                                        El botón "Chat" del landing usará este número con prefijo +57.
                                    </p>
                                </div>

                                {/* Price range */}
                                <div>
                                    <label style={labelStyle}>Rango de Precios</label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        {[1, 2, 3, 4].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriceRange(p)}
                                                style={{
                                                    flex: 1, padding: isMobile ? '0.75rem' : '1rem', borderRadius: '16px', border: '1px solid',
                                                    borderColor: priceRange === p ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.05)',
                                                    background: priceRange === p ? 'rgba(20, 184, 166, 0.1)' : 'rgba(255,255,255,0.02)',
                                                    color: priceRange === p ? 'white' : 'rgba(255,255,255,0.4)',
                                                    display: 'flex', justifyContent: 'center', gap: '1px', cursor: 'pointer'
                                                }}
                                            >
                                                {Array.from({ length: p }).map((_, i) => <DollarSign key={i} size={isMobile ? 14 : 16} />)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cover image — file upload */}
                                <div>
                                    <label style={labelStyle}>Imagen de Portada del Local</label>
                                    <div
                                        onClick={() => coverImageRef.current?.click()}
                                        style={{
                                            position: 'relative', borderRadius: '20px', overflow: 'hidden',
                                            border: '2px dashed rgba(255,255,255,0.15)', cursor: 'pointer',
                                            height: coverImagePreview ? 'auto' : '120px',
                                            background: 'rgba(255,255,255,0.02)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {coverImagePreview ? (
                                            <>
                                                <img src={coverImagePreview} alt="Portada" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '18px' }} />
                                                <div style={{
                                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    opacity: 0, transition: 'opacity 0.2s',
                                                    borderRadius: '18px'
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                                >
                                                    <Camera size={28} color="white" />
                                                    <span style={{ color: 'white', fontWeight: '800', marginLeft: '0.5rem' }}>Cambiar</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                                                <ImageIcon size={32} style={{ marginBottom: '0.5rem' }} />
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700' }}>Haz clic para subir portada</p>
                                                <p style={{ margin: 0, fontSize: '0.75rem' }}>JPG, PNG, WEBP</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={coverImageRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={handleCoverImageChange}
                                    />
                                </div>

                                {/* Vibes */}
                                <div>
                                    <label style={labelStyle}>Selecciona los Vibes del Local</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '10px' }}>
                                        {VIBE_OPTIONS.map(vibe => (
                                            <button
                                                key={vibe.label}
                                                type="button"
                                                onClick={() => toggleVibe(vibe.label)}
                                                style={{
                                                    padding: '0.75rem', borderRadius: '16px', border: '1px solid',
                                                    borderColor: selectedVibes.includes(vibe.label) ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.05)',
                                                    background: selectedVibes.includes(vibe.label) ? 'rgba(111, 66, 193, 0.1)' : 'rgba(255,255,255,0.02)',
                                                    color: selectedVibes.includes(vibe.label) ? 'white' : 'rgba(255,255,255,0.4)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer'
                                                }}
                                            >
                                                <vibe.icon size={18} />
                                                <span style={{ fontSize: '0.75rem' }}>{vibe.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={prevStep} style={backButtonStyle}><ChevronLeft /></button>
                                <button type="button" onClick={nextStep} style={buttonStyle}>
                                    {isMobile ? 'Destacados' : 'Destacados y Menú'} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Menu + Gallery + Description ── */}
                    {step === 3 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Utensils color="var(--color-neon-purple)" size={isMobile ? 20 : 24} /> Destacados y Menú
                            </h2>

                            {/* Menu — mode toggle */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>Formato del Menú</label>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    {(['images', 'pdf'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setMenuMode(mode)}
                                            style={{
                                                flex: 1, padding: '0.85rem', borderRadius: '16px', border: '1px solid',
                                                borderColor: menuMode === mode ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.08)',
                                                background: menuMode === mode ? 'rgba(111,66,193,0.1)' : 'rgba(255,255,255,0.02)',
                                                color: menuMode === mode ? 'white' : 'rgba(255,255,255,0.4)',
                                                fontWeight: '700', fontSize: isMobile ? '0.85rem' : '0.95rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                            }}
                                        >
                                            {mode === 'images' ? <><ImageIcon size={16} /> Fotos (máx. 5)</> : <><FileText size={16} /> Archivo PDF</>}
                                        </button>
                                    ))}
                                </div>

                                {menuMode === 'images' ? (
                                    <div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                            {menuFiles.map((f, i) => (
                                                <div key={i} style={{ position: 'relative' }}>
                                                    <img
                                                        src={URL.createObjectURL(f)}
                                                        alt=""
                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                    />
                                                    <button type="button" onClick={() => setMenuFiles(p => p.filter((_, idx) => idx !== i))} style={removeImgBtnStyle}>
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {menuFiles.length < 5 && (
                                                <button type="button" onClick={() => menuInputRef.current?.click()} style={addImgBtnStyle}>
                                                    <Plus size={20} />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            ref={menuInputRef} type="file" multiple
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            style={{ display: 'none' }}
                                            onChange={handleMenuImagesChange}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>
                                            Mínimo 0, máximo 5 imágenes. Solo JPG/PNG/WEBP.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div
                                            onClick={() => menuPDFRef.current?.click()}
                                            style={{
                                                border: `2px dashed ${menuPDF ? 'rgba(111,66,193,0.5)' : 'rgba(255,255,255,0.15)'}`,
                                                borderRadius: '16px', padding: '1.5rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                background: menuPDF ? 'rgba(111,66,193,0.05)' : 'rgba(255,255,255,0.02)'
                                            }}
                                        >
                                            <FileText size={32} color={menuPDF ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.2)'} />
                                            <div>
                                                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>
                                                    {menuPDF ? menuPDF.name : 'Subir menú en PDF'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Solo archivos .pdf</p>
                                            </div>
                                        </div>
                                        <input ref={menuPDFRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handleMenuPDFChange} />
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0 1.5rem' }}>
                                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: '800', textTransform: 'uppercase' }}>o añade items al menú</span>
                                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: isMobile ? '1.25rem' : '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '1rem' }}>Añadir un Producto</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 100px', gap: '1rem', marginBottom: '1rem' }}>
                                    <input placeholder="Nombre" style={inputStyle} value={newItem.name} onFocus={e => e.target.select()} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                    <input placeholder="Precio" style={inputStyle} value={newItem.price} onFocus={e => e.target.select()} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                                    <input placeholder="Descripción..." style={{ ...inputStyle, flex: 1 }} value={newItem.description} onFocus={e => e.target.select()} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                                    <button type="button" onClick={addMenuItem} style={{ ...buttonStyle, width: isMobile ? '100%' : 'auto', padding: '0.75rem 1.5rem', background: 'var(--color-neon-teal)', boxShadow: 'none' }}>
                                        <Plus size={18} /> Añadir
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                                {menuItems.map((item, i) => (
                                    <div key={i} style={{ ...itemRowStyle, padding: isMobile ? '1rem' : '1rem 1.5rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '700', fontSize: isMobile ? '0.9rem' : '1rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{item.description}</div>
                                        </div>
                                        <div style={{ fontWeight: '800', color: 'var(--color-neon-teal)', fontSize: isMobile ? '0.9rem' : '1rem' }}>${item.price}</div>
                                        <button type="button" onClick={() => setMenuItems(menuItems.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Section divider */}
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2rem 0' }} />

                            {/* Gallery + Description + Address */}
                            <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <ImageIcon size={20} color="var(--color-neon-teal)" />
                                Imágenes y Descripción del Local
                            </h3>

                            {/* Gallery images */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>Imágenes del Carrusel (máx. 5, mín. 1)</label>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    {galleryPreviews.map((src, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <img
                                                src={src} alt=""
                                                style={{ width: isMobile ? '70px' : '90px', height: isMobile ? '70px' : '90px', objectFit: 'cover', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}
                                            />
                                            <button type="button" onClick={() => removeGalleryImage(i)} style={removeImgBtnStyle}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {galleryFiles.length < 5 && (
                                        <button type="button" onClick={() => galleryInputRef.current?.click()} style={{ ...addImgBtnStyle, width: isMobile ? '70px' : '90px', height: isMobile ? '70px' : '90px' }}>
                                            <Plus size={24} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={galleryInputRef} type="file" multiple
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleGalleryChange}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>
                                    Estas imágenes se verán en el carrusel de la tarjeta del local en el landing. Mínimo 1.
                                </p>
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>Descripción del Local</label>
                                <textarea
                                    rows={isMobile ? 3 : 4}
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: '90px' }}
                                    placeholder="Cuéntale a los parceros qué hace especial tu local..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Address */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={labelStyle}>Dirección del Local</label>
                                <input
                                    style={inputStyle}
                                    placeholder="Calle 10 #5-20, Bello, Antioquia"
                                    value={address}
                                    onFocus={e => e.target.select()}
                                    onChange={e => setAddress(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={prevStep} style={backButtonStyle}><ChevronLeft /></button>
                                <button type="button" onClick={nextStep} style={buttonStyle}>
                                    Ofertas Especiales <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Special Offers ── */}
                    {step === 4 && (
                        <div className="fade-in">
                            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles color="var(--color-neon-teal)" size={isMobile ? 20 : 24} /> Ofertas Especiales (Opcional)
                            </h2>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>¿Cómo prefieres subir tus ofertas?</label>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    {(['manual', 'pdf'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setOffersMode(mode)}
                                            style={{
                                                flex: 1, padding: '0.85rem', borderRadius: '16px', border: '1px solid',
                                                borderColor: offersMode === mode ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.08)',
                                                background: offersMode === mode ? 'rgba(20, 184, 166, 0.1)' : 'rgba(255,255,255,0.02)',
                                                color: offersMode === mode ? 'white' : 'rgba(255,255,255,0.4)',
                                                fontWeight: '700', fontSize: isMobile ? '0.85rem' : '0.95rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                            }}
                                        >
                                            {mode === 'manual' ? <><Plus size={16} /> Escritura Manual</> : <><FileText size={16} /> Archivo PDF</>}
                                        </button>
                                    ))}
                                </div>

                                {offersMode === 'manual' ? (
                                    <div>
                                        {/* Added offers list */}
                                        {specialOffers.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                                {specialOffers.map((offer, i) => (
                                                    <div key={i} style={{ ...itemRowStyle, padding: isMobile ? '1rem' : '1rem 1.5rem', borderColor: 'rgba(20, 184, 166, 0.1)' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '800', fontSize: isMobile ? '0.9rem' : '1rem', color: 'white' }}>{offer.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{offer.description}</div>
                                                        </div>
                                                        <div style={{ fontWeight: '900', color: 'var(--color-neon-teal)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{offer.price}</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button type="button" onClick={() => editSpecialOffer(i)} style={{ background: 'transparent', border: 'none', color: 'var(--color-neon-teal)', cursor: 'pointer', padding: '5px' }}>
                                                                <FileText size={16} />
                                                            </button>
                                                            <button type="button" onClick={() => setSpecialOffers(specialOffers.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '5px' }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {isAddingOffer ? (
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: isMobile ? '1.25rem' : '1.5rem', borderRadius: '24px', border: '1px solid rgba(20, 184, 166, 0.2)', marginBottom: '2rem', animation: 'fadeIn 0.3s ease' }}>
                                                <h3 style={{ fontSize: '0.8rem', color: 'var(--color-neon-teal)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>
                                                    {editingOfferIndex !== null ? 'Editar Oferta' : 'Nueva Oferta'}
                                                </h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 120px', gap: '1rem', marginBottom: '1rem' }}>
                                                    <input placeholder="Nombre (ej. 2x1 en Mojitos)" style={inputStyle} value={newOffer.name} autoFocus onChange={e => setNewOffer({ ...newOffer, name: e.target.value })} />
                                                    <input placeholder="Precio (Opcional)" style={inputStyle} value={newOffer.price} onChange={e => setNewOffer({ ...newOffer, price: e.target.value })} />
                                                </div>
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <input placeholder="Descripción corta (opcional)" style={inputStyle} value={newOffer.description} onChange={e => setNewOffer({ ...newOffer, description: e.target.value })} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <button type="button" onClick={() => { setIsAddingOffer(false); setEditingOfferIndex(null); }} style={{ ...backButtonStyle, flex: 1, padding: '0.75rem' }}>Cancelar</button>
                                                    <button type="button" onClick={addSpecialOffer} style={{ ...buttonStyle, flex: 2, padding: '0.75rem', background: 'var(--color-neon-teal)', boxShadow: 'none' }}>
                                                        <Check size={18} /> {editingOfferIndex !== null ? 'Guardar Cambios' : 'Confirmar Oferta'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            specialOffers.length < 10 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsAddingOffer(true)}
                                                    style={{ 
                                                        width: '100%', padding: '1.25rem', borderRadius: '20px', 
                                                        background: 'rgba(20, 184, 166, 0.05)', border: '2px dashed rgba(20, 184, 166, 0.3)',
                                                        color: 'var(--color-neon-teal)', fontWeight: '800', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                                        marginBottom: '2rem'
                                                    }}
                                                >
                                                    <PlusCircle size={24} /> AÑADIR OFERTA ESPECIAL
                                                </button>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div
                                            onClick={() => offersPDFRef.current?.click()}
                                            style={{
                                                border: `2px dashed ${offersPDF ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.15)'}`,
                                                borderRadius: '16px', padding: '1.5rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                background: offersPDF ? 'rgba(20, 184, 166, 0.05)' : 'rgba(255,255,255,0.02)'
                                            }}
                                        >
                                            <FileText size={32} color={offersPDF ? 'var(--color-neon-teal)' : 'rgba(255,255,255,0.2)'} />
                                            <div>
                                                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>
                                                    {offersPDF ? offersPDF.name : 'Subir ofertas en PDF'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Solo archivos .pdf</p>
                                            </div>
                                        </div>
                                        <input ref={offersPDFRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handleOffersPDFChange} />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={prevStep} style={backButtonStyle}><ChevronLeft /></button>
                                <button type="submit" disabled={loading} style={{ ...buttonStyle, background: 'linear-gradient(135deg, var(--color-neon-purple) 0%, #a855f7 100%)' }}>
                                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Lanzar Portal</>}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <style>{`
                .fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                input[type="time"] { position: relative; }
                input[type="time"]::-webkit-calendar-picker-indicator {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: transparent; color: transparent; cursor: pointer;
                }
            `}</style>
        </div>
    );
};

// ── Styles ──
const formContainerStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '40px',
    padding: '3.5rem',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
};

const dayRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.3s'
};

const timeInputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '0.7rem 1rem',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    textAlign: 'center',
    transition: 'all 0.3s',
    appearance: 'none'
};

const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '1rem 1.5rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: '1rem',
    marginLeft: '0.5rem',
    letterSpacing: '1px'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '100px',
    padding: '0.75rem 1.5rem',
    color: 'white',
    outline: 'none',
    fontSize: '1rem',
    transition: 'all 0.3s',
    boxSizing: 'border-box'
};

const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
};

const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1.25rem',
    color: 'rgba(255,255,255,0.2)'
};

const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '1.2rem',
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
    gap: '10px',
    boxShadow: '0 8px 25px rgba(111, 66, 193, 0.3)',
    transition: 'all 0.3s'
};

const backButtonStyle: React.CSSProperties = {
    width: '80px',
    borderRadius: '100px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const removeImgBtnStyle: React.CSSProperties = {
    position: 'absolute', top: '-6px', right: '-6px',
    width: '22px', height: '22px', borderRadius: '50%',
    background: '#ef4444', border: '2px solid #030305',
    color: 'white', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0
};

const addImgBtnStyle: React.CSSProperties = {
    width: '80px', height: '80px', borderRadius: '14px',
    border: '2px dashed rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.02)',
    color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s'
};

export default Onboarding;
