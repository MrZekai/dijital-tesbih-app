// Yerel bildirimler — günlük zikir hatırlatıcısı.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "zikirhane-daily";
const REMINDER_ID = "zikirhane-daily-reminder";

const REMINDER_MESSAGES = [
  "Bugünkü zikir hedefinizi tamamlamak ister misiniz?",
  "Kısa bir zikir molası için güzel bir vakit.",
  "Günlük hedefinize ulaşmanıza az kaldı.",
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Zikir Hatırlatıcı",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    lightColor: "#C6A664",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.status === "granted") {
    return { granted: true, canAskAgain: cur.canAskAgain };
  }
  if (!cur.canAskAgain) {
    return { granted: false, canAskAgain: false };
  }
  const req = await Notifications.requestPermissionsAsync();
  return { granted: req.status === "granted", canAskAgain: req.canAskAgain };
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // ignore
  }
  // Also cancel any leftover schedules with the same identifier prefix
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(REMINDER_ID)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<boolean> {
  await ensureAndroidChannel();
  await cancelDailyReminder();
  const body =
    REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        // Uygulama adıyla tutarlı olmalı — eskiden eski proje kod adı
        // ("Zikirhane") görünüyordu.
        title: "Hedef Zikirmatik",
        body,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
      },
    });
    return true;
  } catch (e) {
    console.warn("[notifications] schedule failed", e);
    return false;
  }
}
