// Public VAPID key — safe to ship in client code (it's the public half of an asymmetric key pair)
export const VAPID_PUBLIC_KEY = 'BNNfYp1EFnTGtRy9YQiIDs49oMebNTrhOGZja-48yK-4eKaeHG6BaGgKkEQI6qGmORGUqSP0T5wKQ2jA_iKEfgg';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
