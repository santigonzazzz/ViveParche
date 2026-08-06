
import { useState, useEffect } from 'react';
import { businessApi } from '../services/businessApi';
import type { EventData } from '../services/businessApi';

export const useEvents = (venueId?: string) => {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const data = await businessApi.getEvents(venueId);
            setEvents(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [venueId]);

    return { events, loading, error, refreshEvents: fetchEvents };
};
