// TesbihRingSvg — sayaç halkası + geleneksel İslam geometrisi motifi.
//
// v1.1.0'da eski `TesbihRing` (basit View noktaları) yerine gelir.
// v1.1.0-r2'de merkez motifi yeniden çizildi: eski hâli genel bir
// "mandala" gibi okunuyordu; artık merkezde RUB'EL HİZB (۞) var.
//
// MOTİF — Rub'el Hizb
//   Kur'an-ı Kerim'de cüz/hizb bölümlerini işaretlemek için yüzyıllardır
//   kullanılan sekiz köşeli yıldız. Biri 45° döndürülmüş İKİ KARE'nin
//   üst üste binmesinden oluşur; ortasında küçük bir daire bulunur.
//   Unicode'daki ۞ (U+06DE) karakterinin geometrik karşılığıdır.
//   Etrafına sekiz köşeli girih yıldızı ({8/3} çokgeni) ve uçlara küçük
//   noktalar eklenmiştir — Selçuklu/Osmanlı taş ve ahşap işçiliğindeki
//   klasik düzen.
//
// KATMANLAR (arkadan öne)
//   1. Yumuşak radyal zemin.
//   2. Rub'el Hizb + girih yıldızı — altın, düşük opaklıkta filigran,
//      çok yavaş döner (180 sn/tur).
//   3. Çift ince çember (mihrap kemeri hissi).
//   4. TESBİH TANELERİ — ilerledikçe tek tek altına döner.
//
// Dinî içerik notu: burada hiçbir metin, ayet, hadis veya sembolik iddia
// yoktur; yalnızca geleneksel geometrik süsleme kullanılır.

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

/**
 * {8/3} yıldız çokgeni — sekiz nokta, her biri üç sonrakine bağlanır.
 * Girih desenlerinin temel yıldızıdır.
 */
function starPolygon(r: number, step = 3): string {
  const pts: string[] = [];
  let i = 0;
  for (let n = 0; n < 8; n++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`);
    i = (i + step) % 8;
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
      withTiming(360, { duration: 180000, easing: Easing.linear }),
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

  // Motif ölçüleri — sayaç rakamları ortada durduğu için filigran dar tutulur.
  const motifR = size * 0.29;
  const half = motifR * 0.66; // Rub'el Hizb karelerinin yarı kenarı
  const tipR = motifR * 0.93; // yıldız uçlarındaki noktalar

  const tipDots = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      out.push(
        <Circle
          key={i}
          cx={tipR * Math.cos(a)}
          cy={tipR * Math.sin(a)}
          r={Math.max(1, size * 0.007)}
          fill={gold}
        />
      );
    }
    return out;
  }, [gold, size, tipR]);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Motif katmanı — çok yavaş döner. */}
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

          <G translateX={cx} translateY={cy} opacity={0.22}>
            {/* RUB'EL HİZB (۞) — biri 45° döndürülmüş iki kare */}
            <Path d={squarePath(half)} stroke={gold} strokeWidth={1.4} fill="none" />
            <G rotation={45}>
              <Path d={squarePath(half)} stroke={gold} strokeWidth={1.4} fill="none" />
            </G>
            {/* Merkez daire — Rub'el Hizb'in ayırt edici parçası */}
            <Circle r={motifR * 0.17} stroke={gold} strokeWidth={1.2} fill="none" />

            {/* Girih yıldızı {8/3} + uç noktaları */}
            <Path
              d={starPolygon(motifR * 0.93)}
              stroke={gold}
              strokeWidth={0.85}
              fill="none"
              opacity={0.85}
            />
            {tipDots}
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
