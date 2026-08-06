import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { PricingSection } from '../components/business/PricingSection';
import { MobileNav } from '../components/MobileNav';

export const Pricing: React.FC = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSelectPlan = (_planId: string) => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user) {
            navigate('/business/register');
        } else if (user.role === 'owner') {
            navigate('/business/subscription?showUpgrade=true');
        } else {
            alert("Esta sección es para dueños de negocios");
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'white', paddingBottom: isMobile ? '7rem' : '4rem' }}>
            <Navbar />

            <div className="container" style={{ paddingTop: isMobile ? '6rem' : '10rem' }}>
                <PricingSection onSelectPlan={handleSelectPlan} />
            </div>

            {isMobile && <MobileNav />}
        </div>
    );
};
