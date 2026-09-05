// Yerel bildirimler — günlük zikir hatırlatıcısı.
//
// v1.1.0: Bildirim metinleri artık bu modülde SABİT DEĞİL. Çağıran taraf
// (Ayarlar ekranı) seçili dildeki metinleri geçirir. Kullanıcı dili
// değiştirdiğinde hatırlatıcı yeniden planlanır, böylece bildirim de yeni
// dilde gelir.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "zikirhane-daily";
const REMINDER_ID = "zikirhane-daily-reminder";

export interface ReminderStrings {
  /** Android bildirim kanalının adı (sistem ayarlarında görünür). */
  channelName: string;
  /** Bildirim başlığı — uygulama adı. */
  title: string;
  /** Dönüşümlü gösterilecek gövde metinleri. */
  bodies: string[];
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(channelName: string): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: channelName,
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
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(REMINDER_ID)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.warn("[notifications] cancel sweep failed", e);
  }
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  strings: ReminderStrings
): Promise<boolean> {
  await ensureAndroidChannel(strings.channelName);
  await cancelDailyReminder();
  const pool = strings.bodies.length > 0 ? strings.bodies : [strings.title];
  const body = pool[Math.floor(Math.random() * pool.length)];
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: strings.title,
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
