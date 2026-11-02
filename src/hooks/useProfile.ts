import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Gender = 'male' | 'female' | 'other' | 'unset';

export interface Profile {
  displayName: string;
  avatarPreset: string | null;
  gender: Gender;
}

/**
 * Reads and writes the signed-in user's profile row (display name, preset
 * avatar and gender). Gender drives gender-specific features such as the
 * upcoming cycle tracker.
 */
export function useProfile() {
  const { user } = useAuth();
  const fallbackName = (user?.user_metadata?.display_name as string | undefined)
    || (user?.user_metadata?.full_name as string | undefined)
    || user?.email?.split('@')[0]
    || 'ARUX user';

  const [profile, setProfile] = useState<Profile>({ displayName: fallbackName, avatarPreset: null, gender: 'unset' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_preset, gender')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile({
      displayName: data?.display_name || fallbackName,
      avatarPreset: (data as { avatar_preset?: string | null } | null)?.avatar_preset ?? null,
      gender: (((data as { gender?: string | null } | null)?.gender) as Gender) || 'unset',
    });
    setLoading(false);
  }, [user?.id, fallbackName]);

  useEffect(() => { load(); }, [load]);

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) return false;
    const next = { ...profile, ...patch };
    setProfile(next);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: next.displayName,
        avatar_preset: next.avatarPreset,
        gender: next.gender === 'unset' ? null : next.gender,
      } as never)
      .eq('user_id', user.id);
    if (error) { toast.error('Could not save your profile'); load(); return false; }
    if (patch.displayName) {
      await supabase.auth.updateUser({ data: { display_name: next.displayName } });
    }
    return true;
  };

  return { profile, loading, updateProfile, reload: load };
}
