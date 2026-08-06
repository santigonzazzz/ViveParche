import { useState, useEffect } from 'react';
import { businessApi, type TeamMember, type TeamInvitation } from '../services/businessApi';

export function useTeamManagement() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const data = await businessApi.getTeamMembers();
            setMembers(data);
        } catch (err: any) {
            console.error('Failed to fetch team members:', err);
            setError(err.message || 'Failed to load team members');
        } finally {
            setLoading(false);
        }
    };

    const inviteMember = async (invitation: TeamInvitation): Promise<{ code: string } | null> => {
        try {
            const result = await businessApi.inviteTeamMember(invitation);
            await fetchMembers(); // Refresh the list
            return result;
        } catch (err: any) {
            console.error('Failed to invite team member:', err);
            throw err;
        }
    };

    const joinTeam = async (invitationCode: string): Promise<any> => {
        try {
            const result = await businessApi.joinTeam(invitationCode);
            await fetchMembers(); // Refresh the list
            return result;
        } catch (err: any) {
            console.error('Failed to join team:', err);
            throw err;
        }
    };

    return {
        members,
        loading,
        error,
        inviteMember,
        joinTeam,
        refreshMembers: fetchMembers
    };
}
