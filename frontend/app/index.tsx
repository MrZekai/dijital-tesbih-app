// Acilis yonlendirmesi.
// Kullanici istegi: hicbir ara ekran (splash/onboarding) gosterilmez,
// uygulama acilir acilmaz dogrudan Ana Sayfa'ya gidilir.
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
