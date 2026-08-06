import axios from 'axios';

// Obtener URL de API desde el entorno
const API_URL = import.meta.env.VITE_APP_API_URL || 'https://viveparche.cloud/api';

// Authenticated client (for owner/staff)
const chatClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

chatClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Public client (for customers — no auth)
const publicChatClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_type: 'customer' | 'ai' | 'staff';
    sender_id?: string;
    message: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    metadata?: any;
    created_at: string;
}

export interface ChatConversation {
    id: string;
    customer_id: string;
    store_id: string;
    venue_id?: string;
    category: 'lead' | 'guest' | 'alert' | 'past_guest' | 'active';
    last_message?: string;
    unread_count: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    ai_enabled: boolean;
    customer_name?: string;
    created_at: string;
    updated_at: string;
    customer_avatar?: string;
}

export interface PromoSuggestion {
    promo_code: string;
    discount_percent: number;
    message: string;
    reasoning: string;
}

export interface ChatStatistics {
    total_conversations: number;
    total_leads: number;
    ai_handled: number;
    sentiment_distribution: {
        positive: number;
        neutral: number;
        negative: number;
    };
}

export interface AISettings {
    tone: 'professional' | 'vibey' | 'energetic';
    custom_instructions: string;
    automation_level: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Customer API (Forzada para Producción)
// ─────────────────────────────────────────────────────────────────────────────

export const customerChatApi = {
    /** Start or resume a conversation with a venue */
    startConversation: async (
        venueId: string,
        customerId: string,
        customerName?: string,
        eventContext?: {
            eventId?: string;
            eventTitle?: string;
            eventDate?: string;
            eventAddress?: string;
            eventPrice?: number;
        }
    ): Promise<ChatConversation> => {
        try {
            // Usar cliente público con ruta relativa
            const response = await publicChatClient.post('/chat/customer/start', {
                venue_id: venueId,
                customer_id: customerId,
                customer_name: customerName,
                event_context: eventContext,
            });
            return response.data;
        } catch (err: any) {
            throw err;
        }
    },

    /** Send a customer message and get AI reply */
    sendMessage: async (
        conversationId: string,
        customerId: string,
        message: string
    ): Promise<{ customer_message: ChatMessage; ai_reply: ChatMessage | null }> => {
        const response = await publicChatClient.post('/chat/customer/message', {
            conversation_id: conversationId,
            customer_id: customerId,
            message,
        });
        return response.data;
    },

    /** Get messages for a customer conversation */
    getMessages: async (conversationId: string, customerId: string): Promise<ChatMessage[]> => {
        const response = await publicChatClient.get(
            `/chat/customer/messages/${conversationId}`,
            { params: { customer_id: customerId } }
        );
        return response.data.messages || [];
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Owner/Staff API (Forzada para Producción)
// ─────────────────────────────────────────────────────────────────────────────

export const chatApi = {
    getConversations: async (filterType: string = 'all', venueId?: string, limit: number = 50, offset: number = 0): Promise<ChatConversation[]> => {
        const response = await chatClient.get('/chat/conversations', {
            params: { filter_type: filterType, venue_id: venueId, limit, offset }
        });
        return response.data.conversations || [];
    },

    getMessages: async (conversationId: string, limit: number = 100): Promise<ChatMessage[]> => {
        const response = await chatClient.get(`/chat/conversations/${conversationId}/messages`, {
            params: { limit }
        });
        return response.data.messages || [];
    },

    sendMessage: async (conversationId: string, message: string): Promise<ChatMessage> => {
        const response = await chatClient.post(`/chat/conversations/${conversationId}/messages`, {
            message,
            conversation_id: conversationId
        });
        return response.data;
    },

    createConversation: async (customerId: string, category: string = 'lead'): Promise<ChatConversation> => {
        const response = await chatClient.post('/chat/conversations', {
            customer_id: customerId,
            category
        });
        return response.data;
    },

    toggleAI: async (conversationId: string, enabled: boolean): Promise<{ success: boolean; ai_enabled: boolean }> => {
        const response = await chatClient.patch(`/chat/conversations/${conversationId}/ai-toggle`, {
            enabled
        });
        return response.data;
    },

    generatePromoSuggestion: async (conversationId: string): Promise<PromoSuggestion> => {
        const response = await chatClient.post(`/chat/conversations/${conversationId}/promo-suggestion`);
        return response.data;
    },

    getStatistics: async (venueId?: string): Promise<ChatStatistics> => {
        const url = venueId
            ? `/chat/statistics?venue_id=${venueId}`
            : '/chat/statistics';
        const response = await chatClient.get(url);
        return response.data;
    },

    getAISettings: async (venueId?: string): Promise<AISettings> => {
        const url = venueId
            ? `/chat/ai-settings?venue_id=${venueId}`
            : '/chat/ai-settings';
        const response = await chatClient.get(url);
        return response.data;
    },

    saveAISettings: async (settings: AISettings, venueId?: string): Promise<{ success: boolean; settings: AISettings }> => {
        const url = venueId
            ? `/chat/ai-settings?venue_id=${venueId}`
            : '/chat/ai-settings';
        const response = await chatClient.put(url, settings);
        return response.data;
    },
};
