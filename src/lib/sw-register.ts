/**
 * Service Worker Registration
 * Register and manage service worker lifecycle
 */
import { createLogger } from "@/lib/logger";

const logger = createLogger("sw-register");

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.info('Service Worker registered', { scope: registration.scope });

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              logger.info('New content available, please refresh');
              
              // Show update notification
              if (window.confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return registration;
    } catch (error) {
      logger.error('Service Worker registration failed:', error as Error);
    }
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    logger.info('Service Worker unregistered');
  }
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      logger.info('Push subscription created');
      return subscription;
    } catch (error) {
      logger.error('Push subscription failed:', error as Error);
      return null;
    }
  }
  return null;
};

/**
 * Check if app is running as PWA
 */
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Prompt to install PWA
 */
export const promptPWAInstall = () => {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          logger.info(`User response: ${outcome}`);
          deferredPrompt = null;
          installButton.style.display = 'none';
        }
      });
    }
  });
};

/**
 * Background sync for offline actions
 */
export const registerBackgroundSync = async (tag: string) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      logger.info('Background sync registered', { tag });
    } catch (error) {
      logger.error('Background sync failed:', error as Error);
    }
  }
};

/**
 * Cache API data manually
 */
export const cacheAPIData = async (url: string, data: any) => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('fitness360-api-cache');
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(url, response);
      logger.info('Cached API data', { url });
    } catch (error) {
      logger.error('Cache failed:', error as Error);
    }
  }
};

/**
 * Get cached API data
 */
export const getCachedAPIData = async (url: string) => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('fitness360-api-cache');
      const response = await cache.match(url);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      logger.error('Cache retrieval failed:', error as Error);
    }
  }
  return null;
};
