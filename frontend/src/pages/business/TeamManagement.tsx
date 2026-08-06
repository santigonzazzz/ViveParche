import React, { useState, useEffect } from 'react';
import { Mail, Shield, Trash2, UserPlus, CheckCircle, Loader2, Lock, Edit2, X } from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const TeamManagement: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const venueId = searchParams.get('venueId');

    const [team, setTeam] = useState<any[]>([]);
    const [venue, setVenue] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [inviteData, setInviteData] = useState({
        email: '',
        full_name: '',
        password: '',
        role: 'staff' as 'staff' | 'manager'
    });
    const [lastInvite, setLastInvite] = useState<any>(null);

    // Edit state
    const [editingMember, setEditingMember] = useState<any>(null);
    const [editData, setEditData] = useState({
        full_name: '',
        password: ''
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const [teamData, venueData] = await Promise.all([
                businessApi.getVenueTeam(venueId || undefined),
                businessApi.getVenueProfile(venueId || undefined)
            ]);
            setTeam(teamData);
            setVenue(venueData);
        } catch (err) {
            console.error("Failed to fetch team", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            const result = await businessApi.inviteTeamMember(inviteData);
            setLastInvite(result);
            setShowInviteForm(false);
            setInviteData({ email: '', full_name: '', password: '', role: 'staff' });
            fetchTeam();
        } catch (error) {
            console.error("Failed to invite member:", error);
            alert("Error al invitar al mesero. Revisa el correo electrónico y vuelve a intentarlo.");
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!window.confirm("¿Seguro que quieres eliminar a este miembro del equipo?")) return;
        try {
            await businessApi.removeTeamMember(memberId);
            setTeam(team.filter(m => m.id !== memberId));
        } catch (error) {
            console.error("Failed to remove member:", error);
            alert("Error al eliminar al miembro del equipo.");
        }
    };

    const handleStartEdit = (member: any) => {
        setEditingMember(member);
        setEditData({
            full_name: member.full_name,
            password: ''
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await businessApi.updateTeamMember(editingMember.id, editData);
            setEditingMember(null);
            fetchTeam();
        } catch (error) {
            console.error("Failed to update member:", error);
            alert("Error al actualizar el miembro del equipo.");
        } finally {
            setUpdating(false);
        }
    };

    const getWorkerLimit = () => {
        const tier = (venue?.subscription_tier || 'FREE').toUpperCase();
        if (tier === 'FREE' || tier === 'VITRINA') return 0;  // No workers allowed
        if (tier === 'ARRANQUE') return 1;                    // Max 1 worker
        if (tier === 'EL_PARCHE' || tier === 'EL PARCHE') return 3; // Max 3 workers
        return Infinity;                                       // PRO / DUENO_DEL_PARCHE = unlimited
    };

    // Count only workers (not the owner) against the plan limit
    const workerCount = team.filter(m => m.role !== 'owner' && m.team_role !== 'owner').length;
    const workerLimit = getWorkerLimit();
    const limitReached = workerCount >= workerLimit;

    return (
        <div style={{ color: 'white' }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: '2.5rem',
                gap: '1.5rem'
            }}>
                <div>
                    <h2 style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Equipo del Local</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.85rem' : '0.9rem', fontWeight: '600' }}>Administra acceso y permisos del equipo.</p>
                </div>
                <button
                    onClick={() => !limitReached && setShowInviteForm(!showInviteForm)}
                    disabled={limitReached}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '16px',
                        background: limitReached ? 'rgba(255,255,255,0.05)' : (showInviteForm ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'),
                        border: 'none',
                        color: limitReached ? 'rgba(255,255,255,0.3)' : 'white',
                        fontWeight: '900',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: limitReached ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: limitReached ? 'none' : (showInviteForm ? 'none' : '0 8px 20px rgba(109, 40, 217, 0.3)'),
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    {limitReached ? <Lock size={18} /> : (showInviteForm ? 'Cancelar' : <UserPlus size={18} />)}
                    {limitReached
                        ? (workerLimit === 0 ? 'REQUIERE PLAN' : `LÍMITE (${workerCount}/${workerLimit})`)
                        : (showInviteForm ? '' : 'Invitar Mesero')}
                </button>
            </div>

            {limitReached && workerLimit === 0 && (
                <div style={{
                    background: 'rgba(111, 66, 193, 0.1)',
                    border: '1px solid rgba(111, 66, 193, 0.2)',
                    borderRadius: '16px',
                    padding: '1rem 1.5rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                }}>
                    <p style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>
                        Tu plan actual no permite agregar meseros. Actualiza para trabajar con tu equipo.
                    </p>
                    <button
                        onClick={() => navigate('/business/subscription?showUpgrade=true')}
                        style={{
                            background: 'var(--color-neon-purple)',
                            color: 'white',
                            border: 'none',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        Mejorar Plan
                    </button>
                </div>
            )}

            {lastInvite && (
                <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: '1.25rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: '#22c55e', padding: '8px', borderRadius: '12px', color: 'white' }}>
                            <CheckCircle size={24} />
                        </div>
                        <h4 style={{ color: 'white', fontWeight: '800', margin: 0 }}>¡Invitación Enviada!</h4>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                        Se ha enviado un correo con instrucciones a <strong>{lastInvite.email}</strong>.
                    </p>
                    <button
                        onClick={() => setLastInvite(null)}
                        style={{ marginLeft: isMobile ? '0' : 'auto', background: 'transparent', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}
                    >{isMobile ? 'Ocultar' : '✕'}</button>
                </div>
            )}

            {showInviteForm && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: isMobile ? '1.5rem' : '2rem',
                    marginBottom: '3rem',
                    backdropFilter: 'blur(20px)'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', marginBottom: '1.5rem' }}>Invitar Nuevo Mesero</h3>
                    <form onSubmit={handleInvite} style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto',
                        gap: '1rem',
                        alignItems: 'end'
                    }}>
                        <div>
                            <label style={labelStyle}>Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={inviteData.full_name}
                                onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                                placeholder="Juan Pérez"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                value={inviteData.email}
                                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                placeholder="mesero@local.com"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Contraseña Temporal</label>
                            <input
                                type="text"
                                required
                                value={inviteData.password}
                                onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                                placeholder="Secreto123!"
                                style={inputStyle}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={inviting}
                            style={{
                                padding: '0.85rem 2rem',
                                borderRadius: '14px',
                                background: '#8b5cf6',
                                color: 'white',
                                fontWeight: '900',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: isMobile ? '100%' : 'auto',
                                marginTop: isMobile ? '0.5rem' : '0'
                            }}
                        >
                            {inviting ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Invitación'}
                        </button>
                    </form>
                </div>
            )
            }

            {editingMember && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#0a0a0c',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '32px',
                        padding: isMobile ? '1.5rem' : '2.5rem',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Editar Mesero</h3>
                            <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={editData.full_name}
                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={labelStyle}>Nueva Contraseña (Opcional)</label>
                                <input
                                    type="text"
                                    value={editData.password}
                                    onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                    placeholder="Dejar en blanco para no cambiar"
                                    style={inputStyle}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updating}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    background: 'var(--color-neon-purple)',
                                    color: 'white',
                                    fontWeight: '900',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                {updating ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Cambios'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 size={48} className="animate-spin text-purple-500" />
                </div>
            ) : team.length === 0 ? (
                <div style={{ textAlign: 'center', padding: isMobile ? '3rem 1.5rem' : '5rem 2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                    <Shield size={isMobile ? 32 : 48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>Sin Miembros en el Equipo</h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '300px', margin: '0 auto', fontSize: '0.85rem' }}>Solo el dueño tiene acceso. Invita meseros para arrancar.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {team.map((member) => (
                        <div key={member.id} style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            justifyContent: 'space-between',
                            padding: isMobile ? '1.25rem' : '1.5rem 2rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            gap: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem' }}>
                                <div style={{ width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '900', flexShrink: 0 }}>
                                    {member.full_name?.charAt(0) || '?'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h4 style={{ fontWeight: '800', color: 'white', fontSize: '1.1rem', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.full_name}</h4>
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.25rem' : '0.75rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '200px' : 'none' }}>
                                            <Mail size={12} /> {member.email || 'No email'}
                                        </span>
                                        {!isMobile && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></span>}
                                        <span style={{ fontSize: '0.7rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a78bfa' }}>
                                            {member.role || member.team_role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {member.role !== 'owner' && (
                                <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
                                    <button
                                        onClick={() => handleStartEdit(member)}
                                        style={{ flex: isMobile ? 1 : 'none', padding: '10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleRemove(member.id)}
                                        style={{ flex: isMobile ? 1 : 'none', padding: '10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '0.5rem',
    letterSpacing: '0.05em'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.85rem 1.25rem',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxSizing: 'border-box'
};

export default TeamManagement;
