// Yerel yedekleme — kullanıcının verisini kendi seçtiği yere kaydetmesi.
//
// TASARIM KARARLARI
//  - Yedek CİHAZDA üretilir; hiçbir sunucuya gönderilmez. Uygulama zaten
//    tamamen çevrimdışıdır ve öyle kalır.
//  - Dosya, uygulamanın ÖNBELLEK dizinine yazılır ve hemen sistem paylaşım
//    sayfasına verilir. Kullanıcı nereye kaydedeceğine kendisi karar verir
//    (Drive, Dosyalar, e-posta…). Böylece depolama izni GEREKMEZ.
//  - Yedek dosyası düz JSON'dur; kullanıcı içeriğini görebilir. Uygulamada
//    parola/kimlik/konum gibi hassas veri yoktur, şifreleme gereksizdir ve
//    kullanıcıyı kendi verisinden kilitlemek doğru olmaz.
//  - Hata durumunda ASLA istisna fırlatmaz; `false` döner ve arayüz
//    kullanıcıya anlaşılır bir mesaj gösterir.

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { buildBackup, type PersistedState } from "./migration";

/** Yedek dosyasının adı — tarih içerir, üzerine yazmaz. */
export function backupFileName(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `zikirmatik-backup-${date.getFullYear()}${p(date.getMonth() + 1)}` +
    `${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.json`
  );
}

export interface ExportResult {
  ok: boolean;
  /** Yalnızca tanılama için; kullanıcıya ham yol gösterilmez. */
  uri?: string;
  error?: string;
}

export async function exportBackup(
  state: PersistedState,
  appVersion: string,
  dialogTitle: string
): Promise<ExportResult> {
  try {
    const payload = buildBackup(state, appVersion);
    const json = JSON.stringify(payload, null, 2);

    const file = new File(Paths.cache, backupFileName());
    if (file.exists) file.delete();
    file.create();
    file.write(json);

    const canShare = await Sharing.isAvailableAsync().catch(() => false);
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle,
        UTI: "public.json",
      });
    }
    return { ok: true, uri: file.uri };
  } catch (e) {
    console.warn("[backup] export failed", e);
    return { ok: false, error: (e as Error)?.message ?? "unknown" };
  }
}
