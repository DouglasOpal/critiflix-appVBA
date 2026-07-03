// Expo push registration: asks permission, gets the device's Expo push token,
// and registers it with the backend so notify.js can push to it.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from '../api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export async function registerForPush() {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250],
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    if (token) await api.savePushToken(token).catch(() => {});
    return token;
  } catch (e) { console.log('[push] skipped:', e?.message); return null; }
}
