import { useState, useEffect } from 'react';
import { businessApi } from '../services/businessApi';
import type { DashboardSummaryData, SalesChartData, AISuggestion } from '../services/businessApi';

export function useBusinessDashboard(venueId?: string) {
    const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
    const [salesData, setSalesData] = useState<SalesChartData | null>(null);
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [venueProfile, setVenueProfile] = useState<any | null>(null);

    // Granular loading states
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [suggestionsLoading, setSuggestionsLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const loading = summaryLoading || chartLoading || suggestionsLoading;

    useEffect(() => {
        let mounted = true;

        const loadSummary = async () => {
            try {
                const data = await businessApi.getDashboardSummary(venueId);
                if (mounted) setSummary(data);
            } catch (err) {
                console.error("Summary error:", err);
            } finally {
                if (mounted) setSummaryLoading(false);
            }
        };

        const loadChart = async () => {
            try {
                const data = await businessApi.getSalesChart('week', venueId);
                if (mounted) setSalesData(data);
            } catch (err) {
                console.error("Chart error:", err);
            } finally {
                if (mounted) setChartLoading(false);
            }
        };

        const loadSuggestions = async () => {
            try {
                const data = await businessApi.getAISuggestions(5); // Adjust if needed to support venueId on AI
                if (mounted) setSuggestions(data);
            } catch (err) {
                console.error("Suggestions error:", err);
            } finally {
                if (mounted) setSuggestionsLoading(false);
            }
        };

        const loadVenue = async () => {
            try {
                const data = await businessApi.getVenueProfile(venueId);
                if (mounted) setVenueProfile(data);
            } catch (err) {
                console.error("Venue profile error:", err);
            }
        };

        // Fire all concurrently
        loadSummary();
        loadChart();
        loadSuggestions();
        loadVenue();

        return () => {
            mounted = false;
        };
    }, [venueId]);

    const refreshSales = async (period: 'week' | 'month') => {
        setChartLoading(true);
        try {
            const data = await businessApi.getSalesChart(period, venueId);
            setSalesData(data);
        } catch (err) {
            console.error(err);
            setError('Failed to refresh sales data');
        } finally {
            setChartLoading(false);
        }
    };

    return {
        summary,
        salesData,
        suggestions,
        venueProfile,
        loading,
        summaryLoading,
        chartLoading,
        suggestionsLoading,
        error,
        refreshSales
    };
}
