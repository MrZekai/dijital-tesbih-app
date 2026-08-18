// Büyük Yazı Modu destekli `Text` / `TextInput` sarmalayıcıları.
//
// Kullanım: ekranlarda `react-native` yerine buradan import edin:
//     import { Text, TextInput } from "@/src/components/AppText";
//
// Davranış:
//   - Büyük Yazı Modu KAPALI iken (`scale === 1`) hiçbir ek iş yapılmaz;
//     bileşen doğrudan react-native'in kendisine devredilir (sıfır maliyet).
//   - AÇIK iken stildeki `fontSize` ve `lineHeight` değerleri ölçeklenir.
//   - `fontSize` verilmemiş metinler için React Native'in varsayılanı
//     (14) baz alınır, böylece stilsiz metinler de büyür.
//   - `allowFontScaling={false}` verilen bileşenler (ör. ana sayaç, kendi
//     dinamik boyut mantığına sahip) ölçekten ETKİLENMEZ.

import React from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { useFontScale } from "@/src/lib/fontScale";

const RN_DEFAULT_FONT_SIZE = 14;

function scaleTextStyle(
  style: StyleProp<TextStyle>,
  scale: number
): StyleProp<TextStyle> {
  if (scale === 1) return style;

  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseSize = flat?.fontSize ?? RN_DEFAULT_FONT_SIZE;

  const patch: TextStyle = { fontSize: Math.round(baseSize * scale) };

  if (typeof flat?.lineHeight === "number") {
    patch.lineHeight = Math.round(flat.lineHeight * scale);
  }

  return [style, patch];
}

export const Text = React.forwardRef<RNText, TextProps>(function AppText(
  { style, allowFontScaling, ...rest },
  ref
) {
  const scale = useFontScale();
  const effectiveScale = allowFontScaling === false ? 1 : scale;
  return (
    <RNText
      ref={ref}
      allowFontScaling={allowFontScaling}
      style={scaleTextStyle(style, effectiveScale)}
      {...rest}
    />
  );
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function AppTextInput({ style, allowFontScaling, ...rest }, ref) {
    const scale = useFontScale();
    const effectiveScale = allowFontScaling === false ? 1 : scale;
    return (
      <RNTextInput
        ref={ref}
        allowFontScaling={allowFontScaling}
        style={scaleTextStyle(style as StyleProp<TextStyle>, effectiveScale)}
        {...rest}
      />
    );
  }
);
