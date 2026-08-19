// Zikirmatik — Android manifest sertleştirme (config plugin).
//
// v1.0.20:
// - allowBackup=false
// - expo-audio background/microphone servisleri tools:node="remove"
// - kullanılmayan generic FOREGROUND_SERVICE izni tools:node="remove"
//
// app.json `blockedPermissions` de aynı foreground-service iznini engeller;
// bu plugin ikinci bir güvence olarak merged manifest'e remove directive yazar.

const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const TOOLS_NS = "http://schemas.android.com/tools";
const TARGET_SERVICES = [
  "expo.modules.audio.service.AudioControlsService",
  "expo.modules.audio.service.AudioRecordingService",
];
const TARGET_PERMISSIONS = ["android.permission.FOREGROUND_SERVICE"];

function ensureToolsNamespace(manifest) {
  const attrs = manifest.$ || {};
  if (!attrs["xmlns:tools"]) {
    attrs["xmlns:tools"] = TOOLS_NS;
    manifest.$ = attrs;
  }
}

function upsertRemovedService(application, serviceName) {
  if (!Array.isArray(application.service)) application.service = [];
  const existing = application.service.find(
    (svc) => svc?.$?.["android:name"] === serviceName
  );
  if (existing) {
    existing.$ = { ...existing.$, "tools:node": "remove" };
    return;
  }
  application.service.push({
    $: { "android:name": serviceName, "tools:node": "remove" },
  });
}

function upsertRemovedPermission(manifest, permissionName) {
  const key = "uses-permission";
  if (!Array.isArray(manifest[key])) manifest[key] = [];
  const existing = manifest[key].find(
    (perm) => perm?.$?.["android:name"] === permissionName
  );
  if (existing) {
    existing.$ = { ...existing.$, "tools:node": "remove" };
    return;
  }
  manifest[key].push({
    $: { "android:name": permissionName, "tools:node": "remove" },
  });
}

const withZikirmatikManifestCleanup = (config) =>
  withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults.manifest;
    ensureToolsNamespace(manifest);

    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.$["android:allowBackup"] = "false";

    for (const svc of TARGET_SERVICES) upsertRemovedService(application, svc);
    for (const permission of TARGET_PERMISSIONS) {
      upsertRemovedPermission(manifest, permission);
    }

    return cfg;
  });

module.exports = withZikirmatikManifestCleanup;
