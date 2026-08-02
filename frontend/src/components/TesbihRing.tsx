// Zarif, dairesel tesbih taneleri süsleme — Ana sayaç etrafında yer alır.
// Reanimated ile yavaş dönüş animasyonu.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface Props {
  size: number;
  beadCount?: number;
  color: string;
  progress: number; // 0..1
  progressColor: string;
}

export function TesbihRing({
  size,
  beadCount = 33,
  color,
  progress,
  progressColor,
}: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const beads: React.ReactElement[] = [];
  const radius = size / 2;
  const beadSize = Math.max(3, size * 0.02);
  const filled = Math.min(beadCount, Math.floor(progress * beadCount));

  for (let i = 0; i < beadCount; i++) {
    const angle = (i / beadCount) * Math.PI * 2 - Math.PI / 2;
    const x = radius + Math.cos(angle) * (radius - beadSize * 2);
    const y = radius + Math.sin(angle) * (radius - beadSize * 2);
    const isFilled = i < filled;
    beads.push(
      <View
        key={i}
        style={[
          styles.bead,
          {
            width: beadSize * 2,
            height: beadSize * 2,
            borderRadius: beadSize,
            left: x - beadSize,
            top: y - beadSize,
            backgroundColor: isFilled ? progressColor : color,
            opacity: isFilled ? 1 : 0.35,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[styles.container, { width: size, height: size, pointerEvents: "none" }]}
    >
      <Animated.View
        style={[
          styles.absoluteFill,
          { width: size, height: size, borderRadius: size / 2 },
          animStyle,
        ]}
      >
        {beads}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  absoluteFill: {
    position: "absolute",
  },
  bead: {
    position: "absolute",
  },
});
