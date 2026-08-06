export interface Municipality {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
}

export interface Event {
    id: string;
    slug: string;
    title: string;
    description?: string;
    event_date: string; // Changed from start_time
    location_address?: string; // Changed from location_name
    municipality_id: string;
    image_url?: string;
    vibe_tags?: string[];
    price?: number;
    owner_id: string;
    venue_id?: string;
    tickets_sold: number;
    total_tickets: number;
    created_at: string;
    ticket_contact_type?: 'whatsapp' | 'url';
    ticket_contact_value?: string;
    // Computed fields for UI
    status?: 'all' | 'upcoming' | 'completed';
    date?: string;
    attendees?: number;
    revenue?: number;
    image?: string;
    perks_count?: number;
    latitude?: number;
    longitude?: number;
}

export interface EventCreate {
    title: string;
    description?: string;
    event_date: string;
    location_address?: string;
    municipality_id: string;
    owner_id: string; // Required by backend
    venue_id?: string;
    price?: number;
    vibe_tags?: string[];
    image_url?: string;
    ticket_contact_type?: 'whatsapp' | 'url';
    ticket_contact_value?: string;
}

export interface Place {
    id: string;
    slug: string;
    name: string;
    description?: string;
    image_url?: string;
    vibe_tags?: string[];
    municipality_id: string;
    rating: number;
    review_count?: number;
    is_open: boolean;
    distance?: string; // e.g. "0.8 km" (legacy)
    distance_km?: number; // From backend
    latitude?: number;
    longitude?: number;
    category?: string;
    status?: string; // 'active' | 'inactive'
    completion_percentage?: number; // 0-100
    address?: string;
    whatsapp_number?: string;
    subscription_tier?: string;
    special_offers_pdf_url?: string;
    special_offers_text?: string;
    special_offers_json?: any[];
    price_range?: number; // 1-4
    opening_hours?: { [key: string]: { open?: string; close?: string; closed?: boolean } };
    menu_url?: string;
    menu_text?: string;
    instagram_url?: string;
    facebook_url?: string;
    tiktok_url?: string;
    website_url?: string;
    gallery_images?: string[];
    social_links?: {
        instagram?: string;
        facebook?: string;
        website?: string;
    };
}

export type DiscoveryContext = 'discovery' | 'events' | 'places';
