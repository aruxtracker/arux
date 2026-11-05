import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AdminRole = 'super_admin' | 'admin' | 'user' | null;

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [checkingRole, setCheckingRole] = useState<boolean>(true);
  const [dbTableExists, setDbTableExists] = useState<boolean>(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setCheckingRole(false);
      return;
    }

    setCheckingRole(true);
    try {
      // 1. Check user_roles table in Supabase
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // If table doesn't exist yet (relation does not exist code 42P01)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setDbTableExists(false);
        }

        // Fallback: Check app_metadata or user_metadata
        const appRole = (user.app_metadata as any)?.role;
        const metaAdmin = (user.user_metadata as any)?.is_admin;
        if (appRole === 'super_admin') {
          setRole('super_admin');
        } else if (appRole === 'admin' || metaAdmin === true) {
          setRole('admin');
        } else {
          setRole(null);
        }
      } else if (data && (data as any).role) {
        setDbTableExists(true);
        setRole((data as any).role as AdminRole);
      } else {
        // Table exists, but no role entry yet
        setDbTableExists(true);
        const appRole = (user.app_metadata as any)?.role;
        if (appRole === 'super_admin') setRole('super_admin');
        else if (appRole === 'admin') setRole('admin');
        else setRole(null);
      }
    } catch {
      setRole(null);
    } finally {
      setCheckingRole(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading, fetchRole]);

  // Promote current user to super_admin (useful on first setup)
  const claimSuperAdminRole = useCallback(async () => {
    if (!user) return { success: false, error: 'User not signed in' };
    try {
      const { error } = await supabase
        .from('user_roles' as any)
        .upsert(
          { user_id: user.id, role: 'super_admin', updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      setRole('super_admin');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to claim role' };
    }
  }, [user]);

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isSuperAdmin || role === 'admin';

  return {
    user,
    role,
    isSuperAdmin,
    isAdmin,
    checkingRole: checkingRole || authLoading,
    dbTableExists,
    refetchRole: fetchRole,
    claimSuperAdminRole,
  };
}
