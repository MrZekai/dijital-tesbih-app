// Sağdan sola (RTL) yerleşim yardımcıları.
//
// NEDEN KENDİ KATMANIMIZ VAR?
// ───────────────────────────
// React Native'de `I18nManager.forceRTL()` ancak uygulama YENİDEN
// BAŞLATILDIKTAN sonra tam etki eder. Kullanıcı ayarlardan Arapçaya
// geçtiği anda ekranın bozuk kalmaması için, yön bilgisini ayrıca
// i18n context'inden okuyup kritik yerlerde (satır yönü, metin hizası,
// yönlü ikonlar, kenar boşlukları) ELLE uygularız.
//
// Böylece:
//   - Yeniden başlatmadan ÖNCE de arayüz doğru görünür,
//   - Yeniden başlatmadan SONRA native RTL ile çakışmaz (native RTL zaten
//     `flexDirection: "row"`u ters çevirir; biz `row` yerine hesaplanmış
//     değeri verdiğimiz için sonuç aynı kalır).
//
// KURAL: Ekranlarda `marginLeft/right`, `left/right`, `textAlign: "left"`
// gibi FİZİKSEL değerler yerine buradaki MANTIKSAL yardımcıları kullan.

import { I18nManager, type TextStyle } from "react-native";

import { useI18n } from "@/src/i18n";

export interface Direction {
  isRTL: boolean;
  /** Normal içerik satırı. */
  row: "row" | "row-reverse";
  /** Bilinçli olarak TERS satır (ör. sağa yaslı aksiyonlar). */
  rowReverse: "row" | "row-reverse";
  /** Metin hizası — okuma yönünün başlangıcı. */
  textAlign: TextStyle["textAlign"];
  /** Metin hizası — okuma yönünün sonu. */
  textAlignEnd: TextStyle["textAlign"];
  /** Yazı yönü; karışık (Arapça + rakam) metinlerde gereklidir. */
  writingDirection: TextStyle["writingDirection"];
  /** "Geri" oku için doğru ikon adı. */
  backIcon: "chevron-back" | "chevron-forward";
  /** İleri/detay oku için doğru ikon adı. */
  forwardIcon: "chevron-forward" | "chevron-back";
  /** Mutlak konumlandırmada başlangıç kenarı. */
  start: "left" | "right";
  /** Mutlak konumlandırmada bitiş kenarı. */
  end: "left" | "right";
}

export function directionFor(isRTL: boolean): Direction {
  // Native taraf zaten RTL'e geçtiyse `flexDirection: "row"` kendiliğinden
  // ters akar; o durumda tekrar ters çevirmek YANLIŞ olur.
  const nativeAlreadyRTL = I18nManager.isRTL;
  const needsManualFlip = isRTL && !nativeAlreadyRTL;

  return {
    isRTL,
    row: needsManualFlip ? "row-reverse" : "row",
    rowReverse: needsManualFlip ? "row" : "row-reverse",
    textAlign: isRTL ? "right" : "left",
    textAlignEnd: isRTL ? "left" : "right",
    writingDirection: isRTL ? "rtl" : "ltr",
    backIcon: isRTL ? "chevron-forward" : "chevron-back",
    forwardIcon: isRTL ? "chevron-back" : "chevron-forward",
    start: isRTL ? "right" : "left",
    end: isRTL ? "left" : "right",
  };
}

/** Ekranlarda kullanılacak hook. */
export function useDirection(): Direction {
  const { isRTL } = useI18n();
  return directionFor(isRTL);
}
