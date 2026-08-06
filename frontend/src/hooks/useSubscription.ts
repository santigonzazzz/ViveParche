import { useState, useEffect } from 'react';
import { businessApi, type SubscriptionInfo } from '../services/businessApi';

export function useSubscription() {
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSubscription() {
            try {
                setLoading(true);
                const data = await businessApi.getSubscription();
                setSubscription(data);
            } catch (err: any) {
                console.error('Failed to fetch subscription:', err);
                setError(err.message || 'Failed to load subscription data');
            } finally {
                setLoading(false);
            }
        }

        fetchSubscription();
    }, []);

    const refreshSubscription = async () => {
        try {
            const data = await businessApi.getSubscription();
            setSubscription(data);
        } catch (err: any) {
            console.error('Failed to refresh subscription:', err);
        }
    };

    return {
        subscription,
        loading,
        error,
        refreshSubscription
    };
}
