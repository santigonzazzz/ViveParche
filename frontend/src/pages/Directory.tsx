import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { EventCard } from '../components/EventCard';
import { PlaceCard } from '../components/PlaceCard';
import { Chatbot } from '../components/Chatbot';
import { SegmentedControl } from '../components/SegmentedControl';
import { CustomerChatWindow } from '../components/CustomerChatWindow';
import { municipalityService, eventService, discoveryService, aiService } from '../services/api';
import type { Event, Municipality, Place, DiscoveryContext } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Music, Globe, Coffee, Mountain, ChevronRight, ChevronLeft, Sparkles, MapPin, ShoppingBag, Utensils, X, Wand2, Search } from 'lucide-react';

import { MobileNav } from '../components/MobileNav';
import { Footer } from '../components/Footer';
import VenueMap from '../components/VenueMap';

export const Directory: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const eventsRef = useRef<HTMLDivElement>(null);
    const placesRef = useRef<HTMLDivElement>(null);

    const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = isMobile ? 300 : 400;
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [selectedVibe, setSelectedVibe] = useState<string>('');
    const [events, setEvents] = useState<Event[]>([]);
    const [venues, setVenues] = useState<Place[]>([]);
    const [activeTab, setActiveTab] = useState<DiscoveryContext>((searchParams.get('tab') as DiscoveryContext) || 'discovery');
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [activeChatVenue, setActiveChatVenue] = useState<{ id: string, name: string, menuUrl?: string } | null>(null);
    // AI Vibe Search state
    const [vibeQuery, setVibeQuery] = useState<string>('');
    const [aiSearchLoading, setAiSearchLoading] = useState(false);
    const [aiSearchActive, setAiSearchActive] = useState(false);
    const [aiMessage, setAiMessage] = useState<string>('');
    const [aiResultEvents, setAiResultEvents] = useState<Event[]>([]);
    const [aiResultVenues, setAiResultVenues] = useState<Place[]>([]);

    // Lazy Loading state
    const [visibleEventsCount, setVisibleEventsCount] = useState(5);
    const [visibleVenuesCount, setVisibleVenuesCount] = useState(5);

    const CACHE_KEY = 'vibe_landing_data_v4';
    const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Check Cache first
                const cachedData = localStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const { events: cEvents, venues: cVenues, timestamp } = JSON.parse(cachedData);
                    if (Date.now() - timestamp < CACHE_TTL) {
                        console.log('Using cached landing data');
                        
                        const venueId = searchParams.get('venueId');
                        if (venueId) {
                            setEvents(cEvents.filter((e: any) => e.venue_id === venueId));
                            setActiveTab('events');
                        } else {
                            setEvents(cEvents);
                        }
                        
                        setVenues(cVenues);

                        // We still need municipalities for filters
                        const munis = await municipalityService.getAll();
                        setMunicipalities(munis);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Cargar municipios (con cache interna)
                const munis = await municipalityService.getAll();
                setMunicipalities(munis);

                // 3. Cargar eventos
                const allEvents = await eventService.getAll();

                // Handle venue filtering from URL
                const venueId = searchParams.get('venueId');
                let filteredEvents = allEvents;
                if (venueId) {
                    filteredEvents = allEvents.filter(e => e.venue_id === venueId);
                    setActiveTab('events');
                }
                setEvents(filteredEvents);

                // 4. Cargar Venues Iniciales
                let initialVenues: Place[] = [];
                if (munis.length > 0) {
                    const topMunis = munis.slice(0, 3);
                    const initialVenuesPromises = topMunis.map(muni =>
                        discoveryService.getHybrid(muni.id, userLocation?.lat, userLocation?.lng)
                    );

                    const discoveryResults = await Promise.all(initialVenuesPromises);
                    initialVenues = discoveryResults.flatMap(res => res.venues || []);

                    // Deduplicate
                    const uniqueVenues = Array.from(new Map(initialVenues.map(v => [v.id, v])).values());
                    setVenues(uniqueVenues);

                    // Save to cache
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        events: allEvents,
                        venues: uniqueVenues,
                        timestamp: Date.now()
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch initial data", err);
            } finally {
                setLoading(false);
            }
        };

        // Get user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.log("Location access denied or error:", error)
            );
        }

        fetchInitialData();
    }, [searchParams]); // Re-fetch if searchParams change


    const handleVibeChange = async (vibe: string) => {
        if (selectedVibe === vibe && vibe !== '') {
            setSelectedVibe('');
            vibe = '';
        } else {
            setSelectedVibe(vibe);
        }

        setLoading(true);

        try {
            // Handle "all", "trending", "events", "places" - should show broad results
            if (!vibe || vibe === 'all' || vibe === 'trending' || vibe === 'most popular' || vibe === 'events' || vibe === 'places') {
                // Fetch events
                if (vibe !== 'places') {
                    const allEvents = await eventService.getAll();
                    setEvents(allEvents);
                } else {
                    setEvents([]);
                }

                // Fetch venues - OPTIMIZACIÓN: Solo si el tab activo es places o discovery
                if (vibe !== 'events' && (activeTab === 'places' || activeTab === 'discovery')) {
                    // Si ya tenemos venues cargados y estamos reseteando a 'all', no necesitamos re-pedir todo
                    if (venues.length === 0 || vibe === 'all') {
                        const topMunis = municipalities.slice(0, 5); // Aumentamos a 5 para el filtro pero no a los 26
                        const allVenuesPromises = topMunis.map(async (muni: Municipality) => {
                            const data = await discoveryService.getHybrid(muni.id, userLocation?.lat, userLocation?.lng);
                            return data.venues || [];
                        });
                        const venuesArrays = await Promise.all(allVenuesPromises);
                        const allVenues = venuesArrays.flat();
                        const uniqueVenues = Array.from(new Map(allVenues.map(v => [v.id, v])).values());
                        setVenues(uniqueVenues);
                    }
                } else if (vibe === 'events') {
                    setVenues([]);
                }
            } else {
                // Filter by vibe based on active tab
                if (activeTab === 'events' || activeTab === 'discovery') {
                    const vibeEvents = await eventService.getByVibe(vibe);
                    setEvents(vibeEvents);
                }

                if (activeTab === 'places' || activeTab === 'discovery') {
                    // Fetch all venues and filter by vibe
                    if (municipalities.length > 0) {
                        const allVenuesPromises = municipalities.map(async (muni: Municipality) => {
                            const data = await discoveryService.getHybrid(muni.id, userLocation?.lat, userLocation?.lng);
                            return data.venues || [];
                        });
                        const venuesArrays = await Promise.all(allVenuesPromises);
                        const allVenues = venuesArrays.flat();

                        const filteredVenues = allVenues.filter((v: Place) =>
                            v.vibe_tags?.some(tag => tag.toLowerCase().includes(vibe.toLowerCase()))
                        );
                        setVenues(filteredVenues);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getVibes = () => {
        if (activeTab === 'events') {
            return [
                { id: 'concerts', label: 'Conciertos', icon: <Music size={16} /> },
                { id: 'workshops', label: 'Talleres', icon: <Globe size={16} /> },
                { id: 'parties', label: 'Fiestas', icon: <Zap size={16} /> },
                { id: 'arts', label: 'Arte', icon: <Sparkles size={16} /> },
            ];
        }
        if (activeTab === 'places') {
            return [
                { id: 'cafes', label: 'Cafe Bar', icon: <Coffee size={16} /> },
                { id: 'restaurants', label: 'Comida', icon: <Utensils size={16} /> },
                { id: 'retail', label: 'Rumba', icon: <ShoppingBag size={16} /> },
                { id: 'outdoors', label: 'Tranqui', icon: <Mountain size={16} /> },
            ];
        }
        return [
            { id: 'all', label: 'Todos', icon: <Globe size={16} /> },
            { id: 'trending', label: 'Punta de Lanza', icon: <Sparkles size={16} /> },
            { id: 'events', label: 'Parches', icon: <Zap size={16} /> },
            { id: 'places', label: 'Locales', icon: <MapPin size={16} /> },
        ];
    };


    const handleVibeSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vibeQuery.trim()) return;
        setAiSearchLoading(true);
        setAiSearchActive(false);
        try {
            const result = await aiService.vibeSearch(vibeQuery.trim());
            setAiResultEvents(result.events || []);
            setAiResultVenues(result.venues || []);
            setAiMessage(result.ai_message || '');
            setAiSearchActive(true);
        } catch (err) {
            console.error('Vibe search failed:', err);
        } finally {
            setAiSearchLoading(false);
        }
    };

    const clearVibeSearch = () => {
        setAiSearchActive(false);
        setVibeQuery('');
        setAiMessage('');
        setAiResultEvents([]);
        setAiResultVenues([]);
    };

    const handleTabChange = (tab: DiscoveryContext) => {
        setActiveTab(tab);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tab);
        if (tab !== 'events') {
            newParams.delete('venueId');
        }
        setSearchParams(newParams);
    };

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '8rem', backgroundColor: 'var(--color-bg)' }}>
            <Navbar />

            {/* Hero Section */}
            <header style={{
                paddingTop: '10rem',
                paddingBottom: '6rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Glows */}
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '80%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(189, 0, 255, 0.08) 0%, transparent 70%)',
                    zIndex: 0
                }}></div>

                <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', gap: isMobile ? '2rem' : '4rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ maxWidth: '700px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}>
                                    <span style={{ width: '8px', height: '8px', background: 'var(--color-neon-teal)', borderRadius: '50%', boxShadow: 'var(--shadow-neon-teal)' }}></span>
                                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>VibeMap en vivo</span>
                                </div>
                                <SegmentedControl activeTab={activeTab} onChange={handleTabChange} />
                            </div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1, fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '-0.03em' }}
                            >
                                Descubre la <span className="neon-text-purple">Buena Vibra</span> <br /> de tu Ciudad.
                            </motion.h1>

                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '550px', lineHeight: 1.6 }}>
                                Descubre parches impulsados por IA. Deja de buscar y empieza a vivir.
                            </p>

                            {/* === AI VIBE SEARCH BAR === */}
                            <div style={{ position: 'relative', maxWidth: '850px', marginBottom: '1.5rem' }}>
                                <form onSubmit={handleVibeSearch}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: aiSearchActive
                                            ? 'rgba(189, 0, 255, 0.07)'
                                            : 'rgba(255,255,255,0.03)',
                                        border: aiSearchActive
                                            ? '1px solid rgba(189, 0, 255, 0.5)'
                                            : '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '16px',
                                        padding: isMobile ? '4px' : '6px 6px 6px 0',
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: aiSearchActive
                                            ? '0 0 30px rgba(189, 0, 255, 0.2)'
                                            : '0 10px 40px rgba(0,0,0,0.3)',
                                        transition: 'all 0.4s ease',
                                        flexDirection: isMobile ? 'column' : 'row',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                            {/* AI Badge */}
                                            {!isMobile && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    padding: '0.5rem 1.2rem',
                                                    borderRight: '1px solid rgba(255,255,255,0.1)',
                                                    marginRight: '0.5rem',
                                                    color: 'var(--color-neon-purple)',
                                                    flexShrink: 0,
                                                }}>
                                                    <Sparkles size={18} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em' }}>AI</span>
                                                </div>
                                            )}
                                            
                                            {/* Search Icon */}
                                            <div style={{ paddingLeft: isMobile ? '1rem' : '0.5rem', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                                <Search size={18} />
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Describe tu parche... 'un sitio tranqui para una cita' o 'rumba pesada'"
                                                value={vibeQuery}
                                                onChange={(e) => setVibeQuery(e.target.value)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    outline: 'none',
                                                    padding: isMobile ? '0.75rem 0.5rem' : '0.85rem 0.5rem',
                                                    fontSize: isMobile ? '0.9rem' : '1rem',
                                                    width: '100%',
                                                    color: 'white',
                                                }}
                                            />
                                        </div>

                                        {/* Clear button when AI search is active */}
                                        {aiSearchActive && (
                                            <button
                                                type="button"
                                                onClick={clearVibeSearch}
                                                style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.7)',
                                                    borderRadius: '50%',
                                                    width: '32px',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    marginRight: '0.4rem',
                                                    flexShrink: 0,
                                                }}
                                                title="Clear AI search"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={aiSearchLoading}
                                            style={{
                                                background: aiSearchLoading
                                                    ? 'rgba(189, 0, 255, 0.4)'
                                                    : 'var(--color-neon-purple)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                padding: isMobile ? '0.85rem 1.5rem' : '0.85rem 2rem',
                                                color: 'white',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.75rem',
                                                cursor: aiSearchLoading ? 'wait' : 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: 'var(--shadow-neon-purple)',
                                                width: isMobile ? '100%' : 'auto',
                                                marginTop: isMobile ? '4px' : '0',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <Wand2 size={16} />
                                            {aiSearchLoading ? 'Buscando...' : 'Descubrir Parche'}
                                        </button>
                                    </div>
                                </form>

                                {/* Loading typing indicator */}
                                <AnimatePresence>
                                    {aiSearchLoading && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            style={{
                                                position: 'absolute',
                                                top: '105%',
                                                left: '1.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                color: 'var(--color-neon-purple)',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            >
                                                <Sparkles size={16} />
                                            </motion.div>
                                            VibeSeeker AI está leyendo tu energía...
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* === AI Result Banner === */}
                            <AnimatePresence>
                                {aiSearchActive && aiMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        style={{
                                            maxWidth: '850px',
                                            marginBottom: '2rem',
                                            background: 'linear-gradient(135deg, rgba(189,0,255,0.12), rgba(0,243,255,0.06))',
                                            border: '1px solid rgba(189,0,255,0.3)',
                                            borderRadius: '20px',
                                            padding: '1rem 1.5rem',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '1rem',
                                        }}
                                    >
                                        <div style={{ background: 'var(--color-neon-purple)', padding: '8px', borderRadius: '12px', flexShrink: 0 }}>
                                            <Sparkles size={18} color="white" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-neon-teal)', marginBottom: '0.35rem' }}>VibeSeeker AI</div>
                                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{aiMessage}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Vibe Filter Chips (hidden when AI search is active) */}
                            {!aiSearchActive && (
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    {getVibes().map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => handleVibeChange(v.id)}
                                            className="chip"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                background: selectedVibe === v.id ? 'var(--color-neon-purple)' : 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                padding: '0.6rem 1.2rem',
                                                borderRadius: '50px',
                                                fontSize: '0.9rem',
                                                fontWeight: '600',
                                                color: selectedVibe === v.id ? 'white' : 'rgba(255,255,255,0.8)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <span style={{ color: selectedVibe === v.id ? 'white' : 'var(--color-neon-teal)', display: 'flex' }}>
                                                {v.icon}
                                            </span>
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* AI Recommendation Floating Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px',
                                padding: '1.5rem',
                                width: '300px',
                                backdropFilter: 'blur(10px)',
                                position: 'relative',
                                display: 'none' // Hide on smaller screens
                            }}
                            className="ai-recommendation-card"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'var(--color-primary)', padding: '8px', borderRadius: '12px' }}>
                                    <Sparkles size={18} color="black" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-neon-teal)' }}>Recomendación en Vivo</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>VibeSeeker AI</div>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                                "¡Describe tu parche arriba y encontraré los mejores lugares para ti!"
                            </p>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>IMPULSADO POR IA</span>
                                <Sparkles size={14} color="var(--color-neon-purple)" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </header>

            <main className="container">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '5rem' }}>
                        <Sparkles className="neon-text-purple" size={40} />
                        <p style={{ marginTop: '1rem' }}>Sintonizando el parche...</p>
                    </div>
                ) : aiSearchActive ? (
                    /* === AI SEARCH RESULTS VIEW === */
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="ai-results"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}
                        >
                            {aiResultEvents.length > 0 && (
                                <section>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                        <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900 }}>
                                            <span className="neon-text-purple">✨ {aiResultEvents.length}</span> Parches Recomendados
                                        </h2>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                                        {aiResultEvents.map((event: Event) => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                onChat={(id, name) => {
                                                    const venue = venues.find(v => v.id === id) || (event as any).venues;
                                                    setActiveChatVenue({ id, name, menuUrl: venue?.menu_url });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {aiResultVenues.length > 0 && (
                                <section>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                        <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900 }}>
                                            <span className="neon-text-teal">✨ {aiResultVenues.length}</span> Locales Recomendados
                                        </h2>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                                        {aiResultVenues.map((place: Place) => (
                                            <PlaceCard
                                                key={place.id}
                                                place={place}
                                                onChat={(id, name) => setActiveChatVenue({ id, name, menuUrl: place.menu_url })}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {aiResultEvents.length === 0 && aiResultVenues.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '5rem' }}>
                                    <Sparkles className="neon-text-purple" size={40} />
                                    <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>No encontramos resultados. ¡Intenta describir tu parche de otra forma!</p>
                                    <button onClick={clearVibeSearch} style={{ marginTop: '1.5rem', background: 'var(--color-neon-purple)', border: 'none', color: 'white', borderRadius: '50px', padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer' }}>
                                        Ver Todo
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'discovery' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                                    {/* Places Carousel */}
                                    <section>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                            <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', margin: 0, fontWeight: 900 }}>Mejores <span className="neon-text-teal">Locales</span></h2>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => scroll(placesRef, 'left')} style={navButtonStyle}><ChevronLeft size={20} /></button>
                                                <button onClick={() => scroll(placesRef, 'right')} style={navButtonStyle}><ChevronRight size={20} /></button>
                                            </div>
                                        </div>
                                        <div
                                            ref={placesRef}
                                            style={{
                                                display: 'flex',
                                                gap: '2rem',
                                                overflowX: 'auto',
                                                paddingBottom: '1rem',
                                                scrollSnapType: 'x mandatory',
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none'
                                            }}
                                            className="hide-scrollbar"
                                        >
                                            {venues.slice(0, visibleVenuesCount).map((place: Place) => (
                                                <div key={place.id} style={{
                                                    width: isMobile ? '280px' : '350px',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <PlaceCard
                                                        place={place}
                                                        onChat={(id, name) => setActiveChatVenue({ id, name, menuUrl: place.menu_url })}
                                                    />
                                                </div>
                                            ))}
                                            {venues.length > visibleVenuesCount && (
                                                <div style={{ minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setVisibleVenuesCount(prev => prev + 5)}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid var(--color-neon-teal)',
                                                            borderRadius: '50px',
                                                            padding: '1rem 2rem',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Ver más
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Events Carousel (Moved Below Places) */}
                                    <section>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                            <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', margin: 0, fontWeight: 900 }}>Parches <span className="neon-text-purple">Tendencia</span></h2>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => scroll(eventsRef, 'left')} style={navButtonStyle}><ChevronLeft size={20} /></button>
                                                <button onClick={() => scroll(eventsRef, 'right')} style={navButtonStyle}><ChevronRight size={20} /></button>
                                            </div>
                                        </div>
                                        <div
                                            ref={eventsRef}
                                            style={{
                                                display: 'flex',
                                                gap: '2rem',
                                                overflowX: 'auto',
                                                paddingBottom: '1rem',
                                                scrollSnapType: 'x mandatory',
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none'
                                            }}
                                            className="hide-scrollbar"
                                        >
                                            {events.slice(0, visibleEventsCount).map((event: Event) => (
                                                <div key={event.id} style={{
                                                    width: isMobile ? '280px' : '350px',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    <EventCard
                                                        event={event}
                                                        onChat={(id, name) => {
                                                            const venue = venues.find(v => v.id === id) || (event as any).venues;
                                                            setActiveChatVenue({ id, name, menuUrl: venue?.menu_url });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            {events.length > visibleEventsCount && (
                                                <div style={{ minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setVisibleEventsCount(prev => prev + 5)}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid var(--color-neon-purple)',
                                                            borderRadius: '50px',
                                                            padding: '1rem 2rem',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Ver más
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Removed Duplicate Places Carousel */}
                                </div>
                            )}

                            {activeTab === 'places' && (
                                <section>
                                    {/* Header de la sección */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                                            Nuestros <span style={{ color: 'var(--color-neon-teal)' }}>Locales</span>
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                            Los mejores negocios, cafés y lugares ocultos.
                                        </p>
                                    </div>

                                    {/* Botón Toggle Lista / Mapa */}
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '0.5rem',
                                        marginBottom: '2rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '100px',
                                        padding: '4px',
                                        width: 'fit-content',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <button
                                            onClick={() => setShowMap(false)}
                                            style={{
                                                padding: '0.5rem 1.25rem',
                                                borderRadius: '100px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: '700',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.2s',
                                                background: !showMap 
                                                    ? 'var(--color-neon-teal)' 
                                                    : 'transparent',
                                                color: !showMap ? 'black' : 'rgba(255,255,255,0.5)',
                                            }}
                                        >
                                            📋 Lista
                                        </button>
                                        <button
                                            onClick={() => setShowMap(true)}
                                            style={{
                                                padding: '0.5rem 1.25rem',
                                                borderRadius: '100px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: '700',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.2s',
                                                background: showMap 
                                                    ? 'var(--color-neon-teal)' 
                                                    : 'transparent',
                                                color: showMap ? 'black' : 'rgba(255,255,255,0.5)',
                                            }}
                                        >
                                            🗺️ Mapa
                                        </button>
                                    </div>

                                    {/* Vista Mapa */}
                                    {showMap ? (
                                        <VenueMap
                                            venues={venues.map(v => ({
                                                id: v.id,
                                                name: v.name,
                                                latitude: v.latitude,
                                                longitude: v.longitude,
                                                address: v.address,
                                                slug: v.slug
                                            }))}
                                            userLocation={userLocation}
                                            onVenueClick={(slug) => navigate(`/places/${slug}`)}
                                        />
                                    ) : (
                                        /* Vista Lista — igual que antes */
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                                                {venues.slice(0, visibleVenuesCount).map((place: Place) => (
                                                    <div key={place.id} style={{
                                                        width: isMobile ? '280px' : '350px',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        <PlaceCard
                                                            place={place}
                                                            onChat={(id, name) => setActiveChatVenue({ id, name, menuUrl: place.menu_url })}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            {venues.length > visibleVenuesCount && (
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setVisibleVenuesCount(prev => prev + 5)}
                                                        className="btn-secondary"
                                                        style={{ padding: '1rem 4rem' }}
                                                    >
                                                        Cargar más locales
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}

                            {activeTab === 'events' && (
                                <section>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                                            Nuestros <span style={{ color: 'var(--color-neon-purple)' }}>Parches</span>
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                            Encuentra el evento perfecto para hoy.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                                        {events.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                                                No hay parches disponibles en este momento.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                                                {events.slice(0, visibleEventsCount).map((event: Event) => (
                                                    <div key={event.id} style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        <EventCard
                                                            event={event}
                                                            onChat={(id, name) => {
                                                                const venue = venues.find(v => v.id === id) || (event as any).venues;
                                                                setActiveChatVenue({ id, name, menuUrl: venue?.menu_url });
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {events.length > visibleEventsCount && (
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => setVisibleEventsCount(prev => prev + 5)}
                                                    className="btn-secondary"
                                                    style={{ padding: '1rem 4rem' }}
                                                >
                                                    Cargar más parches
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>

            {/* Footer */}
            <Footer />

            <Chatbot />

            {isMobile && <MobileNav />}

            {activeChatVenue && (
                <CustomerChatWindow
                    venueId={activeChatVenue.id}
                    venueName={activeChatVenue.name}
                    menuUrl={activeChatVenue.menuUrl}
                    onClose={() => setActiveChatVenue(null)}
                />
            )}

            <style>{`
                @media (min-width: 1024px) {
                    .ai-recommendation-card {
                        display: block !important;
                    }
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .chip:hover {
                    border-color: var(--color-neon-purple) !important;
                    transform: translateY(-2px);
                }
            `}</style>
        </div >
    );
};

const navButtonStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '0.75rem',
    borderRadius: '50%',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
};


