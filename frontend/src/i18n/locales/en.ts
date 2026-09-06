// English — ANA KAYNAK (source of truth).
//
// Bu dosyadaki anahtar kümesi, tüm dillerin uyması gereken sözleşmedir.
// `TranslationKey` tipi buradan türetilir; diğer diller `Partial` olarak
// yazılır, eksik anahtarlar çalışma zamanında İngilizceye düşer.
//
// KURALLAR
//  - Cümle parçalarını birleştirme. Her tam cümle KENDİ anahtarına sahiptir.
//  - Sayılar `{{count}}`, diğer değerler `{{ad}}` gibi yer tutucularla gelir.
//  - Çoğul gerektiren anahtarlar `_one` / `_other` (ve gerekiyorsa
//    `_zero`/`_two`/`_few`/`_many`) son eklerini kullanır.
//  - Yeni anahtar eklerken önce BURAYA ekle; testler diğer dilleri uyarır.

const en = {
  // ── Ortak ────────────────────────────────────────────────────────────
  "common.ok": "OK",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.back": "Back",
  "common.reset": "Reset",
  "common.all": "All",
  "common.favorites": "Favorites",
  "common.search": "Search",
  "common.add": "Add",
  "common.done": "Done",
  "common.loading": "Loading…",
  "common.restart_title": "Restart required",
  "common.restart_body":
    "Close and reopen the app so the right-to-left layout is applied everywhere.",
  "common.restart_later": "Later",

  // ── Sekmeler ─────────────────────────────────────────────────────────
  "tabs.home": "Counter",
  "tabs.my_dhikrs": "My Dhikrs",
  "tabs.stats": "Statistics",
  "tabs.settings": "Settings",

  // ── Ana sayaç ekranı ─────────────────────────────────────────────────
  "home.brand": "DHIKR COUNTER",
  "home.today": "Today: {{count}}",
  "home.laps_one": "{{count}} round",
  "home.laps_other": "{{count}} rounds",
  "home.undo": "Undo",
  "home.reset": "Reset",
  "home.toggle_vibration": "Vibration",
  "home.toggle_sound": "Sound",
  "home.toggle_screen": "Screen",
  "home.tesbihat": "After Prayer",
  "home.vibration_on": "Vibration on",
  "home.vibration_off": "Vibration off",
  "home.sound_on": "Bead sound on",
  "home.sound_off": "Bead sound off",
  "home.screen_on": "Screen will stay on while you count",
  "home.screen_off": "Screen will dim normally",
  "home.target_reached": "Target reached — {{count}} × {{name}}.",
  "home.reset_title": "Reset the counter?",
  "home.reset_message":
    "The current counter for {{name}} will be set to zero. Your totals and statistics are kept.",
  "home.choose_target": "Choose a target",
  "home.choose_dhikr": "Choose a dhikr",
  "home.custom_target_hint":
    "Need a different number? Create a custom dhikr with your own target.",
  "home.a11y_counter": "Dhikr counter. Current count {{count}} of {{target}}.",
  "home.a11y_tap_area": "Counting area. Tap anywhere to count one.",

  // ── İstatistikler ────────────────────────────────────────────────────
  "stats.title": "Statistics",
  "stats.today": "Today",
  "stats.goal_progress": "{{percent}}% of today's goal",
  "stats.goal_reached": "You reached today's goal.",
  "stats.remaining_one": "{{count}} left to reach your goal",
  "stats.remaining_other": "{{count}} left to reach your goal",
  "stats.weekly": "This week",
  "stats.monthly": "Last 30 days",
  "stats.total": "All time",
  "stats.top_dhikrs": "Most counted",
  "stats.streak_current": "Current streak",
  "stats.streak_best": "Best streak",
  "stats.days_one": "{{count}} day",
  "stats.days_other": "{{count}} days",
  "stats.no_data": "No counts recorded yet.",
  "stats.reset_all": "Reset all data",
  "stats.reset_all_title": "Reset all statistics?",
  "stats.reset_all_message":
    "This deletes every counter and all history. It cannot be undone.",

  // ── Zikirlerim ───────────────────────────────────────────────────────
  "mydhikrs.title": "My Dhikrs",
  "mydhikrs.search_placeholder": "Search dhikr",
  "mydhikrs.no_results": "No dhikr matches your search.",
  "mydhikrs.add_custom": "Create custom dhikr",
  "mydhikrs.delete_title": "Delete this dhikr?",
  "mydhikrs.delete_message": "“{{name}}” and its counter will be deleted.",
  "mydhikrs.section_favorites": "Favorites",
  "mydhikrs.section_recent": "Recently used",
  "mydhikrs.section_builtin": "Built-in",
  "mydhikrs.section_custom": "Your dhikrs",
  "mydhikrs.add_favorite": "Add to favorites",
  "mydhikrs.remove_favorite": "Remove from favorites",
  "mydhikrs.filter_all": "All",
  "mydhikrs.filter_favorites": "Favorites",
  "mydhikrs.filter_custom": "Custom",
  "mydhikrs.esma_link": "99 Names of Allah",

  // ── Özel zikir ───────────────────────────────────────────────────────
  "custom.title_new": "New custom dhikr",
  "custom.title_edit": "Edit dhikr",
  "custom.name_label": "Name",
  "custom.name_placeholder": "e.g. Yā Razzāq",
  "custom.arabic_label": "Arabic (optional)",
  "custom.arabic_placeholder": "e.g. يَا رَزَّاق",
  "custom.target_label": "Target",
  "custom.custom_target": "Custom target",
  "custom.required": "A name and a target are required.",
  "custom.invalid": "Invalid value.",
  "custom.duplicate":
    "A dhikr named “{{name}}” already exists. Tap again to save anyway.",
  "custom.save_anyway": "Save anyway",
  "custom.save_changes": "Save changes",
  "custom.save": "Save dhikr",

  // ── Esmaül Hüsna ─────────────────────────────────────────────────────
  "esma.title": "99 Names of Allah",
  "esma.search_placeholder": "Search name, meaning or number",
  "esma.reset_title": "Reset this counter?",
  "esma.reset_message": "The counter for {{name}} will be set to zero.",
  "esma.meaning_pending":
    "Meaning shown in English — a reviewed translation for this language is not available yet.",

  // ── Namaz sonrası tesbihat ───────────────────────────────────────────
  "tesbihat.title": "After-Prayer Dhikr",
  "tesbihat.subtitle": "33 × Subḥānallāh · 33 × Alḥamdulillāh · 33 × Allāhu Akbar",
  "tesbihat.step": "Step {{current}} of {{total}}",
  "tesbihat.finish": "Finish",
  "tesbihat.finished": "Completed. May it be accepted.",
  "tesbihat.resume_title": "Continue where you left off?",
  "tesbihat.resume_body": "You have an unfinished session.",
  "tesbihat.restart": "Start over",

  // ── Ayarlar ──────────────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.section_appearance": "APPEARANCE",
  "settings.language": "Language",
  "settings.language_desc": "Choose the language of the app.",
  "settings.select_language": "Select language",
  "settings.theme": "Theme",
  "settings.theme_dark": "Dark",
  "settings.theme_light": "Light",
  "settings.theme_system": "System",
  "settings.big_text": "Large text",
  "settings.big_text_desc": "Show all text in the app larger and easier to read.",
  "settings.big_text_on": "Large text on — text is 22% bigger.",
  "settings.big_text_off": "Large text off — standard size.",
  "settings.simple_mode": "Simple mode",
  "settings.simple_mode_desc":
    "Hides the extra controls so you can focus on counting.",
  "settings.section_feedback": "FEEDBACK",
  "settings.vibration": "Vibration",
  "settings.bead_sound": "Bead sound",
  "settings.bead_sound_desc": "An optional, very soft tap sound.",
  "settings.keep_awake": "Keep screen on",
  "settings.keep_awake_desc": "Prevent the screen from turning off on the counter.",
  "settings.section_goal": "DAILY GOAL",
  "settings.custom_goal_placeholder": "Custom goal (e.g. 250)",
  "settings.goal_applied": "Daily goal set to {{count}}.",
  "settings.language_system": "System language (automatic)",
  "settings.sound_complete": "Completion sound",
  "settings.sound_complete_desc": "A short chime each time you reach the target.",
  "settings.section_reminder": "REMINDER",
  "settings.daily_reminder": "Daily reminder",
  "settings.daily_reminder_desc": "A gentle daily nudge to make dhikr.",
  "settings.reminder_time": "Reminder time",
  "settings.permission_blocked":
    "Notifications are turned off for this app. Enable them in your device settings.",
  "settings.section_data": "YOUR DATA",
  "settings.export": "Export a backup",
  "settings.export_desc":
    "Saves all of your counters, custom dhikrs and history to a file you keep.",
  "settings.export_done": "Backup created.",
  "settings.export_failed": "Could not create the backup.",
  "settings.data_notice":
    "Your dhikr records, counter history and settings are stored on your device. Google AdMob may process certain device and app usage data for ad delivery, measurement and security, in line with Google's policies.",
  "settings.section_app": "APP",
  "settings.version": "Version",
  "settings.privacy_policy": "Privacy policy",
  "settings.ad_privacy_options": "Ad privacy options",

  // ── Karşılama ────────────────────────────────────────────────────────
  "onboarding.t1": "Count your dhikr with ease",
  "onboarding.d1":
    "Tap anywhere on the screen to count. One hand, smooth and distraction-free.",
  "onboarding.t2": "Follow your goals and progress",
  "onboarding.d2":
    "Daily, weekly and monthly statistics let you see your journey over time.",
  "onboarding.t3": "A calm place to remember",
  "onboarding.d3": "Plain design, soft motion and nothing that gets in your way.",
  "onboarding.next": "Continue",
  "onboarding.start": "Get started",
  "onboarding.skip": "Skip",

  // ── Bildirimler ──────────────────────────────────────────────────────
  "notif.channel_name": "Dhikr reminder",
  "notif.title": "Dhikr Counter",
  "notif.body_1": "Would you like to complete today's dhikr goal?",
  "notif.body_2": "A good moment for a short dhikr break.",
  "notif.body_3": "You are close to your daily goal.",

  // ── Doğrulama ────────────────────────────────────────────────────────
  "validation.required": "Enter a value.",
  "validation.positive_integer": "Enter a positive whole number (e.g. 250).",
  "validation.min": "The value must be greater than 0.",
  "validation.max": "The value is too large.",

  // ── Hata sınırı ──────────────────────────────────────────────────────
  "error.title": "Something went wrong",
  "error.body": "The app hit an unexpected problem. Your saved counts are safe.",
  "error.retry": "Try again",

  // ── Hazır zikirler ───────────────────────────────────────────────────
  // Arapça metin dilden bağımsızdır ve `src/lib/dhikrs.ts` içinde durur.
  // Buradaki değerler yalnızca okunuş (transliterasyon) ve kısa anlamdır.
  "dhikr.subhanallah": "Subḥānallāh",
  "dhikr.subhanallah_meaning": "Glory be to Allah",
  "dhikr.elhamdulillah": "Alḥamdulillāh",
  "dhikr.elhamdulillah_meaning": "All praise is due to Allah",
  "dhikr.allahuekber": "Allāhu Akbar",
  "dhikr.allahuekber_meaning": "Allah is the Greatest",
  "dhikr.estagfirullah": "Astaghfirullāh",
  "dhikr.estagfirullah_meaning": "I seek forgiveness from Allah",
  "dhikr.salavat": "Ṣalawāt",
  "dhikr.salavat_meaning": "Blessings upon the Prophet Muhammad",
  "dhikr.kelimeitevhid": "Kalimat at-Tawḥīd",
  "dhikr.kelimeitevhid_meaning": "There is no god but Allah",
} as const;

export type TranslationKey = keyof typeof en;

/**
 * Çoğul anahtarların TABAN adı. `t("stats.days", { count })` çağrısı
 * çalışma zamanında `stats.days_one` / `stats.days_other` … arasından
 * doğru olanı seçer; bu tip o tabanları derleme zamanında güvenli kılar.
 */
type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";
type StripPlural<K extends string> = K extends `${infer B}_${PluralSuffix}`
  ? B
  : never;
export type PluralBaseKey = StripPlural<TranslationKey>;

/** `t()` fonksiyonunun kabul ettiği tüm anahtarlar. */
export type AnyTranslationKey = TranslationKey | PluralBaseKey;

/**
 * Bir dil, İngilizcede bulunmayan çoğul biçimlerini de sağlayabilir
 * (ör. Arapçada `_zero`/`_two`/`_few`/`_many`, Rusçada `_few`/`_many`).
 * Bu yüzden çeviri tablosu, çoğul TABANLARININ tüm CLDR varyantlarını
 * kabul eder; taban olmayan anahtarlar yine sıkı biçimde denetlenir.
 */
type PluralVariantKey = `${PluralBaseKey}_${PluralSuffix}`;

export type TranslationTable = Partial<
  Record<TranslationKey | PluralVariantKey, string>
>;

export const EN_KEYS = Object.keys(en) as TranslationKey[];

export default en;
