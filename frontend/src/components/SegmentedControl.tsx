
import React from 'react';
import { motion } from 'framer-motion';
import type { DiscoveryContext } from '../types';

interface SegmentedControlProps {
    activeTab: DiscoveryContext;
    onChange: (tab: DiscoveryContext) => void;
}

const TABS: { id: DiscoveryContext; label: string }[] = [
    { id: 'discovery', label: 'Descubrir' },
    { id: 'events', label: 'Eventos' },
    { id: 'places', label: 'Locales' }
];

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ activeTab, onChange }) => {
    return (
        <div style={containerStyle}>
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    style={{
                        ...tabButtonStyle,
                        color: activeTab === tab.id ? 'white' : 'rgba(255, 255, 255, 0.4)',
                    }}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="active-pill"
                            style={{
                                ...activePillStyle,
                                background: tab.id === 'places' ? 'var(--color-neon-teal)' : 'var(--color-neon-purple)',
                                boxShadow: tab.id === 'places' ? 'var(--shadow-neon-teal)' : 'var(--shadow-neon-purple)',
                            }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '100px',
    padding: '4px',
    marginBottom: '2rem',
    position: 'relative'
};

const tabButtonStyle: React.CSSProperties = {
    padding: '0.6rem 1.75rem',
    borderRadius: '100px',
    border: 'none',
    background: 'transparent',
    fontSize: '0.9rem',
    fontWeight: '800',
    cursor: 'pointer',
    position: 'relative',
    transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none'
};

const activePillStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '100px',
    zIndex: 0
};
