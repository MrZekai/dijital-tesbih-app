// Esmaül Hüsna — Allah'ın 99 ismi.
//
// v1.1.0 ÇOK DİLLİ NOT
// ────────────────────
// - `arabic` ve `latin` (okunuş) DİLDEN BAĞIMSIZDIR; her dilde aynı gösterilir.
// - Anlamlar dinî içeriktir. Bu sürümde YALNIZCA iki dilde, insan tarafından
//   gözden geçirilebilir biçimde tutulur: Türkçe (`meaningTr`, mevcut
//   sürümden birebir korundu) ve İngilizce (`meaningEn`).
// - Diğer 25 dilde arayüz İngilizce anlamı gösterir ve altında
//   `esma.meaning_pending` uyarısını yazar. Doğrulanmamış dinî çeviri
//   ÜRETİLMEZ — bkz. TRANSLATION_MATRIX.md (NEEDS_HUMAN_REVIEW).
// - Anlamlar temkinli, kısa ve genel kabul gören kaynaklara göredir;
//   kesin fıkhî hüküm içermez.

export interface EsmaEntry {
  no: number;
  arabic: string;
  /** Latin harfli okunuş — dilden bağımsız. */
  latin: string;
  /** Türkçe anlam (1.0.x'ten korunmuştur). */
  meaningTr: string;
  /** İngilizce anlam — diğer diller için yedek. */
  meaningEn: string;
}

export const ESMA_LIST: EsmaEntry[] = [
  { no: 1, arabic: "الرَّحْمٰنُ", latin: "Er-Rahmân", meaningTr: "Rahmeti sonsuz, tüm yaratılmışlara merhametle davranan.", meaningEn: "The Most Compassionate, whose mercy encompasses all creation." },
  { no: 2, arabic: "الرَّحِيمُ", latin: "Er-Rahîm", meaningTr: "Ahirette müminlere sonsuz rahmetiyle muamele eden.", meaningEn: "The Most Merciful, especially to the believers." },
  { no: 3, arabic: "الْمَلِكُ", latin: "El-Melik", meaningTr: "Bütün kâinatın gerçek sahibi ve mutlak hükümdar.", meaningEn: "The Sovereign, the true owner of all dominion." },
  { no: 4, arabic: "الْقُدُّوسُ", latin: "El-Kuddûs", meaningTr: "Her türlü eksiklikten uzak, mukaddes olan.", meaningEn: "The Most Holy, free of every imperfection." },
  { no: 5, arabic: "السَّلَامُ", latin: "Es-Selâm", meaningTr: "Esenlik ve barışın kaynağı, kullarını selâmete erdiren.", meaningEn: "The Source of Peace, who grants safety and well-being." },
  { no: 6, arabic: "الْمُؤْمِنُ", latin: "El-Mü'min", meaningTr: "Güven veren, kullarına emân bahşeden.", meaningEn: "The Giver of Faith and Security." },
  { no: 7, arabic: "الْمُهَيْمِنُ", latin: "El-Müheymin", meaningTr: "Her şeyi görüp gözeten, kollayan.", meaningEn: "The Guardian who watches over and protects all things." },
  { no: 8, arabic: "الْعَزِيزُ", latin: "El-Azîz", meaningTr: "Yenilmez kudret sahibi, çok üstün.", meaningEn: "The Almighty, invincible in might." },
  { no: 9, arabic: "الْجَبَّارُ", latin: "El-Cebbâr", meaningTr: "İradesini her şeye geçiren, dilediğini yaptıran.", meaningEn: "The Compeller, whose will prevails over everything." },
  { no: 10, arabic: "الْمُتَكَبِّرُ", latin: "El-Mütekebbir", meaningTr: "Büyüklük yalnız kendisine yaraşan.", meaningEn: "The Supreme in Greatness, to whom majesty alone belongs." },
  { no: 11, arabic: "الْخَالِقُ", latin: "El-Hâlik", meaningTr: "Her şeyi yoktan var eden yaratıcı.", meaningEn: "The Creator, who brings all things into being from nothing." },
  { no: 12, arabic: "الْبَارِئُ", latin: "El-Bâri'", meaningTr: "Yarattıklarını uyumlu ve kusursuz şekilde meydana getiren.", meaningEn: "The Originator, who shapes creation in perfect harmony." },
  { no: 13, arabic: "الْمُصَوِّرُ", latin: "El-Musavvir", meaningTr: "Her varlığa özgün bir suret veren.", meaningEn: "The Fashioner, who gives every being its own form." },
  { no: 14, arabic: "الْغَفَّارُ", latin: "El-Gaffâr", meaningTr: "Günahları örten, çokça bağışlayan.", meaningEn: "The Ever-Forgiving, who covers and pardons sins." },
  { no: 15, arabic: "الْقَهَّارُ", latin: "El-Kahhâr", meaningTr: "Her şeye galip gelen, kahredici kudret sahibi.", meaningEn: "The All-Prevailing, who overcomes everything." },
  { no: 16, arabic: "الْوَهَّابُ", latin: "El-Vehhâb", meaningTr: "Karşılıksız ve çokça bağışta bulunan.", meaningEn: "The Bestower, who gives generously without expecting return." },
  { no: 17, arabic: "الرَّزَّاقُ", latin: "Er-Rezzâk", meaningTr: "Tüm canlıların rızkını veren.", meaningEn: "The Provider, who sustains every living thing." },
  { no: 18, arabic: "الْفَتَّاحُ", latin: "El-Fettâh", meaningTr: "Kapalı olanı açan, hayır kapılarını aralayan.", meaningEn: "The Opener, who opens the way to what is good." },
  { no: 19, arabic: "الْعَلِيمُ", latin: "El-Alîm", meaningTr: "Her şeyi tüm ayrıntısıyla bilen.", meaningEn: "The All-Knowing, who knows everything in full detail." },
  { no: 20, arabic: "الْقَابِضُ", latin: "El-Kâbıd", meaningTr: "Dilediğine daraltan, sıkan.", meaningEn: "The Withholder, who restricts as He wills." },
  { no: 21, arabic: "الْبَاسِطُ", latin: "El-Bâsit", meaningTr: "Dilediğine genişlik ve bolluk veren.", meaningEn: "The Extender, who gives abundance as He wills." },
  { no: 22, arabic: "الْخَافِضُ", latin: "El-Hâfid", meaningTr: "Dilediğini alçaltan.", meaningEn: "The Abaser, who lowers whom He wills." },
  { no: 23, arabic: "الرَّافِعُ", latin: "Er-Râfi'", meaningTr: "Dilediğini yücelten.", meaningEn: "The Exalter, who raises whom He wills." },
  { no: 24, arabic: "الْمُعِزُّ", latin: "El-Muizz", meaningTr: "İzzet ve şeref veren.", meaningEn: "The Giver of Honour and dignity." },
  { no: 25, arabic: "الْمُذِلُّ", latin: "El-Müzill", meaningTr: "Zillete düşüren, alçaltan.", meaningEn: "The Giver of Dishonour to those who deserve it." },
  { no: 26, arabic: "السَّمِيعُ", latin: "Es-Semî'", meaningTr: "Her sesi hakkıyla işiten.", meaningEn: "The All-Hearing, who hears every sound." },
  { no: 27, arabic: "الْبَصِيرُ", latin: "El-Basîr", meaningTr: "Her şeyi hakkıyla gören.", meaningEn: "The All-Seeing, who sees all things." },
  { no: 28, arabic: "الْحَكَمُ", latin: "El-Hakem", meaningTr: "Hükmü mutlak, adaletle hükmeden.", meaningEn: "The Judge, whose ruling is absolute and just." },
  { no: 29, arabic: "الْعَدْلُ", latin: "El-Adl", meaningTr: "Mutlak adalet sahibi.", meaningEn: "The Utterly Just." },
  { no: 30, arabic: "اللَّطِيفُ", latin: "El-Latîf", meaningTr: "En ince işleri bilen, lütuf sahibi.", meaningEn: "The Subtle and Kind, aware of the finest details." },
  { no: 31, arabic: "الْخَبِيرُ", latin: "El-Habîr", meaningTr: "Her şeyin iç yüzünden haberdar olan.", meaningEn: "The All-Aware, who knows the inner reality of everything." },
  { no: 32, arabic: "الْحَلِيمُ", latin: "El-Halîm", meaningTr: "Cezada acele etmeyen, yumuşak davranan.", meaningEn: "The Forbearing, who does not hasten to punish." },
  { no: 33, arabic: "الْعَظِيمُ", latin: "El-Azîm", meaningTr: "Sonsuz büyüklük sahibi.", meaningEn: "The Magnificent, boundless in greatness." },
  { no: 34, arabic: "الْغَفُورُ", latin: "El-Gafûr", meaningTr: "Günahları çokça bağışlayan.", meaningEn: "The Much-Forgiving." },
  { no: 35, arabic: "الشَّكُورُ", latin: "Eş-Şekûr", meaningTr: "Az amele bile bol karşılık veren.", meaningEn: "The Most Appreciative, who rewards small deeds abundantly." },
  { no: 36, arabic: "الْعَلِيُّ", latin: "El-Aliyy", meaningTr: "Pek yüce, her şeyden üstün olan.", meaningEn: "The Most High, above all things." },
  { no: 37, arabic: "الْكَبِيرُ", latin: "El-Kebîr", meaningTr: "En büyük, azameti sonsuz olan.", meaningEn: "The Most Great." },
  { no: 38, arabic: "الْحَفِيظُ", latin: "El-Hafîz", meaningTr: "Her şeyi koruyup gözeten.", meaningEn: "The Preserver, who guards and protects everything." },
  { no: 39, arabic: "الْمُقِيتُ", latin: "El-Mukît", meaningTr: "Bedenlere ve ruhlara gıda veren.", meaningEn: "The Sustainer, who nourishes bodies and souls." },
  { no: 40, arabic: "الْحَسِيبُ", latin: "El-Hasîb", meaningTr: "Hesabı gören, kullara yeten.", meaningEn: "The Reckoner, who is sufficient for His servants." },
  { no: 41, arabic: "الْجَلِيلُ", latin: "El-Celîl", meaningTr: "Ululuk ve heybet sahibi.", meaningEn: "The Majestic, possessor of glory and awe." },
  { no: 42, arabic: "الْكَرِيمُ", latin: "El-Kerîm", meaningTr: "Karşılıksız ve bol veren, cömert.", meaningEn: "The Most Generous." },
  { no: 43, arabic: "الرَّقِيبُ", latin: "Er-Rakîb", meaningTr: "Her şeyi görüp gözeten, kontrol eden.", meaningEn: "The Watchful, who observes and oversees all." },
  { no: 44, arabic: "الْمُجِيبُ", latin: "El-Mucîb", meaningTr: "Duaları kabul eden.", meaningEn: "The Responder, who answers prayers." },
  { no: 45, arabic: "الْوَاسِعُ", latin: "El-Vâsi'", meaningTr: "İlmi ve rahmeti geniş olan.", meaningEn: "The All-Encompassing in knowledge and mercy." },
  { no: 46, arabic: "الْحَكِيمُ", latin: "El-Hakîm", meaningTr: "Hikmet sahibi, işleri hikmetle yapan.", meaningEn: "The All-Wise, who does everything with wisdom." },
  { no: 47, arabic: "الْوَدُودُ", latin: "El-Vedûd", meaningTr: "Kullarını çok seven ve sevilmeye layık olan.", meaningEn: "The Most Loving, who loves and is worthy of love." },
  { no: 48, arabic: "الْمَجِيدُ", latin: "El-Mecîd", meaningTr: "Şanı yüce, şerefi sonsuz olan.", meaningEn: "The Most Glorious, boundless in honour." },
  { no: 49, arabic: "الْبَاعِثُ", latin: "El-Bâis", meaningTr: "Ölüleri dirilten.", meaningEn: "The Resurrector, who raises the dead." },
  { no: 50, arabic: "الشَّهِيدُ", latin: "Eş-Şehîd", meaningTr: "Her şeye şahit olan.", meaningEn: "The Witness over all things." },
  { no: 51, arabic: "الْحَقُّ", latin: "El-Hakk", meaningTr: "Varlığı gerçek ve değişmez olan.", meaningEn: "The Truth, whose existence is real and unchanging." },
  { no: 52, arabic: "الْوَكِيلُ", latin: "El-Vekîl", meaningTr: "Kendisine güvenene yeten.", meaningEn: "The Trustee, sufficient for whoever relies on Him." },
  { no: 53, arabic: "الْقَوِيُّ", latin: "El-Kaviyy", meaningTr: "Kudreti sonsuz olan.", meaningEn: "The All-Strong, limitless in power." },
  { no: 54, arabic: "الْمَتِينُ", latin: "El-Metîn", meaningTr: "Kuvveti ve iradesi çok sağlam olan.", meaningEn: "The Firm, unshakeable in strength and will." },
  { no: 55, arabic: "الْوَلِيُّ", latin: "El-Veliyy", meaningTr: "Sevdiği kullarının dostu ve yardımcısı.", meaningEn: "The Protecting Friend and helper of those He loves." },
  { no: 56, arabic: "الْحَمِيدُ", latin: "El-Hamîd", meaningTr: "Her türlü övgüye layık olan.", meaningEn: "The Praiseworthy, worthy of all praise." },
  { no: 57, arabic: "الْمُحْصِي", latin: "El-Muhsî", meaningTr: "Her şeyi tek tek sayıp bilen.", meaningEn: "The Reckoner, who counts and knows every single thing." },
  { no: 58, arabic: "الْمُبْدِئُ", latin: "El-Mübdi'", meaningTr: "Yaratmayı ilk kez başlatan.", meaningEn: "The Originator, who begins creation." },
  { no: 59, arabic: "الْمُعِيدُ", latin: "El-Muîd", meaningTr: "Yaratılışı tekrar eden.", meaningEn: "The Restorer, who brings creation back again." },
  { no: 60, arabic: "الْمُحْيِي", latin: "El-Muhyî", meaningTr: "Hayat veren, dirilten.", meaningEn: "The Giver of Life." },
  { no: 61, arabic: "الْمُمِيتُ", latin: "El-Mümît", meaningTr: "Ölümü yaratan.", meaningEn: "The Bringer of Death." },
  { no: 62, arabic: "الْحَيُّ", latin: "El-Hayy", meaningTr: "Ezelî ve ebedî diri olan.", meaningEn: "The Ever-Living, without beginning or end." },
  { no: 63, arabic: "الْقَيُّومُ", latin: "El-Kayyûm", meaningTr: "Kendi zatıyla var olan, her şeyi ayakta tutan.", meaningEn: "The Self-Subsisting, who sustains all existence." },
  { no: 64, arabic: "الْوَاجِدُ", latin: "El-Vâcid", meaningTr: "Dilediğini istediği anda bulan.", meaningEn: "The Finder, who lacks nothing and finds whatever He wills." },
  { no: 65, arabic: "الْمَاجِدُ", latin: "El-Mâcid", meaningTr: "Şanı yüce, keremi bol olan.", meaningEn: "The Noble and Glorious, abundant in generosity." },
  { no: 66, arabic: "الْوَاحِدُ", latin: "El-Vâhid", meaningTr: "Tek olan, ortağı olmayan.", meaningEn: "The One, without partner." },
  { no: 67, arabic: "الْأَحَدُ", latin: "El-Ahad", meaningTr: "Zatında ve sıfatlarında eşsiz olan.", meaningEn: "The Unique, matchless in essence and attributes." },
  { no: 68, arabic: "الصَّمَدُ", latin: "Es-Samed", meaningTr: "Hiçbir şeye muhtaç olmayan, her şey kendisine muhtaç olan.", meaningEn: "The Eternal Refuge, who needs nothing while all need Him." },
  { no: 69, arabic: "الْقَادِرُ", latin: "El-Kâdir", meaningTr: "Her şeye gücü yeten.", meaningEn: "The Able, who has power over all things." },
  { no: 70, arabic: "الْمُقْتَدِرُ", latin: "El-Muktedir", meaningTr: "Kudreti sonsuz, dilediğini yapan.", meaningEn: "The Omnipotent, who does whatever He wills." },
  { no: 71, arabic: "الْمُقَدِّمُ", latin: "El-Mukaddim", meaningTr: "Dilediğini öne alan.", meaningEn: "The Expediter, who brings forward whom He wills." },
  { no: 72, arabic: "الْمُؤَخِّرُ", latin: "El-Muahhir", meaningTr: "Dilediğini geriye bırakan.", meaningEn: "The Delayer, who postpones whom He wills." },
  { no: 73, arabic: "الْأَوَّلُ", latin: "El-Evvel", meaningTr: "Başlangıcı olmayan, ilk olan.", meaningEn: "The First, without beginning." },
  { no: 74, arabic: "الْآخِرُ", latin: "El-Âhir", meaningTr: "Sonu olmayan, son olan.", meaningEn: "The Last, without end." },
  { no: 75, arabic: "الظَّاهِرُ", latin: "Ez-Zâhir", meaningTr: "Varlığı apaçık olan.", meaningEn: "The Manifest, whose existence is evident." },
  { no: 76, arabic: "الْبَاطِنُ", latin: "El-Bâtın", meaningTr: "Zatı akıllarla kavranamayan.", meaningEn: "The Hidden, whose essence minds cannot grasp." },
  { no: 77, arabic: "الْوَالِي", latin: "El-Vâlî", meaningTr: "Kâinatı yöneten.", meaningEn: "The Governor, who directs all creation." },
  { no: 78, arabic: "الْمُتَعَالِي", latin: "El-Müte'âlî", meaningTr: "Yaratılmışların vasıflarından uzak, yüce.", meaningEn: "The Most Exalted, far above the traits of creation." },
  { no: 79, arabic: "الْبَرُّ", latin: "El-Berr", meaningTr: "İyilik ve ihsanı bol olan.", meaningEn: "The Source of Goodness, abundant in kindness." },
  { no: 80, arabic: "التَّوَّابُ", latin: "Et-Tevvâb", meaningTr: "Tövbeleri çokça kabul eden.", meaningEn: "The Ever-Relenting, who accepts repentance again and again." },
  { no: 81, arabic: "الْمُنْتَقِمُ", latin: "El-Müntekim", meaningTr: "Adaleti gereği zalimden hesap soran.", meaningEn: "The Avenger, who calls the oppressor to account in justice." },
  { no: 82, arabic: "الْعَفُوُّ", latin: "El-Afüvv", meaningTr: "Günahları silen, çokça affeden.", meaningEn: "The Pardoner, who erases sins and forgives much." },
  { no: 83, arabic: "الرَّءُوفُ", latin: "Er-Raûf", meaningTr: "Kullarına çok şefkatli olan.", meaningEn: "The Most Kind, deeply compassionate to His servants." },
  { no: 84, arabic: "مَالِكُ الْمُلْكِ", latin: "Mâlikü'l-Mülk", meaningTr: "Mülkün gerçek sahibi.", meaningEn: "The Owner of All Sovereignty." },
  { no: 85, arabic: "ذُو الْجَلَالِ وَالْإِكْرَامِ", latin: "Zü'l-Celâli ve'l-İkrâm", meaningTr: "Ululuk ve ikram sahibi.", meaningEn: "The Lord of Majesty and Honour." },
  { no: 86, arabic: "الْمُقْسِطُ", latin: "El-Muksit", meaningTr: "Adaletle hükmeden.", meaningEn: "The Equitable, who judges with fairness." },
  { no: 87, arabic: "الْجَامِعُ", latin: "El-Câmi'", meaningTr: "Dağınık olanı bir araya getiren.", meaningEn: "The Gatherer, who brings together what is scattered." },
  { no: 88, arabic: "الْغَنِيُّ", latin: "El-Ganiyy", meaningTr: "Zengin, hiçbir şeye muhtaç olmayan.", meaningEn: "The Self-Sufficient, in need of nothing." },
  { no: 89, arabic: "الْمُغْنِي", latin: "El-Muğnî", meaningTr: "Dilediğini zengin kılan.", meaningEn: "The Enricher, who makes whom He wills self-sufficient." },
  { no: 90, arabic: "الْمَانِعُ", latin: "El-Mâni'", meaningTr: "Dilediğinin önüne engel koyan.", meaningEn: "The Withholder, who prevents what He wills." },
  { no: 91, arabic: "الضَّارُّ", latin: "Ed-Dârr", meaningTr: "Hikmeti gereği zarar veren.", meaningEn: "The Distresser, who allows harm in His wisdom." },
  { no: 92, arabic: "النَّافِعُ", latin: "En-Nâfi'", meaningTr: "Fayda veren.", meaningEn: "The Bestower of Benefit." },
  { no: 93, arabic: "النُّورُ", latin: "En-Nûr", meaningTr: "Nurun kaynağı, aydınlatan.", meaningEn: "The Light, the source of all illumination." },
  { no: 94, arabic: "الْهَادِي", latin: "El-Hâdî", meaningTr: "Doğru yolu gösteren.", meaningEn: "The Guide, who shows the right path." },
  { no: 95, arabic: "الْبَدِيعُ", latin: "El-Bedî'", meaningTr: "Örneksiz ve eşsiz yaratan.", meaningEn: "The Incomparable Originator, who creates without precedent." },
  { no: 96, arabic: "الْبَاقِي", latin: "El-Bâkî", meaningTr: "Varlığı ebedî olan.", meaningEn: "The Everlasting, whose existence never ends." },
  { no: 97, arabic: "الْوَارِثُ", latin: "El-Vâris", meaningTr: "Her şeyin gerçek sahibi, her şey O'na kalır.", meaningEn: "The Inheritor, to whom everything ultimately returns." },
  { no: 98, arabic: "الرَّشِيدُ", latin: "Er-Reşîd", meaningTr: "İşlerini hikmetle sonuca ulaştıran.", meaningEn: "The Guide to the Right Path, who brings affairs to a wise end." },
  { no: 99, arabic: "الصَّبُورُ", latin: "Es-Sabûr", meaningTr: "Cezada acele etmeyen, sabreden.", meaningEn: "The Most Patient, who does not hasten to punish." },
];

/**
 * Seçili dile göre gösterilecek anlamı ve "insan kontrolü bekliyor"
 * bayrağını döndürür.
 */
export function esmaMeaning(
  entry: EsmaEntry,
  lang: string
): { text: string; needsReview: boolean } {
  if (lang === "tr") return { text: entry.meaningTr, needsReview: false };
  if (lang === "en") return { text: entry.meaningEn, needsReview: false };
  return { text: entry.meaningEn, needsReview: true };
}
