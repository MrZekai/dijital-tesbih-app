// useTesbihSounds - Ana sayfa sayac sesleri.
//
// NOT: Bu ozellik projede daha once HIC uygulanmamisti. Ayarlar'daki "Ses"
// dugmesi sadece bir boolean sakliyordu, hicbir yerde ses calinmiyordu.
//
// - Hook'lar HER ZAMAN kosulsuz cagrilir (BottomBanner'daki cokmenin sebebi
//   tam olarak kosullu hook cagrisiydi; ayni hatayi tekrarlamiyoruz).
// - Sessiz modda da duyulur, diger uygulamalarin muzigini kesmez.
// - Hizli dokunuslarda ses bastan calsin diye her seferinde seekTo(0).

import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useCallback, useEffect } from "react";

const TAP_SOURCE = require("@/assets/sounds/tap.wav");
const TARGET_SOURCE = require("@/assets/sounds/target.wav");

export interface SoundPrefs {
  /** Her dokunuşta tane sesi. */
  tap: boolean;
  /** Hedefe ulaşınca tamamlanma sesi. */
  complete: boolean;
}

/**
 * v1.1.0: tek bir `enabled` yerine İKİ ayrı tercih.
 * Kullanıcı geri bildirimi: hedef dolunca ses çıkmasını istiyor ama her
 * dokunuşta tık sesi istemiyor. Artık ikisi bağımsız.
 */
export function useTesbihSounds(prefs: SoundPrefs) {
  const tapPlayer = useAudioPlayer(TAP_SOURCE);
  const targetPlayer = useAudioPlayer(TARGET_SOURCE);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch((e) => {
      console.warn("[sound] setAudioModeAsync failed", e);
    });
  }, []);

  return useCallback(
    (kind: "tap" | "target") => {
      if (kind === "tap" && !prefs.tap) return;
      if (kind === "target" && !prefs.complete) return;
      const player = kind === "target" ? targetPlayer : tapPlayer;
      try {
        player.seekTo(0);
        player.play();
      } catch (e) {
        // Ses asla uygulamayi cokertmemeli.
        console.warn("[sound] play failed", e);
      }
    },
    [prefs.complete, prefs.tap, tapPlayer, targetPlayer]
  );
}
