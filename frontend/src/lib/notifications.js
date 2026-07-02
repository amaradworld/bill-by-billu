import { api } from './api';

const SW_SCOPE = '/';

export function isPushSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  return result;
}

export async function subscribeToPush() {
  if (!isPushSupported()) return null;

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: SW_SCOPE });
    await navigator.serviceWorker.ready;

    const vapidRes = await api.get('/api/notifications/vapid-key');
    const vapidKey = vapidRes.publicKey;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const sub = subscription.toJSON();
    await api.post('/api/notifications/subscribe', {
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    });

    return subscription;
  } catch (err) {
    console.error('Push subscribe failed:', err);
    return null;
  }
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await api.post('/api/notifications/unsubscribe', {
      endpoint: subscription.endpoint,
    });

    await subscription.unsubscribe();
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}

export async function isSubscribed() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export async function sendTestNotification() {
  return api.post('/api/notifications/test');
}

export async function getNotificationPrefs() {
  return api.get('/api/notifications/preferences');
}

export async function updateNotificationPrefs(prefs) {
  return api.put('/api/notifications/preferences', prefs);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
