// TesbihRingSvg — sayaç halkası + geleneksel İslami geometri motifi.
//
// v1.1.0'da eski `TesbihRing` (basit View noktaları) yerine gelir.
//
// KATMANLAR (arkadan öne)
//   1. Yumuşak radyal zemin — halkanın içine derinlik verir.
//   2. MOTİF: Rub'el Hizb (۞ — 45° döndürülmüş iki kare) + sekiz kollu
//      girih rozeti + sekizgen. Altın, çok düşük opaklıkta filigran.
//      Çok yavaş döner (120 sn/tur) — dikkat dağıtmaz, ekranı canlı tutar.
//   3. Çift ince çember (mihrap kemeri hissi).
//   4. TESBİH TANELERİ: ilerledikçe TEK TEK altına döner. Eski sürümde
//      tek renk bir yay vardı; artık kaç tane çekildiği tanelerden okunur.
//   5. Aktif tane vurgusu + ilerleme yayı.
//
// Dinî içerik notu: burada hiçbir metin, ayet veya sembolik iddia yoktur;
// yalnızca geleneksel geometrik süsleme kullanılır.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface Props {
  size: number;
  /** Halka üzerindeki tane sayısı (hedef 33'ten büyükse 33'te sabitlenir). */
  beadCount?: number;
  /** 0..1 — mevcut turdaki ilerleme. */
  progress: number;
  /** Boş tane / ince çizgi rengi. */
  color: string;
  /** Dolu tane ve vurgu rengi (altın). */
  progressColor: string;
  /** Motif rengi; verilmezse `progressColor` kullanılır. */
  motifColor?: string;
  /** Motifi hareketsiz bırak (erişilebilirlik / pil). */
  reduceMotion?: boolean;
}

/** Merkezi (0,0) olan bir karenin yolu. */
function squarePath(half: number): string {
  return `M ${-half} ${-half} L ${half} ${-half} L ${half} ${half} L ${-half} ${half} Z`;
}

/** Sekizgen yolu — girih rozetinin dış çerçevesi. */
function octagonPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 8;
    pts.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export function TesbihRingSvg({
  size,
  beadCount = 33,
  progress,
  color,
  progressColor,
  motifColor,
  reduceMotion = false,
}: Props) {
  const spin = useSharedValue(0);

  React.useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(
      withTiming(360, { duration: 120000, easing: Easing.linear }),
      -1,
      false
    );
  }, [reduceMotion, spin]);

  const motifStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const beads = Math.max(9, Math.min(33, beadCount));
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.42;
  const beadR = Math.max(2.5, size * 0.021);
  const gold = motifColor ?? progressColor;

  // Dolu tane sayısı: ilerleme oranından. `progress === 1` iken hepsi dolu.
  const filled = progress >= 1 ? beads : Math.floor(progress * beads + 1e-6);

  const beadNodes = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let i = 0; i < beads; i++) {
      // -90° → tepeden başla, saat yönünde.
      const a = (Math.PI * 2 * i) / beads - Math.PI / 2;
      const x = cx + ringR * Math.cos(a);
      const y = cy + ringR * Math.sin(a);
      const on = i < filled;
      out.push(
        <Circle
          key={i}
          cx={x}
          cy={y}
          r={on ? beadR * 1.25 : beadR}
          fill={on ? progressColor : "transparent"}
          stroke={on ? progressColor : color}
          strokeWidth={on ? 0 : 1}
          opacity={on ? 1 : 0.5}
        />
      );
    }
    return out;
  }, [beadR, beads, color, cx, cy, filled, progressColor, ringR]);

  const motifR = size * 0.3;
  const half = motifR * 0.72;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Motif katmanı — yavaşça döner. */}
      <Animated.View style={[StyleSheet.absoluteFill, motifStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="glowBg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={gold} stopOpacity="0.10" />
              <Stop offset="60%" stopColor={gold} stopOpacity="0.03" />
              <Stop offset="100%" stopColor={gold} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle cx={cx} cy={cy} r={size * 0.38} fill="url(#glowBg)" />

          <G translateX={cx} translateY={cy} opacity={0.16}>
            {/* Rub'el Hizb — iki kare, biri 45° döndürülmüş */}
            <Path d={squarePath(half)} stroke={gold} strokeWidth={1.1} fill="none" />
            <G rotation={45}>
              <Path d={squarePath(half)} stroke={gold} strokeWidth={1.1} fill="none" />
            </G>

            {/* Girih rozeti: sekizgen + sekiz kol */}
            <Path d={octagonPath(motifR * 0.5)} stroke={gold} strokeWidth={0.9} fill="none" />
            <Path d={octagonPath(motifR * 0.26)} stroke={gold} strokeWidth={0.8} fill="none" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (Math.PI / 4) * i;
              const x1 = motifR * 0.26 * Math.cos(a);
              const y1 = motifR * 0.26 * Math.sin(a);
              const x2 = motifR * 0.72 * Math.cos(a);
              const y2 = motifR * 0.72 * Math.sin(a);
              return (
                <Path
                  key={i}
                  d={`M ${x1} ${y1} L ${x2} ${y2}`}
                  stroke={gold}
                  strokeWidth={0.8}
                />
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      {/* Taneler ve çemberler — SABİT (ilerleme okunabilir kalsın). */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Çift ince çember */}
        <Circle
          cx={cx}
          cy={cy}
          r={ringR}
          stroke={color}
          strokeWidth={0.8}
          fill="none"
          opacity={0.45}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={size * 0.475}
          stroke={color}
          strokeWidth={1}
          fill="none"
          opacity={0.28}
        />
        {beadNodes}
      </Svg>
    </View>
  );
}

export default TesbihRingSvg;
