// Büyük Yazı Modu — uygulama geneli yazı ölçeklendirmesi.
//
// SORUN (v1.0.16 ve öncesi)
// ─────────────────────────
// Ayarlar > "Büyük Yazı Modu" anahtarı yalnızca `settings.bigText` boolean
// değerini saklıyordu. Bu değer TÜM uygulamada tek bir yerde kullanılıyordu:
// Ana Sayfa'daki sayaç font boyutu (128 → 152). Sayaç `adjustsFontSizeToFit`
// ile zaten halkaya sığacak şekilde küçültüldüğü için, pratikte HİÇBİR
// GÖRSEL DEĞİŞİKLİK olmuyordu. Kullanıcı haklı olarak "çalışmıyor, ne
// olduğu bile belli değil" dedi.
//
// ÇÖZÜM
// ─────
// Hafif bir Context ile uygulama geneli bir `fontScale` yayınlanır ve
// `@/src/components/AppText` içindeki `Text` / `TextInput` sarmalayıcıları
// bu ölçeği stildeki `fontSize` ve `lineHeight` değerlerine uygular.
//
// PERFORMANS NOTU: Bu context'in DEĞERİ sadece bir sayıdır ve yalnızca
// kullanıcı ayarı değiştirdiğinde değişir. Ana store (her zikir dokunuşunda
// güncellenir) doğrudan tüketilmediği için, sayaç artışları binlerce Text
// bileşenini yeniden render ETMEZ.

import React, { createContext, useContext, useMemo } from "react";

import { useStore } from "./store";

/** Büyük Yazı Modu açıkken uygulanan çarpan. */
export const BIG_TEXT_SCALE = 1.22;

const FontScaleContext = createContext<number>(1);

export function useFontScale(): number {
  return useContext(FontScaleContext);
}

/**
 * Store'daki `settings.bigText` değerini okuyup context'e yayar.
 * StoreProvider'ın İÇİNDE render edilmelidir.
 */
export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const scale = state.settings.bigText ? BIG_TEXT_SCALE : 1;

  // `children` referansı değişmediği sürece alt ağaç yeniden render olmaz;
  // context değeri de sadece ölçek değiştiğinde yenilenir.
  const value = useMemo(() => scale, [scale]);

  return (
    <FontScaleContext.Provider value={value}>
      {children}
    </FontScaleContext.Provider>
  );
}

/** Tek bir sayısal boyutu ölçekler (ör. ikon boyutları için). */
export function scaleSize(size: number, scale: number): number {
  if (scale === 1) return size;
  return Math.round(size * scale);
}
