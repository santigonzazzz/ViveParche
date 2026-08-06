import api from './api';

export const loyaltyService = {
    // --- LECTURA DE DATOS ---
    getStats: async (venueId: string) => {
        const response = await api.get(`loyalty/venue/${venueId}/stats`);
        return response.data;
    },

    getRecentValidations: async (venueId: string, limit = 5) => {
        const response = await api.get(`loyalty/venue/${venueId}/recent-validations?limit=${limit}`);
        return response.data;
    },

    getVenuePerks: async (venueId: string) => {
        const response = await api.get(`loyalty/venue/${venueId}/perks`);
        return response.data;
    },

    // --- ACCIONES DE VALIDACIÓN ---

    // Validar una visita simple
    validateVisit: async (data: {
        user_hash_id: string;
        venue_id: string;
        amount_spent?: number
    }) => {
        const response = await api.post(`loyalty/staff/validate-visit`, data);
        return response.data;
    },

    // Redimir un ticket o código de beneficio
    redeemTicket: async (code: string) => {
        const response = await api.post(`loyalty/staff/redeem-ticket`, { code });
        return response.data;
    },

    // Validar premios del "Pasaporte" de Parché
    validatePassportReward: async (code: string) => {
        const response = await api.post(`loyalty/staff/validate-passport-reward`, { code });
        return response.data;
    }
};
