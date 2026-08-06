
import React from 'react';
import { Lock } from 'lucide-react';

interface RestrictedFeatureProps {
    children: React.ReactNode;
    tier?: string;
    requiredTier?: 'FREE' | 'ARRANQUE' | 'EL PARCHE' | 'PRO';
    userRole?: string;
    fallback?: React.ReactNode;
}

export const RestrictedFeature: React.FC<RestrictedFeatureProps> = ({
    children,
    tier = 'FREE',
    requiredTier = 'PRO',
    userRole = 'owner',
    fallback
}) => {
    const isAdmin = userRole === 'admin' || userRole === 'VIP';

    const tierPriority = {
        'FREE': 0,
        'ARRANQUE': 1,
        'EL PARCHE': 2,
        'EL_PARCHE': 2,
        'PRO': 3,
        'DUENO_DEL_PARCHE': 3
    };

    const hasTierAccess = tierPriority[tier as keyof typeof tierPriority] >= tierPriority[requiredTier];
    const hasAccess = isAdmin || hasTierAccess;

    if (hasAccess) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    // Default locked state for buttons/links
    return (
        <div style={{ position: 'relative', opacity: 0.6, cursor: 'not-allowed' }}>
            {children}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: 'inherit'
            }}>
                <Lock size={16} color="white" />
            </div>
        </div>
    );
};
