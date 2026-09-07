// TesbihRingSvg — sayaç halkası + hilal-yıldız motifi.
//
// MOTİF SEÇİMİ (v1.1.0-r3)
// ────────────────────────
// Önceki sürümlerde merkezde geometrik bir yıldız (Rub'el Hizb + girih)
// vardı. QA'da haklı olarak "dinî değil, trigonometrik şekil gibi" diye
// eleştirildi ve yerine HİLAL + YILDIZ kondu — uygulamanın Play'deki
// kendi logosuyla aynı kimlik, dolayısıyla ikon ile ekran arasında
// bütünlük kurar.
//
// DİNÎ UYGUNLUK SINIRLARI (bilinçli kararlar)
//   - Tasvir yok: hiçbir canlı varlık figürü çizilmez.
//   - YAZI YOK: Allah/Muhammed hattı veya ayet KULLANILMAZ. Üzerine sayaç
//     rakamı binen bir zemine mübarek isim veya ayet yerleştirmek uygun
//     düşmez; bu bir tasarım tercihi değil, konulan bir sınırdır.
//   - Motif düşük opaklıkta filigran olarak kalır; okunurluğu bozmaz.
//
// KATMANLAR (arkadan öne)
//   1. Yumuşak radyal zemin.
//   2. Hilal + beş köşeli yıldız — altın, düşük opaklık, SABİT.
//      DÖNMEZ: hilal dönen bir motif olamaz. Geometrik bir rozet dönerken
//      fark edilmez, ama hilalin her açıda anlamı değişir; bir an gelir
//      aşağı bakar ve yanlış görünür. QA'da tam olarak bu yaşandı.
//   3. Çift ince çember (mihrap kemeri hissi).
//   4. TESBİH TANELERİ — ilerledikçe tek tek altına döner.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
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
}

/**
 * Beş köşeli yıldız yolu (merkez 0,0). Tepe noktası yukarı bakar.
 */
function starPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(rr * Math.cos(a)).toFixed(2)} ${(rr * Math.sin(a)).toFixed(2)}`);
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
}: Props) {
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

  // ── HİLAL + YILDIZ ──────────────────────────────────────────────────
  // Hilal, iki daire yayından oluşan TEK bir yol olarak çizilir: dış daire
  // (yarıçap R, merkez 0,0) eksi sağa kaydırılmış iç daire (yarıçap r).
  // Maske/clip kullanılmaz — react-native-svg'de yol daha güvenilir.
  const motifR = size * 0.235;
  const crescentPath = useMemo(() => {
    const R = motifR;
    const r = R * 0.86;
    const d = R * 0.3;
    const ix = (R * R - r * r + d * d) / (2 * d);
    const iy = Math.sqrt(Math.max(0, R * R - ix * ix));
    // Yay bayrakları görsel olarak doğrulandı: 1/0 + 1/1 sağa açılan hilal.
    return (
      `M ${ix.toFixed(2)} ${(-iy).toFixed(2)} ` +
      `A ${R.toFixed(2)} ${R.toFixed(2)} 0 1 0 ${ix.toFixed(2)} ${iy.toFixed(2)} ` +
      `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${ix.toFixed(2)} ${(-iy).toFixed(2)} Z`
    );
  }, [motifR]);

  const starD = useMemo(() => starPath(motifR * 0.23), [motifR]);
  const starX = motifR * 0.68;
  const starY = -motifR * 0.55;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Motif katmanı — SABİT. Hilal asla döndürülmez. */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="glowBg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={gold} stopOpacity="0.10" />
              <Stop offset="60%" stopColor={gold} stopOpacity="0.03" />
              <Stop offset="100%" stopColor={gold} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle cx={cx} cy={cy} r={size * 0.38} fill="url(#glowBg)" />

          {/* Hilal + yıldız — logodaki duruş: açıklık sağa ve YUKARI bakar.
              rotation NEGATİF = saat yönünün tersi = açıklık yukarı kalkar. */}
          <G translateX={cx + motifR * 0.14} translateY={cy} opacity={0.18}>
            <G rotation={-25}>
              <Path d={crescentPath} fill={gold} />
              <G translateX={starX} translateY={starY}>
                <Path d={starD} fill={gold} />
              </G>
            </G>
          </G>
        </Svg>
      </View>

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
