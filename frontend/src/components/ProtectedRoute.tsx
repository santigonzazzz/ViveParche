import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
    requiredRole?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        // Rules:
        // 1. If 'admin' is in required roles, ONLY 'admin' can pass.
        // 2. Otherwise/Else: 'admin' can bypass (super-user)
        // 3. User must be in roles list.
        
        const isAdminRequired = roles.includes('admin');
        const isUserInRoles = roles.includes(user.role);
        const isUserAdmin = user.role === 'admin';

        if (isAdminRequired) {
            // Strict check: only real admins
            if (!isUserAdmin) return <Navigate to="/" replace />;
        } else {
            // General check: user must match role OR be a super-admin
            if (!isUserInRoles && !isUserAdmin) {
                return <Navigate to="/" replace />;
            }
        }
    }

    return <Outlet />;
};
