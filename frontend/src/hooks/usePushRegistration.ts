/**
 * usePushRegistration — registers the device for Expo Push notifications,
 * sends the token to the backend (PATCH /api/auth/me {expo_push_token}),
 * and wires foreground tap handlers.
 *
 * Uses Expo's free push tier — NO API keys or external service required.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

export function usePushRegistration() {
  const { user } = useAuth();
  const responseListener = useRef<any>(null);
  const notifListener    = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        if (!Device.isDevice && Platform.OS !== 'web') return; // Sim/web has no real token
        const { status: existing } = await Notifications.getPermissionsAsync();
        let final = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          final = status;
        }
        if (final !== 'granted') return;

        // Set up Android channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1a237e',
          });
        }

        const projectId =
          (require('expo-constants').default?.expoConfig?.extra as any)?.eas?.projectId ||
          (require('expo-constants').default?.easConfig as any)?.projectId;
        const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        const token = tokenRes.data;
        if (token && token !== user.expo_push_token) {
          await api.patch('/auth/me', { expo_push_token: token });
        }
      } catch (e) {
        // silent — push is a nice-to-have
      }
    })();

    // Foreground notification while app open
    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Could refresh notifications list / badge here
    });
    // User tapped a push
    responseListener.current = Notifications.addNotificationResponseReceivedListener((_resp) => {
      // Could deep-link based on _resp.notification.request.content.data
    });

    return () => {
      // expo-notifications SDK 53+: each subscription has a `.remove()` method.
      // Older `Notifications.removeNotificationSubscription(sub)` was removed.
      try { notifListener.current?.remove?.(); } catch {}
      try { responseListener.current?.remove?.(); } catch {}
    };
  }, [user?.id]);
}
