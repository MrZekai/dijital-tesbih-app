// Zikirmatik — Android manifest sertleştirme (config plugin).
//
// Bu eklenti üç şeyi garanti eder:
//  1) `<application android:allowBackup="false">` — cihaz-yerel gizlilik
//     modeliyle tutarlı Android Auto Backup davranışı (BUG-004 politikası).
//  2) expo-audio kütüphanesinin kendi AndroidManifest.xml'inde otomatik
//     kayıtlı olan iki servis (`AudioControlsService`, `AudioRecordingService`)
//     KALDIRILIR. Bu uygulama sadece kısa `useAudioPlayer` tap sesleri çalar;
//     media playback ne de background recording gerekmez. Böylece:
//        - `foregroundServiceType="mediaPlayback"` yok
//        - `foregroundServiceType="microphone"` yok
//        - Play Console permission-declaration formu tetiklenmez.
//  3) Kalan (istenmeyen) `android.permission.FOREGROUND_SERVICE` gibi
//     transitive/uses-permission girişleri app.json `blockedPermissions`
//     ile ayrıca temizlenmelidir; bu eklenti sadece <application> altındaki
//     <service> düğümlerini soyutlar.
//
// Servisleri “kaldırmak”, gerçek APK'da tools:node="remove" merge
// yönergesiyle yapılır. Böylece Expo/Gradle manifest merger, transitive
// olarak eklenen bu servisleri final AndroidManifest.xml'ten çıkarır.

const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const TOOLS_NS = "http://schemas.android.com/tools";
const TARGET_SERVICES = [
  "expo.modules.audio.service.AudioControlsService",
  "expo.modules.audio.service.AudioRecordingService",
];

function ensureToolsNamespace(manifest) {
  const attrs = manifest.$ || {};
  if (!attrs["xmlns:tools"]) {
    attrs["xmlns:tools"] = TOOLS_NS;
    manifest.$ = attrs;
  }
}

function upsertRemovedService(application, serviceName) {
  if (!Array.isArray(application.service)) {
    application.service = [];
  }
  const existing = application.service.find(
    (svc) => svc && svc.$ && svc.$["android:name"] === serviceName
  );
  if (existing) {
    existing.$ = {
      ...existing.$,
      "tools:node": "remove",
    };
    return;
  }
  application.service.push({
    $: {
      "android:name": serviceName,
      "tools:node": "remove",
    },
  });
}

const withZikirmatikManifestCleanup = (config) => {
  return withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults.manifest;
    ensureToolsNamespace(manifest);

    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    // (1) allowBackup=false — Ayarlar ekranındaki gizlilik metniyle uyumlu.
    application.$["android:allowBackup"] = "false";

    // (2) expo-audio transitive servislerini kaldır.
    for (const svc of TARGET_SERVICES) {
      upsertRemovedService(application, svc);
    }

    return cfg;
  });
};

module.exports = withZikirmatikManifestCleanup;
