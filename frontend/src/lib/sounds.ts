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

export function useTesbihSounds(enabled: boolean) {
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
      if (!enabled) return;
      const player = kind === "target" ? targetPlayer : tapPlayer;
      try {
        player.seekTo(0);
        player.play();
      } catch (e) {
        // Ses asla uygulamayi cokertmemeli.
        console.warn("[sound] play failed", e);
      }
    },
    [enabled, tapPlayer, targetPlayer]
  );
}
