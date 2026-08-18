// Uygulama geneli hata sınırı (Error Boundary).
//
// QA BUG-001'in tavsiyesi:
//   "Regardless, wrap the ad integration in an error boundary so an ad SDK
//    fault can never take down the counter screen."
//
// Bu bileşen render ağacında oluşan HERHANGİ bir JavaScript hatasını
// yakalar ve uygulamanın komple kapanması (beyaz ekran / kill) yerine
// kurtarılabilir bir ekran gösterir.
//
// Neden bu özellikle önemli:
//   - Zikir verisi her değişiklikte diske yazılır (store'daki debounce +
//     zorunlu flush). Yani bir çökme olsa bile SAYIM KAYBI olmaz; ancak
//     kullanıcı uygulamanın "kapandığını" görür ve güveni sarsılır.
//   - Reklam SDK'sı üçüncü taraf native koddur; JS tarafında beklenmedik
//     bir durum üretirse sayaç ekranını da beraberinde götürmemelidir.
//
// NOT: Error boundary yalnızca RENDER sırasındaki hataları yakalar; event
// handler'lar ve asenkron kod kendi try/catch'ine sahiptir (reklam
// modüllerinde mevcut).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Log'larda ayırt etmek için (ör. "root", "ads"). */
  tag?: string;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.warn(
      `[error-boundary:${this.props.tag ?? "root"}]`,
      error?.message,
      info
    );
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Bir sorun oluştu</Text>
        <Text style={styles.body}>
          Zikir kayıtlarınız güvende — hepsi cihazınıza kaydedildi. Aşağıdaki
          düğmeye dokunarak devam edebilirsiniz.
        </Text>
        <Pressable
          onPress={this.reset}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}
          testID="error-boundary-retry"
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>Yeniden Dene</Text>
        </Pressable>
      </View>
    );
  }
}

// Tema context'i de bozulmuş olabileceği için sabit renkler kullanılır.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: {
    color: "#C6A664",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  body: {
    color: "#C2BCA8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  btn: {
    marginTop: 12,
    backgroundColor: "#C6A664",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  btnText: {
    color: "#06090E",
    fontSize: 16,
    fontWeight: "700",
  },
});
