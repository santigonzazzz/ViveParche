import api from '../services/api';
import type { Event } from '../types';
// import api from './api';

export type EventData = Event;


// Create axios instance with auth interceptor
// Note: Do NOT set Content-Type here — let axios auto-detect per request
// (needed so FormData requests get proper multipart/form-data + boundary header)


export interface DashboardSummaryData {
    total_attendees: number;
    avg_attendees_2weeks: number;
    attendees_trend?: 'up' | 'down';
    total_revenue: number;
    revenue_growth_month: number;
    avg_satisfaction: number;
    satisfaction_trend_2weeks: number;
    subscription_plan?: string;
    subscription_tier?: string;
}

export interface SalesChartData {
    labels: string[];
    data: number[];
    period: 'week' | 'month';
}

export interface AISuggestion {
    id: string;
    title: string;
    description: string;
    type: string;
    target_audience?: string;
    channels?: string[];
    status?: string;
    created_at?: string;
}

export interface SubscriptionInfo {
    plan_type: string;
    status: string;
    started_at: string;
    expires_at?: string;
    features: Record<string, boolean>;
    limits: Record<string, number>;
    usage_stats?: {
        events_this_month: number;
        team_members_count: number;
    };
}

export interface TeamMember {
    id: string;
    user_id: string;
    full_name: string;
    email?: string;
    role: string;
    created_at: string;
}


export interface TeamInvitation {
    email: string;
    role: 'staff' | 'manager';
}

// --- OBJETO BUSINESS API COMPLETO ---
export const businessApi = {
    // --- DASHBOARD & ANALYTICS ---
    getDashboardSummary: async (venueId?: string): Promise<DashboardSummaryData> => {
        const url = venueId
            ? `business/dashboard/summary?venue_id=${venueId}`
            : 'business/dashboard/summary';
        const response = await api.get(url);
        const data = response.data;
        return {
            total_attendees: data.total_attendees || 0,
            avg_attendees_2weeks: data.avg_attendees_2weeks || 0,
            attendees_trend: data.avg_attendees_2weeks > 0 ? 'up' : 'down',
            total_revenue: data.total_revenue || 0,
            revenue_growth_month: data.revenue_growth_month || 0,
            avg_satisfaction: data.avg_satisfaction || 0,
            satisfaction_trend_2weeks: data.satisfaction_trend_2weeks || 0,
            subscription_plan: data.subscription_plan
        };
    },

    getSalesChart: async (period: 'week' | 'month' = 'week', venueId?: string): Promise<SalesChartData> => {
        let url = `business/dashboard/sales-chart?period=${period}`;
        if (venueId) url += `&venue_id=${venueId}`;
        const response = await api.get(url);
        return {
            labels: response.data.labels || [],
            data: response.data.data || [],
            period: response.data.period || period
        };
    },

    getTrafficChart: async (period: 'week' | 'month' = 'week', venueId?: string): Promise<SalesChartData> => {
        let url = `business/dashboard/traffic-chart?period=${period}`;
        if (venueId) url += `&venue_id=${venueId}`;
        const response = await api.get(url);
        return {
            labels: response.data.labels || [],
            data: response.data.data || [],
            period: response.data.period || period
        };
    },

    getEventAnalytics: async (eventId?: string): Promise<any> => {
        const url = eventId
            ? `business/analytics/events?event_id=${eventId}`
            : 'business/analytics/events';
        const response = await api.get(url);
        return response.data;
    },

    // --- EVENTS MANAGEMENT ---
    getEvents: async (venueId?: string): Promise<any[]> => {
        const url = venueId ? `business/events?venue_id=${venueId}` : 'business/events';
        const response = await api.get(url);
        const data = Array.isArray(response.data) ? response.data : [];
        return data.map((event: any) => ({
            ...event,
            date: event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date',
            attendees: event.tickets_sold || 0,
            revenue: (event.price || 0) * (event.tickets_sold || 0),
            status: new Date(event.event_date) > new Date() ? 'upcoming' : 'completed',
            image: event.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'
        }));
    },

    getEventDetail: async (eventId: string): Promise<EventData> => {
        const response = await api.get(`business/events/${eventId}`);
        return response.data;
    },

    updateEvent: async (eventId: string, payload: Record<string, any>): Promise<any> => {
        const response = await api.patch(`events/${eventId}`, payload);
        return response.data;
    },

    getAISuggestions: async (limit: number = 5): Promise<AISuggestion[]> => {
        const response = await api.get(`business/ai-suggestions?limit=${limit}`);
        return response.data.suggestions || [];
    },

    sendCampaign: async (suggestionId: string, channels: string[]): Promise<any> => {
        const response = await api.post(`business/ai-suggestions/${suggestionId}/send`, { channels });
        return response.data;
    },

    // --- SUBSCRIPTION & PAYMENTS ---
    getSubscription: async (venueId?: string): Promise<SubscriptionInfo> => {
        const url = venueId ? `business/subscription?venue_id=${venueId}` : 'business/subscription';
        const response = await api.get(url);
        return response.data;
    },

    submitPaymentProof: async (venueId: string, planType: string, file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('venue_id', venueId);
        formData.append('plan_type', planType);
        formData.append('file', file); // Backend expects 'file', NOT 'proof'
        const response = await api.post('subscriptions/submit-proof', formData, {
            headers: { 'Content-Type': undefined }, // Let browser set multipart boundary
        });
        return response.data;
    },

    // --- TEAM MANAGEMENT ---
    getTeamMembers: async (): Promise<any[]> => {
        const response = await api.get('team/members');
        return Array.isArray(response.data) ? response.data : [];
    },

    getVenueTeam: async (venueId?: string): Promise<any[]> => {
        const url = venueId ? `team/members?venue_id=${venueId}` : 'team/members';
        const response = await api.get(url);
        return Array.isArray(response.data) ? response.data : [];
    },

    inviteTeamMember: async (invitation: TeamInvitation): Promise<any> => {
        const response = await api.post('team/invite', invitation);
        return response.data;
    },

    joinTeam: async (invitationCode: string): Promise<any> => {
        const response = await api.post('team/join', { invitation_code: invitationCode });
        return response.data;
    },

    removeTeamMember: async (memberId: string): Promise<any> => {
        const response = await api.delete(`team/${memberId}`);
        return response.data;
    },

    updateTeamMember: async (memberId: string, data: { full_name?: string, password?: string }): Promise<any> => {
        const response = await api.put(`team/members/${memberId}`, data);
        return response.data;
    },

    // --- TICKETING ---
    validateTicket: async (data: { qr_code_token?: string, text_code?: string }): Promise<any> => {
        const response = await api.post('tickets/validate', data);
        return response.data;
    },

    getEventAttendees: async (eventId: string): Promise<any[]> => {
        const response = await api.get(`tickets/event/${eventId}/attendees`);
        return Array.isArray(response.data) ? response.data : [];
    },

    getEventTicketingStats: async (eventId: string): Promise<any> => {
        const response = await api.get(`tickets/event/${eventId}/stats`);
        return response.data;
    },

    // --- VENUE PROFILE ---
    getVenueProfile: async (venueId?: string): Promise<any> => {
        const url = venueId ? `venues/profile?venue_id=${venueId}` : 'venues/profile';
        const response = await api.get(url);
        return response.data;
    },

    updateVenueProfile: async (data: any): Promise<any> => {
        const response = await api.put('venues/profile', data);
        return response.data;
    },

    addVenueMenuItem: async (item: any): Promise<any> => {
        const response = await api.post('venues/items', item);
        return response.data;
    },

    uploadVenueFile: async (file: File, fileType: string = 'venue_image', userId?: string): Promise<{ url: string, menu_text?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);
        if (userId) formData.append('user_id', userId);

        const response = await api.post('venues/upload-file', formData, {
            headers: { 'Content-Type': undefined }
        });
        return response.data;
    },

    uploadLogo: async (file: File, userId?: string): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        if (userId) formData.append('user_id', userId);

        const response = await api.post('settings/upload-logo', formData, {
            headers: { 'Content-Type': undefined }
        });
        return response.data;
    },

    // --- PERKS & COUPONS ---
    getEventPerks: async (eventId: string): Promise<any[]> => {
        const response = await api.get(`perks/event/${eventId}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    createPerk: async (perk: any): Promise<any> => {
        const response = await api.post('perks', perk);
        return response.data;
    },

    deletePerk: async (perkId: string): Promise<any> => {
        const response = await api.delete(`perks/${perkId}`);
        return response.data;
    },

    generatePerkSuggestions: async (eventDetails: any): Promise<any[]> => {
        const response = await api.post('perks/generate-suggestions', { event_details: eventDetails });
        return Array.isArray(response.data) ? response.data : [];
    },

    getActivePerks: async (venueId?: string): Promise<any[]> => {
        const url = venueId ? `perks/active?venue_id=${venueId}` : 'perks/active';
        const response = await api.get(url);
        return Array.isArray(response.data) ? response.data : [];
    },

    // --- AUTH ---
    login: async (credentials: any): Promise<any> => {
        const response = await api.post('auth/login', credentials);
        const role = response.data.user?.role;
        // Allow owners and workers; block customers and other roles
        if (!['owner', 'worker'].includes(role)) {
            throw new Error('Esta cuenta no tiene acceso al portal de negocios. Inicia sesión con tu cuenta de dueño o mesero.');
        }
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    registerBusiness: async (data: any): Promise<any> => {
        const response = await api.post('auth/business/register', data, {
            headers: { 'Content-Type': undefined }
        });
        return response.data;
    },

    verifyOTP: async (email: string, code: string): Promise<any> => {
        const response = await api.post('auth/verify', { email, code });
        return response.data;
    }
};
