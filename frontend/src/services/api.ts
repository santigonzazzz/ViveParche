import axios from 'axios';
import type { Event, EventCreate, Municipality, Place } from '../types';

const api = axios.create({
    baseURL: import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api',
    headers: {
        'Content-Type': 'application/json',
        'X-Build-Version': '1.0.1'
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or unauthorized
            localStorage.removeItem('access_token');
            localStorage.removeItem('token'); // Cleanup legacy
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?expired=true';
            }
        }
        return Promise.reject(error);
    }
);

export const authService = {
    getGoogleAuthUrl: async (redirectTo?: string) => {
        const url = redirectTo ? `auth/google?redirect_to=${encodeURIComponent(redirectTo)}` : 'auth/google';
        const response = await api.get(url);
        return response.data;
    },
    register: async (data: any) => {
        const response = await api.post('auth/register', data);
        return response.data;
    },
    login: async (data: any) => {
        const response = await api.post('auth/login', data);
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },
    verify: async (data: { email: string; code: string; password?: string }) => {
        const response = await api.post('auth/verify', data);
        return response.data;
    },
    getMe: async () => {
        const response = await api.get('auth/me');
        return response.data;
    },
    getSystemConfig: async () => {
        const response = await api.get('auth/system/config');
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token'); // Cleanup legacy
        localStorage.removeItem('user');
        window.location.href = 'login/';
    },
    forgotPassword: async (email: string) => {
        const response = await api.post('auth/forgot-password', { email });
        return response.data;
    },
    verifyForgotPassword: async (email: string, code: string) => {
        const response = await api.post('auth/verify-forgot-password', { email, code });
        return response.data;
    },
    resetPassword: async (data: { email: string; code: string; new_password: string }) => {
        const response = await api.post('auth/reset-password', data);
        return response.data;
    },
    resendOtp: async (email: string) => {
        const response = await api.post('auth/resend-otp', { email });
        return response.data;
    },
    syncProfile: async () => {
        const response = await api.get('auth/sync-profile');
        if (response.data) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    }
};

export const eventService = {
    getAll: async () => {
        const response = await api.get<Event[]>('events/');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Event>(`events/${id}`);
        return response.data;
    },
    getByMunicipality: async (municipalityId: string) => {
        const response = await api.get<Event[]>(`events/municipality/${municipalityId}`);
        return response.data;
    },
    getByVibe: async (vibeTags: string) => {
        const response = await api.get<Event[]>(`events/vibe/${vibeTags}`);
        return response.data;
    },
    search: async (query: string) => {
        const response = await api.get<Event[]>(`events/search?query=${encodeURIComponent(query)}`);
        return response.data;
    },
    create: async (event: EventCreate) => {
        const response = await api.post<Event>('events/', event);
        return response.data;
    },
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('events/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getPerks: async (eventId: string) => {
        const response = await api.get(`perks/event/${eventId}`);
        return response.data;
    },
};

export const placeService = {
    getAll: async () => {
        const response = await api.get<Place[]>('venues/');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Place>(`venues/${id}`);
        return response.data;
    },
    getProfile: async () => {
        const response = await api.get<Place>('venues/profile');
        return response.data;
    },
};

export const ticketService = {
    reserve: async (eventId: string, quantity: number, promoCode?: string) => {
        const response = await api.post('tickets/reserve', { event_id: eventId, quantity, promo_code: promoCode });
        return response.data;
    },
    purchase: async (reservationId: string) => {
        const response = await api.post(`tickets/purchase/${reservationId}`);
        return response.data;
    },
    getReservation: async (reservationId: string) => {
        const response = await api.get(`tickets/reservation/${reservationId}`);
        return response.data;
    },
    getMyTickets: async () => {
        const response = await api.get('tickets/my-tickets');
        return response.data;
    },
    validate: async (data: { qr_code_token?: string; text_code?: string }) => {
        const response = await api.post('tickets/validate', data);
        return response.data;
    }
};

export const rewardService = {
    getPassport: async () => {
        const response = await api.get('loyalty/user/wallet');
        return response.data;
    },
    getStoreStats: async (storeId: string) => {
        const response = await api.get(`rewards/stamps/count/${storeId}`);
        return response.data;
    },
    claim: async (storeId: string) => {
        const response = await api.post('rewards/claim', { store_id: storeId });
        return response.data;
    }
};

export const loyaltyService = {
    validateVisit: async (data: { user_hash_id: string; venue_id: string; amount_spent: number; user_lat?: number; user_lng?: number; }) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second hardcore cutoff

            const response = await api.post('loyalty/staff/validate-visit', data, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.data;
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.message === 'canceled') {
                throw new Error("¡Qué pena! La conexión en el local está bailando. Intenta de nuevo.");
            }
            throw error;
        }
    },
    getVenuePerks: async (venueId: string) => {
        const response = await api.get(`loyalty/venue/${venueId}/perks`);
        return response.data;
    },
    getMarketplace: async () => {
        const response = await api.get('loyalty/marketplace');
        return response.data;
    },
    purchasePerk: async (venueId: string, perkId: string) => {
        const response = await api.post(`loyalty/venue/${venueId}/perks/${perkId}/purchase`);
        return response.data;
    },
    getMyRewardTickets: async () => {
        const response = await api.get('loyalty/my-reward-tickets');
        return response.data;
    },
    redeemTicket: async (code: string) => {
        const response = await api.post('loyalty/staff/redeem-ticket', { code });
        return response.data;
    },
    // Stamp Rewards (Passport System)
    getVenueStampRewards: async (venueId: string) => {
        const response = await api.get(`loyalty/venue/${venueId}/stamp-rewards`);
        return response.data;
    },
    createStampReward: async (venueId: string, data: any) => {
        const response = await api.post(`loyalty/venue/${venueId}/stamp-rewards`, data);
        return response.data;
    },
    updateStampReward: async (venueId: string, rewardId: string, data: any) => {
        const response = await api.patch(`loyalty/venue/${venueId}/stamp-rewards/${rewardId}`, data);
        return response.data;
    },
    deleteStampReward: async (venueId: string, rewardId: string) => {
        const response = await api.delete(`loyalty/venue/${venueId}/stamp-rewards/${rewardId}`);
        return response.data;
    },
    aiGenerateStampRewards: async (venueId: string) => {
        const response = await api.post(`loyalty/venue/${venueId}/stamp-rewards/ai-generate`);
        return response.data;
    },
    claimStampReward: async (venueId: string) => {
        const response = await api.post(`loyalty/claim-stamp-reward/${venueId}`);
        return response.data;
    },
    switchStampReward: async (venueId: string) => {
        const response = await api.post(`loyalty/switch-stamp-reward/${venueId}`);
        return response.data;
    },
    getMyPassportRewards: async () => {
        const response = await api.get('loyalty/my-passport-rewards');
        return response.data;
    },
    validatePassportReward: async (code: string) => {
        const response = await api.post('loyalty/staff/validate-passport-reward', { code });
        return response.data;
    },
};

export const businessService = {
    getStats: async () => {
        const response = await api.get('business/dashboard/stats');
        return response.data;
    },
    getAiCopilot: async () => {
        const response = await api.get('business/dashboard/ai-copilot');
        return response.data;
    },
    sendCampaign: async (id: string) => {
        const response = await api.post(`business/dashboard/campaign/send/${id}`);
        return response.data;
    },
    getAnalytics: async (eventId?: string) => {
        const response = await api.get(`business/analytics/events${eventId ? `?event_id=${eventId}` : ''}`);
        return response.data;
    },
    invite: async (role: string) => {
        const response = await api.post('business/team/invite', { role });
        return response.data;
    },
    join: async (code: string) => {
        const response = await api.post('business/team/join', { invitation_code: code });
        return response.data;
    }
};

export const settingsService = {
    updateProfile: async (data: any) => {
        const response = await api.put('settings/profile', data);
        return response.data;
    },
    changePassword: async (data: any) => {
        const response = await api.post('settings/security/password', data);
        return response.data;
    },
    getBilling: async () => {
        const response = await api.get('settings/billing/methods');
        return response.data;
    },
    updateNotifications: async (settings: any) => {
        const response = await api.put('settings/notifications', settings);
        return response.data;
    },
    toggle2FA: async (enabled: boolean) => {
        const response = await api.post(`settings/security/2fa?enabled=${enabled}`);
        return response.data;
    },
    getNotifications: async (venueId?: string) => {
        const url = venueId ? `settings/notifications?venue_id=${venueId}` : '/settings/notifications';
        const response = await api.get(url);
        return response.data;
    },
    markNotificationRead: async (id: string) => {
        const response = await api.post(`settings/notifications/${id}/read`);
        return response.data;
    },
    uploadLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('settings/upload-logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

export const municipalityService = {
    getAll: async () => {
        const CACHE_KEY = 'vibe_municipalities';
        const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    console.log('Using cached municipalities');
                    return data as Municipality[];
                }
            }
        } catch (e) {
            console.error('Error reading municipality cache:', e);
        }

        const response = await api.get<Municipality[]>('municipalities/');

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: response.data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Error saving municipality cache:', e);
        }

        return response.data;
    },
};

export const discoveryService = {
    getHybrid: async (municipalityId: string, lat?: number, lng?: number) => {
        const headers: any = {};
        if (lat !== undefined && lng !== undefined) {
            headers['X-User-Lat'] = lat;
            headers['X-User-Lng'] = lng;
        }
        const response = await api.get(`discovery?municipality_id=${municipalityId}`, { headers });
        return response.data;
    },
    searchVenues: async (query: string) => {
        const response = await api.get<Place[]>(`venues/search?query=${query}`);
        return response.data;
    }
};

export const aiService = {
    chat: async (user_question: string, event_id?: string) => {
        const response = await api.post('ai/chat', { user_question, event_id });
        return response.data;
    },
    vibeSearch: async (query: string) => {
        const response = await api.post('ai/vibe-search', { query });
        return response.data as {
            events: any[];
            venues: any[];
            ai_message: string;
        };
    },
};

export const reviewService = {
    getVenueReviews: async (venueId: string, limit = 20, offset = 0) => {
        const response = await api.get(`reviews/venue/${venueId}?limit=${limit}&offset=${offset}`);
        return response.data;
    },
    getVenueReviewStats: async (venueId: string) => {
        const response = await api.get(`reviews/venue/${venueId}/stats`);
        return response.data as { avg_stars: number; total_reviews: number; distribution: Record<string, number> };
    },
    createReview: async (venueId: string, stars: number, message?: string) => {
        const response = await api.post(`reviews/venue/${venueId}`, { stars, message });
        return response.data;
    },
};

export const viewService = {
    trackVenueView: async (venueId: string) => {
        try {
            await api.post(`venues/${venueId}/view`);
        } catch (_) { /* silent */ }
    },
    trackEventView: async (eventId: string) => {
        try {
            await api.post(`events/${eventId}/view`);
        } catch (_) { /* silent */ }
    },
};

export default api;
