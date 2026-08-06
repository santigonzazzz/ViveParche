
import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '../services/chatApi';
import type { ChatConversation } from '../services/chatApi';

export function useChatConversations(filterType: string = 'all', venueId?: string) {
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await chatApi.getConversations(filterType, venueId);
            setConversations(data);
        } catch (err) {
            setError('Failed to load conversations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterType, venueId]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    return { conversations, loading, error, refetch: fetchConversations };
}
