// Paylaşılan giriş doğrulama yardımcıları.
// QA BUG-003/BUG-014/BUG-015 kapsamında: Özel hedef / özel zikir hedefi gibi
// sayısal girişler için TEK bir doğrulama mantığı kullanılır (Ayarlar ve
// Özel Zikir Ekle ekranları arasında tutarlılık sağlar).

export interface PositiveIntResult {
  valid: boolean;
  value?: number;
  error?: string;
}

// Sadece pozitif TAM sayıları kabul eder (0, negatif, ondalık veya boş
// girişleri reddeder ve kullanıcıya gösterilecek açık bir hata döner).
export function parsePositiveInteger(raw: string): PositiveIntResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: "Bir değer girin." };
  }
  // Sadece rakamlardan oluşmalı (ondalık nokta/virgül, eksi işareti vb. yok).
  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      error: "Geçerli bir pozitif tam sayı girin (örn. 250).",
    };
  }
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, error: "Değer 0'dan büyük olmalı." };
  }
  if (n > 1_000_000) {
    return { valid: false, error: "Değer çok büyük." };
  }
  return { valid: true, value: n };
}

// BUG-015: isim çakışması kontrolü — kırpma + küçük harfe çevirme (Türkçe
// locale) ile normalize eder.
export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("tr-TR");
}
