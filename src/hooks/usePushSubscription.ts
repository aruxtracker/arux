import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '@/lib/vapid';
import { toast } from 'sonner';

export interface PushDevice {
  id: string;
  endpoint: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
}

const SW_PATH = '/sw.js';

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android device';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown device';
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    pushSupported() ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const registerSW = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;
      return reg;
    } catch (e) {
      console.error('SW register failed', e);
      return null;
    }
  }, []);

  // Check current subscription state
  const checkSubscription = useCallback(async () => {
    if (!pushSupported() || !user) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { setSubscribed(false); return; }
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch { setSubscribed(false); }
  }, [user]);

  const fetchDevices = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, device_label, user_agent, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setDevices(data as PushDevice[]);
  }, [user]);

  useEffect(() => {
    checkSubscription();
    fetchDevices();
  }, [checkSubscription, fetchDevices]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) { toast.error('Sign in first'); return false; }
    if (!pushSupported()) { toast.error('Push not supported on this browser'); return false; }
    if (isIOS() && !isStandalonePWA()) {
      toast.error('On iPhone, install the app first (Share → Add to Home Screen)', { duration: 6000 });
      return false;
    }
    setLoading(true);
    try {
      // 1. Permission
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { toast.error('Notification permission denied'); return false; }

      // 2. Register SW
      const reg = await registerSW();
      if (!reg) { toast.error('Service worker failed to register'); return false; }

      // 3. Subscribe to push
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        // Cast to BufferSource — TS lib types are too strict for the underlying ArrayBuffer
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
        });
      }

      // 4. Save to Supabase
      const json = sub.toJSON();
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh || '',
        auth: json.keys?.auth || '',
        device_label: deviceLabel(),
        user_agent: navigator.userAgent.slice(0, 200),
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (error) { console.error(error); toast.error('Failed to save subscription'); return false; }
      setSubscribed(true);
      await fetchDevices();
      toast.success('🔔 Push notifications enabled!');
      return true;
    } catch (e: any) {
      console.error('Subscribe failed', e);
      toast.error(e?.message || 'Failed to enable push');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, registerSW, fetchDevices]);

  const unsubscribeDevice = useCallback(async (deviceId: string, endpoint: string) => {
    const { error } = await supabase.from('push_subscriptions').delete().eq('id', deviceId);
    if (error) { toast.error('Failed to remove device'); return; }
    // If it's THIS device, also unsubscribe from PushManager
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub && sub.endpoint === endpoint) { await sub.unsubscribe(); setSubscribed(false); }
    } catch {}
    await fetchDevices();
    toast.success('Device removed');
  }, [fetchDevices]);

  const sendTestPush = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          test: true,
          title: '🎉 ARUX Test',
          body: 'If you see this, push notifications are working!',
          url: '/',
        },
      });
      if (error) throw error;
      toast.success(`Test push sent to ${data?.sent || 0} device(s)`);
    } catch (e: any) {
      toast.error(e?.message || 'Test failed');
    } finally { setLoading(false); }
  }, [user]);

  return {
    supported: pushSupported(),
    isIOS: isIOS(),
    isStandalone: isStandalonePWA(),
    permission, subscribed, devices, loading,
    subscribe, unsubscribeDevice, sendTestPush,
    refresh: fetchDevices,
  };
}
