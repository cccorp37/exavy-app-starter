import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profession: 'academic' | 'professional';
  academic_level: string | null;
  professional_domain: string | null;
  goals: string[];
  onboarding_completed: boolean;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const cacheKey = user ? `exavy:onboarding-completed:${user.id}` : '';
  const hasCompletedCache = () => {
    if (!cacheKey || typeof window === 'undefined') return false;
    return window.localStorage.getItem(cacheKey) === 'true';
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setFetchFailed(false);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    setFetchFailed(false);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfile(data as Profile | null);
      if (typeof window !== 'undefined' && data?.onboarding_completed) {
        window.localStorage.setItem(`exavy:onboarding-completed:${user.id}`, 'true');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setFetchFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const needsOnboarding = Boolean(
    !loading &&
    user &&
    !fetchFailed &&
    !hasCompletedCache() &&
    (!profile || !profile.onboarding_completed)
  );

  return { profile, loading, needsOnboarding, refresh: fetchProfile };
}
